import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  Grid3x3,
} from "lucide-react";

interface AlignmentToolsProps {
  onAlign: (alignment: string) => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  showGrid: boolean;
  snapEnabled: boolean;
}

export const AlignmentTools = ({
  onAlign,
  onToggleGrid,
  onToggleSnap,
  showGrid,
  snapEnabled,
}: AlignmentToolsProps) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAlign("left")}
          title="Align Left"
        >
          <AlignHorizontalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAlign("center-h")}
          title="Align Center Horizontally"
        >
          <AlignHorizontalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAlign("right")}
          title="Align Right"
        >
          <AlignHorizontalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAlign("top")}
          title="Align Top"
        >
          <AlignVerticalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAlign("center-v")}
          title="Align Center Vertically"
        >
          <AlignVerticalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAlign("bottom")}
          title="Align Bottom"
        >
          <AlignVerticalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <Button
        variant={showGrid ? "default" : "outline"}
        size="sm"
        onClick={onToggleGrid}
        title="Toggle Grid"
      >
        <Grid3x3 className="h-4 w-4 mr-2" />
        Grid
      </Button>

      <Button
        variant={snapEnabled ? "default" : "outline"}
        size="sm"
        onClick={onToggleSnap}
        title="Toggle Snap"
      >
        Snap
      </Button>
    </div>
  );
};
