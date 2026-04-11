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
import { buildApplyState, formatApplyStateBlock, type ApplyState } from "./applyState.ts";

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

// ── Main Orchestrator Entry ─────────────────────────────────────────────────

export async function runAssistantOrchestrator(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (task.type === "wizard_template_react") {
    return runWizardLane(parsed, task, corsHeaders);
  }
  return runBuilderLane(parsed, task, corsHeaders);
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

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const { messages, systemsBuildContext, templateName, source, imagePlacement } = parsed;

  // Fast path system prompt — no research, no memory, no patterns
  const finalSystemPrompt = buildFastPathSystemPrompt({
    systemsBuildContext: systemsBuildContext as Record<string, any>,
    templateName: templateName ?? undefined,
    source: source ?? undefined,
  });

  const processedMessages = compactMessages(messages);
  const aiMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...processedMessages,
  ];

  // Provider plan — protected, no user overrides
  const providerPlan = buildProviderPlan(task, Boolean(LOVABLE_API_KEY));
  const providerResult = await runProviderLoop({
    aiMessages,
    providerPlan,
    navPageGen: false,
    lovableApiKey: LOVABLE_API_KEY ?? undefined,
  });

  if (providerResult.earlyResponse) return providerResult.earlyResponse;

  const content = postProcessContent(providerResult.content);

  // Fire-and-forget learning session
  saveLearningSession(parsed, content);

  const responseBody = buildResponseBody({
    content,
    reasoning: providerResult.reasoning,
    generatedImageUrl: '',
    imagePlacement: imagePlacement ?? undefined,
    mode: 'template-react',
    modelUsed: providerResult.modelUsed,
  });

  return new Response(
    JSON.stringify(responseBody),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// LANE B — Builder Orchestration (memory, compaction, research, rich response)
// ============================================================================

async function runBuilderLane(
  parsed: AIRequest,
  task: ClassifiedTask,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  console.log(`[orchestrator] LANE B: ${task.type} (sub-behavior: ${
    task.type === 'debug_fix' ? 'builder_debug' :
    ['surgical_edit', 'behavioral_edit', 'single_file_edit', 'multi_file_edit', 'template_react_edit'].includes(task.type) ? 'builder_edit' :
    'builder_generate'
  })`);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const {
    messages, mode, savePattern = true, generateImage = false, imagePlacement,
    currentCode, editMode = false, debugMode: _debugMode = false,
    templateAction, systemType, variationSeed, templateName, aesthetic, source,
    userDesignProfile, systemsBuildContext, navPageGen = false, navPageName, navLabel,
    siteElementsLibraryContext, surgicalEdit = false, behavioralEdit = false,
    componentBehaviorContext, vfsFiles, gatewayOptions,
    previewDiagnostics, recentChangedFiles,
  } = parsed;

  // ── 1. Session memory (Lane B only) ────────────────────────────────────
  const userPromptText = extractTextContent(messages[messages.length - 1]?.content);
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
    ? Promise.resolve({ snippets: [], trends: [], keyPhrases: [] } as ResearchResult)
    : performPromptResearch(userPromptText);

  const navResearchPromise: Promise<string> = (navPageGen && systemType)
    ? runNavResearch(systemType, navPageName ?? undefined, navLabel ?? undefined)
    : Promise.resolve('');

  const imagePromise = generateImageIfNeeded({
    userPrompt: userPromptText.toLowerCase(),
    generateImage,
    imagePlacement: imagePlacement ?? undefined,
    fastTemplateReact: false,
    lovableApiKey: LOVABLE_API_KEY ?? undefined,
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
  const thinkingInstruction = buildThinkingInstruction(task.skipThinking);
  const elementsLibraryBlock = buildElementsLibraryBlock(siteElementsLibraryContext, surgicalEdit);

  // For surgical edits, use old-style VFS context (byte-for-byte preservation)
  const vfsFilesContext = buildVfsFilesContext(surgicalEdit, vfsFiles);
  const surgicalEditReinforcement = buildSurgicalEditReinforcement(surgicalEdit, vfsFilesContext);

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

  const aiMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...processedMessages,
  ];

  // ── 8. Call AI providers ───────────────────────────────────────────────
  const providerPlan = buildProviderPlan(task, Boolean(LOVABLE_API_KEY), gatewayOptions);
  const providerResult = await runProviderLoop({
    aiMessages,
    providerPlan,
    navPageGen,
    lovableApiKey: LOVABLE_API_KEY ?? undefined,
    reasoningEffort: gatewayOptions?.reasoningEffort,
  });

  if (providerResult.earlyResponse) return providerResult.earlyResponse;

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

  if (savePattern) saveLearningSession(parsed, content);

  const responseBody = buildResponseBody({
    content: reviewResult ? JSON.stringify({ files: reviewResult.cleanedFiles }) : content,
    reasoning: providerResult.reasoning,
    generatedImageUrl: imageResult.generatedImageUrl,
    imagePlacement: imagePlacement ?? undefined,
    debugMode: _debugMode,
    mode: mode ?? undefined,
    modelUsed: providerResult.modelUsed,
    reviewWarnings: reviewResult?.warnings,
    requiresApproval: reviewResult?.requiresApproval,
    removedFiles: reviewResult?.removedFiles,
    reviewSummary: reviewResult?.reviewSummary,
    applyState,
  });

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

function saveLearningSession(parsed: AIRequest, content: string): void {
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
