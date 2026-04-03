import { Canvas as FabricCanvas, FabricText, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Move, Maximize2, RotateCw, Layers
} from "lucide-react";
import { useState, useEffect } from "react";

interface DirectEditToolbarProps {
  fabricCanvas: FabricCanvas | null;
  selectedObject: any;
  onPropertyChange?: () => void;
}

const fontFamilies = [
  "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana",
  "Courier New", "Trebuchet MS", "Impact", "Comic Sans MS",
  "Palatino", "Garamond", "Bookman", "Avant Garde"
];

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

export const DirectEditToolbar = ({ fabricCanvas, selectedObject, onPropertyChange }: DirectEditToolbarProps) => {
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fillColor, setFillColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");

  const isTextObject = selectedObject?.type === "text" || selectedObject?.type === "i-text" || selectedObject?.type === "textbox";

  useEffect(() => {
    if (!selectedObject) return;

    if (isTextObject) {
      setTextContent(selectedObject.text || "");
      setFontSize(selectedObject.fontSize || 16);
      setFontFamily(selectedObject.fontFamily || "Arial");
      setFillColor(selectedObject.fill || "#000000");
      setIsBold(selectedObject.fontWeight === "bold");
      setIsItalic(selectedObject.fontStyle === "italic");
      setIsUnderline(selectedObject.underline || false);
      setTextAlign(selectedObject.textAlign || "left");
    }

    if (selectedObject.fill && typeof selectedObject.fill === "string") {
      setFillColor(selectedObject.fill);
    }
  }, [selectedObject, isTextObject]);

  const updateTextProperty = (key: string, value: any) => {
    if (!selectedObject || !fabricCanvas) return;
    
    selectedObject.set(key, value);
    fabricCanvas.renderAll();
    onPropertyChange?.();
  };

  const handleTextContentChange = (value: string) => {
    setTextContent(value);
    updateTextProperty("text", value);
  };

  const handleFontSizeChange = (value: string) => {
    const size = parseInt(value);
    setFontSize(size);
    updateTextProperty("fontSize", size);
  };

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    updateTextProperty("fontFamily", value);
  };

  const handleColorChange = (value: string) => {
    setFillColor(value);
    updateTextProperty("fill", value);
  };

  const toggleBold = () => {
    const newBold = !isBold;
    setIsBold(newBold);
    updateTextProperty("fontWeight", newBold ? "bold" : "normal");
  };

  const toggleItalic = () => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    updateTextProperty("fontStyle", newItalic ? "italic" : "normal");
  };

  const toggleUnderline = () => {
    const newUnderline = !isUnderline;
    setIsUnderline(newUnderline);
    updateTextProperty("underline", newUnderline);
  };

  const handleAlignChange = (align: "left" | "center" | "right") => {
    setTextAlign(align);
    updateTextProperty("textAlign", align);
  };

  if (!selectedObject) {
    return (
      <div className="h-12 bg-background/95 backdrop-blur border-b flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Select an object to edit</p>
      </div>
    );
  }

  return (
    <div className="h-auto min-h-12 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {/* Text Content Input */}
        {isTextObject && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Text:</Label>
              <Input
                value={textContent}
                onChange={(e) => handleTextContentChange(e.target.value)}
                className="h-8 w-48 text-sm"
                placeholder="Enter text..."
              />
            </div>
            
            <Separator orientation="vertical" className="h-8" />

            {/* Font Family */}
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-2">
              <Select value={fontSize.toString()} onValueChange={handleFontSizeChange}>
                <SelectTrigger className="h-8 w-16 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Text Formatting */}
            <div className="flex items-center gap-1">
              <Button
                variant={isBold ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={toggleBold}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={isItalic ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={toggleItalic}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={isUnderline ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={toggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Text Alignment */}
            <div className="flex items-center gap-1">
              <Button
                variant={textAlign === "left" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleAlignChange("left")}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={textAlign === "center" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleAlignChange("center")}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant={textAlign === "right" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleAlignChange("right")}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8" />
          </>
        )}

        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <Input
            type="color"
            value={fillColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-8 w-16 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={fillColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-8 w-24 text-xs"
            placeholder="#000000"
          />
        </div>

        {/* Object Type Badge */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
            <Layers className="h-3 w-3" />
            <span className="capitalize">{selectedObject.type || "Object"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
