/**
 * PopupsSetupTab — popups active on the current page.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";

interface PopupsSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function PopupsSetupTab({ view }: PopupsSetupTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Popups on {view.page.title}</h2>
        <p className="text-sm text-muted-foreground">
          Modals, drawers, and exit-intent overlays attached to this page.
        </p>
      </div>

      <div className="space-y-2">
        {view.popups.length === 0 ? (
          <SetupStatusCard
            title="No popups attached"
            description="Add a popup to capture leads, run promos, or surface offers."
            severity="warn"
          />
        ) : (
          view.popups.map((p) => (
            <SetupStatusCard
              key={p.popupId}
              title={p.name}
              description={
                p.contentRefId
                  ? `Content reference: ${p.contentRefId}`
                  : "No content reference set"
              }
              severity={p.contentRefId ? "ok" : "warn"}
              meta={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    trigger: {p.trigger}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {p.contentType}
                  </Badge>
                  {p.showOncePerSession && (
                    <Badge variant="secondary" className="text-[10px]">
                      once/session
                    </Badge>
                  )}
                </div>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
