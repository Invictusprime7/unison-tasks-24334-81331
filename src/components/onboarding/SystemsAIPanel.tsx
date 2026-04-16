/**
 * SystemsAIPanel - AI Code Assistant panel for the homepage
 * 
 * Allows users to describe what they want to build and generates
 * production-ready code using the systems-build edge function with
 * premium template references for quality baseline.
 * 
 * Enhanced with User Design Profile analysis - AI learns from user's
 * saved projects to generate style-matched, personalized websites.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUserDesignProfile } from "@/hooks/useUserDesignProfile";
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
import { getTemplatesByCategory } from "@/data/templates";
import type { BusinessSystemType, LayoutCategory } from "@/data/templates/types";
import { getCompositionReactCode, getCompositionMeta } from "@/utils/compositionReference";
import { cn } from "@/lib/utils";
import { templateToVFSFiles } from "@/utils/templateToVFS";
import { normalizeLauncherFiles } from "@/utils/sandpackFilePrep";
import { extractLauncherFilesPayload, sanitizeLauncherResponseText } from "@/utils/launcherPayload";
import { fixJsxVoidElements, fixJsxStyleStrings } from "@/utils/aiCodeCleaner";
import { applyDesignProfileToTemplate } from "@/utils/designPatternExtractor";
import { generateDesignVariation, randomFontPairing } from "@/utils/designVariation";
import { useLaunch } from "@/contexts/useLaunchHooks";
import type { SystemsBuildContext } from "@/types/systemsBuildContext";
import { createLaunchState } from "@/types/launchState";
import {
  createBlueprintFromIndustry,
  compileContract,
  getIndustryProfile,
} from "@/contracts";

// Dropped file type
interface DroppedFile {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'text' | 'code' | 'other';
  preview?: string;
  content?: string;
}

// Map chip IDs to canonical industry keys (matching contracts/industryMatrix)
const CHIP_TO_CANONICAL_INDUSTRY: Record<string, string> = {
  local_service: "local-service",
  salon_spa: "salon",
  restaurant: "restaurant",
  ecommerce: "ecommerce",
  creator: "portfolio",
  coaching: "coaching",
  real_estate: "real-estate",
  nonprofit: "nonprofit",
};

/**
 * Resolve canonical industry key from chip ID.
 * Uses the contracts/industryMatrix as the single source of truth.
 */
function getCanonicalIndustry(chipId: string): string {
  return CHIP_TO_CANONICAL_INDUSTRY[chipId] || 'agency';
}

/**
 * Get the LayoutCategory for a chip (used for template/composition lookup).
 */
function getCategoryForChip(chipId: string): LayoutCategory {
  const industry = getCanonicalIndustry(chipId);
  const profile = getIndustryProfile(industry);
  return (profile as any)?.layoutCategories?.[0] || 'landing';
}

/**
 * Get the BusinessSystemType for a chip.
 */
function getSystemTypeForChip(chipId: string): BusinessSystemType {
  const industry = getCanonicalIndustry(chipId);
  const profile = getIndustryProfile(industry);
  return profile?.systemType || 'agency';
}

// Industry/business prompt chips for quick actions
const codePromptChips = [
  { id: "local_service", label: "Local Service", icon: Wrench, color: "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20", prompt: "Create a professional website for a local service business like plumbing, HVAC, or electrical with service areas, booking form, testimonials, and emergency contact" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, color: "bg-pink-500/10 text-pink-600 border-pink-200 hover:bg-pink-500/20", prompt: "Create an elegant salon or spa website with service menu, appointment booking, stylist profiles, gallery, and gift card section" },
  { id: "restaurant", label: "Restaurant", icon: Utensils, color: "bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20", prompt: "Create a restaurant website with menu display, online ordering, reservation system, location/hours, and photo gallery" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingBag, color: "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20", prompt: "Create an e-commerce storefront with product catalog, shopping cart, checkout flow, and customer reviews" },
  { id: "creator", label: "Creator", icon: Palette, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-500/20", prompt: "Create a creator portfolio website with project showcase, about section, client testimonials, and contact form" },
  { id: "coaching", label: "Coaching", icon: Users, color: "bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20", prompt: "Create a coaching or consulting website with services offered, booking calendar, client success stories, and free resource downloads" },
  { id: "real_estate", label: "Real Estate", icon: Home, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200 hover:bg-cyan-500/20", prompt: "Create a real estate agent website with property listings, search filters, agent bio, market insights, and contact form" },
  { id: "nonprofit", label: "Nonprofit", icon: Heart, color: "bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/20", prompt: "Create a nonprofit organization website with mission statement, donation form, volunteer signup, events calendar, and impact stories" },
];

interface SystemsAIPanelProps {
  user: User | null;
  onAuthRequired?: () => void;
}

/**
 * Picks the best template reference for a given chip.
 * Uses contract-derived system type and layout category.
 */
function getTemplateReference(chipId: string): { templateId: string; templateHtml: string; templateCode: string; templateName: string; systemType: BusinessSystemType } | null {
  const systemType = getSystemTypeForChip(chipId);
  const category = getCategoryForChip(chipId);

  // Prefer composition-based React code
  const compositionCode = getCompositionReactCode(category);
  const compositionMeta = getCompositionMeta(category);
  if (compositionCode && compositionMeta) {
    return {
      templateId: compositionMeta.compositionId,
      templateHtml: compositionCode,
      templateCode: compositionCode,
      templateName: compositionMeta.name,
      systemType,
    };
  }
  
  // Fallback to legacy HTML templates
  const templates = getTemplatesByCategory(category);
  if (!templates.length) return null;
  
  const bestTemplate = templates[0];
  if (!bestTemplate.code || bestTemplate.code.length < 100) return null;
  
  return {
    templateId: bestTemplate.id,
    templateHtml: bestTemplate.code,
    templateCode: bestTemplate.code,
    templateName: bestTemplate.name,
    systemType,
  };
}

/**
 * Build a SystemsBuildContext from a chip selection using the canonical
 * contract pipeline (createBlueprintFromIndustry → compileContract).
 * 
 * This replaces the ad-hoc buildBlueprintFromChip that maintained its
 * own palette/intent mappings outside the contracts system.
 */
function buildContractAndContext(chipId: string, prompt: string, businessName?: string): {
  context: SystemsBuildContext;
  compiled: import('@/contracts').CompiledContract;
} {
  const chip = codePromptChips.find(c => c.id === chipId);
  const canonicalIndustry = getCanonicalIndustry(chipId);
  const name = businessName || chip?.label || "My Business";

  // Use canonical blueprint from contracts system
  const blueprint = createBlueprintFromIndustry(canonicalIndustry, name, {
    prompt,
  });

  // Compile to validate
  const compiled = compileContract(blueprint);
  if (compiled.validation.warnings > 0) {
    console.warn(`[SystemsAIPanel] Blueprint warnings:`, compiled.validation.issues.filter(i => i.severity === 'warning'));
  }

  // Convert to edge function's expected format (SystemsBuildContext shape)
  const fonts = randomFontPairing();
  const design = generateDesignVariation();
  const compositionMeta = getCompositionMeta(getCategoryForChip(chipId));

  const context: SystemsBuildContext = {
    version: "1.0",
    identity: {
      industry: canonicalIndustry,
      primary_goal: blueprint.capabilities.primaryGoal,
    },
    brand: {
      business_name: name,
      tagline: blueprint.identity.tagline || `Professional ${chip?.label || "business"} services you can trust`,
      tone: "professional and friendly",
      typography: fonts,
    },
    design: {
      layout: { hero_style: design.layout.hero_style as string | undefined },
      effects: {
        animations: design.effects.animations,
        scroll_animations: design.effects.scroll_animations,
        hover_effects: design.effects.hover_effects,
        gradient_backgrounds: design.effects.gradient_backgrounds,
        glassmorphism: design.effects.glassmorphism,
        shadows: design.effects.shadows as string | undefined,
      },
      sections: {
        include_stats: design.sections.include_stats,
        include_testimonials: design.sections.include_testimonials,
        include_faq: design.sections.include_faq,
        include_cta_banner: design.sections.include_cta_banner,
        include_newsletter: design.sections.include_newsletter,
        include_social_proof: design.sections.include_social_proof,
      },
    },
    intents: blueprint.intents.allowed.map(i => ({ intent: i })),
    template_sections: compositionMeta?.sections,
    template_intents: compositionMeta?.intents,
  };

  return { context, compiled };
}

export function SystemsAIPanel({ user, onAuthRequired }: SystemsAIPanelProps) {
  const navigate = useNavigate();
  const { setLaunch } = useLaunch();
  const { toast } = useToast();
  
  // Code Assistant state
  const [codePrompt, setCodePrompt] = useState("");
  const [selectedCodeChip, setSelectedCodeChip] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  
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

  const persistLaunchState = useCallback((input: {
    vfsFiles: Record<string, string>;
    templateName: string;
    aesthetic?: string;
    systemType?: BusinessSystemType;
    systemName?: string;
    templateCategory?: LayoutCategory;
    systemsBuildContext?: SystemsBuildContext;
  }) => {
    setLaunch(
      createLaunchState({
        systemType: input.systemType || "content",
        systemName: input.systemName || input.templateName,
        businessName: input.systemName || input.templateName,
        templateName: input.templateName,
        templateCategory: input.templateCategory || "landing",
        aesthetic: input.aesthetic,
        vfsFiles: input.vfsFiles,
        preloadedIntents: input.systemsBuildContext?.intents?.map((item) => item.intent) || [],
        startInPreview: true,
        intentRuntime: true,
        systemsBuildContext: input.systemsBuildContext,
      }),
    );
  }, [setLaunch]);

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
    
    const droppedFile: DroppedFile = {
      id,
      file,
      name: file.name,
      type,
    };

    // Generate preview for images
    if (type === 'image') {
      droppedFile.preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    // Read text content for code/text files
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

    // Filter for supported file types
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
    
    // Add file context to prompt if images were dropped
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

  // Handler for code assistant submit - routes through systems-build with template reference
  const handleCodeSubmit = async () => {
    if (!codePrompt.trim()) {
      toast({ title: "Please describe what you want to build", variant: "destructive" });
      return;
    }

    setIsCodeLoading(true);

    try {
      // Prepare attachments from dropped files
      const attachments = droppedFiles.map(file => ({
        name: file.name,
        type: file.type,
        content: file.content,
        preview: file.preview,
      }));

      // Build enhanced prompt with file context
      const fileContext = droppedFiles.length > 0
        ? `\n\n[Attached files: ${droppedFiles.map(f => f.name).join(", ")}]\n${droppedFiles.filter(f => f.type === "text").map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n")}`
        : "";

      // If a chip is selected, use the pre-built premium template directly
      // Templates have premium CSS built-in - use as-is for quality output
      if (selectedCodeChip) {
        const ref = getTemplateReference(selectedCodeChip);
        
        // If we have a premium template, use its React code directly
        if (ref && ref.templateCode) {
          console.log(`[SystemsAIPanel] Using pre-built template: ${ref.templateId} (${ref.templateName})`);
          
          // The templateCode is already React/TSX from the composition registry
          const reactCode = ref.templateCode;
          
          console.log(`[SystemsAIPanel] Design profile ${hasProfile ? 'applied' : 'not available'} (${savedProjectCount} projects)`);
          
          sessionStorage.setItem('ai_assistant_generated_code', JSON.stringify({ "src/App.tsx": reactCode }));
          setDroppedFiles([]); // Clear files on success
          const contractContext = buildContractAndContext(selectedCodeChip, codePrompt).context;
          const templateCategory = getCategoryForChip(selectedCodeChip);
          const launchVfsFiles = templateToVFSFiles(reactCode, ref.templateName.replace(/[^a-zA-Z0-9]/g, ''));
          persistLaunchState({
            vfsFiles: launchVfsFiles,
            templateName: ref.templateName,
            aesthetic: "premium",
            systemType: ref.systemType,
            systemName: ref.templateName,
            templateCategory,
            systemsBuildContext: contractContext,
          });
          navigate("/web-builder", {
            state: {
              generatedCode: reactCode,
              templateName: ref.templateName,
              aesthetic: "premium",
              startInPreview: true,
              systemType: ref.systemType,
              framework: "react",
              userDesignProfile: hasProfile ? {
                projectCount: savedProjectCount,
                dominantStyle: designProfile?.dominantStyle,
              } : undefined,
              systemsBuildContext: contractContext,
            },
          });
          toast({ 
            title: `${ref.templateName} ready!`, 
            description: hasProfile 
              ? `Personalized from ${savedProjectCount} saved project${savedProjectCount !== 1 ? 's' : ''}` 
              : "Premium template loaded. Customize in Web Builder..."
          });
          return;
        }

        // No pre-built template found - AI generation via ai-code-assistant (same as in-builder AI)
        console.log(`[SystemsAIPanel] No pre-built template for ${selectedCodeChip}, using ai-code-assistant`);

        const chipLabel = codePromptChips.find(c => c.id === selectedCodeChip)?.label || "website";
        const chipBuildContext = buildContractAndContext(selectedCodeChip, codePrompt).context;
        const designProfileContext = hasProfile ? getDesignPromptContext() : null;
        const chipPrompt = `Create a complete, polished, production-ready ${chipLabel} website. ${codePrompt}${fileContext}`;
        const enhancedChipPrompt = designProfileContext
          ? `${designProfileContext}\n\n---\n\nUser Request:\n${chipPrompt}`
          : chipPrompt;

        const CHIP_MAX_RETRIES = 2;
        let chipData: Record<string, unknown> | null = null;
        let chipError: { message?: string } | null = null;

        for (let attempt = 0; attempt <= CHIP_MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            await new Promise(res => setTimeout(res, 1000 * attempt));
            console.log(`[SystemsAIPanel] Retry attempt ${attempt} for chip generation`);
          }
          const result = await supabase.functions.invoke("ai-code-assistant", {
            body: {
              messages: [{ role: "user", content: enhancedChipPrompt }],
              mode: "code",
              templateAction: "full-control",
              editMode: false,
              systemType: ref?.systemType,
              templateName: ref?.templateName,
              attachments: attachments.length > 0 ? attachments : undefined,
              userDesignProfile: hasProfile ? {
                projectCount: savedProjectCount,
                dominantStyle: designProfile?.dominantStyle,
                industryHints: designProfile?.industryHints,
              } : undefined,
              systemsBuildContext: chipBuildContext,
            },
          });
          chipError = result.error as { message?: string } | null;
          chipData = result.data as Record<string, unknown> | null;
          if (!chipError) break;
        }

        if (chipError) {
          const msg = chipError.message || '';
          if (msg.includes('429')) {
            toast({ title: "Rate limit exceeded", description: "Please wait a moment before trying again.", variant: "destructive" });
            return;
          }
          if (msg.includes('402')) {
            toast({ title: "Credits required", description: "Please add credits to continue using AI features.", variant: "destructive" });
            return;
          }
          throw chipError;
        }

        const chipContent = sanitizeLauncherResponseText((chipData?.content as string) || (chipData?.code as string) || "");
        const chipStructuredFiles = extractLauncherFilesPayload(chipContent);

        if (chipStructuredFiles && Object.keys(chipStructuredFiles).length > 0) {
          const chipVfsFiles = normalizeLauncherFiles(chipStructuredFiles, { entryPoint: '/src/App.tsx' });
          const generatedCode = chipVfsFiles['/src/App.tsx'] || chipVfsFiles['/App.tsx'] || Object.values(chipVfsFiles)[0] || '';

          sessionStorage.setItem('ai_assistant_generated_code', JSON.stringify(chipVfsFiles));
          setDroppedFiles([]);
          persistLaunchState({
            vfsFiles: chipVfsFiles,
            templateName: `AI ${chipLabel}`,
            aesthetic: "modern",
            systemType: ref?.systemType,
            systemName: chipLabel,
            templateCategory: getCategoryForChip(selectedCodeChip),
            systemsBuildContext: chipBuildContext,
          });
          navigate("/web-builder", {
            state: {
              vfsFiles: chipVfsFiles,
              generatedCode,
              templateName: `AI ${chipLabel}`,
              aesthetic: "modern",
              startInPreview: true,
              systemType: ref?.systemType,
              userDesignProfile: hasProfile ? { projectCount: savedProjectCount, dominantStyle: designProfile?.dominantStyle } : undefined,
              systemsBuildContext: chipBuildContext,
            },
          });
          toast({ title: "Website generated!", description: "Opening in Web Builder..." });
          return;
        }

        const chipHtmlStart = chipContent.includes('<!DOCTYPE') ? chipContent.indexOf('<!DOCTYPE') : chipContent.indexOf('<html');
        const chipHtmlEnd = chipContent.lastIndexOf('</html>');
        const chipCode = chipHtmlStart !== -1 && chipHtmlEnd !== -1
          ? chipContent.slice(chipHtmlStart, chipHtmlEnd + 7)
          : chipContent.replace(/```(?:html)?\n?/g, '').replace(/```\s*$/g, '').trim();

        if (chipCode && chipCode.length > 100) {
          console.log('[SystemsAIPanel] ai-code-assistant chip generation:', chipCode.length, 'chars');
          // Create VFS from React/TSX code
          const chipVfsFiles = templateToVFSFiles(chipCode, chipLabel.replace(/[^a-zA-Z0-9]/g, ''));
          
          sessionStorage.setItem('ai_assistant_generated_code', chipCode);
          setDroppedFiles([]);
          persistLaunchState({
            vfsFiles: chipVfsFiles,
            templateName: `AI ${chipLabel}`,
            aesthetic: "modern",
            systemType: ref?.systemType,
            systemName: chipLabel,
            templateCategory: getCategoryForChip(selectedCodeChip),
            systemsBuildContext: chipBuildContext,
          });
          navigate("/web-builder", {
            state: {
              vfsFiles: chipVfsFiles,
              generatedCode: chipCode,
              templateName: `AI ${chipLabel}`,
              aesthetic: "modern",
              startInPreview: true,
              systemType: ref?.systemType,
              userDesignProfile: hasProfile ? { projectCount: savedProjectCount, dominantStyle: designProfile?.dominantStyle } : undefined,
              systemsBuildContext: chipBuildContext,
            },
          });
          toast({ title: "Website generated!", description: "Opening in Web Builder..." });
          return;
        }
      }

      // Free-form prompt: ai-code-assistant with retry logic (same engine as in-builder AI)
      const freeformDesignContext = hasProfile ? getDesignPromptContext() : null;
      const basePrompt = buildFreeformPrompt(codePrompt) + fileContext;
      const enhancedFreeformPrompt = freeformDesignContext
        ? `${freeformDesignContext}\n\n---\n\nUser Request:\n${basePrompt}`
        : basePrompt;

      console.log(`[SystemsAIPanel] Free-form ai-code-assistant with ${droppedFiles.length} attachments${hasProfile ? ` + design profile (${savedProjectCount} projects)` : ''}`);

      const FREE_MAX_RETRIES = 2;
      let freeformData: Record<string, unknown> | null = null;
      let freeformError: { message?: string } | null = null;

      for (let attempt = 0; attempt <= FREE_MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await new Promise(res => setTimeout(res, 1000 * attempt));
          console.log(`[SystemsAIPanel] Retry attempt ${attempt} for free-form generation`);
        }
        const result = await supabase.functions.invoke("ai-code-assistant", {
          body: {
            messages: [{ role: "user", content: enhancedFreeformPrompt }],
            mode: "code",
            templateAction: "full-control",
            editMode: false,
            systemType: "content",
            attachments: attachments.length > 0 ? attachments : undefined,
            userDesignProfile: hasProfile ? {
              projectCount: savedProjectCount,
              dominantStyle: designProfile?.dominantStyle,
              industryHints: designProfile?.industryHints,
            } : undefined,
          },
        });
        freeformError = result.error as { message?: string } | null;
        freeformData = result.data as Record<string, unknown> | null;
        if (!freeformError) break;
      }

      if (freeformError) {
        if (freeformError.message?.includes('429')) {
          toast({ title: "Rate limit exceeded", description: "Please wait a moment.", variant: "destructive" });
          return;
        }
        if (freeformError.message?.includes('402')) {
          toast({ title: "Credits required", description: "Please add credits.", variant: "destructive" });
          return;
        }
        throw freeformError;
      }

      const freeformContent = sanitizeLauncherResponseText((freeformData?.content as string) || (freeformData?.code as string) || "");
      const freeformStructuredFiles = extractLauncherFilesPayload(freeformContent);

      if (freeformStructuredFiles && Object.keys(freeformStructuredFiles).length > 0) {
        const freeVfsFiles = normalizeLauncherFiles(freeformStructuredFiles, { entryPoint: '/src/App.tsx' });
        const generatedCode = freeVfsFiles['/src/App.tsx'] || freeVfsFiles['/App.tsx'] || Object.values(freeVfsFiles)[0] || '';

        sessionStorage.setItem('ai_assistant_generated_code', JSON.stringify(freeVfsFiles));
        setDroppedFiles([]);
        persistLaunchState({
          vfsFiles: freeVfsFiles,
          templateName: "AI Generated",
          aesthetic: "modern",
          systemType: "content",
          systemName: "AI Generated",
          templateCategory: "landing",
        });
        navigate("/web-builder", {
          state: {
            vfsFiles: freeVfsFiles,
            generatedCode,
            templateName: "AI Generated",
            aesthetic: "modern",
            startInPreview: true,
            systemType: "content",
            userDesignProfile: hasProfile ? { projectCount: savedProjectCount, dominantStyle: designProfile?.dominantStyle } : undefined,
          },
        });
        toast({ title: "Code generated!", description: "Opening in Web Builder..." });
        return;
      }

      // Extract clean HTML directly - prefer <!DOCTYPE html> boundaries
      const freeHtmlStart = freeformContent.includes('<!DOCTYPE') ? freeformContent.indexOf('<!DOCTYPE') : freeformContent.indexOf('<html');
      const freeHtmlEnd = freeformContent.lastIndexOf('</html>');
      const generatedCode = freeHtmlStart !== -1 && freeHtmlEnd !== -1
        ? freeformContent.slice(freeHtmlStart, freeHtmlEnd + 7)
        : freeformContent.replace(/```(?:html)?\n?/g, '').replace(/```\s*$/g, '').trim();

      if (generatedCode) {
        // Create VFS from React/TSX code
        const freeVfsFiles = templateToVFSFiles(generatedCode, 'CustomWebsite');
        
        sessionStorage.setItem('ai_assistant_generated_code', generatedCode);
        setDroppedFiles([]);
        persistLaunchState({
          vfsFiles: freeVfsFiles,
          templateName: "AI Generated",
          aesthetic: "modern",
          systemType: "content",
          systemName: "AI Generated",
          templateCategory: "landing",
        });
        navigate("/web-builder", {
          state: {
            vfsFiles: freeVfsFiles,
            generatedCode,
            templateName: "AI Generated",
            aesthetic: "modern",
            startInPreview: true,
            systemType: "content",
            userDesignProfile: hasProfile ? { projectCount: savedProjectCount, dominantStyle: designProfile?.dominantStyle } : undefined,
          },
        });
        toast({ title: "Code generated!", description: "Opening in Web Builder..." });
      } else {
        toast({ title: "No code generated", description: "Please try a different prompt", variant: "destructive" });
      }
    } catch (error) {
      console.error("Code generation error:", error);
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsCodeLoading(false);
    }
  };

  return (
    <section id="systems-ai" className="relative overflow-hidden">
      <div className="relative container mx-auto px-4">
        <div className="max-w-3xl mx-auto">

          {/* Main Input Card */}
          <Card className="border shadow-md bg-card/80 backdrop-blur">
            <CardContent className="p-6">
              {/* User Design Profile Indicator */}
              {hasProfile && (
                <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-blue-500/10 rounded-lg border border-violet-200/30">
                  <Fingerprint className="h-4 w-4 text-violet-500" />
                  <span className="text-sm text-violet-600 dark:text-violet-400">
                    Style-matching from {savedProjectCount} saved project{savedProjectCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {/* Text Input with Drop Zone */}
              <div 
                className={cn(
                  "relative mb-3 transition-all rounded-lg",
                  isDragging && "ring-2 ring-primary ring-offset-2"
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
                    "w-full min-h-[100px] p-3 pr-12 text-base border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background",
                    isDragging && "border-primary bg-primary/5"
                  )}
                />
                
                {/* Drop overlay indicator */}
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg border-2 border-dashed border-primary pointer-events-none">
                    <div className="flex items-center gap-2 text-primary text-sm">
                      <Upload className="h-4 w-4" />
                      <span className="font-medium">Drop files here</span>
                    </div>
                  </div>
                )}
                
                <Button 
                  size="icon"
                  className="absolute right-3 bottom-3 h-10 w-10 rounded-full shadow-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={handleCodeSubmit}
                  disabled={isCodeLoading || !codePrompt.trim()}
                >
                  {isCodeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Dropped Files Preview */}
              {droppedFiles.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Attached ({droppedFiles.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {droppedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="relative group flex items-center gap-1.5 px-2 py-1 bg-muted rounded border text-xs"
                      >
                        {file.type === 'image' && file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-5 w-5 object-cover rounded"
                          />
                        ) : (
                          <div className="h-5 w-5 flex items-center justify-center bg-primary/10 rounded">
                            <Code2 className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <span className="truncate max-w-[80px]">{file.name}</span>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Prompt Chips */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Or choose a template:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {codePromptChips.map((chip) => {
                    const Icon = chip.icon;
                    const isSelected = selectedCodeChip === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => handleCodeChipClick(chip.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all ${isSelected ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-600 scale-105 shadow-md" : chip.color}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

/**
 * Build an enhanced freeform prompt for ai-code-assistant (no chip selected)
 */
function buildFreeformPrompt(prompt: string): string {
  return `🚀 CREATE A COMPLETE, POLISHED, PRODUCTION-READY WEBSITE LANDING PAGE

USER REQUEST: ${prompt}

📋 CRITICAL REQUIREMENTS - YOU MUST INCLUDE ALL OF THESE:

1. **COMPLETE HTML DOCUMENT** - Start with <!DOCTYPE html> and include full <html>, <head>, <body>
2. **TAILWIND CSS** - Include <script src="https://cdn.tailwindcss.com"></script>
3. **MULTI-SECTION LAYOUT** - Include AT MINIMUM:
   - Navigation header with logo and menu links (use data-ut-intent="nav.goto" data-ut-path="/pagename.html" for nav links)
   - Hero section with compelling headline, subtext, and CTA button
   - Features/services section with 3-4 feature cards
   - Testimonials or social proof section
   - Contact/CTA section
   - Footer with links and copyright

4. **REAL, COMPELLING CONTENT** - NOT placeholder text
5. **POLISHED VISUAL DESIGN** - Modern color scheme, gradients, typography, hover effects
6. **INTERACTIVE ELEMENTS** - Working navigation, hover states, scroll animations
7. **BACKEND INTENT WIRING** - data-ut-intent attributes on CTAs
8. **UI CONTROLS WITHOUT INTENTS** - data-no-intent on non-conversion elements
9. **NAVIGATION LINKS** - All nav links MUST use data-ut-intent="nav.goto" data-ut-path="/pagename.html" for linked pages (about, services, contact, pricing, etc.)
10. **CTA BUTTONS** - Redirect-worthy CTAs (Shop Now, Learn More, View Details, Get Started, etc.) MUST include data-ut-path pointing to their target page

OUTPUT FORMAT:
- Return ONLY a single complete HTML page (index.html)
- Navigation links use data-ut-intent="nav.goto" with data-ut-path for ALL linked pages
- CTA buttons that imply navigation MUST have data-ut-path attributes
- The system will auto-generate matching pages for every data-ut-path target
- NO \`<!-- PAGE: -->\` markers - generate only the main page
- NO markdown, NO explanations
- Start with <!DOCTYPE html>`;
}

export default SystemsAIPanel;
