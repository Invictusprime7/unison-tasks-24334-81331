import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Wand2 } from "lucide-react";

interface FiltersPanelProps {
  selectedObject: any;
  onApplyFilter: (filterType: string, value: number) => void;
  onResetFilters: () => void;
}

export const FiltersPanel = ({
  selectedObject,
  onApplyFilter,
  onResetFilters,
}: FiltersPanelProps) => {
  if (!selectedObject || selectedObject.type !== "image") {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Select an image to apply filters
          </p>
        </CardContent>
      </Card>
    );
  }

  const getCurrentFilterValue = (filterType: string) => {
    const filter = selectedObject.filters?.find((f: any) => f.type === filterType);
    if (!filter) return filterType === "brightness" ? 0 : 1;
    
    switch (filterType) {
      case "brightness":
        return (filter.brightness || 0) * 100;
      case "contrast":
        return filter.contrast || 0;
      case "saturation":
        return filter.saturation || 0;
      default:
        return 0;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4" />
            Filters
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={onResetFilters}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="brightness">
            Brightness: {Math.round(getCurrentFilterValue("brightness"))}
          </Label>
          <Slider
            id="brightness"
            min={-100}
            max={100}
            step={1}
            value={[getCurrentFilterValue("brightness")]}
            onValueChange={(value) => onApplyFilter("brightness", value[0])}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contrast">
            Contrast: {Math.round(getCurrentFilterValue("contrast") * 100)}%
          </Label>
          <Slider
            id="contrast"
            min={-100}
            max={100}
            step={1}
            value={[getCurrentFilterValue("contrast") * 100]}
            onValueChange={(value) => onApplyFilter("contrast", value[0] / 100)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="saturation">
            Saturation: {Math.round(getCurrentFilterValue("saturation") * 100)}%
          </Label>
          <Slider
            id="saturation"
            min={-100}
            max={100}
            step={1}
            value={[getCurrentFilterValue("saturation") * 100]}
            onValueChange={(value) => onApplyFilter("saturation", value[0] / 100)}
          />
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Adjust filters to enhance your images. Click reset to restore original values.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
