import { Canvas as FabricCanvas } from "fabric";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, MoveUp, MoveDown, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface WebLayersPanelProps {
  fabricCanvas: FabricCanvas | null;
  selectedObject: any;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export const WebLayersPanel = ({ fabricCanvas, selectedObject, onDelete, onDuplicate }: WebLayersPanelProps) => {
  const [objects, setObjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!fabricCanvas) return;

    const updateLayers = () => {
      setObjects(fabricCanvas.getObjects());
    };

    fabricCanvas.on("object:added", updateLayers);
    fabricCanvas.on("object:removed", updateLayers);
    fabricCanvas.on("object:modified", updateLayers);

    updateLayers();

    return () => {
      fabricCanvas.off("object:added", updateLayers);
      fabricCanvas.off("object:removed", updateLayers);
      fabricCanvas.off("object:modified", updateLayers);
    };
  }, [fabricCanvas]);

  const handleSelect = (obj: any) => {
    if (!fabricCanvas) return;
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
  };

  const toggleVisibility = (obj: any) => {
    obj.visible = !obj.visible;
    fabricCanvas?.renderAll();
    setObjects([...objects]);
  };

  const toggleLock = (obj: any) => {
    obj.selectable = !obj.selectable;
    obj.evented = !obj.evented;
    fabricCanvas?.renderAll();
    setObjects([...objects]);
  };

  const getObjectName = (obj: any) => {
    if (obj.blockData?.id) {
      const block = obj.blockData.id;
      return block.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    if (obj.type === "group") return "Component";
    if (obj.type === "i-text" || obj.type === "text") return "Text";
    if (obj.type === "rect") return "Rectangle";
    if (obj.type === "circle") return "Circle";
    return "Object";
  };

  const moveLayer = (obj: any, direction: "up" | "down") => {
    if (!fabricCanvas) return;
    const index = objects.indexOf(obj);
    if (direction === "up" && index < objects.length - 1) {
      fabricCanvas.bringObjectForward(obj);
      toast.success("Layer moved up");
    } else if (direction === "down" && index > 0) {
      fabricCanvas.sendObjectBackwards(obj);
      toast.success("Layer moved down");
    }
    fabricCanvas.renderAll();
    setObjects(fabricCanvas.getObjects());
  };

  const duplicateLayer = (obj: any) => {
    if (!fabricCanvas) return;
    obj.clone((cloned: any) => {
      cloned.set({
        left: cloned.left + 10,
        top: cloned.top + 10,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      toast.success("Layer duplicated");
    });
  };

  const filteredObjects = objects.filter(obj => 
    getObjectName(obj).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Layers</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {objects.length} {objects.length === 1 ? "component" : "components"}
        </p>
        {/* Search */}
        <Input
          placeholder="Search layers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm mt-2"
        />
      </div>

      {/* Layers List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredObjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {searchQuery ? "No layers match your search" : "No components yet. Add some from the blocks panel."}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredObjects.map((obj, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(obj)}
                  className={`p-2 rounded-md cursor-pointer transition-colors ${
                    selectedObject === obj
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex-1 truncate">
                      {getObjectName(obj)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateLayer(obj);
                        }}
                        title="Duplicate (Ctrl+D)"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayer(obj, "up");
                        }}
                        title="Move up (Ctrl+])"
                      >
                        <MoveUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayer(obj, "down");
                        }}
                        title="Move down (Ctrl+[)"
                      >
                        <MoveDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(obj);
                        }}
                        title="Toggle visibility"
                      >
                        {obj.visible !== false ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(obj);
                        }}
                        title="Toggle lock"
                      >
                        {obj.selectable !== false ? (
                          <Unlock className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        title="Delete (Del)"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
