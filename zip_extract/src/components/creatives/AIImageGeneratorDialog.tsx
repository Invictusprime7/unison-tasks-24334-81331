/**
 * AI Image Generator Dialog
 * Generate AI images using DALL-E via Supabase Edge Function
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImagePlacement {
  position: string;
  css: string;
}

interface AIImageGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (imageUrl: string, prompt: string, placement?: ImagePlacement) => void;
}

export const AIImageGeneratorDialog: React.FC<AIImageGeneratorDialogProps> = ({
  isOpen,
  onClose,
  onImageGenerated
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>('natural');
  const [size, setSize] = useState<string>('1024x1024');
  const [quality, setQuality] = useState<string>('standard');
  const [placement, setPlacement] = useState<string>('none');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [generatedPlacement, setGeneratedPlacement] = useState<ImagePlacement | undefined>();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl('');

    try {
      const placementConfig = placement !== 'none' ? { position: placement } : undefined;
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt.trim(),
          style,
          size,
          quality,
          placement: placementConfig
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate image');
      }

      if (data?.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        const placementData = data.placement as ImagePlacement | undefined;
        setGeneratedPlacement(placementData);
        toast({
          title: 'Success!',
          description: placementData ? `Image generated and will be placed at ${placementData.position}` : 'Image generated successfully'
        });

        if (onImageGenerated) {
          onImageGenerated(data.imageUrl, prompt, placementData);
        }
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseImage = () => {
    if (generatedImageUrl && onImageGenerated) {
      onImageGenerated(generatedImageUrl, prompt, generatedPlacement);
      onClose();
    }
  };

  const handleReset = () => {
    setPrompt('');
    setStyle('natural');
    setSize('1024x1024');
    setQuality('standard');
    setPlacement('none');
    setGeneratedImageUrl('');
    setGeneratedPlacement(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Image Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="vivid">Vivid</SelectItem>
                  <SelectItem value="photorealistic">Photorealistic</SelectItem>
                  <SelectItem value="artistic">Artistic</SelectItem>
                  <SelectItem value="abstract">Abstract</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="logo">Logo/Brand</SelectItem>
                  <SelectItem value="icon">Icon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                  <SelectItem value="1792x1024">Landscape (1792×1024)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (1024×1792)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quality">Quality</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="placement">Placement</Label>
              <Select value={placement} onValueChange={setPlacement}>
                <SelectTrigger id="placement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No placement</SelectItem>
                  <SelectItem value="top-left">Top Left (Logo)</SelectItem>
                  <SelectItem value="top-center">Top Center</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {placement !== 'none' && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              The image will be placed at <strong>{placement}</strong> position in your template. 
              You can drag to reposition and use corner handles to resize it in the Live Preview.
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isGenerating}
            >
              Reset
            </Button>
          </div>

          {generatedImageUrl && (
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden bg-slate-50">
                <img
                  src={generatedImageUrl}
                  alt={prompt}
                  className="w-full h-auto"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleUseImage}
                  className="flex-1"
                >
                  Use This Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGeneratedImageUrl('')}
                >
                  Generate Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
