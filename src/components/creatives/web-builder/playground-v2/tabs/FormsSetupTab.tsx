/**
 * FormsSetupTab — forms attached or referenced by the active page.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView, ReadinessSeverity } from "../types";

interface FormsSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function FormsSetupTab({ view }: FormsSetupTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Forms on {view.page.title}</h2>
        <p className="text-sm text-muted-foreground">
          Forms that submit business intents and route to CRM, email, or webhooks.
        </p>
      </div>

      <div className="space-y-2">
        {view.forms.length === 0 ? (
          <SetupStatusCard
            title="No forms attached"
            description="Add a form and connect it to a CRM target or webhook."
            severity="warn"
          />
        ) : (
          view.forms.map((f) => {
            const sev: ReadinessSeverity = f.destinationType ? "ok" : "warn";
            return (
              <SetupStatusCard
                key={f.formId}
                title={f.name}
                description={
                  f.destinationLabel
                    ? `Routes to ${f.destinationLabel}`
                    : "No destination configured"
                }
                severity={sev}
                meta={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {f.fields.length} fields
                    </Badge>
                    {f.submitIntentId && (
                      <Badge variant="outline" className="text-[10px]">
                        intent: {f.submitIntentId}
                      </Badge>
                    )}
                    {f.destinationType && (
                      <Badge variant="secondary" className="text-[10px]">
                        {f.destinationType}
                      </Badge>
                    )}
                  </div>
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
