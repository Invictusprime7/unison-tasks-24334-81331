/**
 * SetupStatusCard — readiness-aware row used across V2 tabs.
 */

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessSeverity } from "../types";

interface SetupStatusCardProps {
  title: string;
  description?: string;
  severity: ReadinessSeverity;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}

const ICONS: Record<ReadinessSeverity, React.ElementType> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  block: XCircle,
};

const COLORS: Record<ReadinessSeverity, string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  block: "text-destructive",
};

export function SetupStatusCard({ title, description, severity, meta, action }: SetupStatusCardProps) {
  const Icon = ICONS[severity];
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", COLORS[severity])} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{title}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
