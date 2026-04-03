/**
 * Simple Mode Toggle - Clean, intuitive mode switcher with improved click response
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { MousePointer2, Eye, Trash2, Copy } from 'lucide-react';

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
  onDelete,
  onDuplicate,
  hasSelection = false,
  className,
}) => {
  return (
    <div className={cn(
      "flex items-center gap-2",
      className
    )}>
      {/* Mode Toggle - Pill Style */}
      <div className="flex items-center bg-background border border-border rounded-full p-1 shadow-lg">
        <button
          onClick={() => onModeChange('select')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "active:scale-95",
            currentMode === 'select' 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <MousePointer2 className="h-4 w-4" />
          <span>Edit</span>
          <kbd className={cn(
            "ml-1 px-1.5 py-0.5 text-[10px] rounded",
            currentMode === 'select' 
              ? "bg-primary-foreground/20 text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>V</kbd>
        </button>

        <button
          onClick={() => onModeChange('preview')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "active:scale-95",
            currentMode === 'preview' 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Eye className="h-4 w-4" />
          <span>Preview</span>
          <kbd className={cn(
            "ml-1 px-1.5 py-0.5 text-[10px] rounded",
            currentMode === 'preview' 
              ? "bg-primary-foreground/20 text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>P</kbd>
        </button>
      </div>

      {/* Action Buttons - Only show when there's a selection in edit mode */}
      {hasSelection && currentMode === 'select' && (
        <div className="flex items-center gap-1 bg-background border border-border rounded-full p-1 shadow-lg animate-in fade-in slide-in-from-left-2 duration-200">
          <button
            onClick={onDuplicate}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-full transition-all duration-150",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "active:scale-90"
            )}
            title="Duplicate (⌘D)"
          >
            <Copy className="h-4 w-4" />
          </button>

          <button
            onClick={onDelete}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-full transition-all duration-150",
              "text-destructive/70 hover:text-destructive hover:bg-destructive/10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive",
              "active:scale-90"
            )}
            title="Delete (Del)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleModeToggle;
