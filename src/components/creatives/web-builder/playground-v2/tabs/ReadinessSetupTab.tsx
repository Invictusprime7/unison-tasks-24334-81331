/**
 * ReadinessSetupTab — full readiness checklist for the active page.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";

interface ReadinessSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function ReadinessSetupTab({ view }: ReadinessSetupTabProps) {
  const { readiness, page } = view;
  const blockers = readiness.items.filter((i) => i.severity === "block");
  const warnings = readiness.items.filter((i) => i.severity === "warn");

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Launch Readiness</h2>
          <p className="text-sm text-muted-foreground">
            Items {page.title} needs to function as a real business page.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">{readiness.score}%</div>
          <div className="text-xs text-muted-foreground">
            {blockers.length} blocking · {warnings.length} warnings
          </div>
        </div>
      </div>

      {readiness.items.length === 0 ? (
        <SetupStatusCard
          title="No readiness issues"
          description="This page passes all automated checks."
          severity="ok"
        />
      ) : (
        <div className="space-y-2">
          {readiness.items.map((item) => (
            <SetupStatusCard
              key={item.id}
              title={item.label}
              description={item.hint}
              severity={item.severity}
              meta={
                <Badge variant="outline" className="text-[10px] uppercase">
                  {item.category}
                </Badge>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
