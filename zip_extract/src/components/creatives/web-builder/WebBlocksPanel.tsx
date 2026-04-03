import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { webBlocks } from "./webBlocks";
import { Layout, Star, MessageSquare, Megaphone, BarChart3 } from "lucide-react";

interface WebBlocksPanelProps {
  onAddBlock: (blockId: string) => void;
}

export const WebBlocksPanel = ({ onAddBlock }: WebBlocksPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = {
    hero: { label: "Hero Sections", icon: Layout },
    features: { label: "Features", icon: Star },
    testimonials: { label: "Social Proof", icon: MessageSquare },
    cta: { label: "Call to Action", icon: Megaphone },
    stats: { label: "Statistics", icon: BarChart3 },
  };

  const groupedBlocks = webBlocks.reduce((acc, block) => {
    const key = block.subcategory?.toLowerCase() || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(block);
    return acc;
  }, {} as Record<string, typeof webBlocks>);

  const filteredBlocks = Object.entries(groupedBlocks).reduce((acc, [key, blocks]) => {
    const filtered = blocks.filter(block =>
      block.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[key] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof webBlocks>);

  return (
    <div className="w-72 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm mb-3">Web Components</h3>
        <Input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      {/* Blocks List */}
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={Object.keys(categories)} className="w-full">
          {Object.entries(filteredBlocks).map(([key, blocks]) => {
            const category = categories[key as keyof typeof categories];
            if (!category) return null;
            
            const Icon = category.icon;
            
            return (
              <AccordionItem key={key} value={key} className="border-b border-border/50">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span>{category.label}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1 px-2">
                    {blocks.map((block) => (
                      <button
                        key={block.id}
                        onClick={() => onAddBlock(block.id)}
                        className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-12 bg-muted/70 rounded border border-border/50 group-hover:border-primary/30 transition-colors flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium group-hover:text-primary transition-colors">
                              {block.label}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
};
