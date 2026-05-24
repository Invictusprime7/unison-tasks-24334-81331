/**
 * Launch Handoff Validator
 *
 * Pre-handoff structural sweep that runs AFTER the launcher merges AI output
 * with the canonical snapshot (and stamps data-ut-* attributes via
 * applyWizardBindingsToVfs) and BEFORE we navigate to the Builder.
 *
 * Goals:
 *   1. Every `data-ut-intent` resolves to a known CoreIntent.
 *   2. Every `data-ut-target-page-id` exists in the canonical PageRegistry.
 *   3. Every stamped intent's required capability is provisioned.
 *
 * Failures are rewritten in-place (strip target id, downgrade unknown
 * intent to `contact.submit`) so the Builder never receives a stamp that
 * will later fire the intent failure bus as "error code".
 *
 * Returns a diagnostics array consumed by LaunchStateController so the
 * launcher surface can show a yellow chip when bindings were repaired.
 */

import { resolveIntentName, getIntentDef } from '@/platform/core';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

export type LaunchHandoffSeverity = 'info' | 'warn' | 'error';

export interface LaunchHandoffIssue {
  severity: LaunchHandoffSeverity;
  code:
    | 'UNKNOWN_INTENT'
    | 'STALE_TARGET_PAGE_ID'
    | 'MISSING_CAPABILITY'
    | 'PERSIST_PARTIAL'
    | 'PERSIST_ZERO';
  message: string;
  filePath?: string;
  slot?: string;
  intent?: string;
  targetPageId?: string;
  capability?: string;
}

export interface LaunchHandoffReport {
  files: Record<string, string>;
  issues: LaunchHandoffIssue[];
  /** Total tags scanned across all files. */
  scanned: number;
  /** Tags rewritten in place. */
  repaired: number;
}

const TAG_OPEN_RE =
  /<[A-Za-z][^>]*?\bdata-ut-(?:slot|binding-key|intent)=[^>]*?>/g;
const INTENT_ATTR_RE = /\bdata-ut-intent=(["'])([^"']+)\1/i;
const TARGET_ATTR_RE = /\bdata-ut-target-page-id=(["'])([^"']+)\1/i;
const SLOT_ATTR_RE = /\bdata-ut-(?:slot|binding-key)=(["'])([^"']+)\1/i;

/**
 * Replace the intent attribute value on a tag, returning the new tag string.
 */
function rewriteIntent(tag: string, next: string): string {
  return tag.replace(INTENT_ATTR_RE, (_m, q) => `data-ut-intent=${q}${next}${q}`);
}

/** Remove the target-page-id attribute from a tag. */
function stripTargetPageId(tag: string): string {
  return tag.replace(/\s*\bdata-ut-target-page-id=(["'])[^"']+\1/i, '');
}

export interface ValidateLaunchHandoffOptions {
  files: Record<string, string>;
  snapshot?: SiteBundleSnapshot | null;
  /** Capabilities provisioned for this site (e.g. ['booking','commerce']). */
  provisionedCapabilities?: string[];
}

/**
 * Validate the post-stamp VFS and repair structural problems in-place.
 * Returns a new files map (immutable input).
 */
export function validateLaunchHandoff(
  opts: ValidateLaunchHandoffOptions,
): LaunchHandoffReport {
  const issues: LaunchHandoffIssue[] = [];
  const out: Record<string, string> = { ...opts.files };

  const knownPageIds = new Set<string>();
  if (opts.snapshot?.pageRegistry?.pages) {
    for (const id of Object.keys(opts.snapshot.pageRegistry.pages)) {
      knownPageIds.add(id);
    }
  }
  const provisioned = new Set(
    (opts.provisionedCapabilities ?? []).map((c) => c.toLowerCase()),
  );
  // 'core' capability is always considered provisioned for nav/contact intents.
  provisioned.add('core');
  provisioned.add('contact');
  provisioned.add('nav');

  let scanned = 0;
  let repaired = 0;

  for (const [filePath, content] of Object.entries(out)) {
    if (typeof content !== 'string') continue;
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) continue;
    if (!content.includes('data-ut-')) continue;

    let mutated = content;
    let fileChanged = false;

    mutated = mutated.replace(TAG_OPEN_RE, (tag) => {
      scanned += 1;
      let nextTag = tag;
      const slot = tag.match(SLOT_ATTR_RE)?.[2];
      const rawIntent = tag.match(INTENT_ATTR_RE)?.[2];
      const targetId = tag.match(TARGET_ATTR_RE)?.[2];

      // 1. Unknown / unresolvable intent → downgrade to contact.submit
      if (rawIntent) {
        const canonical = resolveIntentName(rawIntent);
        if (!canonical) {
          issues.push({
            severity: 'warn',
            code: 'UNKNOWN_INTENT',
            message: `Unknown intent "${rawIntent}" downgraded to contact.submit`,
            filePath,
            slot,
            intent: rawIntent,
          });
          nextTag = rewriteIntent(nextTag, 'contact.submit');
          repaired += 1;
        } else {
          // 2. Capability not provisioned → downgrade to contact.submit
          const def = getIntentDef(canonical);
          const cap = def?.capability?.toLowerCase();
          if (cap && !provisioned.has(cap)) {
            issues.push({
              severity: 'warn',
              code: 'MISSING_CAPABILITY',
              message: `Intent "${canonical}" requires capability "${cap}" which is not provisioned; downgraded to contact.submit`,
              filePath,
              slot,
              intent: canonical,
              capability: cap,
            });
            nextTag = rewriteIntent(nextTag, 'contact.submit');
            repaired += 1;
          } else if (canonical !== rawIntent) {
            // Normalize stamped value to canonical form so DB persist + runtime
            // resolver see exact-match strings.
            nextTag = rewriteIntent(nextTag, canonical);
          }
        }
      }

      // 3. Stale target page id → strip; nav.goto falls back to label/path
      if (targetId && knownPageIds.size > 0 && !knownPageIds.has(targetId)) {
        issues.push({
          severity: 'warn',
          code: 'STALE_TARGET_PAGE_ID',
          message: `data-ut-target-page-id "${targetId}" does not exist in canonical page registry; removed`,
          filePath,
          slot,
          targetPageId: targetId,
        });
        nextTag = stripTargetPageId(nextTag);
        repaired += 1;
      }

      if (nextTag !== tag) fileChanged = true;
      return nextTag;
    });

    if (fileChanged) out[filePath] = mutated;
  }

  return { files: out, issues, scanned, repaired };
}
