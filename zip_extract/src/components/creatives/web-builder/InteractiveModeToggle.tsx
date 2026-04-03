/**
 * Interactive Mode Toggle
 * Switches between edit and preview modes
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Eye } from 'lucide-react';

interface InteractiveModeToggleProps {
  isInteractive: boolean;
  onToggle: (isInteractive: boolean) => void;
}

export const InteractiveModeToggle: React.FC<InteractiveModeToggleProps> = ({
  isInteractive,
  onToggle
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={!isInteractive ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToggle(false)}
        className="flex-1"
      >
        <Edit className="w-4 h-4 mr-1" />
        Edit Mode
      </Button>
      <Button
        type="button"
        variant={isInteractive ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToggle(true)}
        className="flex-1"
      >
        <Eye className="w-4 h-4 mr-1" />
        Preview Mode
      </Button>
    </div>
  );
};

export default InteractiveModeToggle;
