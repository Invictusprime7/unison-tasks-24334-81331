/**
 * Orchestrator — the brain of ai-code-assistant.
 * 
 * Decides which lane to run (A = Wizard, B = Builder),
 * assembles context, calls providers, and normalizes results.
 * 
 * index.ts should only: validate → classify → call orchestrator → return response.
 */

import { createClient } from "@supabase/supabase-js";
import { generateVariation, variationToPromptContext, type TemplateVariation } from "../_shared/industryVariations.ts";
import {
  getIndustryProfile,
  matchPagePattern,
  buildIndustryPageContext,
  getResearchQueries,
} from "../_shared/industryPagePatterns.ts";

import type { ClassifiedTask } from "./taskClassifier.ts";
import type { AIRequest } from "./requestSchema.ts";
import { buildProviderPlan } from "./providerRouter.ts";
import { postProcessContent, buildResponseBody } from "./responseNormalizer.ts";
import { extractTextContent } from "./utils.ts";
import { performPromptResearch, formatResearchContext, type ResearchResult } from "./webResearch.ts";
import {
  buildSystemTypeContext,
  buildDesignProfileContext,
  buildSystemsBlueprintContext,
  analyzeTemplateStructure,
  buildElementsLibraryBlock,
  buildVfsFilesContext,
  buildFastPathSystemPrompt,
  buildUserDBContext,
  buildSiteContextBlock,
  type UserDBContext,
} from "./contextBuilders.ts";
import { buildTemplateActionContext, buildEditModeContext, buildSurgicalEditReinforcement } from "./prompts/editPrompts.ts";
import { buildCodeModePrompt } from "./prompts/codePrompt.ts";
import { buildTemplateJsonPrompt, buildTemplateHtmlPrompt, buildTemplateReactPrompt } from "./prompts/templatePrompts.ts";
import { buildEditAssistantPrompt, buildDebugAssistantPrompt, buildGeneralBuilderPrompt } from "./prompts/builderPrompts.ts";
import { generateImageIfNeeded } from "./imageGeneration.ts";
import { runProviderLoop } from "./aiProviderLoop.ts";
import { compactMessages, buildThinkingInstruction, buildCompactBuilderContext, detectIssueHint } from "./contextCompactor.ts";
import { buildSessionMemory, formatSessionMemoryBlock } from "./sessionMemory.ts";
import { reviewPatch } from "./reviewPass.ts";
import { checkEditScope } from "./reviewScope.ts";
import { buildApplyState, type ApplyState } from "./applyState.ts";
import { preprocessPrompt } from "./promptPreprocessor.ts";
import { buildLaunchDeskSystemPrompt, buildLaunchDeskUserMessage } from "./prompts/launchDeskPrompt.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface CodePattern {
  pattern_type: string;
  description: string | null;
  usage_count: number;
  success_rate: number;
  tags: string[] | null;
  code_snippet: string;
}

function buildAttachmentMessages(attachments?: unknown[]): Array<{ role: 'user'; content: unknown[] }> {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  const imageParts = attachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== 'object') return null;
      const item = attachment as { type?: unknown; name?: unknown; data?: unknown; preview?: unknown; dataUrl?: unknown };
      const data = item.data || item.preview || item.dataUrl;
      if (item.type !== 'image' || typeof data !== 'string') return null;
      return {
        type: 'image_url',
        image_url: { url: data },
        name: typeof item.name === 'string' ? item.name : 'attached image',
      };
    })
    .filter((part): part is { type: string; image_url: { url: string }; name: string } => Boolean(part));

  if (imageParts.length === 0) return [];

  return [{
    role: 'user',
    content: [
      {
        type: 'text',
        text: `Use the attached image${imageParts.length > 1 ? 's' : ''} as visual context for layout, colors, typography, spacing, and asset placement. Preserve the user's written instructions as the source of truth.`,
      },
      ...imageParts,
    ],
  }];
}

export interface OrchestratorResult {
  response: Response;
}

type LauncherFilesPayload = { files: Record<string, string> };

function stripLauncherJsonText(rawContent: string): string {
  let sanitized = rawContent
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
    .replace(/^```json?\s*\n?/i, '')
    .replace(/^```(?:html|tsx|jsx|typescript|javascript)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!sanitized.startsWith('{') && sanitized.includes('{"files"')) {
    sanitized = sanitized.slice(sanitized.indexOf('{"files"'));
  }

  return sanitized.trim();
}

function extractBalancedJsonObject(input: string, preferredKey?: string): string | null {
  if (!input) return null;

  const seedIndex = preferredKey ? input.indexOf(preferredKey) : 0;
  const searchStart = seedIndex >= 0 ? seedIndex : 0;
  const openAt = input.lastIndexOf('{', searchStart);
  const startIndex = openAt >= 0 ? openAt : input.indexOf('{');
  if (startIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return input.slice(startIndex, i + 1).trim();
    }
  }

  return null;
}

function salvagePartialFilesPayload(sanitized: string): LauncherFilesPayload | null {
  // Tolerant extractor for truncated JSON: scans for complete
  // "path": "content" pairs inside the top-level "files" object so a cut-off
  // response still yields whatever files finished streaming.
  const filesIdx = sanitized.indexOf('"files"');
  if (filesIdx < 0) return null;
  const braceStart = sanitized.indexOf('{', filesIdx);
  if (braceStart < 0) return null;

  const files: Record<string, string> = {};
  let i = braceStart + 1;
  while (i < sanitized.length) {
    // Find next key opening quote
    while (i < sanitized.length && sanitized[i] !== '"' && sanitized[i] !== '}') i += 1;
    if (i >= sanitized.length || sanitized[i] === '}') break;

    // Read key string
    i += 1;
    const keyStart = i;
    while (i < sanitized.length && sanitized[i] !== '"') {
      if (sanitized[i] === '\\') i += 2; else i += 1;
    }
    if (i >= sanitized.length) break;
    const rawKey = sanitized.slice(keyStart, i);
    i += 1;

    // Skip colon + whitespace
    while (i < sanitized.length && (sanitized[i] === ':' || sanitized[i] === ' ' || sanitized[i] === '\n' || sanitized[i] === '\r' || sanitized[i] === '\t')) i += 1;
    if (i >= sanitized.length || sanitized[i] !== '"') break;
    i += 1;

    // Read value string, honoring escapes
    const valStart = i;
    let closed = false;
    while (i < sanitized.length) {
      const ch = sanitized[i];
      if (ch === '\\') { i += 2; continue; }
      if (ch === '"') { closed = true; break; }
      i += 1;
    }
    if (!closed) break; // Truncated mid-file — stop salvaging
    const rawVal = sanitized.slice(valStart, i);
    i += 1;

    try {
      const key = JSON.parse('"' + rawKey + '"') as string;
      const val = JSON.parse('"' + rawVal + '"') as string;
      const path = key.replace(/^\/+/, '');
      if (path && typeof val === 'string') files[path] = val;
    } catch { /* skip malformed entry */ }

    // Skip comma + whitespace
    while (i < sanitized.length && (sanitized[i] === ',' || sanitized[i] === ' ' || sanitized[i] === '\n' || sanitized[i] === '\r' || sanitized[i] === '\t')) i += 1;
  }

  return Object.keys(files).length > 0 ? { files } : null;
}

function parseLauncherFilesPayload(rawContent: string): LauncherFilesPayload | null {
  const sanitized = stripLauncherJsonText(rawContent);
  if (!sanitized) return null;

  const candidates = [
    sanitized,
    extractBalancedJsonObject(sanitized, '"files"'),
    extractBalancedJsonObject(sanitized),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { files?: Record<string, unknown> };
      if (!parsed?.files || typeof parsed.files !== 'object') continue;

      const files = Object.fromEntries(
        Object.entries(parsed.files)
          .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
          .map(([path, content]) => [path.replace(/^\/+/, ''), content]),
      );

      if (Object.keys(files).length > 0) return { files };
    } catch {
      // Try next candidate.
    }
  }

  // Last-resort: response was truncated before the closing braces. Try to
  // recover any complete "path": "content" entries that did stream.
  const salvaged = salvagePartialFilesPayload(sanitized);
  if (salvaged) {
    console.warn('[orchestrator] parseLauncherFilesPayload salvaged partial files from truncated JSON', {
      files: Object.keys(salvaged.files),
    });
    return salvaged;
  }

  return null;
}

function hardenWizardSystemsBuildContext(raw: AIRequest['systemsBuildContext']): {
  context: AIRequest['systemsBuildContext'];
  hasExplicitTemplateContract: boolean;
  hasExplicitStyleContract: boolean;
} {
  const ctx = (raw || {}) as Record<string, unknown>;
  const templateSelection = ((ctx.template_selection as Record<string, unknown>) || {});
  const styleSelection = ((ctx.style_selection as Record<string, unknown>) || {});
  const themeTokens = ((ctx.theme_tokens as Record<string, unknown>) || {});

  const fallbackSections = ['hero', 'services', 'about', 'testimonials', 'cta', 'contact', 'footer'];
  const explicitTemplateSections = Array.isArray(ctx.template_sections)
    ? ctx.template_sections.filter((s): s is string => typeof s === 'string')
    : [];
  const explicitSelectionOrder = Array.isArray(templateSelection.section_order)
    ? (templateSelection.section_order as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const hasExplicitTemplateContract =
    explicitSelectionOrder.length > 0 || explicitTemplateSections.length > 0;
  const sectionOrder = explicitSelectionOrder.length > 0
    ? explicitSelectionOrder
    : (explicitTemplateSections.length > 0 ? explicitTemplateSections : fallbackSections);

  const presetId =
    (styleSelection.preset_id as string | undefined) ||
    (themeTokens.presetId as string | undefined) ||
    undefined;
  const presetLabel =
    (styleSelection.preset_label as string | undefined) ||
    (themeTokens.presetLabel as string | undefined) ||
    undefined;
  const styleDirective =
    (styleSelection.style_directive as string | undefined) ||
    (themeTokens.styleDirective as string | undefined) ||
    undefined;
  const hasExplicitStyleContract = Boolean(
    styleSelection.preset_id ||
    themeTokens.presetId,
  );

  const hardened: Record<string, unknown> = {
    ...ctx,
    template_selection: {
      ...templateSelection,
      section_order: sectionOrder,
    },
    template_sections: sectionOrder,
    style_selection: {
      ...styleSelection,
      ...(presetId ? { preset_id: presetId } : {}),
      ...(presetLabel ? { preset_label: presetLabel } : {}),
      ...(styleDirective ? { style_directive: styleDirective } : {}),
    },
    theme_tokens: {
      ...themeTokens,
      ...(presetId ? { presetId } : {}),
      ...(presetLabel ? { presetLabel } : {}),
      ...(styleDirective ? { styleDirective } : {}),
    },
  };

  if (explicitSelectionOrder.length === 0 || explicitTemplateSections.length === 0) {
    console.warn('[orchestrator] Hardened wizard context: repaired missing template section contract');
  }

  return {
    context: hardened as AIRequest['systemsBuildContext'],
    hasExplicitTemplateContract,
    hasExplicitStyleContract,
  };
}

// ── Main Orchestrator Entry ─────────────────────────────────────────────────

export function runAssistantOrchestrator(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
  userId?: string,
): Promise<Response> {
  // Hard guard: wizardLaunch can ONLY be served by Lane A. If the classifier
  // ever returns anything else with wizardLaunch set, force Lane A and log
  // loudly so we catch any regression in routing logic.
  if (parsed.wizardLaunch && task.type !== "wizard_template_react") {
    console.error(
      `[orchestrator] wizardLaunch=true but classifier routed to ${task.type}; forcing Lane A`,
    );
    return runWizardLane(parsed, { ...task, type: "wizard_template_react", fastPath: true }, corsHeaders);
  }
  if (task.type === "wizard_template_react") {
    return runWizardLane(parsed, task, corsHeaders);
  }
  if (task.type === "launch_desk") {
    return runLaunchDeskLane(parsed, task, corsHeaders);
  }
  return runBuilderLane(parsed, task, corsHeaders, userId);
}

// ============================================================================
// LANE A — Wizard Fast Path (protected, no memory, no research overhead)
// ============================================================================

async function runWizardLane(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  console.log('[orchestrator] LANE A: wizard fast path');

  const hasLovableKey = Boolean(Deno.env.get("LOVABLE_API_KEY"));
  const { messages, systemsBuildContext, templateName, source, imagePlacement, siteElementsLibraryContext } = parsed;
  const {
    context: hardenedContext,
    hasExplicitTemplateContract,
    hasExplicitStyleContract,
  } = hardenWizardSystemsBuildContext(systemsBuildContext);

  // Strict guard for explicit wizard-launch requests from the 4-step launcher.
  // If template/style registry selections are missing, fail fast instead of
  // silently falling back to a generic output profile.
  if (parsed.wizardLaunch && (!hasExplicitTemplateContract || !hasExplicitStyleContract)) {
    console.error('[orchestrator] Lane A contract missing for wizardLaunch', {
      hasExplicitTemplateContract,
      hasExplicitStyleContract,
      hasTemplateSelection: Boolean((systemsBuildContext as Record<string, unknown> | undefined)?.template_selection),
      hasStyleSelection: Boolean((systemsBuildContext as Record<string, unknown> | undefined)?.style_selection),
      hasThemeTokens: Boolean((systemsBuildContext as Record<string, unknown> | undefined)?.theme_tokens),
    });
    return new Response(
      JSON.stringify({
        error: 'Wizard launch contract missing template/style selections. Please relaunch from the wizard and select template + style cards.',
      }),
      {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Fast path system prompt — no research, no memory, no patterns
  const baseSystemPrompt = buildFastPathSystemPrompt({
    systemsBuildContext: hardenedContext ?? {},
    templateName: templateName ?? undefined,
    source: source ?? undefined,
  });

  // Inject the Site Elements Library knowledge base. Previously only the
  // Builder lane consumed this — wizard launches generated structure
  // without any element-library grounding, which made every industry
  // collapse to the same generic layout. (Audit gap fix.)
  const elementsLibraryBlock = buildElementsLibraryBlock(siteElementsLibraryContext, false);
  const finalSystemPrompt = elementsLibraryBlock
    ? `${baseSystemPrompt}\n${elementsLibraryBlock}`
    : baseSystemPrompt;

  const processedMessages = compactMessages(messages);
  const aiMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...processedMessages,
  ];

  // Provider plan — protected, no user overrides
  const providerPlan = buildProviderPlan(task, hasLovableKey);
  const providerResult = await runProviderLoop({
    aiMessages,
    providerPlan,
    navPageGen: false,
    forceJsonResponse: true,
    taskType: task.type,
  });

  if (providerResult.earlyError) {
    return new Response(
      JSON.stringify({ error: providerResult.earlyError.error }),
      {
        status: providerResult.earlyError.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const processedContent = postProcessContent(providerResult.content);
  const launcherPayload = parseLauncherFilesPayload(processedContent);
  const content = launcherPayload ? JSON.stringify(launcherPayload) : processedContent;

  if (!launcherPayload) {
    console.warn('[orchestrator] Lane A returned content without a parseable files payload', {
      modelUsed: providerResult.modelUsed,
      preview: processedContent.slice(0, 240),
    });
  }

  // Fire-and-forget learning session
  saveLearningSession(parsed, content);

  const responseBody = {
    ...buildResponseBody({
    content,
    reasoning: providerResult.reasoning,
    generatedImageUrl: '',
    imagePlacement: imagePlacement ?? undefined,
    mode: 'template-react',
    modelUsed: providerResult.modelUsed,
    }),
    ...(launcherPayload ? { files: launcherPayload.files } : {}),
  };

  return new Response(
    JSON.stringify(responseBody),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// LANE B — Builder Orchestration (memory, compaction, research, rich response)
// ============================================================================

// ============================================================================
// LANE C — Launch Desk (structured JSON plan, no memory, no research)
// ============================================================================

async function runLaunchDeskLane(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  console.log('[orchestrator] LANE C: launch_desk');

  const hasLovableKey = Boolean(Deno.env.get("LOVABLE_API_KEY"));
  const { messages, launchBrief } = parsed;

  const systemPrompt = buildLaunchDeskSystemPrompt();

  // Build the user turn — synthesise the brief from launchBrief fields,
  // falling back to the last user message if no launchBrief was supplied.
  let userContent: string;
  if (launchBrief) {
    userContent = buildLaunchDeskUserMessage(launchBrief);
  } else {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    userContent = typeof lastUser?.content === 'string' ? lastUser.content : 'No brief provided.';
  }

  const aiMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const providerPlan = buildProviderPlan(task, hasLovableKey);
  const providerResult = await runProviderLoop({
    aiMessages,
    providerPlan,
    navPageGen: false,
  });

  if (providerResult.earlyError) {
    return new Response(
      JSON.stringify({ error: providerResult.earlyError.error }),
      {
        status: providerResult.earlyError.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Attempt to parse as structured JSON plan; fall back to raw text.
  const rawContent = providerResult.content;
  let plan: unknown = null;
  try {
    const stripped = rawContent.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    plan = JSON.parse(stripped);
  } catch {
    // Model returned prose — wrap it so the frontend can still display something.
    plan = { summary: rawContent, tasks: [], riskRegister: [], ownerChecklist: {}, launchCopy: {}, followUpQuestions: [] };
  }

  return new Response(
    JSON.stringify({ content: JSON.stringify(plan), plan, modelUsed: providerResult.modelUsed, mode: 'launch-desk' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function runBuilderLane(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
  userId?: string,
): Promise<Response> {
  console.log(`[orchestrator] LANE B: ${task.type} (sub-behavior: ${
    task.type === 'debug_fix' ? 'builder_debug' :
    ['surgical_edit', 'behavioral_edit', 'single_file_edit', 'multi_file_edit', 'template_react_edit'].includes(task.type) ? 'builder_edit' :
    'builder_generate'
  })`);

  const hasLovableKey = Boolean(Deno.env.get("LOVABLE_API_KEY"));
  const {
    messages, mode, savePattern = true, generateImage = false, imagePlacement,
    currentCode, editMode = false, debugMode: _debugMode = false,
    templateAction, systemType, variationSeed, templateName, aesthetic, source,
    userDesignProfile, systemsBuildContext, navPageGen = false, navPageName, navLabel,
    siteElementsLibraryContext, surgicalEdit = false,
    componentBehaviorContext, vfsFiles, gatewayOptions,
    previewDiagnostics, previewSnapshot, recentChangedFiles,
    siteContext, attachments,
  } = parsed;

  // ── 0. Prompt preprocessing (typo fix, intent extraction, keyword distillation)
  const rawUserPromptText = extractTextContent(messages[messages.length - 1]?.content);
  const preprocessed = preprocessPrompt(rawUserPromptText);
  const userPromptText = preprocessed.normalized;
  if (preprocessed.wasNormalized) {
    console.log(`[orchestrator] Prompt normalized: ${preprocessed.intents.length} intents, ${preprocessed.searchKeywords.length} keywords`);
  }

  // ── 1. Session memory (Lane B only) ────────────────────────────────────
  const memory = task.shouldUseMemory
    ? buildSessionMemory({
        userPromptText,
        systemType: systemType ?? undefined,
        source: source ?? undefined,
        templateName: templateName ?? undefined,
        aesthetic: aesthetic ?? undefined,
        vfsFiles,
        currentCode: currentCode ?? undefined,
        debugMode: _debugMode,
        previewDiagnostics: previewDiagnostics ?? undefined,
        recentChangedFiles: recentChangedFiles ?? undefined,
        messageCount: messages.length,
      })
    : undefined;
  const memoryBlock = formatSessionMemoryBlock(memory);

  // ── 2. Learned patterns (skip for fast tasks) ──────────────────────────
  let learnedPatterns = 'No patterns loaded.';
  if (!task.fastPath) {
    learnedPatterns = await fetchLearnedPatterns();
  }

  // ── 3. Context blocks ─────────────────────────────────────────────────
  const systemTypeContext = buildSystemTypeContext(systemType ?? undefined);
  const designProfileContext = buildDesignProfileContext(userDesignProfile);
  const systemsBuildContextText = buildSystemsBlueprintContext(systemsBuildContext);
  const templateStructure = currentCode ? analyzeTemplateStructure(currentCode) : '';
  const templateActionCtx = buildTemplateActionContext(templateAction ?? undefined);
  const editModeContext = buildEditModeContext(editMode, currentCode ?? undefined, templateStructure, templateActionCtx);

  // ── 3a. User DB context (history + drafts) — non-blocking ──────────────
  const userDBCtx = userId && !task.fastPath ? await fetchUserContext(userId).catch(() => null) : null;
  const userDBContextBlock = buildUserDBContext(userDBCtx);
  const siteContextBlock = buildSiteContextBlock(siteContext);

  // ── 4. Base system prompt ──────────────────────────────────────────────
  let basePrompt: string;
  if (mode === 'template-json' || mode === 'template-html' || mode === 'template-react') {
    const templatePromptText = templateName
      ? `${templateName} ${aesthetic || ''} ${source || ''}`
      : userPromptText;
    const variation = generateVariation(templatePromptText, variationSeed ?? undefined);
    const variationContext = variationToPromptContext(variation);

    // Detect if user intent overrides default design tokens
    const userOverrideDirective = detectUserDesignOverride(userPromptText, variation);

    if (mode === 'template-json') {
      basePrompt = buildTemplateJsonPrompt(variation, variationContext + userOverrideDirective);
    } else if (mode === 'template-html') {
      basePrompt = buildTemplateHtmlPrompt(variation, variationContext + userOverrideDirective);
    } else {
      basePrompt = buildTemplateReactPrompt(variation, variationContext + userOverrideDirective, currentCode ?? undefined, templateAction ?? undefined);
    }
  } else {
    basePrompt = buildCodeModePrompt({ editModeContext, learnedPatterns });
  }

  // ── 5. Parallel work: research + nav research + image ──────────────────
  const researchPromise = task.skipResearch
    ? Promise.resolve({ snippets: [], trends: [], keyPhrases: [], queriesUsed: [] } as ResearchResult)
    : performPromptResearch(userPromptText, preprocessed.searchKeywords);

  const navResearchPromise: Promise<string> = (navPageGen && systemType)
    ? runNavResearch(systemType, navPageName ?? undefined, navLabel ?? undefined)
    : Promise.resolve('');

  const [research, industryPageContext] = await Promise.all([
    researchPromise, navResearchPromise,
  ]);

  // Keep Gemini calls sequential. Image generation and text/code generation use
  // the same upstream API quota, so running them concurrently can turn one user
  // action into competing provider calls.
  const imageResult = await generateImageIfNeeded({
    userPrompt: userPromptText.toLowerCase(),
    generateImage,
    imagePlacement: imagePlacement ?? undefined,
    fastTemplateReact: false,
  });

  const researchContext = formatResearchContext(research);

  // ── 6. Compact messages + builder context ──────────────────────────────
  const processedMessages = compactMessages(messages);

  // Builder-priority VFS compaction (issue-aware)
  const issueHint = detectIssueHint(previewDiagnostics ?? undefined, memory?.goalCategory);
  const builderContext = task.shouldUseCompactContext
    ? buildCompactBuilderContext({
        vfsFiles,
        changedFiles: memory?.recentChangedFiles,
        currentCode: currentCode ?? undefined,
        previewDiagnostics: previewDiagnostics ?? undefined,
        issueHint,
        goalCategory: memory?.goalCategory,
      })
    : { compactedFiles: '', fileCount: 0, excludedFiles: [] };

  // ── 7. Assemble final prompt by task type ──────────────────────────────
  const thinkingInstruction = buildThinkingInstruction(task.skipThinking);
  const elementsLibraryBlock = buildElementsLibraryBlock(siteElementsLibraryContext, surgicalEdit);

  // For surgical edits, use old-style VFS context (byte-for-byte preservation)
  // For ALL edit tasks, provide VFS context for structure preservation (not just surgical)
  const isEditTask = ['surgical_edit', 'behavioral_edit', 'single_file_edit', 'multi_file_edit', 'template_react_edit'].includes(task.type);
  const vfsFilesContext = buildVfsFilesContext(surgicalEdit || isEditTask, vfsFiles);
  const surgicalEditReinforcement = buildSurgicalEditReinforcement(surgicalEdit || isEditTask, vfsFilesContext);

  const imageContext = imageResult.generatedImageUrl
    ? `\n\n**IMPORTANT: An AI-generated image has been created for this request. Include this image HTML in your response at the appropriate location:**\n${imageResult.imageHtml}\n\nThe image is already styled for the "${imagePlacement || 'top-left'}" position. Make sure to include it in a relative-positioned container.`
    : '';

  // Use the non-surgical compacted files for non-surgical edits
  const compactedFilesBlock = surgicalEdit ? '' : builderContext.compactedFiles;

  let finalSystemPrompt: string;

  switch (task.type) {
    case "debug_fix":
      finalSystemPrompt = buildDebugAssistantPrompt({
        basePrompt,
        memoryBlock,
        compactedFilesBlock,
        thinkingInstruction,
      });
      break;

    case "behavioral_edit":
      finalSystemPrompt = buildEditAssistantPrompt({
        basePrompt,
        memoryBlock,
        compactedFilesBlock,
        surgicalReinforcement: surgicalEditReinforcement,
        researchContext,
        designContext: systemTypeContext + designProfileContext,
        blueprintContext: systemsBuildContextText,
        elementsLibrary: elementsLibraryBlock,
        thinkingInstruction,
        behavioralContext: componentBehaviorContext,
      });
      break;

    case "surgical_edit":
    case "single_file_edit":
    case "multi_file_edit":
    case "template_react_edit":
      finalSystemPrompt = buildEditAssistantPrompt({
        basePrompt,
        memoryBlock,
        compactedFilesBlock,
        surgicalReinforcement: surgicalEditReinforcement,
        researchContext,
        designContext: systemTypeContext + designProfileContext,
        blueprintContext: systemsBuildContextText,
        elementsLibrary: elementsLibraryBlock,
        thinkingInstruction,
      });
      break;

    default:
      // general_code_assist, nav_page_generation, template_json/html
      finalSystemPrompt = buildGeneralBuilderPrompt({
        basePrompt,
        memoryBlock,
        compactedFilesBlock,
        researchContext,
        industryPageContext,
        designContext: systemTypeContext + designProfileContext,
        blueprintContext: systemsBuildContextText,
        elementsLibrary: elementsLibraryBlock,
        thinkingInstruction,
        imageContext,
      });
      break;
  }

  // Inject parsed intent summary into system prompt for better understanding
  if (preprocessed.intentSummary) {
    finalSystemPrompt += preprocessed.intentSummary;
  }

  // Inject site topology + intent bindings so chat prompts can edit routes & wiring.
  if (siteContextBlock) {
    finalSystemPrompt += `\n${siteContextBlock}`;
  }





  // Inject live preview DOM snapshot for context awareness
  if (previewSnapshot) {
    finalSystemPrompt += `\n\n${previewSnapshot}\nUse this to understand what the user currently sees and which elements/sections exist in the live preview.`;
  }

  // Inject component behavior context for all edit types
  if (componentBehaviorContext) {
    finalSystemPrompt += `\n\n[🧠 Component Behavior Map]\n${componentBehaviorContext}\nUse this to identify interactive elements, their current handlers, state, and wiring when making edits.`;
  }

  // Inject user history + draft context from Supabase
  if (userDBContextBlock) {
    finalSystemPrompt += `\n\n${userDBContextBlock}`;
  }

  const attachmentMessages = buildAttachmentMessages(attachments);
  if (attachmentMessages.length > 0) {
    console.log(`[orchestrator] Forwarding ${attachmentMessages[0].content.length - 1} image attachment(s) to Gemini`);
  }

  const aiMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...processedMessages,
    ...attachmentMessages,
  ];

  // ── 8. Call AI providers (complexity-aware model selection) ─────────────
  console.log(`[orchestrator] Prompt complexity: ${preprocessed.complexity.tier} (score=${preprocessed.complexity.score}, factors=[${preprocessed.complexity.factors.join(',')}])`);
  const providerPlan = buildProviderPlan(task, hasLovableKey, gatewayOptions, preprocessed.complexity.tier);
  const providerResult = await runProviderLoop({
    aiMessages,
    providerPlan,
    navPageGen,
    reasoningEffort: gatewayOptions?.reasoningEffort,
  });

  if (providerResult.earlyError) {
    return new Response(
      JSON.stringify({ error: providerResult.earlyError.error }),
      {
        status: providerResult.earlyError.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // ── 9. Post-process + review pass + response ────────────────────────────
  const content = postProcessContent(providerResult.content);

  // Run review pass on multi-file output
  let reviewResult: ReturnType<typeof reviewPatch> | undefined;
  let applyState: ApplyState | undefined;
  try {
    const jsonStr = content.trim().replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.files && typeof parsed.files === "object") {
      const existingFiles = vfsFiles ? Object.keys(vfsFiles) : [];
      reviewResult = reviewPatch({
        files: parsed.files,
        existingFiles,
        taskType: task.type,
        goalCategory: memory?.goalCategory,
      });
      console.log(`[orchestrator] Review: ${reviewResult.approved ? 'APPROVED' : 'FLAGGED'}, ${reviewResult.warnings.length} warnings, ${reviewResult.removedFiles.length} blocked`);

      // ── Scope enforcement for scoped edits ──────────────────────────
      const scopeResult = checkEditScope({
        patchFiles: reviewResult.cleanedFiles,
        targetFile: parsed.targetFile ?? null,
        taskType: task.type,
        existingFiles,
      });
      if (!scopeResult.inScope) {
        console.warn(`[orchestrator] SCOPE VIOLATION: ${scopeResult.reason}`);
        reviewResult.warnings.push({ severity: "error", message: `Scope violation: ${scopeResult.reason}` });
        reviewResult.requiresApproval = true;
      }
      if (scopeResult.blockAutoApply) {
        reviewResult.requiresApproval = true;
      }

      applyState = buildApplyState({
        actionType: reviewResult.removedFiles.length > 0 ? 'multi_patch' : 'patch',
        touchedFiles: Object.keys(reviewResult.cleanedFiles),
        applyStatus: reviewResult.approved ? 'proposed' : 'proposed',
        requiredApproval: reviewResult.requiresApproval,
        reviewWarnings: reviewResult.warnings.map(w => w.message),
      });
    }
  } catch {
    // Not JSON multi-file output — skip review
  }

  if (savePattern) saveLearningSession(parsed, content, userId);

  const responseContent = reviewResult ? JSON.stringify({ files: reviewResult.cleanedFiles }) : content;
  const responseFilesPayload = reviewResult
    ? { files: reviewResult.cleanedFiles }
    : parseLauncherFilesPayload(responseContent);

  const responseBody = {
    ...buildResponseBody({
    content: responseContent,
    reasoning: providerResult.reasoning,
    generatedImageUrl: imageResult.generatedImageUrl,
    imagePlacement: imageResult.imagePlacement ?? imagePlacement ?? undefined,
    debugMode: _debugMode,
    mode: mode ?? undefined,
    modelUsed: providerResult.modelUsed,
    reviewWarnings: reviewResult?.warnings,
    requiresApproval: reviewResult?.requiresApproval,
    removedFiles: reviewResult?.removedFiles,
    reviewSummary: reviewResult?.reviewSummary,
    applyState: applyState as Record<string, unknown> | undefined,
    }),
    ...(responseFilesPayload ? { files: responseFilesPayload.files } : {}),
  };

  return new Response(
    JSON.stringify(responseBody),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ── User Design Override Detection ──────────────────────────────────────────

const DESIGN_OVERRIDE_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(earthy|warm|cool|pastel|neon|muted|soft|vibrant|dark|light|bright)\s*(tone|color|palette|scheme|theme)/i, category: 'palette' },
  { pattern: /\b(change|make|use|switch|set)\s+(the\s+)?(color|colours|palette|scheme|theme)\s+(to|as|like)/i, category: 'palette' },
  { pattern: /\b(serif|sans.?serif|monospace|handwritten|script)\s*(font|typography)/i, category: 'typography' },
  { pattern: /\b(change|make|use|switch|set)\s+(the\s+)?(font|typography|typeface)/i, category: 'typography' },
  { pattern: /\b(minimalist|brutalist|glassmorphism|neumorphism|retro|vintage|modern|elegant|playful)/i, category: 'style' },
  { pattern: /#[0-9a-f]{3,8}\b/i, category: 'palette' },
  { pattern: /\brgb[a]?\s*\(/i, category: 'palette' },
  { pattern: /\bhsl[a]?\s*\(/i, category: 'palette' },
];

function detectUserDesignOverride(userPrompt: string, variation: TemplateVariation): string {
  const matches = DESIGN_OVERRIDE_PATTERNS.filter(p => p.pattern.test(userPrompt));
  if (matches.length === 0) return '';

  const categories = [...new Set(matches.map(m => m.category))];
  const overrideBlock = `

## ⚡ USER DESIGN OVERRIDE DETECTED
The user's request explicitly asks for design changes. **Their request takes absolute priority** over the default "${variation.colorScheme.name}" palette above.
Override categories: ${categories.join(', ')}

**Rules for this override:**
${categories.includes('palette') ? '- REPLACE the default color palette with colors that match the user\'s description.\n' : ''}${categories.includes('typography') ? '- REPLACE the default fonts with typography that matches the user\'s description.\n' : ''}${categories.includes('style') ? '- ADAPT the visual style (effects, layout density, decorative elements) to match the user\'s description.\n' : ''}- Keep the industry context (${variation.industry.name}) — do NOT change the subject matter, copy, or business logic.
- Update the brandKit in your response to reflect the new design tokens.
`;
  console.log(`[orchestrator] Design override detected: ${categories.join(', ')}`);
  return overrideBlock;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetches recent AI sessions and draft metadata for a user to enrich prompts.
 */
async function fetchUserContext(userId: string): Promise<UserDBContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [sessionsResult, draftsResult] = await Promise.all([
    supabase
      .from('ai_learning_sessions')
      .select('session_type, user_prompt, technologies_used')
      .eq('user_id', userId)
      .eq('was_successful', true)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('builder_drafts')
      .select('template_id, metadata, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3),
  ]);

  return {
    recentSessions: (sessionsResult.data ?? []) as UserDBContext['recentSessions'],
    recentDraftsMeta: (draftsResult.data ?? []) as UserDBContext['recentDraftsMeta'],
  };
}

async function fetchLearnedPatterns(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: patterns } = await supabase
      .from('ai_code_patterns')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('success_rate', { ascending: false })
      .limit(12);

    if (patterns && patterns.length > 0) {
      return (patterns as CodePattern[]).map((p) => `
📐 **${p.pattern_type.toUpperCase()}** — ${p.description || 'N/A'}
Tags: ${(p.tags || []).join(', ')} | Used ${p.usage_count}× | ${p.success_rate}% success
\`\`\`tsx
${p.code_snippet.substring(0, 600)}${p.code_snippet.length > 600 ? '...' : ''}
\`\`\`
`).join('\n');
    }
  } catch (e) {
    console.warn('[orchestrator] Failed to fetch patterns:', e);
  }
  return 'No learned patterns yet.';
}

function saveLearningSession(parsed: AIRequest, content: string, userId?: string): void {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const originalUserPrompt = extractTextContent(parsed.messages[parsed.messages.length - 1]?.content);
    if (originalUserPrompt) {
      supabase.from('ai_learning_sessions').insert({
        session_type: parsed.mode === 'code' ? 'code_generation' : parsed.mode === 'design' ? 'design_review' : 'code_review',
        user_prompt: originalUserPrompt.substring(0, 500),
        ai_response: content.substring(0, 500),
        was_successful: true,
        technologies_used: ['React', 'TypeScript', 'Tailwind CSS'],
        user_id: userId ?? null,
      }).then(() => console.log('Learning session saved'));
    }
  } catch {
    // Fire-and-forget
  }
}

async function runNavResearch(
  systemType: string,
  navPageName?: string,
  navLabel?: string,
): Promise<string> {
  try {
    const profile = getIndustryProfile(systemType);
    const pattern = matchPagePattern(profile, navPageName ?? '', navLabel ?? '');
    const staticCtx = buildIndustryPageContext(profile, pattern);
    const queries = getResearchQueries(pattern);
    const liveResults = await Promise.allSettled(
      queries.map(q => performPromptResearch(q))
    );
    const liveSnippets = liveResults
      .filter((r): r is PromiseFulfilledResult<ResearchResult> => r.status === 'fulfilled')
      .flatMap(r => r.value.snippets.slice(0, 3));
    const liveCtx = liveSnippets.length > 0
      ? `\n\n📡 LIVE WEB RESEARCH (industry page patterns):\n${liveSnippets.map(s => `  • ${s}`).join('\n')}`
      : '';
    return staticCtx + liveCtx;
  } catch (e) {
    console.warn('[orchestrator] Nav research failed:', e);
    return '';
  }
}
