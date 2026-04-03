import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ElementsPanel } from './design-studio/ElementsPanel';
import { IntegrationsPanel } from './design-studio/IntegrationsPanel';
import { Button } from '@/components/ui/button';
import type { DesignElement } from './design-studio/ElementsPanel';

interface DesignSidebarProps {
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

export const DesignSidebar = ({
  onElementSelect,
  onElementDragStart,
  onAddText,
  onAddRectangle,
  onAddCircle,
  onAddImage,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onDelete,
  selectedObject,
  layers,
  onLayerSelect,
  isCropping,
  onApplyCrop,
  onCancelCrop,
}: DesignSidebarProps) => {
  return (
    <Tabs defaultValue="elements" className="w-full h-full flex flex-col bg-card">
      <TabsList className="w-full grid grid-cols-3 bg-secondary border-b-2 border-border h-8 text-[10px]">
        <TabsTrigger value="elements" className="text-[10px] py-1 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Design</TabsTrigger>
        <TabsTrigger value="layers" className="text-[10px] py-1 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Layers</TabsTrigger>
        <TabsTrigger value="export" className="text-[10px] py-1 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Export</TabsTrigger>
      </TabsList>

      <TabsContent value="elements" className="flex-1 m-0 overflow-hidden">
        <ElementsPanel
          onElementSelect={onElementSelect}
          onElementDragStart={onElementDragStart}
        />
      </TabsContent>

      <TabsContent value="export" className="flex-1 m-0 overflow-hidden">
        <IntegrationsPanel />
      </TabsContent>

      <TabsContent value="layers" className="flex-1 m-0 p-2 overflow-y-auto space-y-2 bg-card">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Quick Add</div>
          <div className="flex flex-col gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddText}
              className="justify-start bg-secondary hover:bg-accent border border-border h-7 text-xs px-2 text-secondary-foreground"
            >
              Text
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddRectangle}
              className="justify-start bg-secondary hover:bg-accent border border-border h-7 text-xs px-2 text-secondary-foreground"
            >
              Rectangle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddCircle}
              className="justify-start bg-secondary hover:bg-accent border border-border h-7 text-xs px-2 text-secondary-foreground"
            >
              Circle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddImage}
              className="justify-start bg-secondary hover:bg-accent border border-border h-7 text-xs px-2 text-secondary-foreground"
            >
              Upload Image
            </Button>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Layers</div>
          <div className="flex flex-col gap-1 max-h-48 overflow-auto pr-1">
            {layers.map((obj: any, idx: number) => (
              <button
                key={idx}
                className={`text-left px-1.5 py-1 rounded border-2 text-[10px] transition-all ${
                  selectedObject === obj
                    ? 'border-primary bg-primary/20 text-primary-foreground'
                    : 'border-border bg-secondary text-secondary-foreground hover:bg-accent hover:border-accent'
                }`}
                onClick={() => onLayerSelect(obj)}
              >
                {idx + 1}. {obj.type || 'Object'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-purple-300/70 mb-1.5">Actions</div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
              className="px-1.5 py-0.5 text-[10px] rounded bg-[#1a1625] hover:bg-[#211b2e] border border-purple-500/20 h-6 text-purple-200"
            >
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBringForward}
              className="px-1.5 py-0.5 text-[10px] rounded bg-[#1a1625] hover:bg-[#211b2e] border border-purple-500/20 h-6 text-purple-200"
            >
              Forward
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSendBackward}
              className="px-1.5 py-0.5 text-[10px] rounded bg-[#1a1625] hover:bg-[#211b2e] border border-purple-500/20 h-6 text-purple-200"
            >
              Backward
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="px-1.5 py-0.5 text-[10px] rounded bg-red-600/80 hover:bg-red-500 border border-red-400/30 h-6 text-white"
            >
              Delete
            </Button>
          </div>
        </div>

        {isCropping && (
          <div className="p-1.5 bg-purple-500/10 border border-purple-400/30 rounded">
            <div className="text-[10px] text-purple-200 mb-1.5">Crop Mode Active</div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onApplyCrop}
                className="flex-1 h-6 text-[10px] bg-purple-600 hover:bg-purple-500 text-white"
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelCrop}
                className="flex-1 h-6 text-[10px] bg-[#1a1625] hover:bg-[#211b2e] border border-purple-500/30 text-purple-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
