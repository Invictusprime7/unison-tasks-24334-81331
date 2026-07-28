import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, FolderOpen, Layout, Layers, X, Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutTemplatesPanel } from "./LayoutTemplatesPanel";
import { SectionLayoutPicker } from "./SectionLayoutPicker";
import { ProjectsPanel } from "./ProjectsPanel";
import { CloudPanel } from "./CloudPanel";
import type { BusinessSystemType, LayoutCategory } from "@/data/templates/types";

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
  onSelectTemplate: (code: string, name: string, systemType?: BusinessSystemType, templateId?: string, templateCategory?: LayoutCategory) => void;
  onDemoTemplate?: (code: string, name: string, systemType?: BusinessSystemType, templateId?: string, templateCategory?: LayoutCategory) => void;
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
      <div className="flex items-center gap-0.5 rounded-md bg-white/[0.035] p-0.5">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              onClick={() => togglePanel(item.id)}
              className={cn(
                "h-7 w-7 rounded text-xs font-medium transition-colors duration-150",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"
              )}
              title={item.label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}
      </div>

      {/* Expandable Panel - positioned absolutely below the dock */}
      {activePanel && (
        <div className={cn(
          "absolute left-1/2 top-full z-50 mt-2 max-h-[80vh] -translate-x-1/2 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0f0f11] shadow-[0_18px_48px_-18px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-top-1 duration-150",
          activePanel === "cloud" ? "w-[860px]" : "w-[520px]"
        )}>
          {/* Panel Header with Device Toggle */}
          <div className="flex h-10 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0c] px-3">
            <span className="text-xs font-medium text-zinc-300">
              {dockItems.find((d) => d.id === activePanel)?.label}
            </span>

            <div className="flex items-center gap-2">
              {/* Device Toggle for Templates */}
              {activePanel === "templates" && (
                <div className="flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5">
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
                          "h-6 w-6 rounded-md transition-colors duration-150",
                          isActiveDevice
                            ? "bg-white/10 text-white"
                            : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
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
                className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors duration-150"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          {activePanel === "cloud" ? (
            <div className="h-[calc(80vh-48px)] bg-[#0a0a12]">
              <CloudPanel
                businessId={cloudState.business.id}
                businessName={cloudState.business.name}
                onNavigateToCloud={onNavigateToCloud}
              />
            </div>
          ) : (
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
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};
