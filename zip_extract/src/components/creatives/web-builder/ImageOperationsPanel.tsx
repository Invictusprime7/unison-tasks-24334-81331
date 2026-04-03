import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eraser, ArrowUpCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { removeBackground, loadImage } from "@/utils/imageOperations";

interface ImageOperationsPanelProps {
  selectedObject: any;
  fabricCanvas: any;
  onUpdate: () => void;
}

export const ImageOperationsPanel = ({ selectedObject, fabricCanvas, onUpdate }: ImageOperationsPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<string>("");

  const isImageObject = selectedObject && selectedObject.type === "image";

  const handleRemoveBackground = async () => {
    if (!isImageObject) return;

    setLoading(true);
    setOperation("Removing background");
    
    try {
      // Get image URL from fabric object
      const imgSrc = selectedObject.getSrc();
      
      // Fetch the image as blob
      const response = await fetch(imgSrc);
      const blob = await response.blob();
      
      // Load image element
      const imgElement = await loadImage(blob);
      
      // Remove background
      const processedBlob = await removeBackground(imgElement);
      
      // Create URL from blob
      const url = URL.createObjectURL(processedBlob);
      
      // Update fabric image
      selectedObject.setSrc(url, () => {
        fabricCanvas?.renderAll();
        onUpdate();
        toast.success("Background removed successfully");
      });
    } catch (error: any) {
      console.error("Background removal error:", error);
      toast.error(error.message || "Failed to remove background");
    } finally {
      setLoading(false);
      setOperation("");
    }
  };

  const handleUpscale = async () => {
    if (!isImageObject) return;

    setLoading(true);
    setOperation("Upscaling image");
    
    try {
      // Simple 2x upscaling using canvas
      const imgSrc = selectedObject.getSrc();
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const upscaledUrl = canvas.toDataURL('image/png');
      
      selectedObject.setSrc(upscaledUrl, () => {
        // Scale down the display to maintain visual size
        selectedObject.set({
          scaleX: (selectedObject.scaleX || 1) / 2,
          scaleY: (selectedObject.scaleY || 1) / 2,
        });
        fabricCanvas?.renderAll();
        onUpdate();
        toast.success("Image upscaled successfully");
      });
    } catch (error: any) {
      console.error("Upscaling error:", error);
      toast.error(error.message || "Failed to upscale image");
    } finally {
      setLoading(false);
      setOperation("");
    }
  };

  const handleEnhance = async () => {
    if (!isImageObject) return;

    setLoading(true);
    setOperation("Enhancing image");
    
    try {
      const imgSrc = selectedObject.getSrc();
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0);
      
      // Apply enhancement filters
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Increase contrast and saturation
      for (let i = 0; i < data.length; i += 4) {
        // Contrast
        data[i] = ((data[i] - 128) * 1.2) + 128;
        data[i + 1] = ((data[i + 1] - 128) * 1.2) + 128;
        data[i + 2] = ((data[i + 2] - 128) * 1.2) + 128;
      }
      
      ctx.putImageData(imageData, 0, 0);
      const enhancedUrl = canvas.toDataURL('image/png');
      
      selectedObject.setSrc(enhancedUrl, () => {
        fabricCanvas?.renderAll();
        onUpdate();
        toast.success("Image enhanced successfully");
      });
    } catch (error: any) {
      console.error("Enhancement error:", error);
      toast.error(error.message || "Failed to enhance image");
    } finally {
      setLoading(false);
      setOperation("");
    }
  };

  if (!isImageObject) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select an image to apply operations
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-3 block">Image Operations</Label>
        
        <div className="space-y-2">
          <Button 
            onClick={handleRemoveBackground} 
            disabled={loading}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            {loading && operation === "Removing background" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Eraser className="h-4 w-4 mr-2" />
                Remove Background
              </>
            )}
          </Button>

          <Button 
            onClick={handleUpscale} 
            disabled={loading}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            {loading && operation === "Upscaling image" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upscaling...
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Upscale 2x
              </>
            )}
          </Button>

          <Button 
            onClick={handleEnhance} 
            disabled={loading}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            {loading && operation === "Enhancing image" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Enhance Quality
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
