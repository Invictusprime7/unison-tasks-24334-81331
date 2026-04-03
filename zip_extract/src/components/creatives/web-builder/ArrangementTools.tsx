import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowUp, ArrowDown, Copy, Trash2,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  FlipHorizontal, FlipVertical
} from "lucide-react";
import { toast } from "sonner";

interface ArrangementToolsProps {
  fabricCanvas: FabricCanvas | null;
  selectedObject: any;
}

export const ArrangementTools = ({ fabricCanvas, selectedObject }: ArrangementToolsProps) => {
  if (!selectedObject || !fabricCanvas) {
    return null;
  }

  const handleBringForward = () => {
    fabricCanvas.bringObjectForward(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Moved forward");
  };

  const handleSendBackward = () => {
    fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Moved backward");
  };

  const handleBringToFront = () => {
    fabricCanvas.bringObjectToFront(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Brought to front");
  };

  const handleSendToBack = () => {
    fabricCanvas.sendObjectToBack(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Sent to back");
  };

  const handleDuplicate = () => {
    selectedObject.clone((cloned: any) => {
      cloned.set({
        left: cloned.left + 20,
        top: cloned.top + 20,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      toast.success("Duplicated");
    });
  };

  const handleDelete = () => {
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Deleted");
  };

  const handleAlignLeft = () => {
    selectedObject.set({ left: 0 });
    fabricCanvas.renderAll();
    toast.success("Aligned left");
  };

  const handleAlignCenterH = () => {
    const canvasCenter = (fabricCanvas.width || 1280) / 2;
    const objectWidth = (selectedObject.width || 0) * (selectedObject.scaleX || 1);
    selectedObject.set({ left: canvasCenter - objectWidth / 2 });
    fabricCanvas.renderAll();
    toast.success("Centered horizontally");
  };

  const handleAlignRight = () => {
    const canvasWidth = fabricCanvas.width || 1280;
    const objectWidth = (selectedObject.width || 0) * (selectedObject.scaleX || 1);
    selectedObject.set({ left: canvasWidth - objectWidth });
    fabricCanvas.renderAll();
    toast.success("Aligned right");
  };

  const handleAlignTop = () => {
    selectedObject.set({ top: 0 });
    fabricCanvas.renderAll();
    toast.success("Aligned top");
  };

  const handleAlignCenterV = () => {
    const canvasCenter = (fabricCanvas.height || 800) / 2;
    const objectHeight = (selectedObject.height || 0) * (selectedObject.scaleY || 1);
    selectedObject.set({ top: canvasCenter - objectHeight / 2 });
    fabricCanvas.renderAll();
    toast.success("Centered vertically");
  };

  const handleAlignBottom = () => {
    const canvasHeight = fabricCanvas.height || 800;
    const objectHeight = (selectedObject.height || 0) * (selectedObject.scaleY || 1);
    selectedObject.set({ top: canvasHeight - objectHeight });
    fabricCanvas.renderAll();
    toast.success("Aligned bottom");
  };

  const handleFlipHorizontal = () => {
    selectedObject.set({ flipX: !selectedObject.flipX });
    fabricCanvas.renderAll();
    toast.success("Flipped horizontally");
  };

  const handleFlipVertical = () => {
    selectedObject.set({ flipY: !selectedObject.flipY });
    fabricCanvas.renderAll();
    toast.success("Flipped vertically");
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur border-b flex-wrap">
      {/* Layer Order */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleBringToFront}
          title="Bring to front (Ctrl+Shift+])"
        >
          <ArrowUp className="h-4 w-4 mr-1" />
          Front
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleBringForward}
          title="Bring forward (Ctrl+])"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleSendBackward}
          title="Send backward (Ctrl+[)"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleSendToBack}
          title="Send to back (Ctrl+Shift+[)"
        >
          <ArrowDown className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Horizontal Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleAlignLeft}
          title="Align left"
        >
          <AlignStartHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleAlignCenterH}
          title="Center horizontally"
        >
          <AlignCenterHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleAlignRight}
          title="Align right"
        >
          <AlignEndHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Vertical Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleAlignTop}
          title="Align top"
        >
          <AlignStartVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleAlignCenterV}
          title="Center vertically"
        >
          <AlignCenterVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleAlignBottom}
          title="Align bottom"
        >
          <AlignEndVertical className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Flip */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleFlipHorizontal}
          title="Flip horizontally"
        >
          <FlipHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleFlipVertical}
          title="Flip vertically"
        >
          <FlipVertical className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleDuplicate}
          title="Duplicate (Ctrl+D)"
        >
          <Copy className="h-4 w-4 mr-1" />
          Duplicate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive"
          onClick={handleDelete}
          title="Delete (Del)"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};
