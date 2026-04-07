/**
 * PageRouteBar — Shows current page info from PageRegistry above the preview.
 * Displays page name, route, funnel badge, home/nav toggles, and quick page switching.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home, Eye, EyeOff, GitBranch, FileText, ChevronDown,
  AlertTriangle, Settings, ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BuilderPage, PageRegistry } from "@/types/pageRegistry";

// ============================================================================
// Props
// ============================================================================

interface PageRouteBarProps {
  /** Current active VFS path */
  activePagePath: string;
  /** The full page registry from creator playground */
  pageRegistry: PageRegistry;
  /** Callback to navigate to a page */
  onNavigateToPage: (pageId: string) => void;
  /** Callback to toggle nav visibility */
  onToggleNavVisibility: (pageId: string, visible: boolean) => void;
  /** Callback to set homepage */
  onSetHomePage: (pageId: string) => void;
  /** Callback to open playground for page settings */
  onOpenPlayground: (section?: "pages" | "funnels") => void;
  /** Route conflicts to surface */
  routeConflicts?: string[];
}

// ============================================================================
// Component
// ============================================================================

export function PageRouteBar({
  activePagePath,
  pageRegistry,
  onNavigateToPage,
  onToggleNavVisibility,
  onSetHomePage,
  onOpenPlayground,
  routeConflicts = [],
}: PageRouteBarProps) {
  const allPages = useMemo(
    () => Object.values(pageRegistry.pages).sort((a, b) => a.navOrder - b.navOrder),
    [pageRegistry.pages]
  );

  // Match active VFS path to a registry page
  const activePage = useMemo(() => {
    if (allPages.length === 0) return null;
    // Try to match by deriving component name from path
    const pathSegment = activePagePath
      .replace(/^\/src\/pages\//, "")
      .replace(/^\/src\//, "")
      .replace(/\.(tsx|jsx|ts|js)$/, "")
      .replace(/^funnels\/[^/]+\//, ""); // strip funnel dir prefix
    
    return allPages.find((p) => {
      const registrySlug = p.path.replace(/^\//, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const vfsSlug = pathSegment.replace(/[^a-z0-9]/gi, "").toLowerCase();
      return registrySlug === vfsSlug || p.title.replace(/[^a-z0-9]/gi, "").toLowerCase() === vfsSlug;
    }) || (activePagePath.includes("App") ? allPages.find((p) => p.isHome) : null);
  }, [allPages, activePagePath]);

  const funnelInfo = useMemo(() => {
    if (!activePage?.funnelId) return null;
    const funnel = pageRegistry.funnels[activePage.funnelId];
    if (!funnel) return null;
    const stepIdx = funnel.steps.findIndex((s) => s.pageId === activePage.pageId);
    return { name: funnel.name, step: stepIdx + 1, total: funnel.steps.length };
  }, [activePage, pageRegistry.funnels]);

  return (
    <div className="h-8 bg-background/90 backdrop-blur-sm border-b border-border/20 flex items-center px-2 gap-1.5 shrink-0 z-10">
      {/* Page Switcher Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 gap-1.5 text-[11px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/30"
          >
            <FileText className="h-3 w-3 text-primary/70" />
            <span className="max-w-[140px] truncate">
              {activePage?.title || activePagePath.split("/").pop()?.replace(/\.\w+$/, "") || "Page"}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-[#0d0d18] border-border/30">
          {allPages.map((page) => (
            <DropdownMenuItem
              key={page.pageId}
              onClick={() => onNavigateToPage(page.pageId)}
              className={cn(
                "text-xs gap-2 cursor-pointer",
                activePage?.pageId === page.pageId && "bg-primary/10 text-primary"
              )}
            >
              {page.isHome ? <Home className="h-3 w-3 text-amber-400" /> : <FileText className="h-3 w-3" />}
              <span className="flex-1 truncate">{page.title}</span>
              <span className="text-[9px] text-muted-foreground font-mono">{page.path}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenPlayground("pages")} className="text-xs gap-2 cursor-pointer">
            <Settings className="h-3 w-3" />
            Manage Pages...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Route slug */}
      {activePage && (
        <span className="text-[10px] font-mono text-muted-foreground/60 max-w-[100px] truncate">
          {activePage.path}
        </span>
      )}

      {/* Funnel badge */}
      {funnelInfo && (
        <Badge
          variant="outline"
          className="h-4 px-1.5 text-[9px] border-fuchsia-500/40 text-fuchsia-400 bg-fuchsia-500/10 cursor-pointer hover:bg-fuchsia-500/20"
          onClick={() => onOpenPlayground("funnels")}
        >
          <GitBranch className="h-2.5 w-2.5 mr-1" />
          {funnelInfo.name} ({funnelInfo.step}/{funnelInfo.total})
        </Badge>
      )}

      {/* Page type badge */}
      {activePage && activePage.pageType !== "custom" && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
          {activePage.pageType}
        </Badge>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Route conflicts warning */}
      {routeConflicts.length > 0 && (
        <Badge
          variant="outline"
          className="h-4 px-1.5 text-[9px] border-amber-500/40 text-amber-400 bg-amber-500/10"
          title={`Conflicts: ${routeConflicts.join(", ")}`}
        >
          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
          {routeConflicts.length} conflict{routeConflicts.length > 1 ? "s" : ""}
        </Badge>
      )}

      {/* Home toggle */}
      {activePage && !activePage.isHome && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground/50 hover:text-amber-400"
          title="Set as homepage"
          onClick={() => onSetHomePage(activePage.pageId)}
        >
          <Home className="h-3 w-3" />
        </Button>
      )}
      {activePage?.isHome && (
        <Home className="h-3 w-3 text-amber-400" />
      )}

      {/* Nav visibility toggle */}
      {activePage && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground/50 hover:text-foreground"
          title={activePage.showInNav ? "Hide from navigation" : "Show in navigation"}
          onClick={() => onToggleNavVisibility(activePage.pageId, !activePage.showInNav)}
        >
          {activePage.showInNav ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
      )}

      {/* Open in preview */}
      {activePage && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground/50 hover:text-foreground"
          title="Open page settings in Playground"
          onClick={() => onOpenPlayground("pages")}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Route Conflict Detection
// ============================================================================

/**
 * Detect duplicate route slugs in the page registry.
 * Returns an array of conflicting paths.
 */
export function detectRouteConflicts(registry: PageRegistry): string[] {
  const paths = Object.values(registry.pages).map((p) => p.path.toLowerCase());
  const seen = new Set<string>();
  const conflicts: string[] = [];
  for (const path of paths) {
    if (seen.has(path)) {
      conflicts.push(path);
    }
    seen.add(path);
  }
  return [...new Set(conflicts)];
}
