/**
 * CTASetupTab — list of action bindings on the active page.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";
import type { ReadinessSeverity } from "../types";

interface CTASetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

function bindingSeverity(b: PlaygroundV2DerivedPageView["ctas"][number]): ReadinessSeverity {
  if (!b.isValid) return "block";
  if (b.readiness === "blocked") return "block";
  if (b.readiness === "stubbed" || b.readiness === "preview-ready") return "warn";
  return "ok";
}

export function CTASetupTab({ view }: CTASetupTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">CTAs on {view.page.title}</h2>
        <p className="text-sm text-muted-foreground">
          Buttons and interactive elements that fire business intents on this page.
        </p>
      </div>

      <div className="space-y-2">
        {view.ctas.length === 0 ? (
          <SetupStatusCard
            title="No CTAs detected"
            description="Add a primary call-to-action so visitors can take the next step."
            severity="warn"
          />
        ) : (
          view.ctas.map((b) => (
            <SetupStatusCard
              key={b.bindingId}
              title={b.sourceLabel || "Untitled CTA"}
              description={b.validationMessage || b.fixHints?.[0]}
              severity={bindingSeverity(b)}
              meta={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    intent: {b.intent}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    target: {b.targetType}
                  </Badge>
                  {b.source && (
                    <Badge variant="secondary" className="text-[10px]">
                      {b.source}
                    </Badge>
                  )}
                </div>
              }
              action={
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
