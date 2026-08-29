/**
 * WizardPipelineRail — horizontally compact, fully explained pipeline projector
 * shown while the Wizard runs "Generate Site".
 *
 * Replaces the old vertical dropdown stepper. It renders:
 *  - a single-row rail of every canonical generation stage (with a one-line
 *    explanation of what that stage actually does),
 *  - live per-stage state (pending / running / done) and elapsed time,
 *  - a projected log stream of every status the runtime emits, so nothing that
 *    is logged during generation is hidden from the user.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStageDef {
  id: string;
  label: string;
  /** Plain-language explanation of what happens in this stage. */
  explain: string;
  keywords: string[];
}

export const WIZARD_PIPELINE_STAGES: PipelineStageDef[] = [
  {
    id: "plan",
    label: "Plan",
    explain: "Turning your 4-step selections into the page topology and site plan.",
    keywords: ["plan", "topology"],
  },
  {
    id: "generate",
    label: "Generate",
    explain: "Lane B writes each selected page against your industry and template.",
    keywords: ["generat"],
  },
  {
    id: "repair",
    label: "Backfill",
    explain: "Any page that failed acceptance is regenerated from exact diagnostics.",
    keywords: ["remaining", "repair", "missing", "backfill", "retry"],
  },
  {
    id: "snapshot",
    label: "Snapshot",
    explain: "Merging pages, theme tokens and art direction into the SiteBundleSnapshot.",
    keywords: ["snapshot", "theme", "merge"],
  },
  {
    id: "intents",
    label: "Wiring",
    explain: "Binding slots, intents and routes so buttons and icons do real work.",
    keywords: ["intent", "wiring", "route", "bind"],
  },
  {
    id: "preview",
    label: "Preview",
    explain: "Compiling the VFS and proving every module and export resolves.",
    keywords: ["preview", "finaliz", "compil"],
  },
  {
    id: "commit",
    label: "Save",
    explain: "Committing the snapshot and revision to your project workspace.",
    keywords: ["commit", "saving", "workspace", "live data"],
  },
  {
    id: "handoff",
    label: "Handoff",
    explain: "Opening the Web Builder with the generated site hydrated.",
    keywords: ["opening", "web builder", "handoff"],
  },
];

export function deriveStageFromStatus(status: string): number {
  if (!status) return 0;
  const lower = status.toLowerCase();
  for (let i = WIZARD_PIPELINE_STAGES.length - 1; i >= 0; i--) {
    if (WIZARD_PIPELINE_STAGES[i].keywords.some((k) => lower.includes(k))) return i;
  }
  return 0;
}

interface LogEntry {
  at: number;
  text: string;
  stage: string;
}

interface WizardPipelineRailProps {
  isLaunching: boolean;
  launchStatus: string;
}

export function WizardPipelineRail({ isLaunching, launchStatus }: WizardPipelineRailProps) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tickStage, setTickStage] = useState(0);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLaunching) {
      setLog([]);
      setStartedAt(null);
      setTickStage(0);
      return;
    }
    setStartedAt(Date.now());
    setTickStage(0);
    const clock = window.setInterval(() => setNow(Date.now()), 500);
    const soft = window.setInterval(() => {
      setTickStage((prev) => Math.min(prev + 1, WIZARD_PIPELINE_STAGES.length - 3));
    }, 2600);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(soft);
    };
  }, [isLaunching]);

  // Project every emitted status into the log stream (deduped consecutively).
  useEffect(() => {
    if (!isLaunching || !launchStatus) return;
    setLog((prev) => {
      if (prev.length && prev[prev.length - 1].text === launchStatus) return prev;
      const next = [
        ...prev,
        {
          at: Date.now(),
          text: launchStatus,
          stage: WIZARD_PIPELINE_STAGES[deriveStageFromStatus(launchStatus)]?.label ?? "Plan",
        },
      ];
      return next.slice(-60);
    });
  }, [isLaunching, launchStatus]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log.length]);

  const activeIndex = useMemo(() => {
    if (!isLaunching) return -1;
    return Math.max(deriveStageFromStatus(launchStatus), tickStage);
  }, [isLaunching, launchStatus, tickStage]);

  const active = WIZARD_PIPELINE_STAGES[Math.min(Math.max(activeIndex, 0), WIZARD_PIPELINE_STAGES.length - 1)];
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;

  return (
    <AnimatePresence>
      {isLaunching && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="w-[min(760px,78vw)] rounded-xl border border-cyan-500/15 bg-[#0b0d18]/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden"
        >
          {/* Horizontal stage rail */}
          <div className="flex items-center gap-1 px-2.5 py-2 overflow-x-auto">
            {WIZARD_PIPELINE_STAGES.map((stage, idx) => {
              const done = idx < activeIndex;
              const running = idx === activeIndex;
              return (
                <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
                  <div
                    title={stage.explain}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      running && "bg-cyan-500/[0.10] text-cyan-300",
                      done && "text-cyan-500/60",
                      !running && !done && "text-white/25"
                    )}
                  >
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0",
                        done && "bg-cyan-500/25 text-cyan-300",
                        running && "bg-cyan-500 text-[#07080F]",
                        !running && !done && "bg-white/[0.05] text-white/30"
                      )}
                    >
                      {done ? (
                        <Check className="h-2 w-2" />
                      ) : running ? (
                        <Loader2 className="h-2 w-2 animate-spin" />
                      ) : (
                        <span className="text-[8px]">{idx + 1}</span>
                      )}
                    </span>
                    {stage.label}
                  </div>
                  {idx < WIZARD_PIPELINE_STAGES.length - 1 && (
                    <span
                      className={cn(
                        "h-px w-3 flex-shrink-0",
                        idx < activeIndex ? "bg-cyan-500/40" : "bg-white/[0.08]"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation of the current stage */}
          <div className="flex items-baseline justify-between gap-3 px-3 py-1.5 border-t border-white/[0.06]">
            <p className="text-[10.5px] text-white/55 truncate">
              <span className="text-cyan-300/80 font-semibold">{active?.label}</span>
              {" — "}
              {active?.explain}
            </p>
            <span className="text-[10px] font-mono text-white/30 flex-shrink-0">{elapsed}s</span>
          </div>

          {/* Projected runtime log stream */}
          <div
            ref={logRef}
            className="max-h-[92px] overflow-y-auto border-t border-white/[0.06] bg-black/25 px-3 py-1.5 space-y-0.5"
          >
            {log.length === 0 ? (
              <p className="text-[10px] font-mono text-white/25">waiting for runtime output…</p>
            ) : (
              log.map((entry, i) => (
                <p key={`${entry.at}-${i}`} className="text-[10px] font-mono text-white/45 leading-relaxed">
                  <span className="text-white/20">
                    {startedAt ? `+${Math.max(0, Math.round((entry.at - startedAt) / 1000))}s` : "+0s"}
                  </span>{" "}
                  <span className="text-cyan-400/50">[{entry.stage}]</span>{" "}
                  <span className={cn(i === log.length - 1 && "text-white/75")}>{entry.text}</span>
                </p>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
