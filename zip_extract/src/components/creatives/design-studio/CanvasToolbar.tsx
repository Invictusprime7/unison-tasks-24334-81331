import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Square,
  Circle,
  Type,
  Image,
  MousePointer2,
  Trash2,
  Download,
  Upload,
  Layers,
  Copy,
  Move,
  RotateCw,
  Palette,
  Save,
  FolderOpen,
  History,
  BookmarkPlus,
  Undo,
  Redo,
  Crop,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CanvasToolbarProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onDelete: () => void;
  onClear: () => void;
  onExport: () => void;
  onExportJPEG: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  onSaveTemplate: () => void;
  onOpenTemplates: () => void;
  onShowVersionHistory: () => void;
  onSaveVersion: () => void;
  hasTemplate: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  alignmentTools?: React.ReactNode;
}

export const CanvasToolbar = ({
  activeTool,
  onToolSelect,
  onAddRectangle,
  onAddCircle,
  onAddText,
  onAddImage,
  onDelete,
  onClear,
  onExport,
  onExportJPEG,
  onDuplicate,
  onBringForward,
  onSendBackward,
  fillColor,
  onFillColorChange,
  strokeColor,
  onStrokeColorChange,
  onSaveTemplate,
  onOpenTemplates,
  onShowVersionHistory,
  onSaveVersion,
  hasTemplate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  alignmentTools,
}: CanvasToolbarProps) => {
  return (
    <div className="border-b bg-card p-2">
      <div className="flex flex-wrap items-center gap-1">
        {/* Selection Tools */}
        <div className="flex gap-1">
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolSelect("select")}
            title="Select (V)"
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "move" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolSelect("move")}
            title="Move (M)"
          >
            <Move className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Shape Tools */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onAddRectangle}
            title="Rectangle (R)"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onAddCircle}
            title="Circle (C)"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onAddText}
            title="Text (T)"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onAddImage}
            title="Image (I)"
          >
            <Image className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "crop" ? "default" : "outline"}
            size="icon"
            onClick={() => onToolSelect("crop")}
            title="Crop"
          >
            <Crop className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment Tools */}
        {alignmentTools}

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Layer Controls */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onBringForward}
            title="Bring Forward"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onSendBackward}
            title="Send Backward"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDuplicate}
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Colors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="fill-color" className="text-xs">
              Fill
            </Label>
            <Input
              id="fill-color"
              type="color"
              value={fillColor}
              onChange={(e) => onFillColorChange(e.target.value)}
              className="h-8 w-12 cursor-pointer p-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <Label htmlFor="stroke-color" className="text-xs">
              Stroke
            </Label>
            <Input
              id="stroke-color"
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
              className="h-8 w-12 cursor-pointer p-1"
            />
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Template Actions */}
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={onOpenTemplates}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={onSaveTemplate}>
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
          {hasTemplate && (
            <>
              <Button variant="outline" size="sm" onClick={onSaveVersion}>
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Save Version
              </Button>
              <Button variant="outline" size="sm" onClick={onShowVersionHistory}>
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <div className="flex gap-1 ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            title="Delete (Del)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={onExportJPEG}>
            <Download className="h-4 w-4 mr-2" />
            JPEG
          </Button>
          <Button size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            PNG
          </Button>
        </div>
      </div>
    </div>
  );
};
