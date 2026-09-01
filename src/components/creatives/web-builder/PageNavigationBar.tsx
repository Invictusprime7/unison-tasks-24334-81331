/**
 * PageNavigationBar - Multi-page tab bar for Sandpack/SimplePreview
 * 
 * Shows tabs for each HTML page in VFS, allowing users to switch
 * between pages in the preview. Only visible when >1 page exists.
 */

import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileText, Plus, X, Home } from "lucide-react";
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
}

export function PageNavigationBar({
  pages,
  activePage,
  onSelectPage,
  onAddPage,
  onRemovePage,
}: PageNavigationBarProps) {
  if (pages.length <= 1) return null;

  return (
    <div className="h-9 bg-muted/30 border-b flex items-center px-2 gap-1 shrink-0">
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-0.5 pr-2">
          {pages.map((page) => {
            const isActive = page.path === activePage;
            return (
              <button
                key={page.path}
                onClick={() => onSelectPage(page.path)}
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
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
                    className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
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
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          title="Add new page"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
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
