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
import { buildProviderPlan, isGeminiExclusiveProviderMode } from "./providerRouter.ts";
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
  buildUserDBContext,
  buildWizardSeedContext,
  type UserDBContext,
  type WizardSeedShape,
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
import { CATALOG_CHAT_TOOLS, renderCatalogToolDirective } from "../_shared/catalogTools.ts";
import { buildEnvelopeDirective, type EnvelopeShape } from "./envelopeContext.ts";
import { verifyAgainstEnvelope, buildRepairInstruction } from "./envelopeVerifier.ts";
import { recordEnvelopeRun, type EnvelopeRunContext } from "./envelopeRunLog.ts";
import {
  buildUnisonContextDirective,
  resolveReasoningEffort,
  resolveUnisonComplexity,
} from "./unisonContext.ts";


const BUILDER_EDIT_TASKS = new Set<string>([
  'surgical_edit', 'behavioral_edit', 'single_file_edit', 'multi_file_edit', 'template_react_edit',
]);

// ── Types ───────────────────────────────────────────────────────────────────

interface CodePattern {
  pattern_type: string;
  description: string | null;
  usage_count: number;
  success_rate: number;
  tags: string[] | null;
  code_snippet: string;
}

export interface OrchestratorResult {
  response: Response;
}

function buildWizardSeedBasePrompt(): string {
  return `You are the Lane B first-build generator for the System Launcher.
Generate the initial structured business website from the WizardSeed, canonical route registry, theme, intent contract, memory, research, and VFS context.

OUTPUT RULES:
- Return ONLY raw JSON: {"files":{"/src/pages/Home.tsx":"..."}}
- Do not use markdown fences or prose.
- Do not author /src/App.tsx, /src/main.tsx, config files, or package files.
- Emit complete React/TypeScript page/section files using semantic Tailwind tokens.
- Preserve the canonical routes and data-ut-intent contract from the WizardSeed.`;
}

function buildWizardInteractionBasePrompt(): string {
  return `You are the final interaction planner for a validated System Launcher website.
Return ONLY raw JSON with this exact shape: {"templateId":"provided template id","layoutSignature":"provided template layout signature","interactions":[{"target":{"kind":"template-root|interactive|intent","value":"only for intent"},"effect":"hover-lift|hover-glow|reveal|stagger-reveal|click-feedback"}]}.
Do not return TSX, CSS, imports, files, routes, handlers, selectors outside the target vocabulary, or prose.
You may choose at most 12 interactions. Preserve all template layout, semantic HSL tokens, data-ut-intent attributes, routes, and page topology.`;
}

// ── Main Orchestrator Entry ─────────────────────────────────────────────────

export function runAssistantOrchestrator(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
  userId?: string,
  signal?: AbortSignal,
): Promise<Response> {
  if (task.type === "launch_desk") {
    return runLaunchDeskLane(parsed, task, corsHeaders, signal);
  }
  // All wizard launches now route through Lane B as `wizard_seed_generation`.
  return runBuilderLane(parsed, task, corsHeaders, userId, signal);
}

// ============================================================================
// LANE B — Builder Orchestration (memory, compaction, research, rich response)
// ============================================================================
//
// Wizard launches send `mode: "wizard-seed"` with a structured WizardSeed and
// share the same Lane B builder brain as in-Builder AIBuilderPanel edits.


// ============================================================================
// LANE C — Launch Desk (structured JSON plan, no memory, no research)
// ============================================================================

async function runLaunchDeskLane(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
  signal?: AbortSignal,
): Promise<Response> {
  console.log('[orchestrator] LANE C: launch_desk');

  const { messages, launchBrief } = parsed;

  let systemPrompt = buildLaunchDeskSystemPrompt();
  systemPrompt += buildEnvelopeDirective(parsed.requestEnvelope as EnvelopeShape | undefined);
  systemPrompt += buildUnisonContextDirective(parsed.unisonContext);

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

  const launchComplexity = resolveUnisonComplexity('moderate', parsed.unisonContext);
  const launchReasoningEffort = resolveReasoningEffort(
    parsed.gatewayOptions?.reasoningEffort,
    launchComplexity,
  );
  const geminiExclusive = isGeminiExclusiveProviderMode();
  const providerPlan = buildProviderPlan(task, Boolean(
    Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('UNISONGEMINI_API_KEY') ||
    (!geminiExclusive && (Deno.env.get('OPENAI_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY'))),
  ), parsed.gatewayOptions, launchComplexity, userContent);
  const providerResult = await runProviderLoop({
    aiMessages,
    providerPlan,
    navPageGen: false,
    reasoningEffort: launchReasoningEffort,
    signal,
  });

  if (providerResult.earlyError) {
    return new Response(
      JSON.stringify({ error: providerResult.earlyError.error }),
      {
        status: providerResult.earlyError.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(providerResult.earlyError.status === 429 ? { 'Retry-After': '1' } : {}),
        },
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
    JSON.stringify({
      content: JSON.stringify(plan),
      plan,
      modelUsed: providerResult.modelUsed,
      providerUsed: providerResult.providerUsed,
      mode: 'launch-desk',
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(providerResult.providerUsed ? { 'X-Unison-AI-Provider': providerResult.providerUsed } : {}),
      },
    },
  );
}

async function runBuilderLane(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
  userId?: string,
  signal?: AbortSignal,
): Promise<Response> {
  console.log(`[orchestrator] LANE B: ${task.type} (sub-behavior: ${
    task.type === 'debug_fix' ? 'builder_debug' :
    task.type === 'wizard_seed_generation' ? 'wizard_seed_generation' :
    ['surgical_edit', 'behavioral_edit', 'single_file_edit', 'multi_file_edit', 'template_react_edit'].includes(task.type) ? 'builder_edit' :
    'builder_generate'
  })`);

  // Only funded providers count toward the full model plan. Gemini-only is the
  // safe default until AI_PROVIDER_MODE is explicitly switched to "hybrid".
  const geminiExclusive = isGeminiExclusiveProviderMode();
  const hasConfiguredProvider = Boolean(
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('GOOGLE_API_KEY') ||
    Deno.env.get('UNISONGEMINI_API_KEY') ||
    (!geminiExclusive && (Deno.env.get('OPENAI_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY')))
  );
  const {
    messages, mode, savePattern = true, generateImage = false, imagePlacement,
    currentCode, editMode = false, debugMode: _debugMode = false,
    templateAction, systemType, variationSeed, templateName, aesthetic, source,
    userDesignProfile, systemsBuildContext, navPageGen = false, navPageName, navLabel,
    siteElementsLibraryContext, surgicalEdit = false,
    componentBehaviorContext, vfsFiles, gatewayOptions,
    previewDiagnostics, previewSnapshot, recentChangedFiles,
  } = parsed;
  const editScope = (parsed as { editScope?: import("./reviewScope.ts").EditScopeInput }).editScope;
  const wizardSeed = (parsed as { wizardSeed?: WizardSeedShape }).wizardSeed;

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

  // ── 2. Learned patterns (skip only for fast tasks) ─────────────────────
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

  // ── 3a. User DB context (history + drafts) ─────────────────────────────
  const userDBCtx = userId && !task.fastPath
    ? await fetchUserContext(userId).catch(() => null)
    : null;
  const userDBContextBlock = buildUserDBContext(userDBCtx);

  // ── 4. Base system prompt ──────────────────────────────────────────────
  let basePrompt: string;
  if (task.type === 'wizard_seed_generation') {
    basePrompt = buildWizardSeedBasePrompt();
  } else if (task.type === 'wizard_interaction_enrichment') {
    basePrompt = buildWizardInteractionBasePrompt();
  } else if (mode === 'template-json' || mode === 'template-html' || mode === 'template-react') {
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

  const imagePromise = generateImageIfNeeded({
    userPrompt: userPromptText.toLowerCase(),
    generateImage,
    imagePlacement: imagePlacement ?? undefined,
    fastTemplateReact: false,
  });

  const [research, industryPageContext, imageResult] = await Promise.all([
    researchPromise, navResearchPromise, imagePromise,
  ]);

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
  const thinkingInstruction = task.type === 'wizard_seed_generation' || task.type === 'wizard_interaction_enrichment'
    ? ''
    : buildThinkingInstruction(task.skipThinking);
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
  const compactedFilesBlock = task.type === 'wizard_seed_generation'
    ? ''
    : (surgicalEdit ? '' : builderContext.compactedFiles);

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
      // general_code_assist, nav_page_generation, template_json/html, wizard_seed_generation
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

  if (task.type === 'wizard_seed_generation') {
    finalSystemPrompt += `\n\n[WIZARD SEED GENERATION — HARD OUTPUT REQUIREMENTS]\nThis is a first-launch website generation, not an explanation and not a patch review.\nReturn ONLY raw JSON in this exact shape: {"files": {"/src/pages/Home.tsx": "..."}}.\nDo NOT return prose, markdown, summaries, skeletons, placeholders, or a minimal fallback.\nDo NOT author /src/App.tsx, /src/main.tsx, package/config files, root files, SiteNavbar, or SiteFooter.\nThe deterministic App router renders route-registry-derived shared chrome exactly once around every page. Emit body-only page files and never import or render shared chrome inside them.\nThe Home page must be a complete production landing page with at least 5 semantic sections, real industry-specific copy, and working data-ut-intent attributes.\n`;
  }

  if (task.type === 'wizard_interaction_enrichment') {
    finalSystemPrompt += '\n\n[WIZARD INTERACTION ENRICHMENT — PLAN ONLY]\nReturn the interaction JSON object only. The client compiler owns all implementation and will reject any unsupported value.';
  }

  // Inject parsed intent summary into system prompt for better understanding
  if (preprocessed.intentSummary) {
    finalSystemPrompt += preprocessed.intentSummary;
  }

  // Milestone 2: goal-aware generation. The interpreter envelope is authoritative
  // for WHAT must be built, not just how the request was routed.
  const envelopeDirective = buildEnvelopeDirective(
    (parsed as { requestEnvelope?: EnvelopeShape }).requestEnvelope,
  );
  if (envelopeDirective) {
    finalSystemPrompt += envelopeDirective;
    const env = (parsed as { requestEnvelope?: EnvelopeShape }).requestEnvelope;
    console.log('[orchestrator] envelope directive injected', {
      kinds: env?.requestKinds ?? [],
      domains: env?.domains ?? [],
      goals: (env?.goals ?? []).length,
      scope: env?.scope?.level,
    });
  }

  const unisonDirective = buildUnisonContextDirective(parsed.unisonContext);
  if (unisonDirective) {
    finalSystemPrompt += unisonDirective;
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

  // Inject Wizard Launch seed (multi-page contract, theme tokens, intents).
  // When present, this turn is the visitor's first generation after completing
  // the System Launcher — same brain as the AIBuilderPanel, seeded with the
  // 4 wizard selections.
  if (wizardSeed) {
    const seedBlock = buildWizardSeedContext(wizardSeed);
    if (seedBlock) {
      finalSystemPrompt += `\n\n${seedBlock}`;
      console.log('[orchestrator] wizard-seed context injected', {
        pages: (wizardSeed.canonical?.pages || []).length,
        capabilities: (wizardSeed.canonical?.capabilities || []).length,
        intents: (wizardSeed.canonical?.intents || []).length,
        hasBindingGuide: !!wizardSeed.bindingGuide,
      });
    }
  }

  const aiMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...processedMessages,
  ];

  // ── 8. Call AI providers (complexity-aware model selection) ─────────────
  const effectiveComplexity = resolveUnisonComplexity(
    preprocessed.complexity.tier,
    parsed.unisonContext,
  );
  const effectiveReasoningEffort = resolveReasoningEffort(
    gatewayOptions?.reasoningEffort,
    effectiveComplexity,
  );
  console.log(`[orchestrator] Prompt complexity: ${effectiveComplexity} (server=${preprocessed.complexity.tier}, score=${preprocessed.complexity.score}, unison=${parsed.unisonContext?.estimatedComplexity ?? 'n/a'}, factors=[${preprocessed.complexity.factors.join(',')}])`);
  const providerRoutingKey = `${userId || 'anonymous'}:${userPromptText}`;
  const providerPlan = buildProviderPlan(
    task,
    hasConfiguredProvider,
    gatewayOptions,
    effectiveComplexity,
    providerRoutingKey,
  );
  console.log(`[orchestrator] provider primary=${providerPlan.primaryProvider || 'unavailable'} models=${providerPlan.gatewayModels.map((model) => model.id).join(',')}`);
  const enableCatalogTools = BUILDER_EDIT_TASKS.has(task.type);
  if (enableCatalogTools) {
    finalSystemPrompt += renderCatalogToolDirective();
  }
  const aiMessagesForCall = enableCatalogTools
    ? [{ role: 'system', content: finalSystemPrompt }, ...processedMessages]
    : aiMessages;
  const providerResult = await runProviderLoop({
    aiMessages: aiMessagesForCall,
    providerPlan,
    navPageGen,
    reasoningEffort: effectiveReasoningEffort,
    allowDirectFallbacks: true,
    tools: enableCatalogTools ? CATALOG_CHAT_TOOLS : undefined,
    toolChoice: enableCatalogTools ? 'auto' : undefined,
    signal,
  });

  if (providerResult.earlyError) {
    return new Response(
      JSON.stringify({ error: providerResult.earlyError.error }),
      {
        status: providerResult.earlyError.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(providerResult.earlyError.status === 429 ? { 'Retry-After': '1' } : {}),
        },
      }
    );
  }

  // ── 9. Post-process + review pass + envelope verification + response ─────
  let content = postProcessContent(providerResult.content);

  const requestEnvelope = (parsed as { requestEnvelope?: EnvelopeShape }).requestEnvelope;
  const existingFiles = vfsFiles ? Object.keys(vfsFiles) : [];

  type ReviewOutcome = {
    reviewResult: ReturnType<typeof reviewPatch>;
    files: Record<string, string>;
    targetFile: string | null;
  };

  const runReviewPass = (raw: string): ReviewOutcome | undefined => {
    try {
      const jsonStr = raw.trim().replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      const payload = JSON.parse(jsonStr);
      if (!payload.files || typeof payload.files !== "object") return undefined;

      const reviewResult = reviewPatch({
        files: payload.files,
        existingFiles,
        taskType: task.type,
        goalCategory: memory?.goalCategory,
      });
      console.log(
        `[orchestrator] Review: ${reviewResult.approved ? 'APPROVED' : 'FLAGGED'}, ${reviewResult.warnings.length} warnings, ${reviewResult.removedFiles.length} blocked`,
      );

      // ── Scope enforcement for scoped edits ──────────────────────────
      const scopeResult = checkEditScope({
        patchFiles: reviewResult.cleanedFiles,
        targetFile: payload.targetFile ?? editScope?.componentPath ?? null,
        taskType: task.type,
        existingFiles,
        editScope: editScope ?? null,
        originalFiles: vfsFiles ?? {},
      });
      if (!scopeResult.inScope) {
        console.warn(`[orchestrator] SCOPE VIOLATION: ${scopeResult.reason}`);
        reviewResult.warnings.push({ severity: "error", message: `Scope violation: ${scopeResult.reason}` });
        reviewResult.requiresApproval = true;
      }
      if (scopeResult.blockAutoApply) {
        reviewResult.requiresApproval = true;
      }

      return {
        reviewResult,
        files: reviewResult.cleanedFiles as Record<string, string>,
        targetFile: payload.targetFile ?? null,
      };
    } catch {
      // Not JSON multi-file output — skip review
      return undefined;
    }
  };

  let repairAttempted = false;
  let repairAccepted = false;
  let outcome = runReviewPass(content);

  // A provider can occasionally follow the visual brief but ignore the
  // WizardSeed transport contract and emit one raw TSX/HTML document. The
  // generic envelope repair below only runs after JSON parsing succeeds, so
  // repair this specific contract miss before verification.
  if (task.type === 'wizard_seed_generation' && !outcome && content.trim()) {
    repairAttempted = true;
    console.warn('[orchestrator] wizard output was not multi-file JSON — running contract repair');
    try {
      const contractRepairResult = await runProviderLoop({
        aiMessages: [
          ...aiMessagesForCall,
          { role: 'assistant', content },
          {
            role: 'user',
            content: [
              'Your previous response violated the WizardSeed output contract.',
              'Convert it into the complete required multi-page payload now.',
              'Return ONLY raw JSON shaped as {"files":{"/src/pages/Home.tsx":"..."}}.',
              'Include one body-only TSX file for every canonical WizardSeed page.',
              'Do not return markdown, prose, HTML documents, /src/App.tsx, SiteNavbar, or SiteFooter.',
            ].join('\n'),
          },
        ],
        providerPlan,
        navPageGen,
        reasoningEffort: effectiveReasoningEffort,
        allowDirectFallbacks: true,
        signal,
      });
      if (!contractRepairResult.earlyError && contractRepairResult.content) {
        const repairedContent = postProcessContent(contractRepairResult.content);
        const repairedOutcome = runReviewPass(repairedContent);
        if (repairedOutcome && Object.keys(repairedOutcome.files).length > 0) {
          content = repairedContent;
          outcome = repairedOutcome;
          repairAccepted = true;
          console.log('[orchestrator] wizard contract repair accepted', {
            files: Object.keys(repairedOutcome.files).length,
          });
        }
      }
    } catch (error) {
      console.warn('[orchestrator] wizard contract repair failed:', error);
    }
  }

  let verification = verifyAgainstEnvelope({
    envelope: requestEnvelope,
    files: outcome?.files ?? {},
    existingFiles,
  });

  // ── Milestone 3: one targeted repair turn keyed to unmet goals ───────────
  if (outcome && verification.checked && !verification.passed) {
    repairAttempted = true;
    const allowedTargets = Array.isArray(requestEnvelope?.scope?.targets)
      ? (requestEnvelope!.scope!.targets as string[]).filter((t) => typeof t === 'string')
      : [];
    console.warn('[orchestrator] envelope verification failed — running targeted repair', {
      unmet: verification.unmetCriteria.length,
      outOfScope: verification.outOfScopeFiles.length,
    });

    try {
      const repairResult = await runProviderLoop({
        aiMessages: [
          ...aiMessagesForCall,
          { role: 'assistant', content: JSON.stringify({ files: outcome.files }) },
          { role: 'user', content: buildRepairInstruction(verification, allowedTargets) },
        ],
        providerPlan,
        navPageGen,
        reasoningEffort: effectiveReasoningEffort,
        allowDirectFallbacks: true,
        signal,
      });

      if (!repairResult.earlyError && repairResult.content) {
        const repairedContent = postProcessContent(repairResult.content);
        const repairedOutcome = runReviewPass(repairedContent);
        if (repairedOutcome) {
          const repairedVerification = verifyAgainstEnvelope({
            envelope: requestEnvelope,
            files: repairedOutcome.files,
            existingFiles,
          });
          // Only accept the repair when it is strictly better.
          const before = verification.unmetCriteria.length + verification.outOfScopeFiles.length;
          const after = repairedVerification.unmetCriteria.length + repairedVerification.outOfScopeFiles.length;
          if (after < before) {
            content = repairedContent;
            outcome = repairedOutcome;
            verification = repairedVerification;
            repairAccepted = true;
            console.log('[orchestrator] targeted repair accepted', { before, after });
          } else {
            console.log('[orchestrator] targeted repair rejected (no improvement)', { before, after });
          }
        }
      }
    } catch (e) {
      console.warn('[orchestrator] targeted repair failed:', e);
    }
  }

  const reviewResult = outcome?.reviewResult;

  if (reviewResult && verification.checked && !verification.passed) {
    if (verification.outOfScopeFiles.length > 0) {
      reviewResult.warnings.push({
        severity: "error",
        message: `Out of declared scope: ${verification.outOfScopeFiles.join(', ')}`,
      });
    }
    for (const miss of verification.unmetCriteria.slice(0, 8)) {
      reviewResult.warnings.push({ severity: "warning", message: `Unmet goal: ${miss}` });
    }
    // `must`-priority misses and scope violations can never auto-apply.
    if (verification.blockingMisses.length > 0 || verification.outOfScopeFiles.length > 0) {
      reviewResult.requiresApproval = true;
    }
  }

  const applyState: ApplyState | undefined = reviewResult
    ? buildApplyState({
        actionType: reviewResult.removedFiles.length > 0 ? 'multi_patch' : 'patch',
        touchedFiles: Object.keys(reviewResult.cleanedFiles),
        applyStatus: 'proposed',
        requiredApproval: reviewResult.requiresApproval,
        reviewWarnings: reviewResult.warnings.map(w => w.message),
      })
    : undefined;

  if (verification.checked) {
    console.log('[orchestrator] envelope verification', {
      passed: verification.passed,
      summary: verification.summary,
      blocking: verification.blockingMisses.length,
    });
  }

  if (savePattern) saveLearningSession(parsed, content, userId);

  // ── Milestone 4: durable envelope + verdict log (learning / replay) ───────
  const envelopeRunId = await recordEnvelopeRun({
    userId,
    runContext: (parsed as { runContext?: EnvelopeRunContext }).runContext ?? null,
    envelope: requestEnvelope as Record<string, unknown> | undefined,
    verification: {
      checked: verification.checked,
      passed: verification.passed,
      summary: verification.summary,
      unmetCriteria: verification.unmetCriteria,
      outOfScopeFiles: verification.outOfScopeFiles,
      blockingMisses: verification.blockingMisses,
    },
    repairAttempted,
    repairAccepted,
    touchedFiles: reviewResult ? Object.keys(reviewResult.cleanedFiles) : Object.keys(outcome?.files ?? {}),
    modelUsed: providerResult.modelUsed,
    providerUsed: providerResult.providerUsed,
    mode: mode ?? null,
  });

  const responseBody = buildResponseBody({
    content: reviewResult ? JSON.stringify({ files: reviewResult.cleanedFiles }) : content,
    reasoning: providerResult.reasoning,
    generatedImageUrl: imageResult.generatedImageUrl,
    imagePlacement: imagePlacement ?? undefined,
    debugMode: _debugMode,
    mode: mode ?? undefined,
    modelUsed: providerResult.modelUsed,
    providerUsed: providerResult.providerUsed,
    reviewWarnings: reviewResult?.warnings,
    requiresApproval: reviewResult?.requiresApproval,
    removedFiles: reviewResult?.removedFiles,
    reviewSummary: reviewResult?.reviewSummary,
    applyState: applyState as Record<string, unknown> | undefined,
    toolCalls: providerResult.toolCalls as unknown[] | undefined,
    envelopeVerification: verification.checked
      ? {
          passed: verification.passed,
          summary: verification.summary,
          unmetCriteria: verification.unmetCriteria,
          outOfScopeFiles: verification.outOfScopeFiles,
          blockingMisses: verification.blockingMisses,
        }
      : undefined,
  });

  if (envelopeRunId) {
    (responseBody as Record<string, unknown>).envelopeRunId = envelopeRunId;
  }

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(providerResult.providerUsed ? { 'X-Unison-AI-Provider': providerResult.providerUsed } : {}),
      },
    },
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
