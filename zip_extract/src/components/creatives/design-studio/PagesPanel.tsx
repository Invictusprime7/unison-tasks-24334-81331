import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Copy } from "lucide-react";
import { useState } from "react";

interface Page {
  id: string;
  name: string;
  thumbnail?: string;
  canvasData: any;
}

interface PagesPanelProps {
  pages: Page[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  onPageAdd: () => void;
  onPageDelete: (pageId: string) => void;
  onPageDuplicate: (pageId: string) => void;
  onPageRename: (pageId: string, name: string) => void;
}

export const PagesPanel = ({
  pages,
  currentPageId,
  onPageSelect,
  onPageAdd,
  onPageDelete,
  onPageDuplicate,
  onPageRename,
}: PagesPanelProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Pages</CardTitle>
          <Button size="sm" variant="outline" onClick={onPageAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2 p-4">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`relative group rounded-lg border-2 transition-all cursor-pointer ${
                  currentPageId === page.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => onPageSelect(page.id)}
              >
                <div className="aspect-video bg-muted rounded-t-md overflow-hidden">
                  {page.thumbnail ? (
                    <img src={page.thumbnail} alt={page.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      Page {index + 1}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  {editingId === page.id ? (
                    <input
                      type="text"
                      defaultValue={page.name}
                      className="w-full px-2 py-1 text-sm border rounded"
                      autoFocus
                      onBlur={(e) => {
                        onPageRename(page.id, e.target.value);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onPageRename(page.id, e.currentTarget.value);
                          setEditingId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-sm font-medium truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(page.id);
                      }}
                    >
                      {page.name}
                    </div>
                  )}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageDuplicate(page.id);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {pages.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPageDelete(page.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
