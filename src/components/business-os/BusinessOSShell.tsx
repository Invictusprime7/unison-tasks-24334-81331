/**
 * BusinessOSShell — Top-level container that frames the BusinessOSOverview.
 *
 * Currently mounted inside CreatorPlaygroundModal as the canonical "home"
 * surface. Existing playground sections (Pages, Funnels, Intent Registry,
 * Readiness, Forms, etc.) act as the per-module surfaces.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { BusinessOSOverview } from "./BusinessOSOverview";
import type { BusinessOSModuleId, BusinessOSProfile } from "@/types/businessOS";

interface Props {
  profile: BusinessOSProfile;
  onOpenModule?: (id: BusinessOSModuleId) => void;
  className?: string;
}

export const BusinessOSShell: React.FC<Props> = ({ profile, onOpenModule, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      <BusinessOSOverview profile={profile} onOpenModule={onOpenModule} />
    </div>
  );
};

export { BusinessOSOverview } from "./BusinessOSOverview";
export { BusinessOSModuleCard } from "./BusinessOSModuleCard";
export { BusinessOSReadinessBar } from "./BusinessOSReadinessBar";
