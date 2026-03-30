import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, FolderOpen, Layout, Layers, X, Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutTemplatesPanel } from "./LayoutTemplatesPanel";
import { SectionLayoutPicker } from "./SectionLayoutPicker";
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
  onSwapSection?: (sectionId: string, variantId: string) => void;
}

type DockPanel = "templates" | "layouts" | "projects" | "cloud" | null;

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
  onSwapSection,
}: FloatingDockProps) => {
  const [activePanel, setActivePanel] = useState<DockPanel>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

  const togglePanel = (panel: DockPanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const dockItems = [
    { id: "templates" as const, label: "Templates", icon: Layout },
    { id: "layouts" as const, label: "Layouts", icon: Layers },
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
      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0d0d18] rounded-lg shadow-[0_0_15px_rgba(255,255,0,0.15)]">
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
                "h-7 px-3 rounded-md text-xs font-bold transition-all duration-200",
                isActive
                  ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,255,0,0.6)]"
                  : "text-yellow-400/70 hover:text-yellow-300 hover:bg-yellow-500/20"
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
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-[520px] max-h-[70vh] bg-[#0a0a12] rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.2)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Panel Header with Device Toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d18]">
            <span className="text-sm font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
              {dockItems.find((d) => d.id === activePanel)?.label}
            </span>
            
            <div className="flex items-center gap-2">
              {/* Device Toggle for Templates */}
              {activePanel === "templates" && (
                <div className="flex items-center gap-0.5 p-0.5 bg-[#0a0a14] rounded-lg">
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
                          "h-6 w-6 rounded-md transition-all duration-200",
                          isActiveDevice
                            ? "bg-fuchsia-500 text-black font-bold shadow-[0_0_10px_rgba(255,0,255,0.5)]"
                            : "text-fuchsia-400/60 hover:text-fuchsia-300 hover:bg-fuchsia-500/20"
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
                className="h-6 w-6 rounded-md text-red-500/70 hover:text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_10px_rgba(255,0,0,0.4)] transition-all duration-200"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          <ScrollArea className="h-[calc(70vh-48px)] bg-[#0a0a12]">
            {activePanel === "templates" && (
              <LayoutTemplatesPanel 
                onSelectTemplate={onSelectTemplate}
                onDemoTemplate={onDemoTemplate}
                previewDevice={previewDevice}
                previewWidth={DEVICE_WIDTHS[previewDevice]}
              />
            )}
            {activePanel === "layouts" && (
              <SectionLayoutPicker
                currentCode={currentCode}
                onSwapSection={onSwapSection || (() => {})}
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
