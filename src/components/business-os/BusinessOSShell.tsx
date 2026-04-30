/**
 * BusinessOSShell — Top-level container for the Business OS surfaces.
 *
 * Frames the Overview, Setup Autopilot, Pages + Funnel Graph (Stage 6),
 * and Intent Runtime Inspector (Stage 5).
 *
 * Currently mounted inside CreatorPlaygroundModal as the canonical "home"
 * surface. Existing playground sections (Pages, Funnels, Intent Registry,
 * Readiness, Forms, etc.) act as the per-module surfaces.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { BusinessOSOverview } from "./BusinessOSOverview";
import { BusinessOSSetupAutopilot } from "./BusinessOSSetupAutopilot";
import { BusinessOSPagesGraph, type PagePreviewStatus } from "./BusinessOSPagesGraph";
import { BusinessOSIntentInspector } from "./BusinessOSIntentInspector";
import type { PageRegistry } from "@/types/pageRegistry";
import type {
  BusinessOSModuleId,
  BusinessOSProfile,
  BusinessOSSetupTask,
  SetupTaskStatus,
} from "@/types/businessOS";

interface Props {
  profile: BusinessOSProfile;
  onOpenModule?: (id: BusinessOSModuleId) => void;
  setupTasks?: BusinessOSSetupTask[];
  onUpdateSetupTaskStatus?: (taskId: string, status: SetupTaskStatus) => void;
  moduleCounts?: Partial<Record<BusinessOSModuleId, number>>;
  /** Live page registry — drives the Pages + Funnel Graph. */
  pageRegistry?: PageRegistry;
  /** Per-page status badges (ready/preview/blocked/missing). */
  pageStatus?: Record<string, PagePreviewStatus>;
  onSelectPage?: (pageId: string) => void;
  onSelectFunnel?: (funnelId: string) => void;
  onAddPage?: () => void;
  onAddFunnel?: () => void;
  className?: string;
}

export const BusinessOSShell: React.FC<Props> = ({
  profile,
  onOpenModule,
  setupTasks,
  onUpdateSetupTaskStatus,
  moduleCounts,
  pageRegistry,
  pageStatus,
  onSelectPage,
  onSelectFunnel,
  onAddPage,
  onAddFunnel,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <BusinessOSOverview profile={profile} onOpenModule={onOpenModule} moduleCounts={moduleCounts} />
      {setupTasks && onUpdateSetupTaskStatus && (
        <BusinessOSSetupAutopilot
          tasks={setupTasks}
          onUpdateStatus={onUpdateSetupTaskStatus}
          onOpenModule={onOpenModule}
        />
      )}
      {pageRegistry && (
        <BusinessOSPagesGraph
          registry={pageRegistry}
          pageStatus={pageStatus}
          onSelectPage={onSelectPage}
          onSelectFunnel={onSelectFunnel}
          onAddPage={onAddPage}
          onAddFunnel={onAddFunnel}
        />
      )}
      <BusinessOSIntentInspector />
    </div>
  );
};

export { BusinessOSOverview } from "./BusinessOSOverview";
export { BusinessOSModuleCard } from "./BusinessOSModuleCard";
export { BusinessOSReadinessBar } from "./BusinessOSReadinessBar";
export { BusinessOSSetupAutopilot } from "./BusinessOSSetupAutopilot";
export { BusinessOSPagesGraph } from "./BusinessOSPagesGraph";
export { BusinessOSIntentInspector } from "./BusinessOSIntentInspector";
