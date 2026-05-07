/**
 * Header — business / page context bar with readiness score.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ListChecks, Sparkles, Rocket } from "lucide-react";
import type { BuilderPage } from "@/types/pageRegistry";

interface PlaygroundHeaderProps {
  businessName?: string;
  page: BuilderPage | null;
  readinessScore: number;
  siteScore?: number;
  siteBlockers?: number;
  onPreview?: () => void;
  onRunReadiness?: () => void;
  onPublishChecklist?: () => void;
}

function scoreVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

export function PlaygroundHeader({
  businessName,
  page,
  readinessScore,
  siteScore,
  siteBlockers,
  onPreview,
  onRunReadiness,
  onPublishChecklist,
}: PlaygroundHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/40 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Creator Playground · Launch Control
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">
            {businessName || "Untitled business"}
          </span>
          {page && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-base font-medium">{page.title}</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {page.pageType}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {typeof siteScore === "number" && (
          <Badge variant={scoreVariant(siteScore)} className="gap-1" title="Whole-site readiness">
            <ListChecks className="h-3 w-3" />
            Site {siteScore}%
            {typeof siteBlockers === "number" && siteBlockers > 0 && (
              <span className="ml-1 rounded bg-background/20 px-1 text-[10px]">
                {siteBlockers} blocking
              </span>
            )}
          </Badge>
        )}
        <Badge variant={scoreVariant(readinessScore)} className="gap-1">
          <ListChecks className="h-3 w-3" />
          Page {readinessScore}%
        </Badge>
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Preview
        </Button>
        <Button variant="outline" size="sm" onClick={onRunReadiness}>
          <ListChecks className="mr-1.5 h-3.5 w-3.5" />
          Check
        </Button>
        <Button size="sm" onClick={onPublishChecklist}>
          <Rocket className="mr-1.5 h-3.5 w-3.5" />
          Publish
        </Button>
      </div>
    </div>
  );
}
