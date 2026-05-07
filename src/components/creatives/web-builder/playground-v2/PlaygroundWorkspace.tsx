/**
 * Workspace — center pane that routes the selected category to a tab.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { OverviewSetupTab } from "./tabs/OverviewSetupTab";
import { CTASetupTab } from "./tabs/CTASetupTab";
import { BindingsSetupTab } from "./tabs/BindingsSetupTab";
import { FormsSetupTab } from "./tabs/FormsSetupTab";
import { ReadinessSetupTab } from "./tabs/ReadinessSetupTab";
import { ProductsSetupTab } from "./tabs/ProductsSetupTab";
import { PopupsSetupTab } from "./tabs/PopupsSetupTab";
import { WorkflowsSetupTab } from "./tabs/WorkflowsSetupTab";
import { CRMSetupTab } from "./tabs/CRMSetupTab";
import { WebhooksSetupTab } from "./tabs/WebhooksSetupTab";
import { SEOSetupTab } from "./tabs/SEOSetupTab";
import type { PlaygroundV2Category, PlaygroundV2Config, PlaygroundV2DerivedPageView } from "./types";

interface PlaygroundWorkspaceProps {
  category: PlaygroundV2Category;
  view: PlaygroundV2DerivedPageView | null;
  config: PlaygroundV2Config;
}

export function PlaygroundWorkspace({ category, view, config }: PlaygroundWorkspaceProps) {
  if (!view) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Select a page from the topology to begin setup.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl p-6">
        {category === "overview" && <OverviewSetupTab view={view} />}
        {category === "cta" && <CTASetupTab view={view} />}
        {category === "bindings" && <BindingsSetupTab view={view} />}
        {category === "forms" && <FormsSetupTab view={view} />}
        {category === "readiness" && <ReadinessSetupTab view={view} />}
        {category === "products" && <ProductsSetupTab view={view} config={config} />}
        {category === "popups" && <PopupsSetupTab view={view} />}
        {category === "workflows" && <WorkflowsSetupTab view={view} />}
        {category === "crm" && <CRMSetupTab view={view} config={config} />}
        {category === "webhooks" && <WebhooksSetupTab view={view} />}
        {category === "seo" && <SEOSetupTab view={view} />}
      </div>
    </ScrollArea>
  );
}
