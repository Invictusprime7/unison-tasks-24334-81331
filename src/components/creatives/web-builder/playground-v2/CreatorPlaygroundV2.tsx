/**
 * CreatorPlaygroundV2 — Launch Control shell.
 *
 * Composes header + mode tabs + 3-pane workspace (category rail · workspace · assistant).
 * Reads from canonical PlaygroundState and PageRegistry; does not mutate.
 *
 * Mount this component anywhere the legacy Creator Playground was rendered.
 */

import { useMemo, useState } from "react";
import type { PlaygroundBinding, PlaygroundCalendar, PlaygroundPopup } from "@/types/playground";
import type { PageRegistry } from "@/types/pageRegistry";
import type { CreatorData } from "@/types/creatorData";
import { PlaygroundHeader } from "./PlaygroundHeader";
import { PlaygroundModeTabs } from "./PlaygroundModeTabs";
import { PlaygroundCategoryRail } from "./PlaygroundCategoryRail";
import { PlaygroundWorkspace } from "./PlaygroundWorkspace";
import { PlaygroundAssistantRail } from "./PlaygroundAssistantRail";
import { FunnelFlowView } from "./FunnelFlowView";
import { BusinessSystemsView } from "./BusinessSystemsView";
import { usePlaygroundV2Config, derivePageView } from "./hooks/usePlaygroundV2Config";
import type { PlaygroundV2Category, PlaygroundV2Mode } from "./types";

export interface CreatorPlaygroundV2Props {
  businessId: string | null;
  projectId: string | null;
  businessName?: string;
  pageRegistry: PageRegistry;
  creatorData: CreatorData;
  bindings: Record<string, PlaygroundBinding>;
  popups: Record<string, PlaygroundPopup>;
  calendars: Record<string, PlaygroundCalendar>;
  initialPageId?: string | null;
  initialCategory?: PlaygroundV2Category;
  onPageSelect?: (pageId: string) => void;
  onPreviewPage?: (pageId: string) => void;
}

export function CreatorPlaygroundV2(props: CreatorPlaygroundV2Props) {
  const config = usePlaygroundV2Config({
    businessId: props.businessId,
    projectId: props.projectId,
    pageRegistry: props.pageRegistry,
    creatorData: props.creatorData,
    bindings: props.bindings,
    popups: props.popups,
    calendars: props.calendars,
  });

  const allPages = useMemo(
    () => Object.values(config.pageRegistry.pages || {}),
    [config.pageRegistry.pages],
  );

  const [mode, setMode] = useState<PlaygroundV2Mode>("page-setup");
  const [category, setCategory] = useState<PlaygroundV2Category>(
    props.initialCategory ?? "overview",
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    props.initialPageId ?? config.pageRegistry.homePageId ?? allPages[0]?.pageId ?? null,
  );

  const view = derivePageView(config, selectedPageId);

  // Aggregate site readiness + per-category counts (for the active page).
  const { siteScore, siteBlockers, categoryCounts } = useMemo(() => {
    const allReadiness = Object.values(config.readiness);
    const totalScore = allReadiness.reduce((sum, r) => sum + r.score, 0);
    const avgScore = allReadiness.length
      ? Math.round(totalScore / allReadiness.length)
      : 0;
    const blockers = allReadiness.reduce(
      (sum, r) => sum + r.items.filter((i) => i.severity === "block").length,
      0,
    );
    const counts: Partial<Record<PlaygroundV2Category, { block: number; warn: number }>> = {};
    if (view) {
      for (const item of view.readiness.items) {
        const slot = (counts[item.category] = counts[item.category] || { block: 0, warn: 0 });
        if (item.severity === "block") slot.block += 1;
        else if (item.severity === "warn") slot.warn += 1;
      }
    }
    return { siteScore: avgScore, siteBlockers: blockers, categoryCounts: counts };
  }, [config.readiness, view]);

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId);
    setMode("page-setup");
    props.onPageSelect?.(pageId);
  };

  return (
    <div className="flex h-full min-h-[600px] w-full flex-col bg-background">
      <PlaygroundHeader
        businessName={props.businessName}
        page={view?.page ?? null}
        readinessScore={view?.readiness.score ?? 0}
        siteScore={siteScore}
        siteBlockers={siteBlockers}
        onPreview={() => view && props.onPreviewPage?.(view.page.pageId)}
        onRunReadiness={() => setCategory("readiness")}
        onPublishChecklist={() => setCategory("readiness")}
      />

      <div className="flex items-center justify-between gap-3 border-b bg-muted/10 px-4 py-2">
        <PlaygroundModeTabs mode={mode} onModeChange={setMode} />
        {mode === "page-setup" && (
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={selectedPageId ?? ""}
            onChange={(e) => setSelectedPageId(e.target.value || null)}
          >
            {allPages.map((p) => (
              <option key={p.pageId} value={p.pageId}>
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {mode === "page-setup" && (
          <>
            <PlaygroundCategoryRail
              category={category}
              onCategoryChange={setCategory}
              counts={categoryCounts}
            />
            <PlaygroundWorkspace category={category} view={view} config={config} />
            <PlaygroundAssistantRail
              pageTitle={view?.page.title}
              items={view?.readiness.items ?? []}
              onJumpToBlocker={(item) => {
                if (item.pageId && item.pageId !== selectedPageId) {
                  setSelectedPageId(item.pageId);
                }
                setCategory(item.category);
              }}
            />
          </>
        )}

        {mode === "funnel-flow" && (
          <FunnelFlowView config={config} onSelectPage={handlePageSelect} />
        )}

        {mode === "systems" && <BusinessSystemsView config={config} />}
      </div>
    </div>
  );
}
