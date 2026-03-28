/**
 * SiteOperatingBar — Top-level mode navigation for the builder
 *
 * Appears when the builder is opened from the launch pipeline (AI or guided).
 * Provides quick access to site operating modes: Pages, Brand, Content,
 * Logic, Automations — replacing generic "select/preview" with domain-aware tabs.
 */
import { cn } from "@/lib/utils";
import {
  FileText,
  Palette,
  Type,
  Zap,
  Workflow,
  Code2,
} from "lucide-react";

export type SiteOperatingMode = "pages" | "brand" | "content" | "logic" | "automations" | "code";

const OPERATING_MODES: { id: SiteOperatingMode; label: string; icon: typeof FileText; description: string }[] = [
  { id: "pages", label: "Pages", icon: FileText, description: "Site map & navigation" },
  { id: "brand", label: "Brand", icon: Palette, description: "Colors, fonts & identity" },
  { id: "content", label: "Content", icon: Type, description: "Text, images & media" },
  { id: "logic", label: "Logic", icon: Zap, description: "Intents & interactions" },
  { id: "automations", label: "Automations", icon: Workflow, description: "Workflows & triggers" },
  { id: "code", label: "Code", icon: Code2, description: "Source files & VFS" },
];

interface SiteOperatingBarProps {
  activeMode: SiteOperatingMode;
  onModeChange: (mode: SiteOperatingMode) => void;
  systemName?: string | null;
  systemType?: string | null;
  className?: string;
}

export function SiteOperatingBar({
  activeMode,
  onModeChange,
  systemName,
  systemType,
  className,
}: SiteOperatingBarProps) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-3 py-1.5",
      "bg-[#0a0a12]/90 backdrop-blur-sm border-b border-cyan-500/15",
      className
    )}>
      {/* System identity badge */}
      {systemName && (
        <div className="flex items-center gap-1.5 mr-3 pr-3 border-r border-white/10">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
          <span className="text-xs font-medium text-gray-300 truncate max-w-[120px]">
            {systemName}
          </span>
          {systemType && (
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
              {systemType}
            </span>
          )}
        </div>
      )}

      {/* Mode tabs */}
      {OPERATING_MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            title={mode.description}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-cyan-500/15 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.15)]"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
