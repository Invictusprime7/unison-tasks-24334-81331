/**
 * CRMSetupTab — shows where leads/orders captured on this page will land.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2Config, PlaygroundV2DerivedPageView, ReadinessSeverity } from "../types";

interface CRMSetupTabProps {
  view: PlaygroundV2DerivedPageView;
  config: PlaygroundV2Config;
}

export function CRMSetupTab({ view, config }: CRMSetupTabProps) {
  const business = config.creatorData.businessInfo;
  const crmDest = business.crmDestination;
  const notifyEmail = business.notificationEmail || business.email;

  const sev: ReadinessSeverity = crmDest || notifyEmail ? "ok" : "block";

  const formsRouted = view.forms.filter((f) => f.destinationType === "crm" || f.destinationType === "email");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">CRM Routing</h2>
        <p className="text-sm text-muted-foreground">
          Where leads, bookings, and orders captured on {view.page.title} are sent.
        </p>
      </div>

      <SetupStatusCard
        title="Default CRM destination"
        description={crmDest ? `Routes to ${crmDest}` : "No CRM destination configured for this business."}
        severity={crmDest ? "ok" : "warn"}
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            {notifyEmail && (
              <Badge variant="outline" className="text-[10px]">
                notifies: {notifyEmail}
              </Badge>
            )}
            {business.followUpChannel && (
              <Badge variant="outline" className="text-[10px]">
                follow-up: {business.followUpChannel}
              </Badge>
            )}
          </div>
        }
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Forms routing into CRM ({formsRouted.length})</h3>
        {formsRouted.length === 0 ? (
          <SetupStatusCard
            title="No forms route into CRM yet"
            description="Connect a form to CRM or email to start collecting leads from this page."
            severity={sev}
          />
        ) : (
          <div className="space-y-2">
            {formsRouted.map((f) => (
              <SetupStatusCard
                key={f.formId}
                title={f.name}
                description={f.destinationLabel || `Routes to ${f.destinationType}`}
                severity="ok"
                meta={
                  <Badge variant="outline" className="text-[10px]">
                    {f.destinationType}
                  </Badge>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
