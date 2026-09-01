/**
 * Simple Mode Toggle - Clean, intuitive mode switcher with improved click response
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { MousePointer2, Eye } from 'lucide-react';

export type SimpleBuilderMode = 'select' | 'preview';

interface SimpleModeToggleProps {
  currentMode: SimpleBuilderMode;
  onModeChange: (mode: SimpleBuilderMode) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  hasSelection?: boolean;
  className?: string;
}

export const SimpleModeToggle: React.FC<SimpleModeToggleProps> = ({
  currentMode,
  onModeChange,
  className,
}) => {
  return (
    <div className={cn(
      "flex items-center gap-2",
      className
    )}>
      {/* Mode Toggle - Pill Style */}
      <div className="flex items-center bg-[#0d0d18] rounded-lg p-1 shadow-[0_0_15px_rgba(0,255,0,0.15)]">
        <button
          onClick={() => onModeChange('select')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-bold transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2",
            "active:scale-95",
            currentMode === 'select' 
              ? "bg-lime-400 text-black shadow-[0_0_20px_rgba(0,255,0,0.6)]" 
              : "text-lime-400/70 hover:text-lime-300 hover:bg-lime-500/20"
          )}
        >
          <MousePointer2 className="h-4 w-4" />
          <span>Edit</span>
          <kbd className={cn(
            "ml-1 px-1.5 py-0.5 text-[10px] rounded font-mono",
            currentMode === 'select' 
              ? "bg-black/30 text-black" 
              : "bg-lime-500/20 text-lime-400/60"
          )}>V</kbd>
        </button>

        <button
          onClick={() => onModeChange('preview')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-bold transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
            "active:scale-95",
            currentMode === 'preview' 
              ? "bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.6)]" 
              : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/20"
          )}
        >
          <Eye className="h-4 w-4" />
          <span>Preview</span>
          <kbd className={cn(
            "ml-1 px-1.5 py-0.5 text-[10px] rounded font-mono",
            currentMode === 'preview' 
              ? "bg-black/30 text-black" 
              : "bg-cyan-500/20 text-cyan-400/60"
          )}>P</kbd>
        </button>
      </div>

      {/* Action Buttons - Disabled: use floating toolbar instead */}
      {/* Selection actions (duplicate/delete) are now handled by ElementFloatingToolbar */}
    </div>
  );
};

export default SimpleModeToggle;
