import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Sun, Contrast, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface FilterConfig {
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

interface FilterPanelProps {
  onApplyFilter: (filterName: string, value: number) => void;
  onApplyAdvancedFilter: (filterName: string) => void;
}

export const FilterPanel = ({ onApplyFilter, onApplyAdvancedFilter }: FilterPanelProps) => {
  const [blur, setBlur] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [hue, setHue] = useState(0);

  const applyFilter = (name: string, value: number) => {
    onApplyFilter(name, value);
    toast.success(`${name} filter applied`);
  };

  return (
    <Card className="h-full border-0 rounded-none">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Filters & Adjustments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Blur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Gaussian Blur</Label>
                <span className="text-xs text-muted-foreground">{blur}px</span>
              </div>
              <Slider
                value={[blur]}
                onValueChange={([value]) => {
                  setBlur(value);
                  applyFilter("blur", value);
                }}
                min={0}
                max={50}
                step={1}
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Sun className="h-3 w-3" />
                  Brightness
                </Label>
                <span className="text-xs text-muted-foreground">{brightness}</span>
              </div>
              <Slider
                value={[brightness]}
                onValueChange={([value]) => {
                  setBrightness(value);
                  applyFilter("brightness", value);
                }}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Contrast className="h-3 w-3" />
                  Contrast
                </Label>
                <span className="text-xs text-muted-foreground">{contrast}</span>
              </div>
              <Slider
                value={[contrast]}
                onValueChange={([value]) => {
                  setContrast(value);
                  applyFilter("contrast", value);
                }}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Saturation
                </Label>
                <span className="text-xs text-muted-foreground">{saturation}</span>
              </div>
              <Slider
                value={[saturation]}
                onValueChange={([value]) => {
                  setSaturation(value);
                  applyFilter("saturation", value);
                }}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            {/* Hue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hue Rotation</Label>
                <span className="text-xs text-muted-foreground">{hue}°</span>
              </div>
              <Slider
                value={[hue]}
                onValueChange={([value]) => {
                  setHue(value);
                  applyFilter("hue", value);
                }}
                min={-180}
                max={180}
                step={1}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => {
                setBlur(0);
                setBrightness(0);
                setContrast(0);
                setSaturation(0);
                setHue(0);
                toast.success("Filters reset");
              }}
            >
              Reset All Filters
            </Button>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onApplyAdvancedFilter("sharpen")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Unsharp Mask (Sharpen)
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onApplyAdvancedFilter("denoise")}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Denoise
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onApplyAdvancedFilter("emboss")}
            >
              <Contrast className="h-4 w-4 mr-2" />
              Emboss
            </Button>

            <div className="p-3 bg-muted/30 rounded-lg mt-4">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Advanced filters</strong> use GPU-accelerated shaders for real-time processing
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
