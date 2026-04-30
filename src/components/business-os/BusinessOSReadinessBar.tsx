import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { BusinessOSReadiness } from "@/types/businessOS";

interface Props {
  readiness: BusinessOSReadiness;
  className?: string;
}

export const BusinessOSReadinessBar: React.FC<Props> = ({ readiness, className }) => {
  const tone =
    readiness.blocked > 0
      ? "text-red-400"
      : readiness.percent >= 80
        ? "text-emerald-400"
        : "text-amber-400";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-semibold", tone)}>
          Business OS Readiness · {readiness.percent}%
        </span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="h-5 text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            {readiness.ready} ready
          </Badge>
          {readiness.inProgress > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/10">
              {readiness.inProgress} in progress
            </Badge>
          )}
          {readiness.blocked > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] border-red-500/40 text-red-400 bg-red-500/10">
              {readiness.blocked} blocked
            </Badge>
          )}
        </div>
      </div>
      <Progress value={readiness.percent} className="h-1.5 bg-muted/40" />
    </div>
  );
};
