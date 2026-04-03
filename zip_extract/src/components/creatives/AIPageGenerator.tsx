import React, { useState } from 'react';
import { usePageGenerator, PageSchema } from '@/hooks/usePageGenerator';
import { PageRenderer } from './PageRenderer';
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
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

const THEME_PRESETS = {
  noir: 'Dark, elegant black and white with high contrast',
  warm: 'Warm beige, editorial serif headings, spacious',
  vibrant: 'Bold, colorful, playful with bright accents',
  minimal: 'Clean, minimal, lots of whitespace',
  luxury: 'Premium, gold accents, sophisticated'
};

export const AIPageGenerator: React.FC = () => {
  const { loading, generatedPage, generatePage, generateSection, savePage } = usePageGenerator();
  const [prompt, setPrompt] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<PageSchema | null>(null);
  const [sectionPrompt, setSectionPrompt] = useState('');
  const [sectionType, setSectionType] = useState<string>('content');

  const handleGeneratePage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const schema = await generatePage(prompt, selectedTheme ? THEME_PRESETS[selectedTheme as keyof typeof THEME_PRESETS] : undefined);
    if (schema) {
      setCurrentPage(schema);
    }
  };

  const handleAddSection = async () => {
    if (!sectionPrompt.trim() || !currentPage) {
      toast.error('Please enter a section prompt');
      return;
    }

    const section = await generateSection(
      sectionPrompt,
      sectionType as any,
      selectedTheme ? THEME_PRESETS[selectedTheme as keyof typeof THEME_PRESETS] : undefined
    );

    if (section && currentPage) {
      const updatedPage = {
        ...currentPage,
        sections: [...currentPage.sections, section]
      };
      setCurrentPage(updatedPage);
      setSectionPrompt('');
    }
  };

  const handleSavePage = async () => {
    if (currentPage) {
      await savePage(currentPage, prompt);
    }
  };

  const handlePageUpdate = (updatedSchema: PageSchema) => {
    setCurrentPage(updatedSchema);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Control Panel */}
      <div className="border-b bg-card">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">AI Page Generator</h1>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Main Page Generation */}
            <Card className="p-4 space-y-4">
              <div>
                <Label htmlFor="prompt">Page Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Create a fashion hero, 3 product cards, newsletter section..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="theme">Theme Preset</Label>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="noir">Noir (Black & White)</SelectItem>
                    <SelectItem value="warm">Warm Editorial</SelectItem>
                    <SelectItem value="vibrant">Vibrant & Playful</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleGeneratePage} 
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Page
                  </>
                )}
              </Button>
            </Card>

            {/* Section Generator */}
            {currentPage && (
              <Card className="p-4 space-y-4">
                <div>
                  <Label htmlFor="section-prompt">Add Section</Label>
                  <Input
                    id="section-prompt"
                    placeholder="Add pricing grid with monthly/annual toggle..."
                    value={sectionPrompt}
                    onChange={(e) => setSectionPrompt(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="section-type">Section Type</Label>
                  <Select value={sectionType} onValueChange={setSectionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hero">Hero</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="gallery">Gallery</SelectItem>
                      <SelectItem value="cta">Call to Action</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAddSection} 
                  disabled={loading || !sectionPrompt.trim()}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Section
                    </>
                  )}
                </Button>
              </Card>
            )}

            {/* Actions */}
            {currentPage && (
              <Card className="p-4 space-y-4">
                <Button 
                  onClick={handleSavePage}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Page
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="container mx-auto p-6">
        {currentPage ? (
          <div className="border rounded-lg overflow-hidden bg-white">
            <PageRenderer 
              schema={currentPage} 
              editable 
              onUpdate={handlePageUpdate}
            />
          </div>
        ) : (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No page generated yet</h2>
            <p className="text-muted-foreground">
              Enter a prompt above to generate your first AI-powered page
            </p>
          </div>
        )}
      </div>
    </div>
  );
};