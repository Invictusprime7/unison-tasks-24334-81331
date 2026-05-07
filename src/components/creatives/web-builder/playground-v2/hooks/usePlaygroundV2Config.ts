/**
 * usePlaygroundV2Config
 *
 * Assembles the V2 config object from canonical sources (PlaygroundState +
 * PageRegistry + CreatorData). Pure derivation — no writes.
 */

import { useMemo } from "react";
import type { PlaygroundBinding, PlaygroundCalendar, PlaygroundPopup } from "@/types/playground";
import type { CreatorData } from "@/types/creatorData";
import type { BuilderPage, PageRegistry } from "@/types/pageRegistry";
import type {
  PageReadiness,
  PlaygroundV2Config,
  PlaygroundV2DerivedPageView,
  ReadinessItem,
} from "../types";

export interface PlaygroundV2Inputs {
  businessId: string | null;
  projectId: string | null;
  pageRegistry: PageRegistry;
  creatorData: CreatorData;
  bindings: Record<string, PlaygroundBinding>;
  popups: Record<string, PlaygroundPopup>;
  calendars: Record<string, PlaygroundCalendar>;
}

const NAV_INTENTS = new Set(["nav.goto", "nav.external", "nav.anchor"]);

function computePageReadiness(
  page: BuilderPage,
  bindings: PlaygroundBinding[],
  forms: { formId: string; attachedToPageIds?: string[] }[],
): PageReadiness {
  const items: ReadinessItem[] = [];
  const pageBindings = bindings.filter((b) => b.sourcePageId === page.pageId);
  const ctas = pageBindings.filter((b) => !NAV_INTENTS.has(b.intent));

  if (pageBindings.length === 0) {
    items.push({
      id: `${page.pageId}-no-ctas`,
      label: "No interactive elements detected on this page",
      severity: "warn",
      category: "cta",
      hint: "Add a CTA or form to make this page actionable.",
      pageId: page.pageId,
    });
  }

  for (const b of pageBindings) {
    if (!b.isValid) {
      items.push({
        id: `binding-invalid-${b.bindingId}`,
        label: `Binding "${b.sourceLabel}" is unresolved`,
        severity: "block",
        category: "bindings",
        hint: b.validationMessage || b.fixHints?.[0],
        pageId: page.pageId,
      });
    } else if (b.readiness === "stubbed" || b.readiness === "blocked") {
      items.push({
        id: `binding-stub-${b.bindingId}`,
        label: `${b.sourceLabel} → ${b.intent} needs setup`,
        severity: b.readiness === "blocked" ? "block" : "warn",
        category: "bindings",
        hint: b.fixHints?.[0],
        pageId: page.pageId,
      });
    }
  }

  // Heuristic: pages of type booking/checkout require at least one CTA
  if ((page.pageType === "booking" || page.pageType === "checkout") && ctas.length === 0) {
    items.push({
      id: `${page.pageId}-needs-cta`,
      label: `${page.pageType} page needs a primary CTA`,
      severity: "block",
      category: "cta",
      pageId: page.pageId,
    });
  }

  const blocks = items.filter((i) => i.severity === "block").length;
  const warns = items.filter((i) => i.severity === "warn").length;
  const total = Math.max(items.length, 1);
  const okWeight = items.length === 0 ? 1 : (total - blocks - warns * 0.5) / total;
  const score = Math.max(0, Math.min(100, Math.round(okWeight * 100)));

  return { pageId: page.pageId, score, items };
}

export function usePlaygroundV2Config(inputs: PlaygroundV2Inputs): PlaygroundV2Config {
  return useMemo(() => {
    const bindingsArr = Object.values(inputs.bindings || {});
    const popupsArr = Object.values(inputs.popups || {});
    const calendarsArr = Object.values(inputs.calendars || {});

    const forms = Object.values(inputs.creatorData.forms || {});
    const products = Object.values(inputs.creatorData.products || {});
    const services = Object.values(inputs.creatorData.services || {});

    const allPages = Object.values(inputs.pageRegistry.pages || {}) as BuilderPage[];
    const readiness: Record<string, PageReadiness> = {};
    for (const p of allPages) {
      readiness[p.pageId] = computePageReadiness(p, bindingsArr, forms);
    }

    return {
      businessId: inputs.businessId,
      projectId: inputs.projectId,
      pageRegistry: inputs.pageRegistry,
      creatorData: inputs.creatorData,
      bindings: bindingsArr,
      popups: popupsArr,
      calendars: calendarsArr,
      forms,
      products,
      services,
      readiness,
    };
  }, [inputs]);
}

export function derivePageView(
  config: PlaygroundV2Config,
  pageId: string | null,
): PlaygroundV2DerivedPageView | null {
  if (!pageId) return null;
  const page = config.pageRegistry.pages?.[pageId];
  if (!page) return null;

  const pageBindings = config.bindings.filter((b) => b.sourcePageId === pageId);
  const ctas = pageBindings.filter((b) => !NAV_INTENTS.has(b.intent));
  const popups = config.popups.filter((p) => p.activeOnPageIds?.includes(pageId));
  const forms = config.forms.filter((f) => f.attachedToPageIds?.includes(pageId));
  const readiness = config.readiness[pageId] || { pageId, score: 0, items: [] };

  return { page, ctas, bindings: pageBindings, forms, popups, readiness };
}
