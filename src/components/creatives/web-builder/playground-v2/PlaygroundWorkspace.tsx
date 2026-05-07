/**
 * Workspace — center pane that routes the selected category to a tab.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { OverviewSetupTab } from "./tabs/OverviewSetupTab";
import { CTASetupTab } from "./tabs/CTASetupTab";
import { BindingsSetupTab } from "./tabs/BindingsSetupTab";
import { FormsSetupTab } from "./tabs/FormsSetupTab";
import { ReadinessSetupTab } from "./tabs/ReadinessSetupTab";
import type { PlaygroundV2Category, PlaygroundV2DerivedPageView } from "./types";

interface PlaygroundWorkspaceProps {
  category: PlaygroundV2Category;
  view: PlaygroundV2DerivedPageView | null;
}

const COMING_SOON: Partial<Record<PlaygroundV2Category, string>> = {
  products: "Products & Services library",
  popups: "Popup configuration",
  workflows: "Automation workflows",
  crm: "CRM routing",
  webhooks: "Webhook connections",
  seo: "SEO & tracking",
};

export function PlaygroundWorkspace({ category, view }: PlaygroundWorkspaceProps) {
  if (!view) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Select a page from the topology to begin setup.
      </div>
    );
  }

  const comingSoon = COMING_SOON[category];

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl p-6">
        {category === "overview" && <OverviewSetupTab view={view} />}
        {category === "cta" && <CTASetupTab view={view} />}
        {category === "bindings" && <BindingsSetupTab view={view} />}
        {category === "forms" && <FormsSetupTab view={view} />}
        {category === "readiness" && <ReadinessSetupTab view={view} />}
        {comingSoon && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">{comingSoon}</h2>
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              {comingSoon} arrives in the next Launch Control milestone. The
              underlying data is already wired — only the editor UI is pending.
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
