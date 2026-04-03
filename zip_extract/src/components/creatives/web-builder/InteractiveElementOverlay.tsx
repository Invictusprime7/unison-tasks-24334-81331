/**
 * Interactive Element Overlay
 * Overlay UI for interacting with elements in preview mode
 */

import React from 'react';
import { Trash2, Copy, Edit, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InteractiveElementOverlayProps {
  element: HTMLElement;
  position: { x: number; y: number };
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSettings: () => void;
}

export const InteractiveElementOverlay: React.FC<InteractiveElementOverlayProps> = ({
  element,
  position,
  onEdit,
  onDuplicate,
  onDelete,
  onSettings
}) => {
  if (!element) return null;

  return (
    <div
      className="absolute z-50 bg-slate-900 rounded-md shadow-lg border border-slate-700 p-1 flex gap-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -120%)'
      }}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onEdit}
        className="h-7 w-7 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
        title="Edit Element"
      >
        <Edit className="w-3.5 h-3.5" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onDuplicate}
        className="h-7 w-7 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
        title="Duplicate"
      >
        <Copy className="w-3.5 h-3.5" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onSettings}
        className="h-7 w-7 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
        title="Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </Button>

      <div className="w-px bg-slate-700 mx-0.5" />

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/30"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
