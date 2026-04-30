import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RouteShell } from "@/routes";

const shellBadgeClass: Record<RouteShell, string> = {
  public: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  onboarding: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  workspace: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  project: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  builder: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  focus: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
};

interface ShellStatusBadgeProps {
  shell: RouteShell;
  label: string;
  className?: string;
}

export function ShellStatusBadge({ shell, label, className }: ShellStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("h-6 rounded-md px-2 text-[11px] font-medium", shellBadgeClass[shell], className)}>
      {label}
    </Badge>
  );
}

