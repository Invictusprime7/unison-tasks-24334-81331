/**
 * Assistant rail: contextual suggestions derived from readiness items.
 */

import { Button } from "@/components/ui/button";
import { Wand2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ReadinessItem } from "./types";

interface PlaygroundAssistantRailProps {
  pageTitle?: string;
  items: ReadinessItem[];
  onJumpToBlocker?: (item: ReadinessItem) => void;
}

export function PlaygroundAssistantRail({
  pageTitle,
  items,
  onJumpToBlocker,
}: PlaygroundAssistantRailProps) {
  const { toast } = useToast();
  const blockers = items.filter((i) => i.severity !== "ok").slice(0, 6);
  const firstBlocker = blockers[0];

  return (
    <aside className="flex w-72 flex-col border-l bg-muted/20">
      <div className="border-b p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          AI Setup Assistant
        </div>
        <div className="mt-1 text-sm font-medium">
          {pageTitle ? `${pageTitle} suggestions` : "Suggestions"}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {blockers.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              This page looks ready. Run a publish check before going live.
            </div>
          ) : (
            blockers.map((b, i) => (
              <button
                type="button"
                key={b.id}
                onClick={() => onJumpToBlocker?.(b)}
                className="w-full rounded-md border bg-card p-2.5 text-left text-xs hover:bg-muted/40 transition-colors"
              >
                <div className="font-medium leading-tight">
                  {i + 1}. {b.label}
                </div>
                {b.hint && <div className="mt-1 text-muted-foreground">{b.hint}</div>}
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="space-y-1.5 border-t p-3">
        <Button
          size="sm"
          className="w-full"
          disabled={!firstBlocker}
          onClick={() => {
            if (firstBlocker) {
              onJumpToBlocker?.(firstBlocker);
              toast({
                title: "Jumped to first blocker",
                description: firstBlocker.label,
              });
            }
          }}
        >
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          Fix Next Blocker
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() =>
            toast({
              title: "Generate Missing Pieces",
              description: "Coming soon — will scaffold popups, forms, and workflows.",
            })
          }
        >
          Generate Missing Pieces
        </Button>
      </div>
    </aside>
  );
}
