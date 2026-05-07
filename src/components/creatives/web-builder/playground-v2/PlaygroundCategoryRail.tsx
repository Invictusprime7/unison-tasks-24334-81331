/**
 * Left rail: Setup categories. Renders blocker counts per category.
 */

import {
  LayoutDashboard,
  Package,
  FormInput,
  MousePointerClick,
  Link2,
  MessageSquare,
  Workflow,
  Users,
  Webhook,
  Search,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaygroundV2Category } from "./types";

const ITEMS: {
  id: PlaygroundV2Category;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "cta", label: "CTA", icon: MousePointerClick },
  { id: "bindings", label: "Bindings", icon: Link2 },
  { id: "forms", label: "Forms", icon: FormInput },
  { id: "readiness", label: "Readiness", icon: ListChecks },
  { id: "products", label: "Products / Services", icon: Package },
  { id: "popups", label: "Popups", icon: MessageSquare },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "crm", label: "CRM", icon: Users },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "seo", label: "SEO / Tracking", icon: Search },
];

export interface CategoryCounts {
  block: number;
  warn: number;
}

interface PlaygroundCategoryRailProps {
  category: PlaygroundV2Category;
  onCategoryChange: (c: PlaygroundV2Category) => void;
  counts?: Partial<Record<PlaygroundV2Category, CategoryCounts>>;
}

export function PlaygroundCategoryRail({
  category,
  onCategoryChange,
  counts = {},
}: PlaygroundCategoryRailProps) {
  return (
    <nav className="flex w-56 flex-col gap-0.5 border-r bg-muted/20 p-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = category === item.id;
        const c = counts[item.id];
        const blockCount = c?.block ?? 0;
        const warnCount = c?.warn ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onCategoryChange(item.id)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="flex items-center gap-1">
              {blockCount > 0 && (
                <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-medium text-destructive">
                  {blockCount}
                </span>
              )}
              {warnCount > 0 && blockCount === 0 && (
                <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-500">
                  {warnCount}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
