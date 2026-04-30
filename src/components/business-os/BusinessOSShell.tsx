/**
 * BusinessOSShell — Top-level container that frames the BusinessOSOverview
 * and the Setup Autopilot panel.
 *
 * Currently mounted inside CreatorPlaygroundModal as the canonical "home"
 * surface. Existing playground sections (Pages, Funnels, Intent Registry,
 * Readiness, Forms, etc.) act as the per-module surfaces.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { BusinessOSOverview } from "./BusinessOSOverview";
import { BusinessOSSetupAutopilot } from "./BusinessOSSetupAutopilot";
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
  className?: string;
}

export const BusinessOSShell: React.FC<Props> = ({
  profile,
  onOpenModule,
  setupTasks,
  onUpdateSetupTaskStatus,
  moduleCounts,
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
    </div>
  );
};

export { BusinessOSOverview } from "./BusinessOSOverview";
export { BusinessOSModuleCard } from "./BusinessOSModuleCard";
export { BusinessOSReadinessBar } from "./BusinessOSReadinessBar";
export { BusinessOSSetupAutopilot } from "./BusinessOSSetupAutopilot";
