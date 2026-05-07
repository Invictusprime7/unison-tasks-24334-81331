/**
 * BindingsSetupTab — every detected element + its wired intent.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView, ReadinessSeverity } from "../types";

function severity(b: PlaygroundV2DerivedPageView["bindings"][number]): ReadinessSeverity {
  if (!b.isValid) return "block";
  if (b.readiness === "blocked") return "block";
  if (b.readiness === "stubbed") return "warn";
  return "ok";
}

interface BindingsSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function BindingsSetupTab({ view }: BindingsSetupTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Component Bindings</h2>
        <p className="text-sm text-muted-foreground">
          Every interactive element on {view.page.title} mapped to a business intent.
        </p>
      </div>

      <div className="space-y-2">
        {view.bindings.length === 0 ? (
          <SetupStatusCard
            title="No bindings detected"
            description="Run the binding scanner from the Web Builder to populate this list."
            severity="warn"
          />
        ) : (
          view.bindings.map((b) => (
            <SetupStatusCard
              key={b.bindingId}
              title={b.sourceLabel || b.elementKey || "Unnamed element"}
              description={
                b.elementKey
                  ? `Slot: ${b.elementKey}`
                  : b.validationMessage || b.fixHints?.[0]
              }
              severity={severity(b)}
              meta={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {b.intent}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    → {b.targetType}
                  </Badge>
                  {b.uiAction && (
                    <Badge variant="secondary" className="text-[10px]">
                      ui: {b.uiAction}
                    </Badge>
                  )}
                  {typeof b.confidence === "number" && (
                    <span className="text-[10px] text-muted-foreground">
                      confidence {Math.round(b.confidence * 100)}%
                    </span>
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
