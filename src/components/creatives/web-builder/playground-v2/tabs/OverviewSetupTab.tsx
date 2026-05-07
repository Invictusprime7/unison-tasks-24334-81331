/**
 * OverviewSetupTab — at-a-glance summary of the active page.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";

interface OverviewSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function OverviewSetupTab({ view }: OverviewSetupTabProps) {
  const { page, ctas, bindings, forms, popups, readiness } = view;
  const stats = [
    { label: "CTAs", value: ctas.length },
    { label: "Bindings", value: bindings.length },
    { label: "Forms", value: forms.length },
    { label: "Popups", value: popups.length },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Page Setup
        </div>
        <h2 className="mt-1 text-xl font-semibold">{page.title}</h2>
        <p className="text-sm text-muted-foreground">
          {page.path} · {page.pageType}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Required Setup</h3>
          <Badge variant="outline" className="text-xs">
            {readiness.score}% ready
          </Badge>
        </div>
        <div className="space-y-2">
          {readiness.items.length === 0 ? (
            <SetupStatusCard
              title="All required setup is complete"
              description="This page is ready to launch."
              severity="ok"
            />
          ) : (
            readiness.items.map((item) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
