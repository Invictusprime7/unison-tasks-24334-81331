/**
 * AI Binding Tool — Structured surface the AI uses to bind a slotted
 * element to a CoreIntent (and optional navigation target) WITHOUT touching
 * TSX source.
 *
 * Why this exists
 * ----------------
 * Free-form AI edits to button JSX are the #1 source of preview syntax errors
 * in the Web Builder. Bindings are *data*, not code: slot ↔ intent ↔ target
 * is resolved at runtime by `RuntimeProvider` from `site_intent_bindings`.
 *
 * Contract
 * --------
 * - `intent` MUST be a value of {@link CoreIntent}. Unknown intents are rejected.
 * - `targetPageId` (when present) MUST resolve in the supplied PageRegistry.
 * - `slot` is the stable `data-ut-slot` identity already present in the
 *   rendered TSX. Labels are presentation-only — never used for resolution.
 *
 * The tool returns a discriminated result so the AI assistant can surface a
 * deterministic error in the next turn instead of looping on broken patches.
 */

import { isCoreIntent, isNavIntent, type CoreIntent } from '@/coreIntents';
import { upsertIntentBinding, type IntentBinding } from '@/services/intentBindingService';
import type { PageRegistry } from '@/types/pageRegistry';

export interface ApplyButtonBindingInput {
  businessId: string;
  projectId: string;
  /** Page path the element lives on, e.g. "/" or "/pricing" */
  pagePath: string;
  /** Stable slot id from `data-ut-slot` (e.g. "hero.primary-cta") */
  slot: string;
  /** Human-readable label, optional — for diagnostics only */
  elementLabel?: string;
  /** CoreIntent enum value (validated) */
  intent: string;
  /** Required when intent === 'nav.goto' */
  targetPageId?: string;
  /** Optional payload merged into payloadSchema */
  params?: Record<string, unknown>;
}

export type ApplyButtonBindingResult =
  | { ok: true; binding: IntentBinding }
  | {
      ok: false;
      code:
        | 'invalid_intent'
        | 'missing_target_page'
        | 'unknown_target_page'
        | 'slot_not_found'
        | 'persist_failed';
      message: string;
    };

export interface ApplyButtonBindingDeps {
  pageRegistry: PageRegistry;
  /**
   * Optional slot existence check. If omitted, slot is trusted.
   * Pass a function that returns true when the slot exists in the current
   * SiteBundleSnapshot for the page.
   */
  slotExists?: (pagePath: string, slot: string) => boolean;
}

/**
 * Validate + persist a slot→intent binding. The runtime picks up the new
 * binding on its next `lookupIntentBinding` (30s cache) or after an explicit
 * `clearBindingCache()`. No TSX is mutated.
 */
export async function applyButtonBinding(
  input: ApplyButtonBindingInput,
  deps: ApplyButtonBindingDeps,
): Promise<ApplyButtonBindingResult> {
  // 1. Intent enum validation — fails fast, no DB round-trip.
  if (!isCoreIntent(input.intent)) {
    return {
      ok: false,
      code: 'invalid_intent',
      message: `Intent "${input.intent}" is not a CoreIntent. See src/coreIntents.ts.`,
    };
  }
  const intent = input.intent as CoreIntent;

  // 2. Nav targets must resolve against PageRegistry.
  if (isNavIntent(intent) && intent === 'nav.goto') {
    if (!input.targetPageId) {
      return {
        ok: false,
        code: 'missing_target_page',
        message: 'nav.goto requires targetPageId.',
      };
    }
    if (!deps.pageRegistry.pages[input.targetPageId]) {
      return {
        ok: false,
        code: 'unknown_target_page',
        message: `targetPageId "${input.targetPageId}" not found in PageRegistry.`,
      };
    }
  }

  // 3. Slot existence (best-effort — caller decides authority).
  if (deps.slotExists && !deps.slotExists(input.pagePath, input.slot)) {
    return {
      ok: false,
      code: 'slot_not_found',
      message: `Slot "${input.slot}" not found on page "${input.pagePath}".`,
    };
  }

  // 4. Persist via the existing service. payloadSchema carries the resolved
  //    targetPageId so the runtime navigator can use it without re-querying.
  const payloadSchema: Record<string, unknown> = { ...(input.params ?? {}) };
  if (input.targetPageId) payloadSchema.targetPageId = input.targetPageId;

  const binding = await upsertIntentBinding({
    businessId: input.businessId,
    projectId: input.projectId,
    pagePath: input.pagePath,
    elementKey: input.slot,
    elementLabel: input.elementLabel ?? null,
    intent,
    payloadSchema,
    enabled: true,
  });

  if (!binding) {
    return {
      ok: false,
      code: 'persist_failed',
      message: 'Binding upsert returned null — see console for upstream error.',
    };
  }
  return { ok: true, binding };
}

// ============================================================================
// Patch-engine guard — block AI patches that mutate interactive attributes
// on slot-bearing elements. Forces the AI back through applyButtonBinding.
// ============================================================================

const SLOT_ATTR_RE = /data-ut-slot=["']([^"']+)["']/g;

/**
 * Extract `data-ut-slot` values from a file's content. Cheap regex sweep —
 * the patch engine only needs a set comparison.
 */
/**
 * Extract `data-ut-slot` values mapped to the JSX opening tag that contains
 * them. Tag-scoped extraction is stable under unrelated edits elsewhere in
 * the file (adding a new slot won't shift the window of existing slots).
 */
function extractSlotElements(content: string): Map<string, string> {
  const slots = new Map<string, string>();
  if (!content) return slots;
  const re = new RegExp(SLOT_ATTR_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const slot = m[1];
    // Walk back to the nearest '<' (start of opening tag).
    let start = m.index;
    while (start > 0 && content[start] !== '<') start--;
    // Walk forward to the matching '>' that closes the opening tag.
    let end = m.index;
    while (end < content.length && content[end] !== '>') end++;
    slots.set(slot, content.slice(start, Math.min(content.length, end + 1)));
  }
  return slots;
}

const INTERACTIVE_ATTR_RE =
  /(onClick|onSubmit|href|to|data-ut-intent|data-ut-path|data-ut-anchor)\s*=/g;

function attrSignature(window: string): string {
  const sig: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(INTERACTIVE_ATTR_RE.source, 'g');
  while ((m = re.exec(window)) !== null) {
    // Capture up to the next quote-balanced terminator (heuristic).
    const tail = window.slice(m.index, m.index + 160);
    sig.push(tail.split(/[\n>]/)[0]);
  }
  return sig.sort().join('|');
}

export interface SlotBindingViolation {
  slot: string;
  reason: string;
}

/**
 * Compare old vs new file content. Return violations for every slot whose
 * interactive-attribute signature changed. Used by `workspacePatchEngine`
 * to reject AI patches that try to wire bindings inline.
 */
export function detectSlotBindingViolations(
  oldContent: string | undefined,
  newContent: string | undefined,
): SlotBindingViolation[] {
  if (!oldContent || !newContent) return [];
  const oldSlots = extractSlotElements(oldContent);
  const newSlots = extractSlotElements(newContent);
  const violations: SlotBindingViolation[] = [];
  for (const [slot, newWindow] of newSlots) {
    const oldWindow = oldSlots.get(slot);
    if (!oldWindow) continue; // new slot — allow (scaffold path)
    if (attrSignature(oldWindow) !== attrSignature(newWindow)) {
      violations.push({
        slot,
        reason:
          `Slot "${slot}" had its interactive attributes (onClick/href/to/data-ut-intent) modified inline. ` +
          `Use applyButtonBinding({ slot, intent, targetPageId? }) instead — bindings are data, not code.`,
      });
    }
  }
  return violations;
}
