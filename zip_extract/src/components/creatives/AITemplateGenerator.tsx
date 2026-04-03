import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAITemplate } from '@/hooks/useAITemplate';
import { Sparkles, Loader2 } from 'lucide-react';
import type { AITemplatePrompt } from '@/types/template';

interface AITemplateGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateGenerated?: (template: any) => void;
}

export const AITemplateGenerator = ({
  open,
  onOpenChange,
  onTemplateGenerated,
}: AITemplateGeneratorProps) => {
  const { loading, generateTemplate } = useAITemplate();
  const [formData, setFormData] = useState<Partial<AITemplatePrompt>>({
    industry: '',
    goal: '',
    format: 'web',
    preferredStyle: 'modern',
  });

  const handleGenerate = async () => {
    if (!formData.industry || !formData.goal) {
      return;
    }

    const template = await generateTemplate(formData as AITemplatePrompt);
    if (template && onTemplateGenerated) {
      onTemplateGenerated(template);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Template Generator
          </DialogTitle>
          <DialogDescription>
            Describe your design needs and AI will generate a professional template with
            Auto Layout constraints, data bindings, and responsive variants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="industry">Industry *</Label>
            <Input
              id="industry"
              placeholder="e.g., E-commerce, SaaS, Education, Healthcare"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="goal">Goal *</Label>
            <Textarea
              id="goal"
              placeholder="e.g., Generate leads, Increase sales, Promote event"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="format">Format</Label>
              <Select
                value={formData.format}
                onValueChange={(value: any) => setFormData({ ...formData, format: value })}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web Hero</SelectItem>
                  <SelectItem value="instagram-story">Instagram Story</SelectItem>
                  <SelectItem value="instagram-post">Instagram Post</SelectItem>
                  <SelectItem value="facebook-post">Facebook Post</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="style">Style</Label>
              <Select
                value={formData.preferredStyle}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, preferredStyle: value })
                }
              >
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="audience">Target Audience (Optional)</Label>
            <Input
              id="audience"
              placeholder="e.g., Young professionals, Parents, Students"
              value={formData.targetAudience || ''}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="messages">Key Messages (Optional, comma-separated)</Label>
            <Input
              id="messages"
              placeholder="e.g., Fast delivery, Free shipping, 24/7 support"
              value={formData.keyMessages?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  keyMessages: e.target.value.split(',').map((m) => m.trim()),
                })
              }
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={loading || !formData.industry || !formData.goal}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Template
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
