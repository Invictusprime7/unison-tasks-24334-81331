/**
 * PageNavigationBar - Multi-page tab bar for Sandpack/SimplePreview
 * 
 * Shows tabs for each HTML page in VFS, allowing users to switch
 * between pages in the preview. Only visible when >1 page exists.
 */

import { cn } from "@/lib/utils";
import { ExternalLink, FileText, Home, Plus, Redo2, RefreshCcw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface PageTab {
  /** VFS file path, e.g. "/checkout.html" */
  path: string;
  /** Human-readable label */
  label: string;
  /** Whether this is the main/index page */
  isMain: boolean;
}

interface PageNavigationBarProps {
  /** All pages available in VFS */
  pages: PageTab[];
  /** Currently active page path */
  activePage: string;
  /** Callback when user selects a page */
  onSelectPage: (path: string) => void;
  /** Optional: callback to add a new page */
  onAddPage?: () => void;
  /** Optional: callback to remove a page */
  onRemovePage?: (path: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onRefresh?: () => void;
  onOpenPreview?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isRefreshing?: boolean;
}

export function PageNavigationBar({
  pages,
  activePage,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onUndo,
  onRedo,
  onRefresh,
  onOpenPreview,
  canUndo = false,
  canRedo = false,
  isRefreshing = false,
}: PageNavigationBarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/[0.05] bg-transparent px-2">
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-0.5 pr-2">
          {pages.map((page) => {
            const isActive = page.path === activePage;
            return (
              <button
                key={page.path}
                onClick={() => onSelectPage(page.path)}
                className={cn(
                    "group relative flex h-7 items-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-indigo-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={page.path}
              >
                {page.isMain ? (
                  <Home className="h-3 w-3 shrink-0" />
                ) : (
                  <FileText className="h-3 w-3 shrink-0" />
                )}
                <span className="max-w-[120px] truncate">{page.label}</span>
                {onRemovePage && !page.isMain && (
                  <X
                    className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePage(page.path);
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
      {onAddPage && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddPage}
          className="h-7 w-7 shrink-0 rounded text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          title="Add new page"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
      <div className="ml-1 flex shrink-0 items-center gap-0.5 border-l border-white/[0.06] pl-1">
        {onUndo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-7 w-7 rounded text-muted-foreground hover:bg-white/[0.05] hover:text-foreground disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onRedo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-7 w-7 rounded text-muted-foreground hover:bg-white/[0.05] hover:text-foreground disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 w-7 rounded text-muted-foreground hover:bg-white/[0.05] hover:text-foreground disabled:opacity-30"
            title="Refresh preview (F5)"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        )}
        {onOpenPreview && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenPreview}
            className="h-7 w-7 rounded text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            title="Open preview in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Extract page tabs from VFS file map.
 * Returns only .html files, sorted with index.html first.
 */
export function extractPageTabs(vfsFiles: Record<string, string>): PageTab[] {
  const htmlPaths = Object.keys(vfsFiles).filter(
    (p) => p.endsWith(".html") && !p.includes("/src/")
  );

  if (htmlPaths.length === 0) return [];

  return htmlPaths
    .map((path) => {
      const content = vfsFiles[path] || "";
      const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
      const isMain = path === "/index.html" || path === "/";
      const label =
        titleMatch?.[1] ||
        path
          .replace(/^\//, "")
          .replace(/\.html$/, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) ||
        "Home";

      return { path, label, isMain };
    })
    .sort((a, b) => {
      if (a.isMain) return -1;
      if (b.isMain) return 1;
      return a.label.localeCompare(b.label);
    });
}
