/**
 * BusinessOSSetupAutopilot — Surfaces the setup-task list inside the OS shell.
 *
 * - Groups tasks by module
 * - Lets the user mark them done / skipped / reopen
 * - Surfaces an "Open" CTA that defers to onOpenModule (which routes to the
 *   correct playground section).
 */

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, CircleDashed, ListChecks, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BusinessOSModuleId,
  type BusinessOSSetupTask,
  type SetupTaskStatus,
} from "@/types/businessOS";
import { summarizeSetupTasks } from "@/services/businessOSSetupAutopilot";

interface Props {
  tasks: BusinessOSSetupTask[];
  onUpdateStatus: (taskId: string, status: SetupTaskStatus) => void;
  onOpenModule?: (id: BusinessOSModuleId) => void;
  className?: string;
}

const STATUS_META: Record<SetupTaskStatus, { label: string; tone: string }> = {
  pending: { label: "To do", tone: "border-border/40 text-muted-foreground" },
  in_progress: { label: "In progress", tone: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  done: { label: "Done", tone: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  skipped: { label: "Skipped", tone: "border-border/40 text-muted-foreground/60 line-through" },
};

export const BusinessOSSetupAutopilot: React.FC<Props> = ({ tasks, onUpdateStatus, onOpenModule, className }) => {
  const summary = React.useMemo(() => summarizeSetupTasks(tasks), [tasks]);

  const grouped = React.useMemo(() => {
    const groups = new Map<BusinessOSModuleId, BusinessOSSetupTask[]>();
    for (const t of tasks) {
      const arr = groups.get(t.module) || [];
      arr.push(t);
      groups.set(t.module, arr);
    }
    return Array.from(groups.entries());
  }, [tasks]);

  if (!tasks.length) {
    return (
      <Card className={cn("bg-card/40 border-border/40 p-4", className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ListChecks className="h-4 w-4" />
          No setup tasks — your OS is fully configured.
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card/40 border-border/40 p-4", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Setup Autopilot
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
          {summary.requiredDone}/{summary.required || summary.total} required · {summary.percent}%
        </Badge>
      </div>

      <div className="h-1 w-full rounded-full bg-muted/30 overflow-hidden mb-4">
        <div
          className="h-full bg-emerald-400/80 transition-[width] duration-500"
          style={{ width: `${summary.percent}%` }}
        />
      </div>

      <div className="space-y-4">
        {grouped.map(([moduleId, items]) => (
          <div key={moduleId}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              {moduleId.replace(/_/g, " ")}
            </p>
            <ul className="space-y-1.5">
              {items.map((task) => {
                const meta = STATUS_META[task.status];
                const done = task.status === "done" || task.status === "skipped";
                return (
                  <li
                    key={task.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border border-border/30 bg-card/30 px-2.5 py-2",
                      done && "opacity-60",
                    )}
                  >
                    <button
                      onClick={() =>
                        onUpdateStatus(task.id, task.status === "done" ? "pending" : "done")
                      }
                      aria-label={task.status === "done" ? "Mark as not done" : "Mark as done"}
                      className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 transition",
                        task.status === "done"
                          ? "bg-emerald-500/80 border-emerald-400 text-background"
                          : "border-border/60 hover:border-emerald-400/60",
                      )}
                    >
                      {task.status === "done" ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : (
                        <CircleDashed className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("text-xs text-foreground/90", task.status === "skipped" && "line-through")}>
                          {task.label}
                        </span>
                        {task.required && task.status !== "done" && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-500/40 text-red-300 bg-red-500/5">
                            required
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("h-4 px-1 text-[9px]", meta.tone)}>
                          {meta.label}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {onOpenModule && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                          onClick={() => onOpenModule(task.module)}
                        >
                          Open
                          <ArrowRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      )}
                      {task.status !== "done" && task.status !== "skipped" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => onUpdateStatus(task.id, "skipped")}
                          title="Skip"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {(task.status === "done" || task.status === "skipped") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => onUpdateStatus(task.id, "pending")}
                          title="Reopen"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
};
