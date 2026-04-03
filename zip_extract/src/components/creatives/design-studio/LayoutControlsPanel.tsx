import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  LayoutGrid, 
  Layers, 
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Move,
  Maximize2
} from "lucide-react";

interface LayoutControlsPanelProps {
  onLayoutUpdate?: (layout: LayoutConfig) => void;
}

export interface LayoutConfig {
  display: 'flex' | 'grid' | 'block';
  flexDirection?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  padding?: string;
  gridCols?: number;
  gridRows?: number;
  zIndex?: number;
  position?: 'relative' | 'absolute' | 'fixed' | 'sticky';
}

export const LayoutControlsPanel = ({ onLayoutUpdate }: LayoutControlsPanelProps) => {
  const [layout, setLayout] = useState<LayoutConfig>({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    gridCols: 3,
    gridRows: 3,
    zIndex: 0,
    position: 'relative',
  });

  const updateLayout = (updates: Partial<LayoutConfig>) => {
    const newLayout = { ...layout, ...updates };
    setLayout(newLayout);
    onLayoutUpdate?.(newLayout);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Layout Controls</h3>
      </div>

      <Tabs defaultValue="layout" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="layout" className="text-xs">
            <LayoutGrid className="h-3 w-3 mr-1" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="spacing" className="text-xs">
            <Move className="h-3 w-3 mr-1" />
            Spacing
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            Layers
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="layout" className="p-3 space-y-4 m-0">
            {/* Display Type */}
            <div className="space-y-2">
              <Label className="text-xs">Display</Label>
              <Select
                value={layout.display}
                onValueChange={(value) => updateLayout({ display: value as 'flex' | 'grid' | 'block' })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex">Flexbox</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flexbox Controls */}
            {layout.display === 'flex' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Direction</Label>
                  <Select
                    value={layout.flexDirection}
                    onValueChange={(value) => updateLayout({ flexDirection: value as 'row' | 'column' })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="row">Row</SelectItem>
                      <SelectItem value="column">Column</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <AlignHorizontalJustifyCenter className="h-3 w-3" />
                    Justify Content
                  </Label>
                  <Select
                    value={layout.justifyContent}
                    onValueChange={(value) => updateLayout({ justifyContent: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flex-start">Start</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="flex-end">End</SelectItem>
                      <SelectItem value="space-between">Space Between</SelectItem>
                      <SelectItem value="space-around">Space Around</SelectItem>
                      <SelectItem value="space-evenly">Space Evenly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <AlignVerticalJustifyCenter className="h-3 w-3" />
                    Align Items
                  </Label>
                  <Select
                    value={layout.alignItems}
                    onValueChange={(value) => updateLayout({ alignItems: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flex-start">Start</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="flex-end">End</SelectItem>
                      <SelectItem value="stretch">Stretch</SelectItem>
                      <SelectItem value="baseline">Baseline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Grid Controls */}
            {layout.display === 'grid' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Grid Columns: {layout.gridCols}</Label>
                  <Slider
                    value={[layout.gridCols || 3]}
                    onValueChange={([value]) => updateLayout({ gridCols: value })}
                    min={1}
                    max={12}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Grid Rows: {layout.gridRows}</Label>
                  <Slider
                    value={[layout.gridRows || 3]}
                    onValueChange={([value]) => updateLayout({ gridRows: value })}
                    min={1}
                    max={12}
                    step={1}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="spacing" className="p-3 space-y-4 m-0">
            <div className="space-y-2">
              <Label className="text-xs">Gap</Label>
              <Input
                type="text"
                value={layout.gap}
                onChange={(e) => updateLayout({ gap: e.target.value })}
                className="h-9 text-xs font-mono"
                placeholder="e.g., 16px, 1rem"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Padding</Label>
              <Input
                type="text"
                value={layout.padding}
                onChange={(e) => updateLayout({ padding: e.target.value })}
                className="h-9 text-xs font-mono"
                placeholder="e.g., 16px, 1rem"
              />
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold mb-2">Quick Presets</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ gap: '8px', padding: '8px' })}
                >
                  Compact
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ gap: '16px', padding: '16px' })}
                >
                  Normal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ gap: '24px', padding: '24px' })}
                >
                  Spacious
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ gap: '32px', padding: '32px' })}
                >
                  Extra
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="p-3 space-y-4 m-0">
            <div className="space-y-2">
              <Label className="text-xs">Position</Label>
              <Select
                value={layout.position}
                onValueChange={(value) => updateLayout({ position: value as any })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relative">Relative</SelectItem>
                  <SelectItem value="absolute">Absolute</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="sticky">Sticky</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Z-Index: {layout.zIndex}</Label>
              <Slider
                value={[layout.zIndex || 0]}
                onValueChange={([value]) => updateLayout({ zIndex: value })}
                min={-10}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold mb-2">Layer Shortcuts</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateLayout({ zIndex: (layout.zIndex || 0) + 1 })}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Move Forward
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateLayout({ zIndex: (layout.zIndex || 0) - 1 })}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Move Backward
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => updateLayout({ zIndex: 100 })}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Bring to Front
                </Button>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
