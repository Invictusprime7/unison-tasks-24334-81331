import React from 'react';
import { X } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  name: string;
}

interface EditorTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

export function EditorTabs({ tabs, activeTabId, onTabSelect, onTabClose }: EditorTabsProps) {
  return (
    <div className="border-b bg-background">
      <ScrollArea className="w-full">
        <div className="flex">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 border-r cursor-pointer text-sm whitespace-nowrap",
                activeTabId === tab.id
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
              onClick={() => onTabSelect(tab.id)}
            >
              <span className="truncate max-w-[150px]">{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-background rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
