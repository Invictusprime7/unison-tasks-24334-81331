/**
 * BusinessOSPagesGraph — Visual graph of the site topology.
 *
 * Renders pages as nodes (with status badges from the readiness map) and
 * funnels as connected step chains. Click a page to navigate; click a
 * funnel to jump into the funnels playground section.
 *
 * Stage 6 of the Business OS roadmap.
 */

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FileText,
  GitBranch,
  Home as HomeIcon,
  Layers,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageRegistry, BuilderPage, FunnelGraph } from "@/types/pageRegistry";

export interface PagePreviewStatus {
  /** "ready" | "preview" | "blocked" | "missing" */
  status: "ready" | "preview" | "blocked" | "missing";
  /** Optional short reason for non-ready state. */
  reason?: string;
}

interface Props {
  registry: PageRegistry;
  /** Map of pageId → status badge for the page. */
  pageStatus?: Record<string, PagePreviewStatus>;
  onSelectPage?: (pageId: string) => void;
  onSelectFunnel?: (funnelId: string) => void;
  onAddPage?: () => void;
  onAddFunnel?: () => void;
  className?: string;
}

const STATUS_TONE: Record<PagePreviewStatus["status"], string> = {
  ready: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  preview: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  blocked: "border-red-500/40 text-red-300 bg-red-500/10",
  missing: "border-border/40 text-muted-foreground",
};

const STATUS_LABEL: Record<PagePreviewStatus["status"], string> = {
  ready: "Ready",
  preview: "Preview",
  blocked: "Blocked",
  missing: "Missing",
};

export const BusinessOSPagesGraph: React.FC<Props> = ({
  registry,
  pageStatus,
  onSelectPage,
  onSelectFunnel,
  onAddPage,
  onAddFunnel,
  className,
}) => {
  const pages = React.useMemo(() => {
    return Object.values(registry.pages).sort((a, b) => {
      if (a.isHome && !b.isHome) return -1;
      if (!a.isHome && b.isHome) return 1;
      return (a.navOrder ?? 0) - (b.navOrder ?? 0);
    });
  }, [registry.pages]);

  const funnels = React.useMemo(() => {
    return Object.values(registry.funnels || {}).filter((f) => f.steps.length > 0);
  }, [registry.funnels]);

  const pageById = React.useCallback(
    (id: string): BuilderPage | undefined => registry.pages[id],
    [registry.pages],
  );

  return (
    <Card className={cn("bg-card/40 border-border/40 p-4 space-y-4", className)}>
      {/* Pages graph */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Pages
            </h3>
            <Badge variant="outline" className="h-5 text-[10px] border-border/40">
              {pages.length}
            </Badge>
          </div>
          {onAddPage && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
              onClick={onAddPage}
            >
              <Plus className="h-3 w-3 mr-0.5" /> Add page
            </Button>
          )}
        </header>

        {pages.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 border border-dashed border-border/30 rounded-md text-center">
            No pages yet — add one to start building.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {pages.map((page) => (
              <PageNode
                key={page.pageId}
                page={page}
                status={pageStatus?.[page.pageId]}
                onClick={onSelectPage ? () => onSelectPage(page.pageId) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Funnels graph */}
      <section>
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-violet-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Funnels
            </h3>
            <Badge variant="outline" className="h-5 text-[10px] border-border/40">
              {funnels.length}
            </Badge>
          </div>
          {onAddFunnel && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-violet-300 hover:text-violet-200 hover:bg-violet-500/10"
              onClick={onAddFunnel}
            >
              <Plus className="h-3 w-3 mr-0.5" /> Add funnel
            </Button>
          )}
        </header>

        {funnels.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 border border-dashed border-border/30 rounded-md text-center">
            No funnels yet — chain pages into a conversion sequence.
          </p>
        ) : (
          <div className="space-y-2">
            {funnels.map((funnel) => (
              <FunnelChain
                key={funnel.funnelId}
                funnel={funnel}
                pageById={pageById}
                pageStatus={pageStatus}
                onSelectFunnel={onSelectFunnel ? () => onSelectFunnel(funnel.funnelId) : undefined}
                onSelectPage={onSelectPage}
              />
            ))}
          </div>
        )}
      </section>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────

function PageNode({
  page,
  status,
  onClick,
}: {
  page: BuilderPage;
  status?: PagePreviewStatus;
  onClick?: () => void;
}) {
  const s = status?.status || "missing";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-lg border border-border/40 bg-card/40 p-2.5 text-left transition-all",
        onClick && "hover:border-emerald-500/40 hover:bg-emerald-500/5",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {page.isHome ? (
            <HomeIcon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-foreground truncate">{page.title}</span>
        </div>
      </div>
      <code className="text-[10px] text-muted-foreground truncate w-full">{page.path}</code>
      <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px]", STATUS_TONE[s])}>
        {STATUS_LABEL[s]}
      </Badge>
      {status?.reason && (
        <p className="text-[10px] text-red-400/80 leading-tight line-clamp-1">{status.reason}</p>
      )}
    </button>
  );
}

function FunnelChain({
  funnel,
  pageById,
  pageStatus,
  onSelectFunnel,
  onSelectPage,
}: {
  funnel: FunnelGraph;
  pageById: (id: string) => BuilderPage | undefined;
  pageStatus?: Record<string, PagePreviewStatus>;
  onSelectFunnel?: () => void;
  onSelectPage?: (pageId: string) => void;
}) {
  const orderedSteps = React.useMemo(() => {
    return [...funnel.steps].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [funnel.steps]);

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={onSelectFunnel}
          disabled={!onSelectFunnel}
          className="flex items-center gap-2 text-left"
        >
          <GitBranch className="h-3.5 w-3.5 text-violet-300" />
          <span className="text-xs font-semibold text-foreground hover:text-violet-200 transition">
            {funnel.name}
          </span>
          {funnel.funnelType && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] border-violet-500/30 text-violet-300">
              {funnel.funnelType}
            </Badge>
          )}
        </button>
        <Badge
          variant="outline"
          className={cn(
            "h-5 text-[10px]",
            funnel.isActive
              ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
              : "border-border/40 text-muted-foreground",
          )}
        >
          {funnel.isActive ? "active" : "draft"}
        </Badge>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {orderedSteps.map((step, idx) => {
          const page = pageById(step.pageId);
          const status = pageStatus?.[step.pageId]?.status || (page ? "missing" : "blocked");
          return (
            <React.Fragment key={step.stepId}>
              <button
                type="button"
                onClick={onSelectPage && page ? () => onSelectPage(page.pageId) : undefined}
                disabled={!onSelectPage || !page}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md border px-2 py-1 transition",
                  STATUS_TONE[status],
                  onSelectPage && page && "hover:bg-emerald-500/10 cursor-pointer",
                )}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-70">
                  {step.role}
                </span>
                <span className="text-[11px] font-semibold leading-tight">
                  {page?.title || step.pageId}
                </span>
              </button>
              {idx < orderedSteps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-violet-400/60 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
