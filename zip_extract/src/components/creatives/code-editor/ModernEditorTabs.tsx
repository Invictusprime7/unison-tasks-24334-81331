/**
 * Modern Editor Tabs - Enhanced VFS Tab UI
 * 
 * Features:
 * - Modern glassmorphism design
 * - File type indicators with icons
 * - Modified/unsaved indicators
 * - Smooth animations
 * - Drag to reorder (visual only)
 * - Context menu
 * - Tab overflow handling
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Circle, Sparkles, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/hooks/useVirtualFileSystem';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  id: string;
  name: string;
  path?: string;
  isModified?: boolean;
  isAIGenerated?: boolean;
}

interface ModernEditorTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseAll?: () => void;
  modifiedTabs?: Set<string>;
  aiGeneratedTabs?: Set<string>;
}

// Get icon color based on file type
const getIconColor = (name: string): string => {
  const iconType = getFileIcon(name);
  switch (iconType) {
    case 'react': return 'text-cyan-400';
    case 'typescript': return 'text-blue-400';
    case 'javascript': return 'text-yellow-400';
    case 'css': return 'text-pink-400';
    case 'html': return 'text-orange-400';
    case 'json': return 'text-yellow-500';
    default: return 'text-slate-400';
  }
};

// Get background gradient based on file type
const getTabGradient = (name: string, isActive: boolean): string => {
  if (!isActive) return '';
  
  const iconType = getFileIcon(name);
  switch (iconType) {
    case 'react': return 'bg-gradient-to-b from-cyan-500/10 to-transparent';
    case 'typescript': return 'bg-gradient-to-b from-blue-500/10 to-transparent';
    case 'javascript': return 'bg-gradient-to-b from-yellow-500/10 to-transparent';
    case 'css': return 'bg-gradient-to-b from-pink-500/10 to-transparent';
    case 'html': return 'bg-gradient-to-b from-orange-500/10 to-transparent';
    case 'json': return 'bg-gradient-to-b from-yellow-500/10 to-transparent';
    default: return 'bg-gradient-to-b from-primary/10 to-transparent';
  }
};

// File extension badge
const ExtBadge = ({ name }: { name: string }) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    'tsx': 'bg-cyan-500/20 text-cyan-400',
    'ts': 'bg-blue-500/20 text-blue-400',
    'jsx': 'bg-yellow-500/20 text-yellow-400',
    'js': 'bg-yellow-500/20 text-yellow-400',
    'css': 'bg-pink-500/20 text-pink-400',
    'json': 'bg-amber-500/20 text-amber-400',
    'html': 'bg-orange-500/20 text-orange-400',
  };
  
  return (
    <span className={cn(
      "text-[8px] font-mono px-1 py-0.5 rounded uppercase",
      colors[ext] || 'bg-slate-500/20 text-slate-400'
    )}>
      {ext}
    </span>
  );
};

export function ModernEditorTabs({ 
  tabs, 
  activeTabId, 
  onTabSelect, 
  onTabClose,
  onCloseOthers,
  onCloseAll,
  modifiedTabs = new Set(),
  aiGeneratedTabs = new Set(),
}: ModernEditorTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);

  // Check scroll state
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
      setShowOverflow(scrollWidth > clientWidth);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tabs]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollAmount = 150;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (tabs.length === 0) {
    return (
      <div className="h-10 border-b border-white/5 bg-slate-900/50 flex items-center justify-center text-xs text-white/30">
        No files open
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-10 border-b border-white/5 bg-gradient-to-r from-slate-900/80 to-slate-950/80 backdrop-blur-sm flex items-center relative">
        {/* Scroll left button */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-0 z-10 h-full flex items-center bg-gradient-to-r from-slate-900 to-transparent pl-1 pr-3"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/10"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex h-full">
            <AnimatePresence mode="popLayout">
              {tabs.map((tab, index) => {
                const isActive = activeTabId === tab.id;
                const isModified = modifiedTabs.has(tab.id) || tab.isModified;
                const isAIGenerated = aiGeneratedTabs.has(tab.id) || tab.isAIGenerated;
                const iconColor = getIconColor(tab.name);
                const gradient = getTabGradient(tab.name, isActive);

                return (
                  <motion.div
                    key={tab.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "group relative flex items-center gap-2 px-3 h-full cursor-pointer text-sm whitespace-nowrap transition-all duration-200",
                      "border-r border-white/5",
                      isActive
                        ? cn("text-white", gradient, "border-b-2 border-b-primary")
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
                    )}
                    onClick={() => onTabSelect(tab.id)}
                  >
                    {/* Active indicator line */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        transition={{ duration: 0.2 }}
                      />
                    )}

                    {/* File type indicator dot */}
                    <span className={cn("w-2 h-2 rounded-full", iconColor.replace('text-', 'bg-'))} />

                    {/* AI indicator */}
                    {isAIGenerated && (
                      <Sparkles className="h-3 w-3 text-purple-400" />
                    )}

                    {/* Tab name */}
                    <span className={cn(
                      "truncate max-w-[120px] transition-colors",
                      isActive && "font-medium"
                    )}>
                      {tab.name}
                    </span>

                    {/* Extension badge (on hover) */}
                    <div className="hidden group-hover:block">
                      <ExtBadge name={tab.name} />
                    </div>

                    {/* Modified indicator or close button */}
                    <div className="flex items-center ml-1">
                      {isModified ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Circle className="h-2 w-2 fill-amber-400 text-amber-400 group-hover:hidden" />
                          </TooltipTrigger>
                          <TooltipContent>Unsaved changes</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="w-2 group-hover:hidden" />
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabClose(tab.id);
                        }}
                        className={cn(
                          "hidden group-hover:flex items-center justify-center",
                          "h-4 w-4 rounded hover:bg-white/20 transition-colors"
                        )}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Scroll right button */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-8 z-10 h-full flex items-center bg-gradient-to-l from-slate-900 to-transparent pr-1 pl-3"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/10"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab actions menu */}
        {tabs.length > 1 && (
          <div className="flex items-center px-2 border-l border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm">
                {onCloseOthers && (
                  <DropdownMenuItem onClick={() => onCloseOthers(activeTabId)}>
                    Close Others
                  </DropdownMenuItem>
                )}
                {onCloseAll && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={onCloseAll} className="text-red-400">
                      Close All
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ModernEditorTabs;
