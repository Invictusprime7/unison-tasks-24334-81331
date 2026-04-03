import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, FileText, Video, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WebDesignKit } from "./WebDesignKit";

interface CreativeTaskSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreativeTaskSelector = ({ open, onOpenChange }: CreativeTaskSelectorProps) => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const handleTemplateGenerated = (code: string, name: string, aesthetic: string) => {
    // Navigate to web builder with the generated template
    navigate("/web-builder", {
      state: {
        generatedCode: code,
        templateName: name,
        aesthetic: aesthetic,
      },
    });
    setSelectedTask(null);
    onOpenChange(false);
  };

  const creativeOptions = [
    {
      id: "web-design-kit",
      title: "Web Design Kit",
      description: "Access integrated design templates from Google, Canva, and AI-generated UI templates",
      icon: Palette,
      color: "text-purple-500",
    },
    {
      id: "content-creation",
      title: "Content Creation",
      description: "Create and manage written content for your projects",
      icon: FileText,
      color: "text-blue-500",
    },
    {
      id: "video-production",
      title: "Video Production",
      description: "Plan and manage video content production",
      icon: Video,
      color: "text-pink-500",
    },
    {
      id: "ai-creative",
      title: "AI Creative Assistant",
      description: "Generate creative assets using AI",
      icon: Sparkles,
      color: "text-amber-500",
    },
  ];

  if (selectedTask) {
    return (
      <WebDesignKit
        open={open}
        onOpenChange={onOpenChange}
        onBack={() => setSelectedTask(null)}
        onTemplateGenerated={handleTemplateGenerated}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Select Creative Task
          </DialogTitle>
          <DialogDescription>
            Choose a creative task type to get started with professional tools and templates
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {creativeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => setSelectedTask(option.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${option.color}`} />
                    {option.title}
                  </CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
