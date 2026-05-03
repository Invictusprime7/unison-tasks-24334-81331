/**
 * GHL Wire Fast-Path
 *
 * Deterministic NL parser for "wire this <element> to <workflow>" prompts.
 * Mirrors the layout-intent fast path: high-confidence matches skip the
 * LLM round-trip and write directly to site_intent_bindings.
 */

export interface ParsedGhlWireIntent {
  /** Optional explicit element label/section parsed from the prompt. */
  elementHint: string | null;
  /** Workflow id (uuid) or human name. */
  workflowRef: string;
  /** True if workflowRef looks like a UUID. */
  isWorkflowId: boolean;
  /** Confidence 0..1 — caller applies threshold. */
  confidence: number;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const WIRE_VERBS = ['wire', 'connect', 'hook up', 'bind', 'link', 'attach'];
const TARGET_KEYWORDS = ['workflow', 'automation', 'ghl workflow', 'ghl automation'];

export function parseGhlWireIntent(prompt: string): ParsedGhlWireIntent | null {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return null;

  const hasVerb = WIRE_VERBS.some((v) => normalized.includes(v));
  const hasTarget = TARGET_KEYWORDS.some((t) => normalized.includes(t));
  if (!hasVerb || !hasTarget) return null;

  // Workflow ref: prefer UUID, else quoted name, else trailing "workflow X"
  const uuidMatch = prompt.match(UUID_RE);
  let workflowRef = uuidMatch?.[0] ?? '';
  let isWorkflowId = Boolean(workflowRef);

  if (!workflowRef) {
    const quoted = prompt.match(/["“']([^"”']{2,80})["”']/);
    if (quoted) workflowRef = quoted[1];
  }
  if (!workflowRef) {
    const tail = prompt.match(/(?:workflow|automation)\s+([A-Za-z0-9 _\-]{2,60})/i);
    if (tail) workflowRef = tail[1].trim();
  }

  if (!workflowRef) return null;

  // Element hint: "this X", "the X button|cta|form"
  let elementHint: string | null = null;
  const elemMatch = prompt.match(/(?:this|the)\s+([a-z][a-z0-9 _-]{1,40}?)\s+(?:to|with|->)/i);
  if (elemMatch) elementHint = elemMatch[1].trim();

  const confidence = isWorkflowId ? 0.95 : elementHint ? 0.8 : 0.65;
  return { elementHint, workflowRef, isWorkflowId, confidence };
}
