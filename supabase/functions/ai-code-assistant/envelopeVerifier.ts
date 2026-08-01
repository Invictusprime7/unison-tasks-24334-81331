/**
 * Milestone 3 — Envelope-driven verification.
 *
 * Milestone 1 made the BuilderRequestEnvelope authoritative for ROUTING.
 * Milestone 2 made it authoritative for GENERATION (prompt directive).
 * Milestone 3 makes it authoritative for ACCEPTANCE: after the model returns
 * files we check the produced patch against the envelope's declared scope and
 * each goal's acceptanceCriteria, instead of trusting the model's prose summary.
 *
 * The verifier is deterministic and evidence-based:
 *   - scope   → which files the patch is allowed to touch
 *   - goals   → concrete signals extracted from acceptanceCriteria text
 *   - caps    → canonical data-ut-intent wiring must actually exist
 *
 * Unmet criteria are fed back into ONE targeted repair turn (see orchestrator),
 * mirroring the Lane B targeted-retry pattern: repair only what failed.
 */

import type { EnvelopeShape } from "./envelopeContext.ts";
import { resolveDatabaseContracts } from "../_shared/capabilityPackContracts.ts";


export interface GoalVerdict {
  goal: string;
  priority: string;
  criterion: string;
  met: boolean;
  evidence?: string;
  reason?: string;
}

export interface EnvelopeVerification {
  checked: boolean;
  passed: boolean;
  /** Files touched that fall outside envelope.scope.targets. */
  outOfScopeFiles: string[];
  scopeEnforced: boolean;
  verdicts: GoalVerdict[];
  unmetCriteria: string[];
  /** Only `must` priority misses block auto-apply. */
  blockingMisses: string[];
  summary: string;
}

const normPath = (p: string) => p.replace(/^\.?\//, "").toLowerCase();

/** A scope target may be a path, a folder, or a bare filename/section name. */
function fileMatchesTarget(file: string, target: string): boolean {
  const f = normPath(file);
  const t = normPath(target).replace(/\*+$/, "");
  if (!t) return true;
  if (f === t || f.startsWith(t)) return true;
  if (f.includes(t)) return true;
  // "Hero" / "hero section" style targets → match Hero.tsx
  const bare = t.replace(/\s*(section|page|component)s?\s*$/i, "").trim();
  if (bare.length >= 3) {
    const base = f.split("/").pop() ?? f;
    if (base.replace(/\.[a-z]+$/, "") === bare) return true;
    if (base.includes(bare)) return true;
  }
  return false;
}

/**
 * Pull checkable signals out of a free-text acceptance criterion.
 * We only assert on things a machine can actually see in the patch.
 */
function extractSignals(criterion: string): {
  paths: string[];
  intents: string[];
  slots: string[];
  quoted: string[];
  identifiers: string[];
} {
  const paths = [...criterion.matchAll(/(\/?src\/[\w./-]+\.[a-z]{2,4})/gi)].map((m) => m[1]);
  const intents = [
    ...criterion.matchAll(/data-ut-intent\s*=\s*["']([\w.]+)["']/gi),
    ...criterion.matchAll(/\bintent\s+["`']?([a-z_]+\.[a-z_.]+)["`']?/gi),
  ].map((m) => m[1]);
  const slots = [...criterion.matchAll(/data-ut-slot\s*=\s*["']([\w.-]+)["']/gi)].map((m) => m[1]);
  const quoted = [...criterion.matchAll(/["“”']([^"“”']{3,60})["“”']/g)]
    .map((m) => m[1])
    .filter((q) => !/^https?:/i.test(q) && !q.includes("data-ut-"));
  const identifiers = [...criterion.matchAll(/\b([A-Z][A-Za-z0-9]{3,})\b/g)]
    .map((m) => m[1])
    .filter((id) => !/^(The|This|That|When|Then|Should|Must|Ensure|User|All|Every|Page|AI)$/i.test(id));

  return { paths, intents, slots, quoted, identifiers };
}

function verifyCriterion(
  criterion: string,
  files: Record<string, string>,
): { met: boolean; evidence?: string; reason?: string } {
  const { paths, intents, slots, quoted, identifiers } = extractSignals(criterion);
  const haystack = Object.values(files).join("\n");
  const fileKeys = Object.keys(files);

  const checks: Array<{ label: string; ok: boolean }> = [];

  for (const p of paths) {
    checks.push({
      label: `file ${p}`,
      ok: fileKeys.some((k) => normPath(k) === normPath(p) || normPath(k).endsWith(normPath(p))),
    });
  }
  for (const i of intents) {
    checks.push({ label: `intent ${i}`, ok: haystack.includes(i) });
  }
  for (const s of slots) {
    checks.push({ label: `slot ${s}`, ok: haystack.includes(s) });
  }
  for (const q of quoted) {
    checks.push({ label: `text "${q}"`, ok: haystack.toLowerCase().includes(q.toLowerCase()) });
  }
  // Identifiers are weak signals — only assert when nothing stronger exists.
  if (checks.length === 0) {
    for (const id of identifiers.slice(0, 3)) {
      checks.push({ label: `symbol ${id}`, ok: haystack.includes(id) });
    }
  }

  if (checks.length === 0) {
    // Nothing machine-checkable — do not fail the turn on prose.
    return { met: true, evidence: "no machine-checkable signal" };
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length === 0) {
    return { met: true, evidence: checks.map((c) => c.label).join(", ") };
  }
  return { met: false, reason: `missing ${failed.map((c) => c.label).join(", ")}` };
}

/** Markup that renders repeated content from an inline literal instead of data. */
const HARDCODED_COLLECTION_RE =
  /(?:const|let)\s+\w+\s*(?::[^=]+)?=\s*\[\s*\{[\s\S]{40,}?\}\s*,\s*\{/;

const RUNTIME_CLIENT_RE = /(integrations\/supabase|runtime-client|useCatalog|CatalogRuntime|supabase\s*\.\s*from)/i;

/**
 * Step 7 — backend-aware verification.
 *
 * For every requested capability we resolve the tables its pack contract owns
 * and require the produced markup to read them through the runtime client.
 * When a section renders an inline collection literal and never touches the
 * backend, the capability is decoration, not a system — that is a `must` miss.
 */
function verifyBackendWiring(
  capabilities: string[],
  files: Record<string, string>,
): GoalVerdict[] {
  const { order, unsupported } = resolveDatabaseContracts(capabilities);
  if (order.length === 0) return [];

  const markup = Object.entries(files)
    .filter(([path]) => /\.(tsx|jsx|ts)$/i.test(path))
    .map(([, content]) => content)
    .join("\n");
  if (!markup.trim()) return [];

  const usesRuntimeClient = RUNTIME_CLIENT_RE.test(markup);
  const hasHardcodedCollection = HARDCODED_COLLECTION_RE.test(markup);
  const verdicts: GoalVerdict[] = [];

  for (const pack of order) {
    // `business_profile` is ambient identity — other packs carry the content.
    if (pack.id === "business_profile") continue;

    const tables = pack.tables.map((t) => t.table);
    const referenced = tables.filter((table) => markup.includes(table));
    const criterion = `Capability "${pack.id}" reads live data from ${tables.join(", ")} instead of hardcoded content`;

    if (referenced.length > 0) {
      verdicts.push({
        goal: `Backend wiring: ${pack.id}`,
        priority: "must",
        criterion,
        met: true,
        evidence: `references ${referenced.join(", ")}`,
      });
      continue;
    }

    // No table reference. Only fail when the file clearly renders its own data.
    if (hasHardcodedCollection && !usesRuntimeClient) {
      verdicts.push({
        goal: `Backend wiring: ${pack.id}`,
        priority: "must",
        criterion,
        met: false,
        reason: `content is rendered from an inline array and never queries ${tables.join(" / ")}`,
      });
    }
  }

  for (const capability of unsupported) {
    verdicts.push({
      goal: `Backend wiring: ${capability}`,
      priority: "should",
      criterion: `Capability "${capability}" has a provisioned backend pack`,
      met: false,
      reason: "no capability pack implements this capability yet",
    });
  }

  return verdicts;
}



export function verifyAgainstEnvelope(opts: {
  envelope?: EnvelopeShape | null;
  files: Record<string, string>;
  existingFiles?: string[];
}): EnvelopeVerification {
  const { envelope, files } = opts;
  const empty: EnvelopeVerification = {
    checked: false,
    passed: true,
    outOfScopeFiles: [],
    scopeEnforced: false,
    verdicts: [],
    unmetCriteria: [],
    blockingMisses: [],
    summary: "",
  };
  if (!envelope) return empty;

  const touched = Object.keys(files);
  if (touched.length === 0) return empty;

  // ── Scope hard gate ───────────────────────────────────────────────────────
  const targets = Array.isArray(envelope.scope?.targets)
    ? (envelope.scope!.targets as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  const level = typeof envelope.scope?.level === "string" ? envelope.scope.level : "";
  // Only enforce when the interpreter declared a narrow scope with real targets.
  const scopeEnforced = targets.length > 0 && !/^(site|project|global|app)$/i.test(level);
  const outOfScopeFiles = scopeEnforced
    ? touched.filter((f) => !targets.some((t) => fileMatchesTarget(f, t)))
    : [];

  // ── Goal / acceptance-criteria verification ───────────────────────────────
  const verdicts: GoalVerdict[] = [];
  const goals = Array.isArray(envelope.goals) ? envelope.goals : [];
  for (const goal of goals) {
    const description = typeof goal?.description === "string" ? goal.description.trim() : "";
    if (!description) continue;
    const priority = typeof goal?.priority === "string" ? goal.priority : "should";
    const criteria = Array.isArray(goal?.acceptanceCriteria)
      ? goal.acceptanceCriteria.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      : [];
    for (const criterion of criteria.slice(0, 10)) {
      const result = verifyCriterion(criterion, files);
      verdicts.push({ goal: description, priority, criterion, ...result });
    }
  }

  // ── Capability wiring ─────────────────────────────────────────────────────
  const capabilities = Array.isArray(envelope.requestedCapabilities)
    ? envelope.requestedCapabilities.filter((c): c is string => typeof c === "string")
    : [];
  const haystack = Object.values(files).join("\n");
  const touchesMarkup = touched.some((f) => /\.(tsx|jsx)$/i.test(f));
  if (capabilities.length > 0 && touchesMarkup && !haystack.includes("data-ut-intent")) {
    verdicts.push({
      goal: `Capabilities: ${capabilities.join(", ")}`,
      priority: "must",
      criterion: "Requested capabilities are wired through canonical data-ut-intent bindings",
      met: false,
      reason: "no data-ut-intent binding present in returned markup",
    });
  }

  // ── Step 7: backend-aware verification ────────────────────────────────────
  // A capability is only satisfied when the produced markup actually reads the
  // capability's tables through the runtime client. Hardcoded arrays rendered
  // where live data belongs are the failure mode this catches.
  if (capabilities.length > 0 && touchesMarkup) {
    verdicts.push(...verifyBackendWiring(capabilities, files));
  }


  const unmet = verdicts.filter((v) => !v.met);
  const blockingMisses = unmet
    .filter((v) => /must|required|critical/i.test(v.priority))
    .map((v) => `${v.criterion} — ${v.reason}`);

  const passed = unmet.length === 0 && outOfScopeFiles.length === 0;

  const summaryParts: string[] = [];
  summaryParts.push(`${verdicts.length - unmet.length}/${verdicts.length || 0} acceptance criteria met`);
  if (outOfScopeFiles.length > 0) {
    summaryParts.push(`${outOfScopeFiles.length} file(s) outside declared scope`);
  }

  return {
    checked: verdicts.length > 0 || scopeEnforced,
    passed,
    outOfScopeFiles,
    scopeEnforced,
    verdicts,
    unmetCriteria: unmet.map((v) => `${v.criterion} — ${v.reason ?? "not satisfied"}`),
    blockingMisses,
    summary: summaryParts.join("; "),
  };
}

/**
 * Build the corrective instruction for the single targeted repair turn.
 * Only failures are restated — never the whole request.
 */
export function buildRepairInstruction(
  verification: EnvelopeVerification,
  allowedTargets: string[],
): string {
  const lines: string[] = [
    "[⛔ VERIFICATION FAILED — TARGETED REPAIR REQUIRED]",
    "Your previous output did not satisfy the authoritative request interpretation.",
    "Return the SAME JSON multi-file shape, fixing ONLY the issues listed below.",
    "Do not restart the task, do not restyle unrelated code, do not drop files you already got right.",
  ];

  if (verification.outOfScopeFiles.length > 0) {
    lines.push(
      "",
      "Out-of-scope files (remove them from your response or justify by editing only in-scope files):",
      ...verification.outOfScopeFiles.map((f) => `  - ${f}`),
      allowedTargets.length ? `Allowed scope targets: ${allowedTargets.join(", ")}` : "",
    );
  }

  if (verification.unmetCriteria.length > 0) {
    lines.push("", "Unmet acceptance criteria (each MUST be implemented in the returned files):");
    for (const c of verification.unmetCriteria) lines.push(`  ✗ ${c}`);
  }

  lines.push(
    "",
    "Re-emit the complete corrected file set as JSON: {\"files\": {\"/path\": \"...\"}}.",
  );

  return lines.filter((l) => l !== "").join("\n");
}
