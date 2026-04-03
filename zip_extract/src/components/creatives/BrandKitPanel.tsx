import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Upload } from "lucide-react";
import type { BrandKit, DesignToken } from "@/types/document";

interface BrandKitPanelProps {
  brandKit?: BrandKit;
  onBrandKitChange: (brandKit: Partial<BrandKit>) => void;
}

export const BrandKitPanel = ({ brandKit, onBrandKitChange }: BrandKitPanelProps) => {
  const [newColorName, setNewColorName] = useState("");
  const [newColorValue, setNewColorValue] = useState("#000000");
  const [newFont, setNewFont] = useState("");

  const addColor = () => {
    if (!newColorName || !newColorValue) return;
    
    const colors = [...(brandKit?.colors || []), { name: newColorName, value: newColorValue }];
    onBrandKitChange({ colors });
    setNewColorName("");
    setNewColorValue("#000000");
  };

  const removeColor = (index: number) => {
    const colors = brandKit?.colors?.filter((_, i) => i !== index) || [];
    onBrandKitChange({ colors });
  };

  const addFont = () => {
    if (!newFont) return;
    
    const fonts = [...(brandKit?.fonts || []), newFont];
    onBrandKitChange({ fonts });
    setNewFont("");
  };

  const removeFont = (index: number) => {
    const fonts = brandKit?.fonts?.filter((_, i) => i !== index) || [];
    onBrandKitChange({ fonts });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Colors */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Brand Colors</h3>
          
          <div className="space-y-2">
            {brandKit?.colors?.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-sm flex-1">{color.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeColor(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Color name"
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="color"
              value={newColorValue}
              onChange={(e) => setNewColorValue(e.target.value)}
              className="w-16"
            />
            <Button size="sm" onClick={addColor}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Fonts */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Brand Fonts</h3>
          
          <div className="space-y-2">
            {brandKit?.fonts?.map((font, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm flex-1" style={{ fontFamily: font }}>
                  {font}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFont(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Font family"
              value={newFont}
              onChange={(e) => setNewFont(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={addFont}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Brand Logo</h3>
          
          {brandKit?.logoUrl ? (
            <div className="space-y-2">
              <img
                src={brandKit.logoUrl}
                alt="Brand logo"
                className="max-h-24 object-contain border rounded p-2"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBrandKitChange({ logoUrl: undefined })}
              >
                Remove Logo
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </Button>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};
