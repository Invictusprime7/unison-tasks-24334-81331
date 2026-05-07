/**
 * Creator Playground V2 — Local types
 *
 * Lightweight shape used by the V2 shell. Composed from canonical
 * PlaygroundState + PageRegistry + CreatorData rather than introducing a
 * new persisted schema.
 */

import type { PlaygroundBinding, PlaygroundPopup, PlaygroundCalendar } from "@/types/playground";
import type { BuilderPage, PageRegistry } from "@/types/pageRegistry";
import type { CreatorData, CreatorForm, CreatorProduct, CreatorService } from "@/types/creatorData";

export type PlaygroundV2Mode = "page-setup" | "funnel-flow" | "systems";

export type PlaygroundV2Category =
  | "overview"
  | "products"
  | "forms"
  | "cta"
  | "bindings"
  | "popups"
  | "workflows"
  | "crm"
  | "webhooks"
  | "seo"
  | "readiness";

export type ReadinessSeverity = "ok" | "warn" | "block";

export interface ReadinessItem {
  id: string;
  label: string;
  severity: ReadinessSeverity;
  category: PlaygroundV2Category;
  hint?: string;
  pageId?: string;
}

export interface PageReadiness {
  pageId: string;
  score: number; // 0-100
  items: ReadinessItem[];
}

export interface PlaygroundV2Config {
  businessId: string | null;
  projectId: string | null;
  pageRegistry: PageRegistry;
  creatorData: CreatorData;
  bindings: PlaygroundBinding[];
  popups: PlaygroundPopup[];
  calendars: PlaygroundCalendar[];
  forms: CreatorForm[];
  products: CreatorProduct[];
  services: CreatorService[];
  readiness: Record<string, PageReadiness>;
}

export interface PlaygroundV2DerivedPageView {
  page: BuilderPage;
  ctas: PlaygroundBinding[];
  bindings: PlaygroundBinding[];
  forms: CreatorForm[];
  popups: PlaygroundPopup[];
  readiness: PageReadiness;
}
