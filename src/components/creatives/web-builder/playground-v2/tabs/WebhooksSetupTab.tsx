/**
 * WebhooksSetupTab — outbound webhook destinations referenced from this page.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";

interface WebhooksSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function WebhooksSetupTab({ view }: WebhooksSetupTabProps) {
  const webhookForms = view.forms.filter((f) => f.destinationType === "webhook");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Webhooks on {view.page.title}</h2>
        <p className="text-sm text-muted-foreground">
          Outbound HTTP destinations triggered by forms or CTAs on this page.
        </p>
      </div>

      <div className="space-y-2">
        {webhookForms.length === 0 ? (
          <SetupStatusCard
            title="No webhooks configured"
            description="Route a form to a webhook to push submissions into Zapier, Make, or your own server."
            severity="warn"
          />
        ) : (
          webhookForms.map((f) => (
            <SetupStatusCard
              key={f.formId}
              title={f.name}
              description={f.destinationLabel || "Webhook URL not yet set"}
              severity={f.destinationLabel ? "ok" : "warn"}
              meta={
                <Badge variant="outline" className="text-[10px]">
                  {f.fields.length} fields
                </Badge>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
