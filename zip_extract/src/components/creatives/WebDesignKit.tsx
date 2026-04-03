import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Sparkles, Layout, Palette, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TemplateEditor } from "./TemplateEditor";

interface WebDesignKitProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onTemplateGenerated?: (code: string, name: string, aesthetic: string) => void;
}

export const WebDesignKit = ({ open, onOpenChange, onBack, onTemplateGenerated }: WebDesignKitProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<{
    name: string;
    aesthetic: string;
    code: string;
  } | null>(null);

  const templateCategories = {
    google: [
      { name: "Material Design Dashboard", aesthetic: "Modern, Clean", preview: "🎨" },
      { name: "Google Workspace UI", aesthetic: "Professional, Minimal", preview: "💼" },
      { name: "Android App Interface", aesthetic: "Mobile-First, Bold", preview: "📱" },
    ],
    canva: [
      { name: "Creative Portfolio", aesthetic: "Vibrant, Artistic", preview: "🎭" },
      { name: "E-commerce Store", aesthetic: "Modern, Conversion-Focused", preview: "🛍️" },
      { name: "Landing Page Pro", aesthetic: "Bold, Engaging", preview: "🚀" },
    ],
    ai: [
      { name: "Glassmorphism UI", aesthetic: "Frosted Glass, Modern", preview: "✨" },
      { name: "Neumorphic Design", aesthetic: "Soft UI, Subtle", preview: "🎯" },
      { name: "Cyberpunk Interface", aesthetic: "Neon, Futuristic", preview: "🌆" },
      { name: "Minimalist SaaS", aesthetic: "Clean, Professional", preview: "📊" },
      { name: "Dark Mode Premium", aesthetic: "Elegant, Sleek", preview: "🌙" },
      { name: "Gradient Mastery", aesthetic: "Colorful, Dynamic", preview: "🌈" },
    ],
  };

  const handleTemplateSelect = async (
    templateName: string,
    aesthetic: string,
    source: string,
    isAI: boolean
  ) => {
    if (!isAI) {
      toast.success(`Selected: ${templateName} from ${source}`);
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: { templateName, aesthetic, source },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Pass the generated template to WebBuilder
      if (onTemplateGenerated) {
        onTemplateGenerated(data.code, templateName, aesthetic);
        onOpenChange(false);
        toast.success("Template loaded in Web Builder!");
      } else {
        setCurrentTemplate({
          name: templateName,
          aesthetic: aesthetic,
          code: data.code,
        });
        setEditorOpen(true);
        toast.success("Template generated successfully!");
      }
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate template. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditorBack = () => {
    setEditorOpen(false);
    setCurrentTemplate(null);
  };

  if (editorOpen && currentTemplate) {
    return (
      <TemplateEditor
        open={open}
        onOpenChange={onOpenChange}
        templateName={currentTemplate.name}
        aesthetic={currentTemplate.aesthetic}
        generatedCode={currentTemplate.code}
        onBack={handleEditorBack}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Palette className="h-6 w-6 text-primary" />
                Web Design Kit
              </DialogTitle>
              <DialogDescription>
                Choose from integrated templates by Google, Canva, and AI-generated designs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by style, aesthetic, or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="ai" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">
              <Globe className="h-4 w-4 mr-2" />
              Google Templates
            </TabsTrigger>
            <TabsTrigger value="canva">
              <Layout className="h-4 w-4 mr-2" />
              Canva Designs
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generated
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templateCategories.google.map((template, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-4xl mb-2">{template.preview}</div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.aesthetic}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() =>
                        handleTemplateSelect(template.name, template.aesthetic, "Google", false)
                      }
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="canva" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templateCategories.canva.map((template, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-4xl mb-2">{template.preview}</div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.aesthetic}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() =>
                        handleTemplateSelect(template.name, template.aesthetic, "Canva", false)
                      }
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">AI-Generated Templates</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    These templates are generated based on popular UI aesthetics and modern design trends
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templateCategories.ai.map((template, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow border-primary/20">
                  <CardHeader>
                    <div className="text-4xl mb-2">{template.preview}</div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.aesthetic}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() =>
                        handleTemplateSelect(template.name, template.aesthetic, "AI", true)
                      }
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate & Use"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
