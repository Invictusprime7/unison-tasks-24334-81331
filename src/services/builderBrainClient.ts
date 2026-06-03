/**
 * builderBrainClient — Headless client for the shared "builder brain"
 * (the `ai-code-assistant` edge function / Lane B).
 *
 * Both the Wizard launch path (SystemLauncher) and the in-Builder
 * AIBuilderPanel call into this single client so they share:
 *   - the same edge entry point
 *   - the same memory / research / VFS context behavior (Lane B)
 *   - the same transactional patch lifecycle
 *
 * This file is intentionally thin: it does NOT compose prompts, parse
 * responses, or apply patches. Those concerns stay in the callers
 * (AIBuilderPanel for the builder, compileWizardSeed/SystemLauncher for
 * the wizard) until a later refactor splits AIBuilderPanel further.
 *
 *   Wizard UI ─┐
 *              ├─→ builderBrainClient ─→ ai-code-assistant ─→ runBuilderLane
 *   AIBuilderPanel UI ─┘
 */

import { supabase } from "@/integrations/supabase/client";
export type BuilderTurnResponse<T = unknown> = { data: T | null; error: unknown };

/**
 * Loose body shape — mirrors the edge function's `AIRequestSchema`.
 * Kept open so callers don't have to import the Zod schema from
 * supabase/functions (Deno-only) and so we can add fields without
 * touching every call site. The edge function validates strictly.
 */
export interface BuilderTurnInput {
  messages: Array<{ role: "user" | "assistant" | "system"; content: unknown }>;
  mode?: string;
  currentCode?: string;
  editMode?: boolean;
  debugMode?: boolean;
  templateAction?: string;
  templateName?: string | null;
  systemType?: string | null;
  aesthetic?: string | null;
  source?: string | null;
  variationSeed?: string | null;
  surgicalEdit?: boolean;
  behavioralEdit?: boolean;
  navPageGen?: boolean;
  navPageName?: string | null;
  navLabel?: string | null;
  targetFile?: string;
  componentBehaviorContext?: string;
  previewDiagnostics?: string;
  previewSnapshot?: string;
  recentChangedFiles?: string[];
  vfsFiles?: Record<string, string>;
  systemsBuildContext?: Record<string, unknown>;
  siteElementsLibraryContext?: string;
  launchBrief?: Record<string, unknown>;
  userDesignProfile?: Record<string, unknown>;
  attachments?: unknown[];
  gatewayOptions?: Record<string, unknown>;
  /** Structured wizard-launch seed; presence routes to Lane B. */
  wizardSeed?: Record<string, unknown>;
  [extra: string]: unknown;
}

export interface BuilderTurnOptions {
  /** Abort the in-flight invoke. */
  signal?: AbortSignal;
}

/**
 * Invoke the shared builder brain. Returns the raw Supabase functions
 * response so callers can keep their existing error-handling / parsing
 * logic unchanged during incremental migration.
 */
export async function runBuilderTurn<TResponse = unknown>(
  input: BuilderTurnInput,
  _options: BuilderTurnOptions = {},
): Promise<BuilderTurnResponse<TResponse>> {
  const { data, error } = await supabase.functions.invoke<TResponse>("ai-code-assistant", {
    body: input as unknown as Record<string, unknown>,
  });
  return { data: (data ?? null) as TResponse | null, error };
}

export default runBuilderTurn;
