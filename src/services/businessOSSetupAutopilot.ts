/**
 * businessOSSetupAutopilot — Derives a BusinessOSSetupTask[] from a profile +
 * its industry pack, merges with previously-stored tasks (preserving status),
 * and exposes helpers to mutate them.
 *
 * Sources:
 *   - "pack"     — required/recommended setup tasks declared by the industry pack
 *   - "blocker"  — derived from module.blockers strings
 *   - "module"   — derived from modules in setupStatus !== "ready"
 *   - "user"/"ai" — created at runtime; preserved as-is
 */

import { resolvePackForIndustry, type BusinessOSPack } from "@/business-os/packs";
import {
  type BusinessOSModuleId,
  type BusinessOSProfile,
  type BusinessOSSetupTask,
  type SetupTaskStatus,
} from "@/types/businessOS";

const MODULE_RESOLVER: Partial<Record<BusinessOSModuleId, { section: string; field?: string }>> = {
  website: { section: "overview" },
  pages: { section: "pages" },
  funnels: { section: "funnels" },
  offers: { section: "products" },
  forms: { section: "forms" },
  crm: { section: "intent_registry" },
  pipeline: { section: "intent_registry" },
  bookings: { section: "calendars" },
  payments: { section: "business", field: "payments" },
  automations: { section: "intent_registry" },
  inbox: { section: "intent_registry" },
  reviews: { section: "readiness" },
  analytics: { section: "readiness" },
  ai_operator: { section: "intent_registry" },
  settings: { section: "business" },
};

export interface AutopilotComputeOptions {
  pack?: BusinessOSPack;
  /** Existing tasks to merge with — preserves user status / completion timestamps */
  existing?: BusinessOSSetupTask[];
}

/**
 * Build the canonical setup-task list for a profile.
 * Deterministic id scheme: `{source}:{module}:{slug}`
 */
export function computeSetupTasks(
  profile: BusinessOSProfile,
  options: AutopilotComputeOptions = {},
): BusinessOSSetupTask[] {
  const now = new Date().toISOString();
  const pack = options.pack || resolvePackForIndustry(profile.identity.industry);
  const previous = new Map((options.existing || profile.setupTasks || []).map((t) => [t.id, t]));
  const next: BusinessOSSetupTask[] = [];

  const upsert = (
    seed: Omit<BusinessOSSetupTask, "createdAt" | "updatedAt" | "status"> & { defaultStatus?: SetupTaskStatus },
  ) => {
    const prev = previous.get(seed.id);
    const status: SetupTaskStatus = prev?.status || seed.defaultStatus || "pending";
    next.push({
      ...seed,
      status,
      createdAt: prev?.createdAt || now,
      updatedAt: prev?.updatedAt || now,
      completedAt: prev?.completedAt,
    });
    previous.delete(seed.id);
  };

  // 1. Pack-declared tasks
  if (pack) {
    for (const t of pack.setupTasks) {
      upsert({
        id: `pack:${t.module}:${t.id}`,
        label: t.label,
        module: t.module,
        required: t.required,
        source: "pack",
        resolver: MODULE_RESOLVER[t.module],
      });
    }
  }

  // 2. Blocker-derived tasks
  for (const moduleId of Object.keys(profile.modules) as BusinessOSModuleId[]) {
    const mod = profile.modules[moduleId];
    if (!mod?.enabled || !mod.blockers?.length) continue;
    for (const reason of mod.blockers) {
      const slug = reason.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      upsert({
        id: `blocker:${moduleId}:${slug}`,
        label: reason,
        description: `Blocking "${moduleId}" module readiness`,
        module: moduleId,
        required: true,
        source: "blocker",
        resolver: MODULE_RESOLVER[moduleId],
      });
    }
  }

  // 3. Module-status derived tasks (catch-all so unused enabled modules surface)
  for (const moduleId of Object.keys(profile.modules) as BusinessOSModuleId[]) {
    const mod = profile.modules[moduleId];
    if (!mod?.enabled) continue;
    if (mod.setupStatus === "ready") continue;
    const id = `module:${moduleId}:configure`;
    if (next.some((t) => t.id === id)) continue;
    upsert({
      id,
      label: `Finish setting up ${moduleId.replace(/_/g, " ")}`,
      module: moduleId,
      required: false,
      source: "module",
      resolver: MODULE_RESOLVER[moduleId],
      defaultStatus: mod.setupStatus === "in_progress" ? "in_progress" : "pending",
    });
  }

  // 4. Preserve user/ai-created tasks that didn't match anything above
  for (const remaining of previous.values()) {
    if (remaining.source === "user" || remaining.source === "ai") {
      next.push(remaining);
    }
  }

  return next;
}

export function setSetupTaskStatus(
  tasks: BusinessOSSetupTask[],
  taskId: string,
  status: SetupTaskStatus,
): BusinessOSSetupTask[] {
  const now = new Date().toISOString();
  return tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status,
          updatedAt: now,
          completedAt: status === "done" ? now : status === "pending" ? undefined : t.completedAt,
        }
      : t,
  );
}

export interface SetupTaskSummary {
  total: number;
  done: number;
  pending: number;
  inProgress: number;
  skipped: number;
  required: number;
  requiredDone: number;
  /** 0-100, based on required tasks (falls back to all if no required) */
  percent: number;
}

export function summarizeSetupTasks(tasks: BusinessOSSetupTask[]): SetupTaskSummary {
  let done = 0;
  let pending = 0;
  let inProgress = 0;
  let skipped = 0;
  let required = 0;
  let requiredDone = 0;
  for (const t of tasks) {
    if (t.status === "done") done += 1;
    else if (t.status === "in_progress") inProgress += 1;
    else if (t.status === "skipped") skipped += 1;
    else pending += 1;
    if (t.required) {
      required += 1;
      if (t.status === "done" || t.status === "skipped") requiredDone += 1;
    }
  }
  const denom = required || tasks.length || 1;
  const num = required ? requiredDone : done + skipped;
  return {
    total: tasks.length,
    done,
    pending,
    inProgress,
    skipped,
    required,
    requiredDone,
    percent: Math.round((num / denom) * 100),
  };
}
