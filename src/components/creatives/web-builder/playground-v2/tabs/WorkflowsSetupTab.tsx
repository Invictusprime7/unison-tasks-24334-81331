/**
 * WorkflowsSetupTab — automation recipes derived from CTA/form intents on this page.
 *
 * Read-only inference: each unique business intent on the page implies a workflow
 * stub (e.g. lead.capture → "Notify owner + add to CRM"). Editing arrives in a later milestone.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";

const WORKFLOW_TEMPLATES: Record<string, { title: string; description: string }> = {
  "lead.capture": {
    title: "Lead Capture Workflow",
    description: "Send confirmation email + push contact to CRM + notify owner.",
  },
  "booking.book": {
    title: "Booking Confirmation Workflow",
    description: "Email customer ICS invite + add to calendar + remind 24h before.",
  },
  "pay.checkout": {
    title: "Checkout Workflow",
    description: "Send receipt + grant access + record purchase in CRM.",
  },
  "newsletter.subscribe": {
    title: "Newsletter Subscribe Workflow",
    description: "Add to mailing list and send welcome email.",
  },
  "contact.message": {
    title: "Contact Message Workflow",
    description: "Notify business owner and create CRM ticket.",
  },
};

interface WorkflowsSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function WorkflowsSetupTab({ view }: WorkflowsSetupTabProps) {
  const intents = new Set<string>();
  view.bindings.forEach((b) => intents.add(b.intent));
  view.forms.forEach((f) => f.submitIntentId && intents.add(f.submitIntentId));

  const workflows = Array.from(intents)
    .filter((i) => !i.startsWith("nav."))
    .map((intent) => ({
      intent,
      template: WORKFLOW_TEMPLATES[intent] ?? {
        title: `${intent} workflow`,
        description: "Generic intent handler — define follow-up actions.",
      },
    }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Workflows on {view.page.title}</h2>
        <p className="text-sm text-muted-foreground">
          Inferred from this page's CTAs and form intents. Each will become an editable recipe.
        </p>
      </div>

      <div className="space-y-2">
        {workflows.length === 0 ? (
          <SetupStatusCard
            title="No workflows inferred"
            description="Add a CTA or form with a business intent to get automation suggestions."
            severity="warn"
          />
        ) : (
          workflows.map(({ intent, template }) => (
            <SetupStatusCard
              key={intent}
              title={template.title}
              description={template.description}
              severity="warn"
              meta={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    intent: {intent}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    stub
                  </Badge>
                </div>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
