/**
 * SEOSetupTab — surfaces page metadata for SEO and tracking.
 */

import { Badge } from "@/components/ui/badge";
import { SetupStatusCard } from "../cards/SetupStatusCard";
import type { PlaygroundV2DerivedPageView } from "../types";

interface SEOSetupTabProps {
  view: PlaygroundV2DerivedPageView;
}

export function SEOSetupTab({ view }: SEOSetupTabProps) {
  const page = view.page as typeof view.page & {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    canonicalUrl?: string;
  };

  const hasTitle = Boolean(page.seoTitle || page.title);
  const hasDescription = Boolean(page.seoDescription);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">SEO & Tracking</h2>
        <p className="text-sm text-muted-foreground">
          Search and analytics metadata for {page.title}.
        </p>
      </div>

      <SetupStatusCard
        title="Page title"
        description={page.seoTitle || page.title || "Not set"}
        severity={hasTitle ? "ok" : "block"}
        meta={
          page.seoTitle ? (
            <Badge variant="outline" className="text-[10px]">
              custom
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              fallback to page title
            </Badge>
          )
        }
      />

      <SetupStatusCard
        title="Meta description"
        description={page.seoDescription || "No description set — add one for better search visibility."}
        severity={hasDescription ? "ok" : "warn"}
      />

      <SetupStatusCard
        title="Canonical URL"
        description={page.canonicalUrl || `Auto: ${page.path}`}
        severity={page.canonicalUrl ? "ok" : "warn"}
      />

      <SetupStatusCard
        title="Tracking pixels"
        description="GA4, Meta Pixel and conversion event wiring — coming soon."
        severity="warn"
        meta={
          <Badge variant="secondary" className="text-[10px]">
            soon
          </Badge>
        }
      />
    </div>
  );
}
