/**
 * BusinessSystemsView — placeholder index of global system editors.
 */

import { Package, FormInput, Users, Workflow, Webhook, MousePointerClick, Building, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlaygroundV2Config } from "./types";

interface BusinessSystemsViewProps {
  config: PlaygroundV2Config;
}

export function BusinessSystemsView({ config }: BusinessSystemsViewProps) {
  const cards = [
    { icon: Package, label: "Products / Services", count: config.products.length + config.services.length },
    { icon: FormInput, label: "Forms", count: config.forms.length },
    { icon: Users, label: "CRM Pipelines", count: 0 },
    { icon: Workflow, label: "Automation Recipes", count: 0 },
    { icon: Webhook, label: "Webhook Connections", count: 0 },
    { icon: MousePointerClick, label: "Global CTA Rules", count: config.bindings.length },
    { icon: Building, label: "Business Profile", count: 1 },
    { icon: Search, label: "Brand / SEO / Tracking", count: 0 },
  ];

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <h2 className="text-xl font-semibold">Business Systems</h2>
          <p className="text-sm text-muted-foreground">
            Global business logic shared across every page in this project.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {c.label}
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="text-2xl font-semibold tabular-nums">{c.count}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    editor coming soon
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
