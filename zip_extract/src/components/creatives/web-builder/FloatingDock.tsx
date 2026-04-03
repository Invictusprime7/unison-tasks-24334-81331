import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, FolderOpen, Layout, X, Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutTemplatesPanel } from "./LayoutTemplatesPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { CloudPanel } from "./CloudPanel";
import type { BusinessSystemType } from "@/data/templates/types";

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  canvas_data: {
    html: string;
    css?: string;
    js?: string;
    previewCode?: string;
  };
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface FloatingDockProps {
  onSelectTemplate: (code: string, name: string, systemType?: BusinessSystemType, templateId?: string) => void;
  onDemoTemplate?: (code: string, name: string, systemType?: BusinessSystemType, templateId?: string) => void;
  onLoadTemplate: (template: SavedTemplate) => void;
  onSaveTemplate: (name: string, description: string, isPublic?: boolean) => Promise<void>;
  currentCode: string;
  cloudState: {
    business: {
      id: string;
      name: string;
    };
  };
  onNavigateToCloud: () => void;
}

type DockPanel = "templates" | "projects" | "cloud" | null;

const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export const FloatingDock = ({
  onSelectTemplate,
  onDemoTemplate,
  onLoadTemplate,
  onSaveTemplate,
  currentCode,
  cloudState,
  onNavigateToCloud,
}: FloatingDockProps) => {
  const [activePanel, setActivePanel] = useState<DockPanel>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

  const togglePanel = (panel: DockPanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const dockItems = [
    { id: "templates" as const, label: "Templates", icon: Layout },
    { id: "projects" as const, label: "Projects", icon: FolderOpen },
    { id: "cloud" as const, label: "Cloud", icon: Cloud },
  ];

  const deviceOptions = [
    { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
    { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
    { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className="relative">
      {/* Dock Bar - inline within the topbar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-card/80 backdrop-blur-md border border-border/40 rounded-full">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => togglePanel(item.id)}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {item.label}
            </Button>
          );
        })}
      </div>

      {/* Expandable Panel - positioned absolutely below the dock */}
      {activePanel && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-[520px] max-h-[70vh] bg-card/98 backdrop-blur-lg border border-border/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Panel Header with Device Toggle */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
            <span className="text-sm font-medium text-foreground">
              {dockItems.find((d) => d.id === activePanel)?.label}
            </span>
            
            <div className="flex items-center gap-2">
              {/* Device Toggle for Templates */}
              {activePanel === "templates" && (
                <div className="flex items-center gap-0.5 p-0.5 bg-background/50 rounded-full border border-border/30">
                  {deviceOptions.map((device) => {
                    const DeviceIcon = device.icon;
                    const isActiveDevice = previewDevice === device.id;
                    return (
                      <Button
                        key={device.id}
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewDevice(device.id)}
                        className={cn(
                          "h-6 w-6 rounded-full transition-all",
                          isActiveDevice
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title={device.label}
                      >
                        <DeviceIcon className="h-3 w-3" />
                      </Button>
                    );
                  })}
                </div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePanel(null)}
                className="h-6 w-6 rounded-full hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          <ScrollArea className="h-[calc(70vh-48px)]">
            {activePanel === "templates" && (
              <LayoutTemplatesPanel 
                onSelectTemplate={onSelectTemplate}
                onDemoTemplate={onDemoTemplate}
                previewDevice={previewDevice}
                previewWidth={DEVICE_WIDTHS[previewDevice]}
              />
            )}
            {activePanel === "projects" && (
              <ProjectsPanel
                onLoadTemplate={onLoadTemplate}
                onSaveTemplate={onSaveTemplate}
                currentCode={currentCode}
              />
            )}
            {activePanel === "cloud" && (
              <CloudPanel
                businessId={cloudState.business.id}
                businessName={cloudState.business.name}
                onNavigateToCloud={onNavigateToCloud}
              />
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
