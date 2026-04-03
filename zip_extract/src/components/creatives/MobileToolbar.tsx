import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Layers, Settings } from 'lucide-react';
import type { DesignElement } from './design-studio/ElementsPanel';
import { DesignSidebar } from './DesignSidebar';

interface MobileToolbarProps {
  onElementSelect: (element: DesignElement) => void;
  onElementDragStart: (element: DesignElement) => void;
  onAddText: () => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddImage: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
  selectedObject: any;
  layers: any[];
  onLayerSelect: (obj: any) => void;
  isCropping: boolean;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
}

export const MobileToolbar = (props: MobileToolbarProps) => {
  return (
    <div className="lg:hidden fixed bottom-2 right-2 z-50 flex gap-1.5">
      {/* Elements & Layers Drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            size="sm" 
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/80 p-0 border-2 border-primary"
            style={{ boxShadow: 'var(--shadow-neon-blue)' }}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] max-w-[280px] p-0 bg-white">
          <DesignSidebar {...props} />
        </SheetContent>
      </Sheet>

      {/* Properties Drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            size="sm" 
            className="h-10 w-10 rounded-full bg-accent hover:bg-accent/80 text-white p-0 border-2 border-accent"
            style={{ boxShadow: 'var(--shadow-neon-cyan)' }}
            disabled={!props.selectedObject}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-[280px] p-3 bg-white">
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-900">Properties</h3>
            {props.selectedObject ? (
              <div className="space-y-1.5 text-[10px] text-gray-600">
                <div>Type: {props.selectedObject.type?.toUpperCase()}</div>
                {props.selectedObject.left !== undefined && (
                  <div>X: {Math.round(props.selectedObject.left)}</div>
                )}
                {props.selectedObject.top !== undefined && (
                  <div>Y: {Math.round(props.selectedObject.top)}</div>
                )}
                {props.selectedObject.width !== undefined && (
                  <div>Width: {Math.round(props.selectedObject.width * (props.selectedObject.scaleX || 1))}</div>
                )}
                {props.selectedObject.height !== undefined && (
                  <div>Height: {Math.round(props.selectedObject.height * (props.selectedObject.scaleY || 1))}</div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">No object selected</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
