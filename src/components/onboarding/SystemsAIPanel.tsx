/**
 * SystemsAIPanel - AI Code Assistant panel for the homepage
 * 
 * Generates production-ready websites using aiLaunchService as the bridge
 * to ai-code-assistant (template-react mode) — the single source of truth
 * for AI-generated template output.
 * 
 * Styled with Unison Tasks' arcade UI theme.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserDesignProfile } from "@/hooks/useUserDesignProfile";
import { generateAILaunchSite } from "@/services/aiLaunchService";
import { createQuickBlueprint, blueprintToLaunchConfig } from "@/services/blueprintCompiler";
import type { LaunchConfig } from "@/types/launchConfig";
import { cn } from "@/lib/utils";
import {
  arcadePanel,
  arcadeTitleYellow,
  arcadeSubtitle,
  arcadeInput,
  arcadeButtonPrimary,
  arcadeBadge,
  arcadeGlows,
} from "@/lib/arcadeTheme";
import { 
  Sparkles, 
  Loader2,
  Wrench,
  Scissors,
  Utensils,
  ShoppingBag,
  Palette,
  Users,
  Home,
  Heart,
  Code2,
  Upload,
  X,
  Image as ImageIcon,
  Fingerprint
} from "lucide-react";
import { User } from "@supabase/supabase-js";

// Dropped file type
interface DroppedFile {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'text' | 'code' | 'other';
  preview?: string;
  content?: string;
}

// Map chip IDs to BusinessSystemType
type BusinessSystemType = 'booking' | 'store' | 'portfolio' | 'agency' | 'content';
const CHIP_TO_SYSTEM: Record<string, BusinessSystemType> = {
  local_service: "booking",
  salon_spa: "booking",
  restaurant: "booking",
  ecommerce: "store",
  creator: "portfolio",
  coaching: "booking",
  real_estate: "agency",
  nonprofit: "content",
};

// Map chip IDs to industry string
const CHIP_TO_INDUSTRY: Record<string, string> = {
  local_service: "contractor",
  salon_spa: "salon",
  restaurant: "restaurant",
  ecommerce: "clothing",
  creator: "photographer",
  coaching: "consulting",
  real_estate: "realestate",
  nonprofit: "nonprofit",
};

// Arcade glow color per chip
type GlowColor = 'yellow' | 'cyan' | 'lime' | 'fuchsia' | 'purple' | 'red' | 'blue';

const CHIP_GLOW: Record<string, GlowColor> = {
  local_service: 'cyan',
  salon_spa: 'fuchsia',
  restaurant: 'yellow',
  ecommerce: 'purple',
  creator: 'lime',
  coaching: 'blue',
  real_estate: 'cyan',
  nonprofit: 'red',
};

// Industry/business prompt chips
const codePromptChips = [
  { id: "local_service", label: "Local Service", icon: Wrench, prompt: "Create a professional website for a local service business like plumbing, HVAC, or electrical with service areas, booking form, testimonials, and emergency contact" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, prompt: "Create an elegant salon or spa website with service menu, appointment booking, stylist profiles, gallery, and gift card section" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, prompt: "Create a restaurant website with menu display, online ordering, reservation system, location/hours, and photo gallery" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, prompt: "Create an e-commerce storefront with product catalog, shopping cart, checkout flow, and customer reviews" },
  { id: "creator", label: "Creator", icon: Palette, prompt: "Create a creator portfolio website with project showcase, about section, client testimonials, and contact form" },
  { id: "coaching", label: "Coaching", icon: Users, prompt: "Create a coaching or consulting website with services offered, booking calendar, client success stories, and free resource downloads" },
  { id: "real_estate", label: "Real Estate", icon: Home, prompt: "Create a real estate agent website with property listings, search filters, agent bio, market insights, and contact form" },
  { id: "nonprofit", label: "Nonprofit", icon: Heart, prompt: "Create a nonprofit organization website with mission statement, donation form, volunteer signup, events calendar, and impact stories" },
];

interface SystemsAIPanelProps {
  user: User | null;
  onAuthRequired?: () => void;
}

/**
 * Build a LaunchConfig from a chip selection via the canonical blueprint compiler.
 * Both SystemLauncher and SystemsAIPanel now produce the same BusinessBlueprint,
 * which is then compiled into a LaunchConfig for the generation pipeline.
 */
function buildLaunchConfigFromChip(chipId?: string | null): LaunchConfig {
  const industry = (chipId && CHIP_TO_INDUSTRY[chipId]) || 'other';
  const businessName = 'My Business'; // Will be resolved by aiLaunchService
  const blueprint = createQuickBlueprint(industry, businessName);
  return blueprintToLaunchConfig(blueprint, 'ai-enhanced');
}

export function SystemsAIPanel({ user, onAuthRequired }: SystemsAIPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Code Assistant state
  const [codePrompt, setCodePrompt] = useState("");
  const [selectedCodeChip, setSelectedCodeChip] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  
  // File drop state
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // User Design Profile - analyzes saved projects for style-matching
  const { 
    hasProfile, 
    profile: designProfile,
    getPromptContext: getDesignPromptContext,
    projectCount: savedProjectCount,
    loading: profileLoading 
  } = useUserDesignProfile();

  // File processing helpers
  const getFileType = (file: File): DroppedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (
      file.type === 'text/plain' ||
      file.type === 'text/html' ||
      file.type === 'text/css' ||
      file.type === 'application/javascript' ||
      file.name.match(/\.(tsx?|jsx?|html|css|json|md)$/i)
    ) return 'code';
    if (file.type.startsWith('text/')) return 'text';
    return 'other';
  };

  const processFile = async (file: File): Promise<DroppedFile> => {
    const type = getFileType(file);
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const droppedFile: DroppedFile = { id, file, name: file.name, type };

    if (type === 'image') {
      droppedFile.preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    if (type === 'code' || type === 'text') {
      droppedFile.content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      });
    }

    return droppedFile;
  };

  // File drop handlers
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const supportedFiles = files.filter(f => 
      f.type.startsWith('image/') || 
      f.type.startsWith('text/') ||
      f.name.match(/\.(tsx?|jsx?|html|css|json|md)$/i)
    );

    if (supportedFiles.length === 0) {
      toast({ title: "Unsupported file type", description: "Please drop images or code files", variant: "destructive" });
      return;
    }

    const processedFiles = await Promise.all(supportedFiles.map(processFile));
    setDroppedFiles(prev => [...prev, ...processedFiles]);
    
    const imageFiles = processedFiles.filter(f => f.type === 'image');
    if (imageFiles.length > 0 && !codePrompt.includes('logo') && !codePrompt.includes('image')) {
      const imageContext = imageFiles.length === 1 
        ? `Include the uploaded image "${imageFiles[0].name}" as a logo or hero image. `
        : `Include the ${imageFiles.length} uploaded images in the design. `;
      setCodePrompt(prev => prev ? `${imageContext}${prev}` : imageContext);
    }
  }, [codePrompt, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleRemoveFile = (id: string) => {
    setDroppedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Handler for code chip click
  const handleCodeChipClick = (chipId: string) => {
    const chip = codePromptChips.find(c => c.id === chipId);
    if (chip) {
      setSelectedCodeChip(chipId);
      setCodePrompt(chip.prompt);
    }
  };

  /**
   * Submit handler — routes through aiLaunchService → ai-code-assistant (template-react).
   * Builds a LaunchConfig from chip selection and passes freeform prompt as extra context.
   */
  const handleCodeSubmit = async () => {
    if (!codePrompt.trim()) {
      toast({ title: "Please describe what you want to build", variant: "destructive" });
      return;
    }

    setIsCodeLoading(true);
    setProgressMessage('');

    try {
      const config = buildLaunchConfigFromChip(selectedCodeChip);

      // Build enhanced prompt with file context and design profile
      const fileContext = droppedFiles.length > 0
        ? `\n\n[Attached files: ${droppedFiles.map(f => f.name).join(", ")}]\n${droppedFiles.filter(f => f.content).map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n")}`
        : "";
      const designProfileContext = hasProfile ? getDesignPromptContext() : "";
      const userPrompt = [designProfileContext, codePrompt, fileContext].filter(Boolean).join('\n\n');

      const result = await generateAILaunchSite(
        config,
        (progress) => setProgressMessage(progress.message),
        userPrompt,
      );

      // If AI failed, show the error visibly
      if (result.error) {
        toast({ title: "AI Generation Failed", description: result.error, variant: "destructive" });
      }

      sessionStorage.setItem('ai_assistant_generated_code', JSON.stringify(result.files));
      setDroppedFiles([]);
      
      navigate("/web-builder", {
        state: {
          launchVFS: result.files,
          launchBusinessName: result.businessName,
          launchAIGenerated: result.aiGenerated,
          launchError: result.error || null,
          launchRuntimeManifest: result.runtimeManifest,
          systemsBuildContext: result.systemsBuildContext || null,
          systemType: config.blueprint.systemType,
          systemName: result.businessName,
        },
      });

      if (!result.error) {
        toast({
          title: result.aiGenerated ? "AI website generated!" : "Template site ready!",
          description: result.aiGenerated
            ? "Opening unique AI variation in Web Builder..."
            : "Opening optimized template in Web Builder...",
        });
      }
    } catch (error) {
      console.error("[SystemsAIPanel] Generation error:", error);
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsCodeLoading(false);
      setProgressMessage('');
    }
  };

  return (
    <section id="systems-ai" className="relative overflow-hidden bg-[#0a0a12] py-8">
      <div className="relative container mx-auto px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className={cn(arcadeTitleYellow, "text-3xl mb-2")}>
              Build with AI
            </h2>
            <p className={arcadeSubtitle}>
              Describe your vision or pick a template to launch
            </p>
          </div>

          {/* Main Panel */}
          <div className={cn(arcadePanel, "p-6")}>
            {/* Design Profile Indicator */}
            {hasProfile && (
              <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <Fingerprint className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-purple-400">
                  Style-matching from {savedProjectCount} saved project{savedProjectCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Progress Indicator */}
            {isCodeLoading && progressMessage && (
              <div className="flex items-center justify-center gap-3 mb-4 px-4 py-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span className="text-sm text-cyan-400">{progressMessage}</span>
              </div>
            )}

            {/* Textarea with Drop Zone */}
            <div 
              className={cn(
                "relative mb-4 transition-all rounded-lg",
                isDragging && "ring-2 ring-cyan-500/60 ring-offset-2 ring-offset-[#0d0d18]"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <textarea
                placeholder="Describe your website... e.g., A modern salon site with booking"
                value={codePrompt}
                onChange={(e) => setCodePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCodeSubmit();
                  }
                }}
                className={cn(
                  arcadeInput,
                  "w-full min-h-[100px] p-3 pr-14 text-base resize-none",
                  isDragging && "border-cyan-500/60 bg-cyan-500/5"
                )}
              />
              
              {/* Drop overlay indicator */}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 rounded-lg border-2 border-dashed border-cyan-500/40 pointer-events-none">
                  <div className="flex items-center gap-2 text-cyan-400 text-sm">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">Drop files here</span>
                  </div>
                </div>
              )}
              
              <button
                className={cn(
                  "absolute right-3 bottom-3 h-10 w-10 rounded-full flex items-center justify-center",
                  arcadeButtonPrimary,
                  (isCodeLoading || !codePrompt.trim()) && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleCodeSubmit}
                disabled={isCodeLoading || !codePrompt.trim()}
              >
                {isCodeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Dropped Files Preview */}
            {droppedFiles.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500">Attached ({droppedFiles.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {droppedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group flex items-center gap-1.5 px-2 py-1 bg-[#12121e] border border-cyan-500/20 rounded text-xs text-gray-300"
                    >
                      {file.type === 'image' && file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-5 w-5 object-cover rounded"
                        />
                      ) : (
                        <div className="h-5 w-5 flex items-center justify-center bg-cyan-500/10 rounded">
                          <Code2 className="h-3 w-3 text-cyan-400" />
                        </div>
                      )}
                      <span className="truncate max-w-[80px]">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                      >
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Chips */}
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">Or choose a template:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {codePromptChips.map((chip) => {
                  const Icon = chip.icon;
                  const isSelected = selectedCodeChip === chip.id;
                  const glowColor = CHIP_GLOW[chip.id] || 'cyan';
                  const activeGlowKey = `${glowColor}Active` as keyof typeof arcadeGlows;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => handleCodeChipClick(chip.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                        arcadeBadge[glowColor],
                        isSelected
                          ? cn("scale-105", arcadeGlows[activeGlowKey])
                          : "hover:scale-105"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SystemsAIPanel;
