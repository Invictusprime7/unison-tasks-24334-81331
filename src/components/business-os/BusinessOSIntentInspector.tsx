/**
 * BusinessOSIntentInspector — Live tail of intent runtime events.
 *
 * Surfaces success/failure events from the intent runtime with per-intent
 * rollups, source filtering, pause/clear controls, and a payload viewer.
 *
 * Stage 5 of the Business OS roadmap.
 */

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  Radio,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useIntentRuntimeInspector,
  type IntentRuntimeEvent,
} from "@/hooks/useIntentRuntimeInspector";

interface Props {
  className?: string;
  /** Optional title override. */
  title?: string;
  /** Max events to retain in memory. */
  limit?: number;
}

export const BusinessOSIntentInspector: React.FC<Props> = ({ className, title = "Intent Runtime", limit = 100 }) => {
  const { events, stats, isPaused, setPaused, clear } = useIntentRuntimeInspector(limit);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "success" | "failure">("all");
  const [intentFilter, setIntentFilter] = React.useState<string | null>(null);

  const visible = React.useMemo(() => {
    return events.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (intentFilter && e.intent !== intentFilter) return false;
      return true;
    });
  }, [events, filter, intentFilter]);

  return (
    <Card className={cn("bg-card/40 border-border/40 p-4", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Radio className={cn("h-4 w-4", isPaused ? "text-muted-foreground" : "text-emerald-400")} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            {title}
          </h3>
          <Badge variant="outline" className="h-5 text-[10px] border-border/40">
            {stats.totalEvents} events
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "h-5 text-[10px]",
              stats.successRate >= 90
                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                : stats.successRate >= 70
                  ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                  : "border-red-500/40 text-red-300 bg-red-500/10",
            )}
          >
            {stats.successRate}% ok
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={clear}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Per-intent rollup */}
      {stats.perIntent.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
            By intent
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={intentFilter === null && filter === "all"}
              onClick={() => { setIntentFilter(null); setFilter("all"); }}
              label="All"
              tone="neutral"
              count={stats.totalEvents}
            />
            <FilterChip
              active={filter === "success" && intentFilter === null}
              onClick={() => { setIntentFilter(null); setFilter("success"); }}
              label="Success"
              tone="success"
              count={stats.totalSuccess}
            />
            <FilterChip
              active={filter === "failure" && intentFilter === null}
              onClick={() => { setIntentFilter(null); setFilter("failure"); }}
              label="Failure"
              tone="failure"
              count={stats.totalFailure}
            />
            {stats.perIntent.slice(0, 8).map((row) => (
              <FilterChip
                key={row.intent}
                active={intentFilter === row.intent}
                onClick={() => { setIntentFilter(intentFilter === row.intent ? null : row.intent); setFilter("all"); }}
                label={row.intent}
                tone={row.failure > 0 ? "warn" : "neutral"}
                count={row.success + row.failure}
              />
            ))}
          </div>
        </div>
      )}

      {/* Event log */}
      {visible.length === 0 ? (
        <div className="text-xs text-muted-foreground p-4 border border-dashed border-border/30 rounded-md text-center">
          {isPaused ? "Paused — resume to capture new events." : "Waiting for intent activity…"}
        </div>
      ) : (
        <ScrollArea className="h-[280px] pr-2 -mr-2">
          <ul className="space-y-1">
            {visible.map((evt) => (
              <EventRow
                key={evt.id}
                event={evt}
                expanded={expanded === evt.id}
                onToggle={() => setExpanded(expanded === evt.id ? null : evt.id)}
              />
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
};

function FilterChip({
  active,
  onClick,
  label,
  tone,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: "success" | "failure" | "warn" | "neutral";
  count: number;
}) {
  const toneClass = {
    success: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    failure: "border-red-500/40 text-red-300 bg-red-500/10",
    warn: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    neutral: "border-border/40 text-foreground/80",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-5 px-2 rounded-full border text-[10px] flex items-center gap-1.5 transition",
        toneClass,
        active && "ring-1 ring-emerald-400/60 shadow-[0_0_10px_rgba(0,200,100,0.15)]",
      )}
    >
      <span>{label}</span>
      <span className="opacity-60">{count}</span>
    </button>
  );
}

function EventRow({
  event,
  expanded,
  onToggle,
}: {
  event: IntentRuntimeEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isSuccess = event.kind === "success";
  return (
    <li
      className={cn(
        "rounded-md border px-2.5 py-1.5",
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/30 bg-red-500/5",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2 text-left"
      >
        {isSuccess ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-foreground/90 truncate">{event.intent}</span>
            <Badge variant="outline" className="h-4 px-1 text-[9px] border-border/40 text-muted-foreground">
              {event.source}
            </Badge>
            {!isSuccess && event.errorCode && (
              <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-500/40 text-red-300 bg-red-500/10">
                {event.errorCode}
              </Badge>
            )}
            {event.actionLabel && (
              <span className="text-[10px] text-muted-foreground truncate">· {event.actionLabel}</span>
            )}
          </div>
          {!isSuccess && event.errorMessage && (
            <p className="text-[10px] text-red-300/90 mt-0.5 truncate">{event.errorMessage}</p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
          {formatTime(event.timestamp)}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
      </button>
      {expanded && (
        <pre className="mt-2 text-[10px] text-muted-foreground bg-background/40 rounded p-2 overflow-x-auto max-h-40">
{JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </li>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false });
}
