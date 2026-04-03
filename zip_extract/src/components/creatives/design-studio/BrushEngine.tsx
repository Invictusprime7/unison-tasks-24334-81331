import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Paintbrush, Eraser, Droplet } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BrushEngineProps {
  onBrushChange: (config: BrushConfig) => void;
  activeBrush: string;
  onBrushSelect: (brush: string) => void;
}

export interface BrushConfig {
  size: number;
  opacity: number;
  hardness: number;
  spacing: number;
  color: string;
  pressureSensitivity: boolean;
  blendMode: string;
}

export const BrushEngine = ({ onBrushChange, activeBrush, onBrushSelect }: BrushEngineProps) => {
  const [config, setConfig] = useState<BrushConfig>({
    size: 20,
    opacity: 100,
    hardness: 80,
    spacing: 10,
    color: "#000000",
    pressureSensitivity: true,
    blendMode: "source-over",
  });

  useEffect(() => {
    onBrushChange(config);
  }, [config]);

  const updateConfig = (updates: Partial<BrushConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <Card className="h-full border-0 rounded-none">
      <CardHeader>
        <CardTitle className="text-sm">Brush Engine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brush Type Selection */}
        <div className="flex gap-2">
          <Button
            variant={activeBrush === "paint" ? "default" : "outline"}
            size="sm"
            onClick={() => onBrushSelect("paint")}
            className="flex-1"
          >
            <Paintbrush className="h-4 w-4 mr-2" />
            Paint
          </Button>
          <Button
            variant={activeBrush === "erase" ? "default" : "outline"}
            size="sm"
            onClick={() => onBrushSelect("erase")}
            className="flex-1"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Erase
          </Button>
          <Button
            variant={activeBrush === "smudge" ? "default" : "outline"}
            size="sm"
            onClick={() => onBrushSelect("smudge")}
            className="flex-1"
          >
            <Droplet className="h-4 w-4 mr-2" />
            Smudge
          </Button>
        </div>

        {/* Brush Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Size</Label>
            <span className="text-xs text-muted-foreground">{config.size}px</span>
          </div>
          <Slider
            value={[config.size]}
            onValueChange={([value]) => updateConfig({ size: value })}
            min={1}
            max={200}
            step={1}
          />
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacity</Label>
            <span className="text-xs text-muted-foreground">{config.opacity}%</span>
          </div>
          <Slider
            value={[config.opacity]}
            onValueChange={([value]) => updateConfig({ opacity: value })}
            min={1}
            max={100}
            step={1}
          />
        </div>

        {/* Hardness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Hardness</Label>
            <span className="text-xs text-muted-foreground">{config.hardness}%</span>
          </div>
          <Slider
            value={[config.hardness]}
            onValueChange={([value]) => updateConfig({ hardness: value })}
            min={0}
            max={100}
            step={1}
          />
        </div>

        {/* Spacing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Spacing</Label>
            <span className="text-xs text-muted-foreground">{config.spacing}%</span>
          </div>
          <Slider
            value={[config.spacing]}
            onValueChange={([value]) => updateConfig({ spacing: value })}
            min={1}
            max={100}
            step={1}
          />
        </div>

        {/* Color */}
        {activeBrush === "paint" && (
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                className="h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={config.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                className="flex-1 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Pressure Sensitivity Info */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Pressure Sensitivity:</strong> Use a stylus/pen for pressure-based size and opacity control
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
