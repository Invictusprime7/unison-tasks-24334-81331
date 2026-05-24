// supabase/functions/ai-code-assistant/taskClassifier.ts
// Classifies incoming requests into task types for routing and optimization.

export type AssistantTaskType =
  | "wizard_template_react"
  | "nav_page_generation"
  | "template_json_generation"
  | "template_html_generation"
  | "template_react_edit"
  | "surgical_edit"
  | "behavioral_edit"
  | "multi_file_edit"
  | "single_file_edit"
  | "debug_fix"
  | "general_code_assist"
  | "launch_desk";

export interface ClassifiedTask {
  type: AssistantTaskType;
  /** True for wizard launches and nav-page gen — skips research, thinking, memory */
  fastPath: boolean;
  /** Whether to inject session memory context */
  shouldUseMemory: boolean;
  /** Whether to compact VFS / conversation context */
  shouldUseCompactContext: boolean;
  /** Whether to prefer JSON output format */
  prefersJsonOutput: boolean;
  /** Whether to skip web research */
  skipResearch: boolean;
  /** Whether to skip thinking tags */
  skipThinking: boolean;
}

/**
 * Classify an AI assistant request based on mode flags.
 * This is the extracted version of the inline detection logic from index.ts.
 */
export function classifyTask(opts: {
  mode?: string;
  systemsBuildContext?: unknown;
  currentCode?: string;
  editMode: boolean;
  templateAction?: string;
  navPageGen: boolean;
  surgicalEdit: boolean;
  behavioralEdit: boolean;
  debugMode: boolean;
  vfsFiles?: Record<string, string>;
  launchBrief?: unknown;
  wizardLaunch?: boolean;
}): ClassifiedTask {
  const {
    mode,
    systemsBuildContext,
    currentCode,
    editMode,
    templateAction,
    navPageGen,
    surgicalEdit,
    behavioralEdit,
    debugMode,
    vfsFiles,
    launchBrief,
    wizardLaunch,
  } = opts;

  // ── Wizard fast path (HARD-LOCKED) ────────────────────────────────────
  // The wizardLaunch flag, set by the Launcher overlay, ALWAYS forces Lane A.
  // No other field (currentCode, editMode, templateAction, …) can override
  // this. This guarantees the hardened 6-card aesthetic payload is the sole
  // generation context for wizard launches.
  if (wizardLaunch) {
    return {
      type: "wizard_template_react",
      fastPath: true,
      shouldUseMemory: false,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: true,
    };
  }

  // ── Launch Desk ───────────────────────────────────────────────────────
  if (mode === "launch-desk" || Boolean(launchBrief)) {
    return {
      type: "launch_desk",
      fastPath: false,
      shouldUseMemory: false,
      shouldUseCompactContext: false,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: false,
    };
  }

  const fastTemplateReact =
    mode === "template-react" &&
    Boolean(systemsBuildContext) &&
    !currentCode &&
    !editMode &&
    !templateAction;

  if (fastTemplateReact) {
    return {
      type: "wizard_template_react",
      fastPath: true,
      shouldUseMemory: false,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: true,
    };
  }

  // ── Nav page generation ───────────────────────────────────────────────
  if (navPageGen) {
    return {
      type: "nav_page_generation",
      fastPath: true,
      shouldUseMemory: false,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: false, // nav pages do targeted industry research
      skipThinking: true,
    };
  }

  // ── Template generation modes ─────────────────────────────────────────
  if (mode === "template-json") {
    return {
      type: "template_json_generation",
      fastPath: false,
      shouldUseMemory: false,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: false,
      skipThinking: false,
    };
  }

  if (mode === "template-html") {
    return {
      type: "template_html_generation",
      fastPath: false,
      shouldUseMemory: false,
      shouldUseCompactContext: true,
      prefersJsonOutput: false,
      skipResearch: false,
      skipThinking: false,
    };
  }

  if (mode === "template-react" && !fastTemplateReact) {
    return {
      type: "template_react_edit",
      fastPath: false,
      shouldUseMemory: true,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: false,
      skipThinking: false,
    };
  }

  // ── Surgical edit ─────────────────────────────────────────────────────
  if (surgicalEdit) {
    return {
      type: "surgical_edit",
      fastPath: false,
      shouldUseMemory: true,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: false,
    };
  }

  // ── Behavioral edit (functional changes: hooks, state, handlers) ──────
  if (behavioralEdit) {
    return {
      type: "behavioral_edit",
      fastPath: false,
      shouldUseMemory: true,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: false,
    };
  }

  // ── Debug mode ────────────────────────────────────────────────────────
  if (debugMode) {
    return {
      type: "debug_fix",
      fastPath: false,
      shouldUseMemory: true,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: false,
    };
  }

  // ── Multi-file edit ───────────────────────────────────────────────────
  if (editMode && vfsFiles && Object.keys(vfsFiles).length > 1) {
    return {
      type: "multi_file_edit",
      fastPath: false,
      shouldUseMemory: true,
      shouldUseCompactContext: true,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: false,
    };
  }

  // ── Single file edit ──────────────────────────────────────────────────
  if (editMode) {
    return {
      type: "single_file_edit",
      fastPath: false,
      shouldUseMemory: true,
      shouldUseCompactContext: false,
      prefersJsonOutput: true,
      skipResearch: true,
      skipThinking: false,
    };
  }

  // ── General code assist (default) ─────────────────────────────────────
  return {
    type: "general_code_assist",
    fastPath: false,
    shouldUseMemory: true,
    shouldUseCompactContext: true,
    prefersJsonOutput: false,
    skipResearch: false,
    skipThinking: false,
  };
}
