/**
 * Interactive Mode Help
 * Help panel showing keyboard shortcuts and tips for interactive mode
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard, Mouse, Info } from 'lucide-react';

interface InteractiveModeHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveModeHelp: React.FC<InteractiveModeHelpProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Interactive Mode Help</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-slate-100">
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Delete Element</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Delete</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duplicate Element</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Ctrl + D</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Undo</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Redo</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Ctrl + Y</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Save</span>
                <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Ctrl + S</kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-slate-100">
              <Mouse className="w-4 h-4" />
              Mouse Actions
            </h3>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Select Element</span>
                <span className="text-slate-300">Click</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Edit Text</span>
                <span className="text-slate-300">Double Click</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Move Element</span>
                <span className="text-slate-300">Drag</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Show Options</span>
                <span className="text-slate-300">Hover</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-slate-100">
              <Info className="w-4 h-4" />
              Tips
            </h3>
            <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
              <li>Use Edit Mode for precise control</li>
              <li>Use Preview Mode to test interactions</li>
              <li>Elements can be styled via properties panel</li>
              <li>Drag elements from sidebar to add new ones</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
