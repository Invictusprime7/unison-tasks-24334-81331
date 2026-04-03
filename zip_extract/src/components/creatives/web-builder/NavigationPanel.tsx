import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronRight, Search, LayoutGrid, Navigation, Menu as MenuIcon,
  Database, Zap, Share2, Wrench, Palette
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const NavigationPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["basics", "elements"]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const sections = [
    {
      id: "basics",
      label: "Basics",
      items: [
        { id: "sections", label: "Sections", icon: LayoutGrid },
        { id: "navigation", label: "Navigation", icon: Navigation },
        { id: "menus", label: "Menus", icon: MenuIcon },
      ],
    },
    {
      id: "cms",
      label: "CMS",
      items: [
        { id: "collections", label: "Collections", icon: Database },
        { id: "fields", label: "Fields", icon: Zap },
      ],
    },
    {
      id: "elements",
      label: "Elements",
      items: [
        { id: "interactive", label: "Interactive", icon: Zap },
        { id: "social", label: "Social", icon: Share2 },
        { id: "utility", label: "Utility", icon: Wrench },
        { id: "creative", label: "Creative", icon: Palette },
      ],
    },
  ];

  return (
    <div className="w-52 bg-card border-r border-border flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-background border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:border-primary"
          />
        </div>
      </div>

      {/* Wireframer */}
      <div className="p-3 border-b border-border">
        <button className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <LayoutGrid className="h-4 w-4" />
          <span className="text-sm font-medium">Wireframer</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {sections.map((section) => (
            <Collapsible
              key={section.id}
              open={openSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors group">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {section.label}
                </span>
                <ChevronRight className={`h-3 w-3 transition-transform text-muted-foreground ${
                  openSections.includes(section.id) ? "rotate-90" : ""
                }`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-2 p-2 pl-3 rounded hover:bg-[#1a1625] text-purple-300/70 hover:text-purple-200 hover:shadow-[0_0_8px_rgba(168,85,247,0.2)] transition-colors group"
                    >
                      <Icon className="h-4 w-4 text-purple-400" />
                      <span className="text-sm">{item.label}</span>
                      <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 text-purple-400" />
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
