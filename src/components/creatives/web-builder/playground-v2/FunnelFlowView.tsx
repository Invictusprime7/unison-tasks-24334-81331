/**
 * FunnelFlowView — read-only graph of pages and their funnel steps.
 */

import { ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlaygroundV2Config } from "./types";
import { cn } from "@/lib/utils";

interface FunnelFlowViewProps {
  config: PlaygroundV2Config;
  onSelectPage: (pageId: string) => void;
}

function statusColor(score: number): string {
  if (score >= 80) return "border-emerald-500/40 bg-emerald-500/5";
  if (score >= 50) return "border-amber-500/40 bg-amber-500/5";
  return "border-destructive/40 bg-destructive/5";
}

export function FunnelFlowView({ config, onSelectPage }: FunnelFlowViewProps) {
  const funnels = Object.values(config.pageRegistry.funnels || {});
  const standalonePages = Object.values(config.pageRegistry.pages || {});

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {funnels.length === 0 ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Pages</h2>
            <div className="space-y-2">
              {standalonePages.map((page) => {
                const r = config.readiness[page.pageId];
                return (
                  <button
                    key={page.pageId}
                    onClick={() => onSelectPage(page.pageId)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                      statusColor(r?.score ?? 0),
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{page.title}</span>
                      <Badge variant="outline">{r?.score ?? 0}%</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {page.path} · {page.pageType}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          funnels.map((funnel) => (
            <div key={funnel.funnelId} className="space-y-2">
              <h2 className="text-lg font-semibold">{funnel.name}</h2>
              <div className="space-y-1">
                {funnel.steps.map((step, idx) => {
                  const page = config.pageRegistry.pages[step.pageId];
                  if (!page) return null;
                  const r = config.readiness[page.pageId];
                  return (
                    <div key={step.stepId}>
                      <button
                        onClick={() => onSelectPage(page.pageId)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                          statusColor(r?.score ?? 0),
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {idx + 1}. {page.title}
                          </span>
                          <Badge variant="outline">{r?.score ?? 0}%</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {step.role} · {page.pageType}
                        </div>
                      </button>
                      {idx < funnel.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
