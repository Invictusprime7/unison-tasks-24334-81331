import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import type { BusinessOSModuleState } from "@/types/businessOS";

interface Props {
  label: string;
  icon: LucideIcon;
  state: BusinessOSModuleState;
  count?: number | string;
  onClick?: () => void;
  className?: string;
}

const STATUS_STYLES: Record<BusinessOSModuleState["setupStatus"], string> = {
  ready: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  in_progress: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  blocked: "border-red-500/40 text-red-400 bg-red-500/10",
  not_started: "border-border/40 text-muted-foreground",
};

const STATUS_LABEL: Record<BusinessOSModuleState["setupStatus"], string> = {
  ready: "Ready",
  in_progress: "In progress",
  blocked: "Blocked",
  not_started: "Not started",
};

export const BusinessOSModuleCard: React.FC<Props> = ({ label, icon: Icon, state, count, onClick, className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!state.enabled}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-border/40 bg-card/40 p-3 text-left transition-all",
        state.enabled
          ? "hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-[0_0_18px_rgba(0,200,100,0.08)]"
          : "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        {count !== undefined && (
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-border/40">
            {count}
          </Badge>
        )}
      </div>
      <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px]", STATUS_STYLES[state.setupStatus])}>
        {STATUS_LABEL[state.setupStatus]}
      </Badge>
      {state.blockers && state.blockers.length > 0 && (
        <p className="text-[10px] text-red-400/80 leading-tight line-clamp-2">
          {state.blockers[0]}
        </p>
      )}
    </button>
  );
};
