import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  Layers as LayersIcon,
  Plus,
  GripVertical
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  type: "raster" | "vector" | "text" | "adjustment";
}

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerBlendModeChange: (layerId: string, blendMode: string) => void;
  onLayerRename: (layerId: string, name: string) => void;
  onLayerReorder: (dragIndex: number, dropIndex: number) => void;
  onAddLayer: () => void;
}

export const LayersPanel = ({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerDelete,
  onLayerDuplicate,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  onLayerRename,
  onLayerReorder,
  onAddLayer,
}: LayersPanelProps) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const blendModes = [
    "source-over",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
  ];

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onLayerReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <Card className="h-full border-0 rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayersIcon className="h-4 w-4" />
            Layers
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onAddLayer}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4">
            {layers.map((layer, index) => {
              const isActive = layer.id === activeLayerId;
              const isEditing = layer.id === editingLayerId;

              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    border rounded-lg p-2 space-y-2 cursor-move
                    ${isActive ? 'bg-accent border-primary' : 'bg-card hover:bg-accent/50'}
                    ${draggedIndex === index ? 'opacity-50' : ''}
                  `}
                  onClick={() => !isEditing && onLayerSelect(layer.id)}
                >
                  {/* Layer Header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={layer.name}
                        onChange={(e) => onLayerRename(layer.id, e.target.value)}
                        onBlur={() => setEditingLayerId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingLayerId(null);
                        }}
                        className="h-7 text-xs flex-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="text-xs font-medium flex-1 truncate cursor-text"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayerId(layer.id);
                        }}
                      >
                        {layer.name}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerToggleVisibility(layer.id);
                        }}
                      >
                        {layer.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerToggleLock(layer.id);
                        }}
                      >
                        {layer.locked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Layer Controls (shown when active) */}
                  {isActive && (
                    <div className="space-y-2 pt-2 border-t">
                      {/* Opacity */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Opacity</span>
                          <span className="text-xs">{layer.opacity}%</span>
                        </div>
                        <Slider
                          value={[layer.opacity]}
                          onValueChange={([value]) => onLayerOpacityChange(layer.id, value)}
                          min={0}
                          max={100}
                          step={1}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Blend Mode */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Blend Mode</span>
                        <Select
                          value={layer.blendMode}
                          onValueChange={(value) => onLayerBlendModeChange(layer.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {blendModes.map((mode) => (
                              <SelectItem key={mode} value={mode} className="text-xs">
                                {mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerDuplicate(layer.id);
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerDelete(layer.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Layer Tips:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Drag to reorder layers</li>
              <li>Double-click name to rename</li>
              <li>Use blend modes for effects</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
