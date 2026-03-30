import React, { useState, useRef, useEffect, useCallback } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import VFSMonacoEditor from "./code-editor/VFSMonacoEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Send,
  Code2,
  Palette,
  CheckCircle2,
  Copy,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Code,
  Trash2,
  Wand2,
  Paperclip,
  Image,
  X,
  Play,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  generateDefaultSlots,
  createSlotRegistry,
  AISlotRulesEngine,
  generateSlotContextForAI,
  ImageSlotTracker,
} from "@/services/imageSlotService";
import { FileDropZone, DroppedFile } from "./web-builder/FileDropZone";
import { useAIFileAnalysis } from "@/hooks/useAIFileAnalysis";
import { useIntentSuccessWatcher, type IntentContinuationRequest } from "@/hooks/useIntentSuccessWatcher";
import { rewriteDemoEmbeds } from "@/utils/demoEmbedRewriter";
import type { BusinessSystemType } from "@/data/templates/types";
import type { TemplateCtaAnalysis } from "@/utils/ctaContract";
import { buildWebBuilderAIContext } from "@/utils/aiAssistantContext";
// Removed deprecated aiFileTags - functionality consolidated in aiResponseParser
import { parseAIResponse, getPrimaryCodeBlock, type AIResponseParseResult } from "@/utils/aiResponseParser";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasCode?: boolean;
  componentData?: Json;
  suggestions?: string[];
}

interface AITheme {
  id: string;
  name: string;
  emoji: string;
  gradient: {
    header: string;
    headerHover: string;
    tab: string;
    button: string;
    buttonHover: string;
    glow: string;
    accent: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const AI_THEMES: AITheme[] = [
  {
    id: "dark-default",
    name: "Dark Mode",
    emoji: "🌑",
    gradient: {
      header: "from-gray-800 via-gray-900 to-black",
      headerHover: "hover:from-gray-700 hover:via-gray-800 hover:to-gray-900",
      tab: "from-gray-700 to-gray-900",
      button: "from-gray-800 via-gray-900 to-black",
      buttonHover: "hover:from-gray-700 hover:via-gray-800 hover:to-gray-900",
      glow: "from-gray-600 to-gray-900",
      accent: "gray",
    },
    colors: {
      primary: "gray-800",
      secondary: "gray-900",
      accent: "gray-700",
    },
  },
  {
    id: "purple-cyan",
    name: "Purple Cyan",
    emoji: "💎",
    gradient: {
      header: "from-purple-700 via-indigo-700 to-cyan-700",
      headerHover: "hover:from-purple-800 hover:via-indigo-800 hover:to-cyan-800",
      tab: "from-purple-600 to-cyan-600",
      button: "from-purple-700 via-indigo-700 to-cyan-700",
      buttonHover: "hover:from-purple-800 hover:via-indigo-800 hover:to-cyan-800",
      glow: "from-purple-600 to-cyan-600",
      accent: "indigo",
    },
    colors: {
      primary: "purple-700",
      secondary: "indigo-700",
      accent: "cyan-700",
    },
  },
  {
    id: "pink-orange",
    name: "Pink Orange",
    emoji: "🌺",
    gradient: {
      header: "from-pink-700 via-rose-700 to-orange-700",
      headerHover: "hover:from-pink-800 hover:via-rose-800 hover:to-orange-800",
      tab: "from-pink-600 to-orange-600",
      button: "from-pink-700 via-rose-700 to-orange-700",
      buttonHover: "hover:from-pink-800 hover:via-rose-800 hover:to-orange-800",
      glow: "from-pink-600 to-orange-600",
      accent: "rose",
    },
    colors: {
      primary: "pink-700",
      secondary: "rose-700",
      accent: "orange-700",
    },
  },
  {
    id: "blue-teal",
    name: "Blue Teal",
    emoji: "🌊",
    gradient: {
      header: "from-blue-700 via-sky-700 to-teal-700",
      headerHover: "hover:from-blue-800 hover:via-sky-800 hover:to-teal-800",
      tab: "from-blue-600 to-teal-600",
      button: "from-blue-700 via-sky-700 to-teal-700",
      buttonHover: "hover:from-blue-800 hover:via-sky-800 hover:to-teal-800",
      glow: "from-blue-600 to-teal-600",
      accent: "sky",
    },
    colors: {
      primary: "blue-700",
      secondary: "sky-700",
      accent: "teal-700",
    },
  },
  {
    id: "green-lime",
    name: "Green Lime",
    emoji: "🍃",
    gradient: {
      header: "from-green-700 via-emerald-700 to-lime-700",
      headerHover: "hover:from-green-800 hover:via-emerald-800 hover:to-lime-800",
      tab: "from-green-600 to-lime-600",
      button: "from-green-700 via-emerald-700 to-lime-700",
      buttonHover: "hover:from-green-800 hover:via-emerald-800 hover:to-lime-800",
      glow: "from-green-600 to-lime-600",
      accent: "emerald",
    },
    colors: {
      primary: "green-700",
      secondary: "emerald-700",
      accent: "lime-700",
    },
  },
  {
    id: "red-amber",
    name: "Red Amber",
    emoji: "🔥",
    gradient: {
      header: "from-red-700 via-orange-700 to-amber-700",
      headerHover: "hover:from-red-800 hover:via-orange-800 hover:to-amber-800",
      tab: "from-red-600 to-amber-600",
      button: "from-red-700 via-orange-700 to-amber-700",
      buttonHover: "hover:from-red-800 hover:via-orange-800 hover:to-amber-800",
      glow: "from-red-600 to-amber-600",
      accent: "orange",
    },
    colors: {
      primary: "red-700",
      secondary: "orange-700",
      accent: "amber-700",
    },
  },
  {
    id: "violet-fuchsia",
    name: "Violet Fuchsia",
    emoji: "✨",
    gradient: {
      header: "from-violet-700 via-purple-700 to-fuchsia-700",
      headerHover: "hover:from-violet-800 hover:via-purple-800 hover:to-fuchsia-800",
      tab: "from-violet-600 to-fuchsia-600",
      button: "from-violet-700 via-purple-700 to-fuchsia-700",
      buttonHover: "hover:from-violet-800 hover:via-purple-800 hover:to-fuchsia-800",
      glow: "from-violet-600 to-fuchsia-600",
      accent: "purple",
    },
    colors: {
      primary: "violet-700",
      secondary: "purple-700",
      accent: "fuchsia-700",
    },
  },
  {
    id: "indigo-rose",
    name: "Indigo Rose",
    emoji: "🌹",
    gradient: {
      header: "from-indigo-700 via-pink-700 to-rose-700",
      headerHover: "hover:from-indigo-800 hover:via-pink-800 hover:to-rose-800",
      tab: "from-indigo-600 to-rose-600",
      button: "from-indigo-700 via-pink-700 to-rose-700",
      buttonHover: "hover:from-indigo-800 hover:via-pink-800 hover:to-rose-800",
      glow: "from-indigo-600 to-rose-600",
      accent: "pink",
    },
    colors: {
      primary: "indigo-700",
      secondary: "pink-700",
      accent: "rose-700",
    },
  },
];

// Get contextual suggestions based on the completed intent type
function getSuggestionsForIntentType(intent: string): string[] {
  if (intent.includes('booking') || intent.includes('calendar')) {
    return [
      'Add confirmation email',
      'Customize booking form',
      'Add availability calendar',
      'Style the booking widget',
      'Add payment flow',
    ];
  }
  if (intent.includes('contact') || intent.includes('lead')) {
    return [
      'Add follow-up automation',
      'Customize form fields',
      'Add form validation',
      'Style the contact form',
      'Add captcha',
    ];
  }
  if (intent.includes('newsletter') || intent.includes('subscribe')) {
    return [
      'Add welcome email',
      'Customize signup form',
      'Add double opt-in',
      'Style the widget',
      'Add subscriber tags',
    ];
  }
  if (intent.includes('checkout') || intent.includes('cart') || intent.includes('payment')) {
    return [
      'Add order confirmation',
      'Customize checkout flow',
      'Add discount codes',
      'Style the cart',
      'Add shipping options',
    ];
  }
  // Default suggestions
  return [
    'Add another section',
    'Improve the styling',
    'Add animations',
    'Wire up more buttons',
    'Test another flow',
  ];
}

interface AICodeAssistantProps {
  className?: string;
  /** Display mode: 'floating' (fixed bottom-right) or 'dock' (inline bottom panel) */
  displayMode?: 'floating' | 'dock';
  /** When in dock mode, whether the panel is expanded */
  isOpen?: boolean;
  /** Callback when dock panel is toggled */
  onToggle?: () => void;
  fabricCanvas?: FabricCanvas | null;
  onCodeGenerated?: (code: string) => void;
  /** Apply a multi-file patch plan (preferred for full context-aware edits). Return true if applied. */
  onFilesPatch?: (files: Record<string, string>) => boolean;
  onSwitchToCanvasView?: () => void;
  currentCode?: string; // Current template code for editing existing templates
  systemType?: BusinessSystemType | null;
  templateName?: string | null;
  templateCtaAnalysis?: TemplateCtaAnalysis;
  pageStructureContext?: string | null;
  backendStateContext?: string | null;
  businessDataContext?: string | null;
  selectedElement?: {
    html: string;
    selector: string;
    section?: string;
  }; // Selected element from preview for targeted editing
  /** User's design profile extracted from saved projects - enables personalized AI generation */
  userDesignProfile?: {
    projectCount?: number;
    dominantStyle?: 'dark' | 'light' | 'colorful' | 'minimal' | 'mixed';
    industryHints?: string[];
  };
  /** When true, the AI panel opens to edit the selected element. Controlled externally. */
  requestAIEdit?: boolean;
  /** Called when the AI panel finishes or dismisses the element-edit request. */
  onAIEditDismissed?: () => void;
  /** Return true when the update was applied successfully. */
  onElementUpdate?: (selector: string, newHtml: string) => boolean;
}

export const AICodeAssistant: React.FC<AICodeAssistantProps> = ({
  className,
  displayMode = 'floating',
  isOpen: externalIsOpen,
  onToggle,
  fabricCanvas,
  onCodeGenerated,
  onFilesPatch,
  onSwitchToCanvasView,
  currentCode,
  systemType,
  templateName,
  templateCtaAnalysis,
  pageStructureContext,
  backendStateContext,
  businessDataContext,
  selectedElement,
  userDesignProfile,
  requestAIEdit,
  onAIEditDismissed,
  onElementUpdate,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"code" | "design" | "review" | "debug">("code");
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [learningEnabled, setLearningEnabled] = useState(true);
  
  // In dock mode, use external control; in floating mode, use internal state
  const isExpanded = displayMode === 'dock' ? (externalIsOpen ?? true) : internalExpanded;
  const setIsExpanded = displayMode === 'dock' 
    ? (val: boolean | ((prev: boolean) => boolean)) => {
        const newVal = typeof val === 'function' ? val(isExpanded) : val;
        onToggle?.();
      }
    : setInternalExpanded;
  const [autoDetectErrors, setAutoDetectErrors] = useState(true);
  const [isEditingElement, setIsEditingElement] = useState(false);
  const [codeViewerOpen, setCodeViewerOpen] = useState(false);
  const [viewerCode, setViewerCode] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [showFileZone, setShowFileZone] = useState(false);
  const [demoEmbedDialogOpen, setDemoEmbedDialogOpen] = useState(false);
  const [demoEmbedUrl, setDemoEmbedUrl] = useState("");
  const [supademoEmbedUrl, setSupademoEmbedUrl] = useState("");

  // Governance: proposed changes require explicit approval
  const [pendingCodeApplyOpen, setPendingCodeApplyOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<string>("");
  const [pendingElementSelector, setPendingElementSelector] = useState<string | null>(null);
  // True when pendingCode is a snippet injected into the template (not a full replacement)
  const [pendingCodeIsSnippet, setPendingCodeIsSnippet] = useState(false);
  // The templateAction that triggered the current pending code (for dialog warnings)
  const [pendingTemplateAction, setPendingTemplateAction] = useState<string | undefined>(undefined);

  const [pendingFilesApplyOpen, setPendingFilesApplyOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, string> | null>(null);
  const [activePendingFilePath, setActivePendingFilePath] = useState<string | null>(null);

  const [builderActionConfirmOpen, setBuilderActionConfirmOpen] = useState(false);
  const [pendingBuilderActions, setPendingBuilderActions] = useState<
    | null
    | {
        type: "install_pack" | "wire_button" | "add_section" | "apply_style" | "modify_element" | "remove_section";
        packs?: string[];
        selector?: string;
        intent?: string;
      }
  >(null);
  const { analyzing, analyzeAndGenerate } = useAIFileAnalysis();
  const [currentTheme, setCurrentTheme] = useState<AITheme>(() => {
    const savedThemeId = localStorage.getItem("ai-assistant-theme");
    return AI_THEMES.find(t => t.id === savedThemeId) || AI_THEMES[0];
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Image slot system for AI with taste
  const slotRegistryRef = useRef(createSlotRegistry());
  const [slotEngine, setSlotEngine] = useState<AISlotRulesEngine | null>(null);
  const [imageInsights, setImageInsights] = useState<string[]>([]);
  
  // Only activate AI editing mode when explicitly requested via the toolbar AI button
  useEffect(() => {
    if (requestAIEdit && selectedElement) {
      setIsEditingElement(true);
      setIsExpanded(true);
      toast({
        title: "AI Edit Mode",
        description: `Describe changes for: ${selectedElement.section || selectedElement.selector || 'element'}`,
      });
    } else if (!requestAIEdit) {
      setIsEditingElement(false);
      // Don't collapse the panel if user has it open for other reasons
    }
  }, [requestAIEdit, selectedElement, toast]);

  // Notify parent when AI edit is dismissed (panel collapsed while in edit mode)
  useEffect(() => {
    if (!isExpanded && isEditingElement && onAIEditDismissed) {
      onAIEditDismissed();
    }
  }, [isExpanded, isEditingElement, onAIEditDismissed]);

  // Auto-continue: watch for intent successes and offer iteration suggestions
  const handleIntentContinuation = useCallback((request: IntentContinuationRequest) => {
    const successMessage: Message = {
      role: "assistant",
      content: request.prompt,
      timestamp: new Date(),
      hasCode: false,
      suggestions: getSuggestionsForIntentType(request.success.intent),
    };
    setMessages((prev) => [...prev, successMessage]);
  }, []);

  useIntentSuccessWatcher(handleIntentContinuation, isExpanded);

  const handleThemeChange = (theme: AITheme) => {
    setCurrentTheme(theme);
    localStorage.setItem("ai-assistant-theme", theme.id);
    toast({
      title: `Theme changed to ${theme.name} ${theme.emoji}`,
      description: "Your AI assistant has a new look!",
    });
  };
  
  // Initialize image slot engine with smart defaults
  const initializeSlotEngine = useCallback(async () => {
    const registry = slotRegistryRef.current;
    registry.clear();
    
    // Generate default slots based on common template structure
    const slots = generateDefaultSlots({
      hasHero: true,
      hasFeatures: 3,
      hasTeam: 3,
      hasLogo: true,
      industry: 'general',
    });
    
    slots.forEach(slot => registry.register(slot));
    
    const engine = new AISlotRulesEngine({ 
      registry, 
      industry: 'general' 
    });
    
    setSlotEngine(engine);
    
    // Load AI insights from tracking
    const recommendations = await ImageSlotTracker.getImageAIRecommendations();
    setImageInsights(recommendations.insights);
    
    console.log('[AICodeAssistant] Image slot engine initialized with', slots.length, 'slots');
    console.log('[AICodeAssistant] AI Insights:', recommendations.insights);
  }, []);

  const loadOrCreateConversation = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[AICodeAssistant] Not authenticated - using in-memory chat");
        return;
      }

      const { data: existingConversations } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("mode", mode)
        .order("updated_at", { ascending: false })
        .limit(1);

      let convId: string;

      if (existingConversations && existingConversations.length > 0) {
        convId = existingConversations[0].id;
        await loadMessages(convId);
      } else {
        const { data: newConv, error } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: user.id,
            mode,
            title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Chat`,
          })
          .select()
          .single();

        if (error) throw error;
        convId = newConv.id;
      }

      setConversationId(convId);
      
      // Initialize image slot engine
      initializeSlotEngine();
      
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  }, [mode]);

  useEffect(() => {
    loadOrCreateConversation();
  }, [loadOrCreateConversation]);

  const loadMessages = async (convId: string) => {
    try {
      const { data: chatMessages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (chatMessages) {
        const loadedMessages: Message[] = chatMessages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
          hasCode: msg.has_code || false,
          componentData: msg.component_data,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const saveMessage = async (message: Message) => {
    if (!conversationId) return;

    try {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        has_code: message.hasCode || false,
        component_data: message.componentData as Json || null,
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const clearConversationHistory = async () => {
    try {
      if (conversationId) {
        // Delete all messages for this conversation
        const { error } = await supabase
          .from("chat_messages")
          .delete()
          .eq("conversation_id", conversationId);

        if (error) throw error;
      }

      // Clear local state
      setMessages([]);
      
      toast({
        title: "Conversation cleared",
        description: "Chat history has been deleted",
      });
    } catch (error) {
      console.error("Error clearing conversation:", error);
      toast({
        title: "Error",
        description: "Failed to clear conversation history",
        variant: "destructive",
      });
    }
  };

  const openCodeViewer = (code: string) => {
    setViewerCode(code);
    setCodeViewerOpen(true);
    toast({
      title: "Code editor opened",
      description: "Edit and render your code on the canvas",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code copied successfully",
    });
  };

  const applyDemoEmbedToCurrentTemplate = useCallback(() => {
    if (!currentCode || currentCode.trim().length < 50) {
      toast({
        title: "No template loaded",
        description: "Load a template in the preview first, then set the demo embed.",
        variant: "destructive",
      });
      return;
    }

    const isHtml = /<!doctype|<html[\s>]|<body[\s>]/i.test(currentCode);
    if (!isHtml) {
      toast({
        title: "Demo embed rewrite supports HTML templates",
        description: "Switch to an HTML template (index.html) before applying a demo embed.",
        variant: "destructive",
      });
      return;
    }

    const result = rewriteDemoEmbeds(currentCode, {
      demoUrl: demoEmbedUrl,
      supademoUrl: supademoEmbedUrl,
      rewriteIframes: true,
    });

    if (!result.changed) {
      toast({
        title: "Nothing to update",
        description: "No demo CTAs/embeds found, or the URL is unchanged.",
      });
      return;
    }

    onCodeGenerated?.(result.html);
    toast({
      title: "Demo embed updated",
      description: "Demo CTAs now carry data-demo-url / data-supademo-url.",
    });

    setDemoEmbedDialogOpen(false);
  }, [currentCode, demoEmbedUrl, supademoEmbedUrl, onCodeGenerated, toast]);

  const handleFilesDropped = useCallback((files: DroppedFile[]) => {
    setDroppedFiles(prev => [...prev, ...files]);
    setShowFileZone(false);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setDroppedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault();
      const files: DroppedFile[] = [];
      
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          
          files.push({ id, file, name: `pasted-image.png`, type: 'image', preview });
        }
      }
      
      if (files.length > 0) {
        setDroppedFiles(prev => [...prev, ...files]);
        toast({ title: "Image pasted", description: "Ready to analyze" });
      }
    }
  };

  const [postInstallPrompt, setPostInstallPrompt] = useState<string | null>(null);

  // Handle clicking a suggestion to auto-continue iteration
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (isLoading || analyzing) return;
    setInput(suggestion);
    // Use setTimeout to ensure state is updated before sending
    setTimeout(() => {
      handleSendRef.current?.({ overrideInput: suggestion });
    }, 0);
  }, [isLoading, analyzing]);

  // Ref to access handleSend from callbacks
  const handleSendRef = useRef<((opts?: { overrideInput?: string; skipBuilderActions?: boolean }) => Promise<void>) | null>(null);

  const handleSend = async (opts?: { overrideInput?: string; skipBuilderActions?: boolean }) => {
    const content = (opts?.overrideInput ?? input).trim();
    const hasFiles = !opts?.overrideInput && droppedFiles.length > 0;
    if ((!content && !hasFiles) || isLoading || analyzing) return;

    const userMessage: Message = {
      role: "user",
      content: content || (hasFiles ? "Analyze these files and create a design" : ""),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = content;
    const filesToProcess = hasFiles ? [...droppedFiles] : [];
    if (!opts?.overrideInput) {
      setInput("");
      setDroppedFiles([]);
    }
    setIsLoading(true);

    // If files are attached, use file analysis first
    if (hasFiles) {
      const result = await analyzeAndGenerate(
        userInput || 'Analyze these files and create a matching React component with Tailwind CSS',
        filesToProcess
      );

      if (result.success && result.code) {
        const assistantMessage: Message = {
          role: "assistant",
          content: `✨ **Code Generated from Files!**\n\n${result.explanation}\n\n\`\`\`html\n${result.code}\n\`\`\``,
          timestamp: new Date(),
          hasCode: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        if (onCodeGenerated) {
          onCodeGenerated(result.code);
          toast({
            title: "Code applied to canvas",
            description: "Generated from your uploaded files",
          });
        }
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Sorry, I couldn't process those files: ${result.error || 'Unknown error'}`,
          timestamp: new Date(),
        }]);
      }
      setIsLoading(false);
      return;
    }

    await saveMessage(userMessage);

    try {
      // Check if we have current code and should be in edit mode
      const hasExistingTemplate = currentCode && 
        !currentCode.includes('AI-generated code will appear here') && 
        currentCode.trim().length > 100;
      
      // Check if editing a selected element
      const isEditingSelectedElement = selectedElement && isEditingElement;
      
      // ========== BUILDER ACTIONS DETECTION ==========
      // Detect if user wants to install packs or wire buttons
      const detectBuilderAction = (message: string): { type: 'install_pack' | 'wire_button' | null; packs?: string[]; selector?: string; intent?: string } => {
        const lowerMessage = message.toLowerCase();
        
        // Detect pack installation requests
        const packKeywords = {
          leads: ['leads pack', 'lead capture', 'contact form', 'newsletter', 'waitlist', 'lead generation'],
          booking: ['booking pack', 'appointment', 'scheduler', 'calendar', 'book now', 'booking system'],
          auth: ['auth pack', 'authentication pack', 'user accounts pack'],
        };
        
        const packsToInstall: string[] = [];
        
        for (const [pack, keywords] of Object.entries(packKeywords)) {
          if (keywords.some(kw => lowerMessage.includes(kw))) {
            packsToInstall.push(pack);
          }
        }
        
        // Check for explicit install/setup/add language
        const isInstallRequest = lowerMessage.match(/\b(install|setup|set up|enable|configure)\b.*\b(pack|system)\b/);
        
        if (isInstallRequest && packsToInstall.length > 0) {
          return { type: 'install_pack', packs: packsToInstall };
        }
        
        // Detect dynamic intent wiring requests — auth, routing, forms
        // These should go through the AI code path (not pack install) for intent wiring
        const authWireMatch = lowerMessage.match(/\b(add|wire|connect|implement|enable)\b.*\b(sign\s*in|sign\s*up|login|logout|sign\s*out|auth|authentication)\b.*\b(button|logic|flow|functionality|to)\b/);
        if (authWireMatch) {
          // Determine the specific auth intent
          let intent = 'auth.signin';
          if (lowerMessage.match(/sign\s*up|register|create\s+account/)) intent = 'auth.signup';
          if (lowerMessage.match(/sign\s*out|log\s*out/)) intent = 'auth.signout';
          
          // Try to identify target button from prompt
          const targetMatch = lowerMessage.match(/(?:to\s+(?:the\s+)?|on\s+(?:the\s+)?)([\w\s]+?)(?:\s+button|\s*$)/);
          const selector = targetMatch ? `button:contains('${targetMatch[1].trim()}')` : '.auth-btn, .login-btn, .signin-btn';
          
          return { type: 'wire_button', selector, intent };
        }

        // Detect booking/contact wiring requests
        const bookingWireMatch = lowerMessage.match(/\b(add|wire|connect|implement)\b.*\b(booking|appointment|schedule)\b.*\b(button|logic|flow|functionality|to)\b/);
        if (bookingWireMatch) {
          return { type: 'wire_button', selector: '.book-btn, .booking-btn', intent: 'booking.create' };
        }

        const contactWireMatch = lowerMessage.match(/\b(add|wire|connect|implement)\b.*\b(contact|inquiry|message)\b.*\b(form|button|logic|functionality|to)\b/);
        if (contactWireMatch) {
          return { type: 'wire_button', selector: '.contact-btn', intent: 'contact.submit' };
        }

        // Detect generic button wiring requests
        const wireMatch = lowerMessage.match(/wire\s+(the\s+)?([\w\s]+)\s+button/i);
        if (wireMatch) {
          const buttonName = wireMatch[2].trim();
          let intent = 'contact.submit';
          if (buttonName.match(/book|schedule|appointment/i)) intent = 'booking.create';
          if (buttonName.match(/subscribe|newsletter/i)) intent = 'newsletter.subscribe';
          if (buttonName.match(/join|waitlist/i)) intent = 'join.waitlist';
          if (buttonName.match(/sign\s*up|register/i)) intent = 'auth.signup';
          if (buttonName.match(/sign\s*in|login/i)) intent = 'auth.signin';
          
          return { type: 'wire_button', selector: `button:contains('${buttonName}')`, intent };
        }
        
        return { type: null };
      };
      
      const builderAction = opts?.skipBuilderActions ? { type: null } : detectBuilderAction(userMessage.content);
      
      // Handle builder actions (install packs / wire buttons) - propose+approve
      if (builderAction.type) {
        console.log('[AICodeAssistant] Builder action detected:', builderAction);

        // If this is a "build the whole thing" style request, store the original prompt
        // so we can continue with template generation after the user approves pack install.
        const isFullBuildRequest = /\b(build|create|generate|make)\b/i.test(userMessage.content) &&
          /\b(landing page|page|website|store|ecommerce|shop|checkout|cart)\b/i.test(userMessage.content);
        if (builderAction.type === 'install_pack' && isFullBuildRequest) {
          setPostInstallPrompt(userMessage.content);
        } else {
          setPostInstallPrompt(null);
        }

        setPendingBuilderActions(builderAction as any);
        setBuilderActionConfirmOpen(true);
        setIsLoading(false);
        return;
      }
      // ========== END BUILDER ACTIONS ==========
      
      // Detect template action from user message
      const detectTemplateAction = (message: string): string | undefined => {
        const lowerMessage = message.toLowerCase();
        
        // Check for full control mode first (highest priority)
        if (lowerMessage.match(/\b(full control|full reign|ai decide|you decide|your choice|go wild|do whatever|improve everything|make it better|optimize everything|enhance everything|fix everything|revamp|overhaul|transform|reimagine)\b/)) {
          return 'full-control';
        }
        // E-commerce/checkout flow requests
        if (lowerMessage.match(/\b(add|create|implement|build)\b.*\b(cart|checkout|ecommerce|e-commerce|shopping|payment|buy now|add to cart)\b/)) {
          return 'full-control';
        }
        // Dynamic/interactive element requests
        if (lowerMessage.match(/\b(make|add)\b.*\b(dynamic|interactive|animated|live|real-time)\b/)) {
          return 'full-control';
        }
        // Auth/login flow requests — these are modify actions (wire existing elements)
        if (lowerMessage.match(/\b(add|wire|connect|implement|enable)\b.*\b(sign\s*in|sign\s*up|login|logout|auth|authentication)\b/)) {
          return 'modify';
        }
        // Routing/navigation requests
        if (lowerMessage.match(/\b(add|wire|implement)\b.*\b(navigation|routing|redirect|page\s*link)\b/)) {
          return 'modify';
        }
        if (lowerMessage.match(/\b(add|insert|include|create new|put|place)\b.*\b(section|element|component|button|image|form|card|hero|footer|header|nav)/)) {
          return 'add';
        }
        if (lowerMessage.match(/\b(remove|delete|hide|get rid of|take out)\b/)) {
          return 'remove';
        }
        if (lowerMessage.match(/\b(change|modify|update|edit|adjust|tweak|fix)\b/)) {
          return 'modify';
        }
        if (lowerMessage.match(/\b(suggest|improve|recommend|enhance|optimize|better|upgrade)\b/)) {
          return 'suggest';
        }
        if (lowerMessage.match(/\b(restyle|redesign|new look|change color|change style|theme|recolor)\b/)) {
          return 'restyle';
        }
        return hasExistingTemplate ? 'modify' : undefined;
      };
      
      const templateAction = hasExistingTemplate ? detectTemplateAction(userMessage.content) : undefined;
      
      // Add image slot context for AI with taste
      let slotContext = '';
      if (slotEngine && mode === "code") {
        slotContext = '\n\n' + generateSlotContextForAI(slotEngine);
        if (imageInsights.length > 0) {
          slotContext += `\n🎯 AI INSIGHTS FROM LEARNING:\n`;
          imageInsights.forEach(insight => {
            slotContext += `  - ${insight}\n`;
          });
        }
      }
      
      // Backend + template awareness context (Web Builder only)
      const backendContext = buildWebBuilderAIContext({
        systemType: systemType ?? null,
        templateName: templateName ?? null,
        ctaAnalysis: templateCtaAnalysis ?? null,
        pageStructure: pageStructureContext ?? null,
        backendState: backendStateContext ?? null,
        businessData: businessDataContext ?? null,
      });

      // Enhanced context for element editing
      let enhancedPrompt = userMessage.content;
      
      if (isEditingSelectedElement) {
        enhancedPrompt = `🚨 ELEMENT EDITING MODE - SURGICAL MODIFICATION ONLY 🚨\n\n`;
        enhancedPrompt += `Selected Element (${selectedElement.section || 'section'}):\n`;
        enhancedPrompt += `Selector: ${selectedElement.selector}\n\n`;
        enhancedPrompt += `Current HTML:\n\`\`\`html\n${selectedElement.html}\n\`\`\`\n\n`;
        enhancedPrompt += `User Request: ${userMessage.content}\n\n`;
        enhancedPrompt += `⚠️ CRITICAL ELEMENT EDITING RULES:\n`;
        enhancedPrompt += `1. Return ONLY the modified HTML for THIS EXACT element - no wrappers, no page structure\n`;
        enhancedPrompt += `2. PRESERVE ALL existing content (text, images, links) unless explicitly asked to change them\n`;
        enhancedPrompt += `3. PRESERVE ALL existing Tailwind classes unless explicitly asked to restyle\n`;
        enhancedPrompt += `4. PRESERVE ALL data-* attributes exactly as they appear\n`;
        enhancedPrompt += `5. PRESERVE ALL existing child elements and their structure\n`;
        enhancedPrompt += `6. ONLY add/modify what was explicitly requested\n`;
        enhancedPrompt += `7. Do NOT wrap the output in any additional tags\n\n`;
        enhancedPrompt += `ALLOWED MODIFICATIONS:\n`;
        enhancedPrompt += `- Layout changes: add grid/flex classes if requested\n`;
        enhancedPrompt += `- Add new components: only if explicitly requested\n`;
        enhancedPrompt += `- Style changes: only if explicitly requested\n`;
        enhancedPrompt += `- Text changes: only if explicitly requested\n\n`;
        enhancedPrompt += `OUTPUT: The modified HTML element only, no markdown fences, no explanations.\n`;
        enhancedPrompt += slotContext;
        console.log('[AICodeAssistant] Element editing mode activated for:', selectedElement.selector);
      } else if (mode === "debug" && hasExistingTemplate) {
        // Limit code size to prevent token overflow (max 6000 chars)
        const truncatedCode = currentCode.length > 6000 
          ? currentCode.substring(0, 6000) + '\n... (code truncated for context)'
          : currentCode;
          
        enhancedPrompt = `I need help fixing rendering/error issues in my React/TSX code. Here's the current code:\n\n\`\`\`tsx\n${truncatedCode}\n\`\`\`\n\nIssue: ${userMessage.content}\n\nPlease analyze the code, identify the issue, and provide a fixed version as valid React/TSX with explanation.${slotContext}`;
        console.log('[AICodeAssistant] Debug mode: Enhanced prompt created with code context');
      } else if (mode === "code") {
        // For surgical (non-full-control) edits on an existing template, force snippet-only output
        const isSurgicalEdit = hasExistingTemplate && templateAction &&
          ['modify', 'add', 'remove', 'restyle', 'suggest'].includes(templateAction);

        if (isSurgicalEdit) {
          const truncatedCode = (currentCode || '').length > 6000
            ? (currentCode || '').substring(0, 6000) + '\n<!-- ...template truncated for context... -->'
            : (currentCode || '');
          enhancedPrompt = '🚨 SURGICAL EDIT MODE — DO NOT REWRITE THE FULL TEMPLATE 🚨\n\n';
          enhancedPrompt += `Existing Template (context only — do NOT reproduce it):\n\`\`\`html\n${truncatedCode}\n\`\`\`\n\n`;
          enhancedPrompt += `User Request: ${userMessage.content}\n\n`;
          enhancedPrompt += '⚠️ CRITICAL SURGICAL OUTPUT RULES:\n';
          enhancedPrompt += '1. Return ONLY the NEW or MODIFIED HTML snippet — NEVER the full page\n';
          enhancedPrompt += '2. If adding a section/element: output ONLY that section/element HTML\n';
          enhancedPrompt += '3. If modifying an element: output ONLY the modified element HTML\n';
          enhancedPrompt += '4. If changing styles: output ONLY a <style> block with the changed rules\n';
          enhancedPrompt += '5. PRESERVE all existing content/classes/attributes not being changed\n';
          enhancedPrompt += '6. DO NOT output <!DOCTYPE html>, <html>, <head>, or <body> wrappers\n';
          enhancedPrompt += '7. NO explanations, no prose — raw HTML snippet only\n';
          enhancedPrompt += slotContext;
          console.log('[AICodeAssistant] Surgical edit mode prompt for action:', templateAction);
        } else {
          // Encourage file patch plans for non-trivial edits.
          const patchPlanHint =
            "\n\nOUTPUT FORMAT PREFERENCE:\n" +
            "- For multi-file or structural changes, output ONLY <file path=\"...\">...</file> blocks (no markdown).\n" +
            "- For single-file full-template changes, you may output one ```html``` or ```tsx``` block.\n" +
            "- For selected-element edits, return ONLY the modified HTML for that element (no wrappers).\n";

          enhancedPrompt = `${userMessage.content}${slotContext}${backendContext}${patchPlanHint}`;
          console.log('[AICodeAssistant] Code mode: Added slot context for AI with taste');
        }
      } else {
        // Design/review modes still benefit from system context
        enhancedPrompt = `${userMessage.content}${backendContext}`;
      }
      
      console.log('[AICodeAssistant] Sending request - Mode:', mode, 'Template Action:', templateAction, 'Debug Mode:', mode === "debug");

      // The backend function enforces a hard 10k limit per message content. Keep a buffer.
      const MAX_MESSAGE_CHARS = 9_000;
      const clamp = (value: string) =>
        value.length > MAX_MESSAGE_CHARS
          ? value.slice(0, MAX_MESSAGE_CHARS) + "\n\n[Truncated to fit request limits]"
          : value;

      // Mitigate transient network failures (which surface as FunctionsFetchError/TypeError: Failed to fetch)
      // and avoid sending extremely large payloads.
      const maxCurrentCodeChars = 20_000;
      const currentCodeForRequest = hasExistingTemplate
        ? (currentCode.length > maxCurrentCodeChars
            ? currentCode.slice(0, maxCurrentCodeChars) + "\n<!-- truncated for request size -->"
            : currentCode)
        : undefined;

      const invokeWithRetry = async () => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const result = await supabase.functions.invoke('ai-code-assistant', {
            body: {
              messages: messages
                // Prevent body validation errors (content > 10,000 chars)
                .map((m) => ({ role: m.role, content: clamp(String(m.content ?? '')) }))
                .concat([{ role: userMessage.role, content: clamp(enhancedPrompt) }]),
              mode,
              currentCode: currentCodeForRequest,
              editMode: hasExistingTemplate || mode === "debug",
              debugMode: mode === "debug",
              templateAction,
              // Pass user design profile for personalized AI generation
              userDesignProfile: userDesignProfile || undefined,
            },
          });

          // Retry only for fetch/network-type errors.
          if (!result.error) return result;

          const err: any = result.error;
          const isFetchError =
            err?.name === 'FunctionsFetchError' ||
            String(err?.message || '').includes('Failed to send a request to the Edge Function') ||
            String(err?.message || '').includes('Failed to fetch');

          if (!isFetchError || attempt === maxAttempts) return result;

          const backoffMs = 400 * attempt;
          console.warn(`[AICodeAssistant] Network error invoking function (attempt ${attempt}/${maxAttempts}). Retrying in ${backoffMs}ms...`, err);
          await new Promise((r) => setTimeout(r, backoffMs));
        }

        // Unreachable, but satisfies TS.
        return { data: null, error: new Error('Failed to invoke function') } as any;
      };

      const { data, error } = await invokeWithRetry();

      console.log('[AICodeAssistant] Response received:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('[AICodeAssistant] Error from edge function:', error);
        if (error.message.includes('429')) {
          toast({
            title: "Rate limit exceeded",
            description: "Please wait a moment before trying again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (error.message.includes('402')) {
          toast({
            title: "Credits required",
            description: "Please add credits to continue using AI features.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to get AI response: " + error.message);
      }

      const assistantContent = data?.content || "";
      
      if (!assistantContent) {
        console.warn('[AICodeAssistant] Empty response from AI');
        toast({
          title: "Empty Response",
          description: "AI returned an empty response. Please try rephrasing your request.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log('[AICodeAssistant] AI response received:', assistantContent.substring(0, 200) + '...');

      // ========== COMPREHENSIVE AI RESPONSE PARSING ==========
      // Use the new parser to extract all structured content types
      const parsedResponse = parseAIResponse(assistantContent);
      console.log('[AICodeAssistant] Parsed response:', {
        files: parsedResponse.files.length,
        codeBlocks: parsedResponse.codeBlocks.length,
        builderActions: parsedResponse.builderActions.length,
        styleModifications: parsedResponse.styleModifications.length,
        sectionOperations: parsedResponse.sectionOperations.length,
        elementOperations: parsedResponse.elementOperations.length,
        intentWirings: parsedResponse.intentWirings.length,
        layoutChanges: parsedResponse.layoutChanges.length,
        hasStructuredContent: parsedResponse.hasStructuredContent,
      });

      // 1) Handle file patches (<file path="...">...</file>)
      if (parsedResponse.files.length > 0) {
        const filePlan: Record<string, string> = {};
        parsedResponse.files.forEach(f => { filePlan[f.path] = f.content; });
        setPendingFiles(filePlan);
        setActivePendingFilePath(parsedResponse.files[0].path);
        setPendingFilesApplyOpen(true);
      }

      // 2) Handle style modifications (<style element="..." property="..." value="..."/>)
      if (parsedResponse.styleModifications.length > 0 && currentCode) {
        console.log('[AICodeAssistant] Applying style modifications:', parsedResponse.styleModifications);
        let modifiedCode = currentCode;
        
        parsedResponse.styleModifications.forEach(mod => {
          // Apply style modification by injecting inline styles or updating existing ones
          const cssProp = mod.property.replace(/([A-Z])/g, '-$1').toLowerCase();
          console.log(`[AICodeAssistant] Style: ${mod.selector} { ${cssProp}: ${mod.value} }`);
          
          // Generate CSS rule
          const styleRule = `${mod.selector} { ${cssProp}: ${mod.value} !important; }`;
          
          // Check if a customizer-injected style block exists
          if (modifiedCode.includes('<style id="ai-style-overrides">')) {
            modifiedCode = modifiedCode.replace(
              '</style><!-- ai-styles-end -->',
              `  ${styleRule}\n</style><!-- ai-styles-end -->`
            );
          } else {
            // Inject new style block before </head>
            if (modifiedCode.includes('</head>')) {
              modifiedCode = modifiedCode.replace(
                '</head>',
                `<style id="ai-style-overrides">\n  ${styleRule}\n</style><!-- ai-styles-end -->\n</head>`
              );
            }
          }
        });
        
        // Apply the modified code
        if (modifiedCode !== currentCode && onCodeGenerated) {
          setPendingCode(modifiedCode);
          setPendingCodeApplyOpen(true);
        }
      }

      // 3) Handle intent wirings (<intent on="..." action="..." .../>)
      if (parsedResponse.intentWirings.length > 0 && currentCode) {
        console.log('[AICodeAssistant] Applying intent wirings:', parsedResponse.intentWirings);
        let modifiedCode = currentCode;
        
        parsedResponse.intentWirings.forEach(wiring => {
          // This is a basic DOM-level intent wiring
          // Find elements matching the selector pattern and add data-ut-intent
          const selectorEscaped = wiring.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Try to find button/element with matching text or class
          const classMatch = wiring.selector.match(/\.([a-zA-Z0-9_-]+)/);
          const textMatch = wiring.selector.match(/contains\(['"]([^'"]+)['"]\)/);
          
          if (classMatch) {
            const className = classMatch[1];
            // Add data-ut-intent to elements with this class
            const pattern = new RegExp(`(class="[^"]*\\b${className}\\b[^"]*")`, 'g');
            modifiedCode = modifiedCode.replace(pattern, (match) => {
              // Check if already has intent
              if (modifiedCode.includes('data-ut-intent')) return match;
              return `${match} data-ut-intent="${wiring.intent}"${wiring.label ? ` data-ut-label="${wiring.label}"` : ''}`;
            });
          }
          
          console.log(`[AICodeAssistant] Wire: ${wiring.selector} -> ${wiring.intent}`);
        });
        
        if (modifiedCode !== currentCode && onCodeGenerated && parsedResponse.styleModifications.length === 0) {
          setPendingCode(modifiedCode);
          setPendingCodeApplyOpen(true);
        }
      }

      // 4) Handle layout changes (<layout selector="..." type="grid" .../>)
      if (parsedResponse.layoutChanges.length > 0 && currentCode) {
        console.log('[AICodeAssistant] Applying layout changes:', parsedResponse.layoutChanges);
        let modifiedCode = currentCode;
        
        parsedResponse.layoutChanges.forEach(layout => {
          // Generate Tailwind layout classes
          let layoutClasses = '';
          
          if (layout.type === 'grid') {
            layoutClasses = 'grid';
            if (layout.columns) layoutClasses += ` grid-cols-${layout.columns}`;
            if (layout.gap) layoutClasses += ` gap-${layout.gap}`;
          } else if (layout.type === 'flex') {
            layoutClasses = 'flex';
            if (layout.align) layoutClasses += ` items-${layout.align}`;
            if (layout.justify) layoutClasses += ` justify-${layout.justify}`;
            if (layout.gap) layoutClasses += ` gap-${layout.gap}`;
          } else if (layout.type === 'stack') {
            layoutClasses = 'flex flex-col';
            if (layout.gap) layoutClasses += ` gap-${layout.gap}`;
          }
          
          // Apply layout classes (simplified: inject CSS rule)
          const layoutStyle = `${layout.selector} { display: ${layout.type === 'stack' ? 'flex; flex-direction: column' : layout.type}; ${layout.columns ? `grid-template-columns: repeat(${layout.columns}, minmax(0, 1fr));` : ''} ${layout.gap ? `gap: ${layout.gap.replace(/^\d+$/, '$&rem')};` : ''} }`;
          
          // Inject layout style
          if (modifiedCode.includes('<style id="ai-style-overrides">')) {
            modifiedCode = modifiedCode.replace(
              '</style><!-- ai-styles-end -->',
              `  ${layoutStyle}\n</style><!-- ai-styles-end -->`
            );
          } else if (modifiedCode.includes('</head>')) {
            modifiedCode = modifiedCode.replace(
              '</head>',
              `<style id="ai-style-overrides">\n  ${layoutStyle}\n</style><!-- ai-styles-end -->\n</head>`
            );
          }
          
          console.log(`[AICodeAssistant] Layout: ${layout.selector} -> ${layoutClasses}`);
        });
        
        if (modifiedCode !== currentCode && onCodeGenerated && parsedResponse.styleModifications.length === 0 && parsedResponse.intentWirings.length === 0) {
          setPendingCode(modifiedCode);
          setPendingCodeApplyOpen(true);
        }
      }

      // 5) Handle builder actions (<action type="..." .../>)
      if (parsedResponse.builderActions.length > 0) {
        console.log('[AICodeAssistant] Processing builder actions from structured tags:', parsedResponse.builderActions);
        // These can be queued for approval
        const firstAction = parsedResponse.builderActions[0];
        if (firstAction) {
          setPendingBuilderActions({
            type: firstAction.type,
            packs: firstAction.params.pack ? [firstAction.params.pack] : undefined,
            selector: firstAction.params.selector,
            intent: firstAction.params.intent,
          });
          setBuilderActionConfirmOpen(true);
        }
      }

      // 6) Handle code blocks (fallback for non-structured responses)
      const hasCode = parsedResponse.codeBlocks.length > 0 || assistantContent.includes("```");

      // Helper: true when a code string is a complete HTML document
      const isFullHtmlDocument = (code: string): boolean =>
        /^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(code.trim());

      // Whether this request was a surgical (targeted, non-destructive) edit
      const isSurgicalAction = hasExistingTemplate && templateAction &&
        ['modify', 'add', 'remove', 'restyle', 'suggest'].includes(templateAction);
      
      if (parsedResponse.files.length === 0 && hasCode && onCodeGenerated) {
        // Use parsed code blocks if available, otherwise fall back to regex
        const primaryBlock = getPrimaryCodeBlock(parsedResponse);
        
        let extractedCode = primaryBlock?.content || '';
        
        // Fallback to regex extraction if parser didn't find blocks
        if (!extractedCode) {
          let codeMatch = assistantContent.match(/```(?:html|jsx|tsx|javascript|js|typescript|ts)\n([\s\S]*?)```/);
          if (!codeMatch) {
            codeMatch = assistantContent.match(/```\n([\s\S]*?)```/);
          }
          if (codeMatch && codeMatch[1]) {
            extractedCode = codeMatch[1].trim();
          }
        }
        
        if (extractedCode) {
          // ALLOW vanilla JavaScript in DOMContentLoaded wrapper
          // Only remove inline event handlers for security
          extractedCode = extractedCode.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
          
          // Remove markdown syntax that sometimes slips through
          extractedCode = extractedCode
            .replace(/^#{1,6}\s+.*$/gm, '')
            .replace(/```[\w]*\n?/g, '')
            .replace(/^[<>-]{3,}.*$/gm, '')
            .replace(/<<<|>>>|---/g, '')
            .replace(/\n{3,}/g, '\n\n');

          const isFullDoc = isFullHtmlDocument(extractedCode);

          if (isEditingSelectedElement && onElementUpdate && selectedElement) {
            // Toolbar AI edit: apply only to the selected element
            console.log('[AICodeAssistant] Toolbar element-edit: staging snippet for element', selectedElement.selector);
            setPendingElementSelector(selectedElement.selector ?? null);
            setPendingCode(extractedCode);
            setPendingCodeIsSnippet(true);
            setPendingTemplateAction(templateAction);
            setPendingCodeApplyOpen(true);
          } else if (!isFullDoc && isSurgicalAction && currentCode) {
            // AI returned a snippet (not a full doc) for a targeted request.
            // Merge it into the existing template instead of replacing the whole page.
            console.log('[AICodeAssistant] Snippet for surgical action:', templateAction, '— merging into template');
            if (selectedElement?.selector && onElementUpdate) {
              // Route to element-level approval — only touches the selected element
              setPendingElementSelector(selectedElement.selector);
              setPendingCode(extractedCode);
              setPendingCodeIsSnippet(true);
              setPendingTemplateAction(templateAction);
              setPendingCodeApplyOpen(true);
            } else {
              // No specific element selected — inject snippet into the template
              let mergedCode: string;
              if (currentCode.includes('</body>')) {
                mergedCode = currentCode.replace(
                  '</body>',
                  `\n<!-- AI ${templateAction}: ${new Date().toISOString()} -->\n${extractedCode}\n</body>`
                );
              } else {
                mergedCode = currentCode + '\n' + extractedCode;
              }
              setPendingElementSelector(null);
              setPendingCode(mergedCode);
              setPendingCodeIsSnippet(false);
              setPendingTemplateAction(templateAction);
              setPendingCodeApplyOpen(true);
            }
          } else if (isFullDoc && isSurgicalAction && currentCode) {
            // AI returned a full document when only a targeted edit was requested.
            // Stage it for review — the approval dialog will warn the user.
            console.warn('[AICodeAssistant] Full document returned for surgical action:', templateAction, '— flagging for review');
            setPendingElementSelector(null);
            setPendingCode(extractedCode);
            setPendingCodeIsSnippet(false);
            setPendingTemplateAction(templateAction);
            setPendingCodeApplyOpen(true);
          } else if (onCodeGenerated) {
            // Normal full code generation (no existing template, or explicit full-control action)
            console.log('[AICodeAssistant] Full code generation:', primaryBlock?.language || 'unknown', extractedCode.length, 'chars');
            setPendingElementSelector(null);
            setPendingCode(extractedCode);
            setPendingCodeIsSnippet(false);
            setPendingTemplateAction(templateAction);
            setPendingCodeApplyOpen(true);
          }
        }
      }
      // ========== END COMPREHENSIVE AI RESPONSE PARSING ==========

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
        hasCode,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);

    } catch (error) {
      console.error("[AICodeAssistant] Error getting AI response:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[AICodeAssistant] Error details:", errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage.includes("Failed to get AI response") 
          ? errorMessage 
          : "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Keep ref updated for use in callbacks
  handleSendRef.current = handleSend;

  const quickPrompts = {
    code: isEditingElement && selectedElement ? [
      "Add a 3-column grid layout",
      "Change to 2-column responsive design",
      "Rewrite the heading and description",
      "Add an image gallery",
      "Make this section stand out with better UI",
      "Add icons to each item",
    ] : [
      "🚀 Full AI control - improve everything",
      "Create a modern hero section",
      "Add sign in/sign up to auth button",
      "Add cart + checkout flow",
      "Wire booking button to booking form",
      "Add navigation routing to all links",
      "Build a pricing section with 3 tiers",
      "Make elements dynamic & interactive",
    ],
    design: [
      "Review my layout hierarchy",
      "Suggest spacing improvements",
      "Improve visual flow",
      "Enhance color consistency",
    ],
    review: [
      "Check code quality",
      "Review best practices",
      "Security audit",
      "Performance check",
    ],
    debug: [
      "Fix rendering issues",
      "Resolve layout problems",
      "Debug JavaScript errors",
      "Fix responsive breakpoints",
    ],
  };

  return (
    <>
      {/* Confirm builder actions (packs / wiring) */}
      <Dialog open={builderActionConfirmOpen} onOpenChange={setBuilderActionConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply backend change?</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {pendingBuilderActions?.type === "install_pack" && (
              <div>
                <div className="font-medium">Install packs</div>
                <div className="text-muted-foreground">
                  {(pendingBuilderActions.packs || []).join(", ") || "(none)"}
                </div>
              </div>
            )}
            {pendingBuilderActions?.type === "wire_button" && (
              <div>
                <div className="font-medium">Wire button</div>
                <div className="text-muted-foreground">Selector: {pendingBuilderActions.selector}</div>
                <div className="text-muted-foreground">Intent: {pendingBuilderActions.intent}</div>
              </div>
            )}
            <div className="text-muted-foreground">
              You approve each backend action before it runs.
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBuilderActionConfirmOpen(false);
                setPendingBuilderActions(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pendingBuilderActions?.type) return;
                try {
                  const followUpPrompt = pendingBuilderActions.type === "install_pack" ? postInstallPrompt : null;

                  const { data: { user } } = await supabase.auth.getUser();
                  const businessId = user?.id || "anonymous";

                  const actions: Array<{ type: string; pack?: string; selector?: string; intent?: string; payload?: object }> = [];
                  if (pendingBuilderActions.type === "install_pack" && pendingBuilderActions.packs) {
                    pendingBuilderActions.packs.forEach((pack) => actions.push({ type: "install_pack", pack }));
                  }
                  if (pendingBuilderActions.type === "wire_button") {
                    actions.push({
                      type: "wire_button",
                      selector: pendingBuilderActions.selector,
                      intent: pendingBuilderActions.intent,
                      payload: {},
                    });
                  }

                  const { data: builderResult, error: builderError } = await supabase.functions.invoke("builder-actions", {
                    body: { projectId: "current", businessId, actions },
                  });

                  if (builderError) throw builderError;

                  let responseContent = "";
                  if (pendingBuilderActions.type === "install_pack" && builderResult?.applied) {
                    responseContent = `✅ **Packs Installed Successfully!**\n\n`;
                    responseContent += `Installed:\n`;
                    builderResult.applied.forEach((pack: string) => (responseContent += `- **${pack}** pack\n`));
                  }
                  if (pendingBuilderActions.type === "wire_button") {
                    responseContent = `✅ **Button Wired!**\n\nIntent: \`${pendingBuilderActions.intent}\``;
                  }

                  if (responseContent) {
                    const assistantMessage: Message = {
                      role: "assistant",
                      content: responseContent,
                      timestamp: new Date(),
                      hasCode: false,
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    await saveMessage(assistantMessage);
                  }

                  setBuilderActionConfirmOpen(false);
                  setPendingBuilderActions(null);

                  // Continue with the original "build the whole thing" request after packs install.
                  // We skip builder-action detection to avoid looping on the same keywords.
                  if (followUpPrompt) {
                    setPostInstallPrompt(null);

                    const assistantMessage: Message = {
                      role: "assistant",
                      content: "🧩 Packs are installed — continuing by generating the responsive template and wiring it to the backend actions…",
                      timestamp: new Date(),
                      hasCode: false,
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    await saveMessage(assistantMessage);

                    setTimeout(() => {
                      const continuationPrompt = [
                        "Packs are installed. Continue by generating a FULLY RESPONSIVE, multi-section e-commerce landing page template and wire it to the built-in backend intents.",
                        "\n\nOUTPUT REQUIREMENTS:",
                        "- Output ONE complete HTML document in a single ```html``` code block.",
                        "- Use Tailwind classes with the design system tokens (bg-background, text-foreground, bg-card, text-muted-foreground, border-border, bg-primary, text-primary-foreground). Avoid hardcoded colors.",
                        "- Include: header/nav with auth CTAs (data-ut-intent=auth.signin/auth.signup/auth.signout), product search + filter UI, featured categories, product grid, floating cart, and a checkout section.",
                        "- Add-to-cart buttons must be wired: data-ut-intent=cart.add (also include data-intent=cart.add for compatibility) and include data-product-id, data-product-name, data-price.",
                        "- Cart/checkout CTAs: data-ut-intent=cart.view and data-ut-intent=checkout.start.",
                        "- Use CTA slots where appropriate: data-ut-cta=cta.nav, cta.primary, cta.hero, cta.footer and set data-ut-label.",
                        "- Do NOT say you cannot build a backend; assume the backend is available via the platform.",
                        "\n\nUSER REQUEST:\n" + followUpPrompt,
                      ].join("\n");

                      void handleSend({ overrideInput: continuationPrompt, skipBuilderActions: true });
                    }, 0);
                  }
                } catch (err) {
                  console.error("[AICodeAssistant] Builder action apply failed:", err);
                  toast({
                    title: "Backend action failed",
                    description: err instanceof Error ? err.message : String(err),
                    variant: "destructive",
                  });
                }
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve code/HTML changes before applying */}
      <Dialog open={pendingCodeApplyOpen} onOpenChange={(open) => {
        setPendingCodeApplyOpen(open);
        if (!open) { setPendingCodeIsSnippet(false); setPendingTemplateAction(undefined); }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review & apply changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {/* Warn when AI returned a full document for a targeted (surgical) edit request */}
            {pendingTemplateAction &&
              ['modify', 'add', 'remove', 'restyle', 'suggest'].includes(pendingTemplateAction) &&
              !pendingElementSelector &&
              /^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(pendingCode) && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <span>
                  The AI returned a <strong>full template replacement</strong> for a "{pendingTemplateAction}" request.
                  This will overwrite your entire template. Review carefully before applying.
                </span>
              </div>
            )}
            {/* Confirm element-level update */}
            {pendingElementSelector && (
              <div className="text-xs text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 py-1.5">
                🎯 Targeted update for <code className="font-mono">{pendingElementSelector}</code> — only this element will change.
              </div>
            )}
            {/* Snippet injection notice */}
            {!pendingElementSelector && !(/^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(pendingCode)) && (
              <div className="text-xs text-lime-400/80 bg-lime-500/10 border border-lime-500/20 rounded-md px-2 py-1.5">
                ✂️ Snippet merged into your template. Review and click Apply.
              </div>
            )}
            {/* Normal full-template notice */}
            {!pendingElementSelector &&
              /^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(pendingCode) &&
              !(['modify', 'add', 'remove', 'restyle', 'suggest'].includes(pendingTemplateAction ?? '')) && (
              <p className="text-sm text-muted-foreground">
                Changes are staged. Click Apply to write them into the current template.
              </p>
            )}
            <Textarea
              value={pendingCode}
              onChange={(e) => setPendingCode(e.target.value)}
              className="min-h-[420px] font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setPendingCodeApplyOpen(false);
              setPendingCodeIsSnippet(false);
              setPendingTemplateAction(undefined);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingCode.trim()) return;
                if (pendingElementSelector && onElementUpdate) {
                  // Targeted element-level update
                  const ok = onElementUpdate(pendingElementSelector, pendingCode);
                  if (!ok) {
                    toast({
                      title: "Couldn't apply update",
                      description:
                        "The selected section couldn't be matched in the current code. Re-select the section, then try again.",
                      variant: "destructive",
                    });
                    return;
                  }

                  toast({ title: "Element updated", description: "Approved changes applied." });
                  setIsEditingElement(false);
                  setPendingCodeIsSnippet(false);
                  setPendingTemplateAction(undefined);
                  
                  // Auto-continue
                  const followUpMessage: Message = {
                    role: "assistant",
                    content: "✅ **Element updated!** I've applied your changes.\n\n**Click to continue:**",
                    timestamp: new Date(),
                    hasCode: false,
                    suggestions: [
                      "Refine this section further",
                      "Move on to another element",
                      "Add new components",
                      "Adjust styling or layout",
                      "Add animations",
                    ],
                  };
                  setMessages((prev) => [...prev, followUpMessage]);
                } else if (onCodeGenerated) {
                  // Full template update (merged snippet already baked in, or explicit full generation)
                  onCodeGenerated(pendingCode);
                  toast({ title: "Template updated", description: "Approved changes applied." });
                  setPendingCodeIsSnippet(false);
                  setPendingTemplateAction(undefined);
                  
                  // Auto-continue
                  const followUpMessage: Message = {
                    role: "assistant",
                    content: "✅ **Applied!** Your code is now live.\n\n**Click to continue:**",
                    timestamp: new Date(),
                    hasCode: false,
                    suggestions: [
                      "Add more sections",
                      "Tweak colors & typography",
                      "Add animations",
                      "Make it more responsive",
                      "Wire up backend logic",
                    ],
                  };
                  setMessages((prev) => [...prev, followUpMessage]);
                }
                setPendingCodeApplyOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve multi-file patch plan before applying */}
      <Dialog open={pendingFilesApplyOpen} onOpenChange={setPendingFilesApplyOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review & apply file changes</DialogTitle>
          </DialogHeader>

          {!pendingFiles ? (
            <p className="text-sm text-muted-foreground">No file changes staged.</p>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <p className="text-xs text-muted-foreground mb-2">Files</p>
                <div className="space-y-1 max-h-[420px] overflow-auto border border-border rounded-md p-2">
                  {Object.keys(pendingFiles).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={activePendingFilePath === p ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => setActivePendingFilePath(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-8">
                <p className="text-xs text-muted-foreground mb-2">Content</p>
                <Textarea
                  value={activePendingFilePath ? pendingFiles[activePendingFilePath] ?? "" : ""}
                  onChange={(e) => {
                    if (!activePendingFilePath) return;
                    const next = { ...pendingFiles, [activePendingFilePath]: e.target.value };
                    setPendingFiles(next);
                  }}
                  className="min-h-[420px] font-mono text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingFilesApplyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingFiles || Object.keys(pendingFiles).length === 0) return;

                const ok = onFilesPatch ? onFilesPatch(pendingFiles) : false;
                if (!ok && onCodeGenerated) {
                  // Fallback: if caller didn't provide file patch handling, try best-effort
                  // by applying main entry file if present.
                  const entry =
                    pendingFiles["/index.html"] ||
                    pendingFiles["/src/App.tsx"] ||
                    pendingFiles["/App.tsx"];
                  if (entry) {
                    onCodeGenerated(entry);
                  }
                }

                if (!ok && !onCodeGenerated) {
                  toast({
                    title: "Couldn't apply file plan",
                    description: "No file patch handler is configured in this editor surface.",
                    variant: "destructive",
                  });
                  return;
                }

                toast({ title: "Files updated", description: "Approved changes applied." });
                setPendingFilesApplyOpen(false);
                
                // Auto-continue: Add follow-up message after file patch
                const followUpMessage: Message = {
                  role: "assistant",
                  content: `✅ **Files applied!** ${Object.keys(pendingFiles).length} file(s) updated.\n\n**Click to continue:**`,
                  timestamp: new Date(),
                  hasCode: false,
                  suggestions: [
                    "Make additional changes",
                    "Create new pages",
                    "Add components",
                    "Add styling",
                    "Set up API routes",
                  ],
                };
                setMessages((prev) => [...prev, followUpMessage]);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating AI Button - only in floating mode */}
      {displayMode === 'floating' && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105",
            `bg-gradient-to-br ${currentTheme.gradient.button} ${currentTheme.gradient.buttonHover}`
          )}
        >
          <div className="px-4 py-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-sm">AI Assistant</span>
            {messages.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                {messages.length}
              </span>
            )}
          </div>
        </button>
      )}

      {/* AI Panel - floating or dock mode */}
      {isExpanded && (
        <div className={cn(
          "bg-[#0a0a12] flex flex-col overflow-hidden transition-all duration-200",
          displayMode === 'floating' 
            ? "fixed bottom-6 right-6 z-50 w-[480px] h-[600px] rounded-xl shadow-[0_0_40px_rgba(0,255,0,0.2)]" 
            : "w-full h-full",
          className
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d18]">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg bg-lime-500 shadow-[0_0_15px_rgba(0,255,0,0.5)]"
              )}>
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <h3 className="text-lime-400 font-bold text-sm flex items-center gap-2 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                {currentTheme.emoji} AI Assistant
                {isEditingElement && selectedElement && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 font-mono">
                    ✏️ Editing: {selectedElement.section || 'element'}
                  </span>
                )}
              </h3>
              {learningEnabled && !isEditingElement && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  🧠
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isEditingElement && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingElement(false);
                    toast({
                      title: "Editing mode cancelled",
                      description: "Switched back to normal mode",
                    });
                  }}
                  title="Cancel element editing"
                  className="h-8 px-2 text-white/70 hover:text-white hover:bg-white/10 text-xs"
                >
                  ✕ Cancel
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Wand2 className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-gray-950 border border-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuLabel className="font-semibold text-sm text-white">
                    🎨 Themes
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {AI_THEMES.map((theme) => (
                    <DropdownMenuItem
                      key={theme.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThemeChange(theme);
                      }}
                      className={cn(
                        "cursor-pointer gap-3 py-2 text-white/80 hover:text-white hover:bg-white/10",
                        currentTheme.id === theme.id && "bg-white/10 font-semibold"
                      )}
                    >
                      <span className="text-lg">{theme.emoji}</span>
                      <span className="flex-1">{theme.name}</span>
                      {currentTheme.id === theme.id && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversationHistory}
                title="Clear chat"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                disabled={messages.length === 0}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLearningEnabled(!learningEnabled)}
                title={learningEnabled ? "Disable learning" : "Enable learning"}
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
              >
                {learningEnabled ? "🧠" : "💤"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (displayMode === 'dock' && onToggle) {
                    onToggle();
                  } else {
                    setIsExpanded(false);
                  }
                }}
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                title={displayMode === 'dock' ? "Close AI Panel" : "Minimize"}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={mode} onValueChange={(v: string) => setMode(v as typeof mode)} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full grid grid-cols-4 rounded-none h-9 bg-[#0a0a12]">
                <TabsTrigger 
                  value="code" 
                  className="text-xs gap-1.5 text-white/60 hover:text-lime-400 data-[state=active]:text-black data-[state=active]:bg-lime-400 transition-all data-[state=active]:shadow-[0_0_10px_rgba(0,255,0,0.5)] rounded-none font-bold"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="design" 
                  className="text-xs gap-1.5 text-white/60 hover:text-cyan-400 data-[state=active]:text-black data-[state=active]:bg-cyan-400 transition-all data-[state=active]:shadow-[0_0_10px_rgba(0,255,255,0.5)] rounded-none font-bold"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Design</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="review" 
                  className="text-xs gap-1.5 text-white/60 hover:text-yellow-400 data-[state=active]:text-black data-[state=active]:bg-yellow-400 transition-all data-[state=active]:shadow-[0_0_10px_rgba(255,255,0,0.5)] rounded-none font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Review</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="debug" 
                  className="text-xs gap-1.5 text-white/60 hover:text-fuchsia-400 data-[state=active]:text-black data-[state=active]:bg-fuchsia-400 transition-all data-[state=active]:shadow-[0_0_10px_rgba(255,0,255,0.5)] rounded-none font-bold"
                  title="Debug & fix code issues"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Debug</span>
                </TabsTrigger>
              </TabsList>

            {messages.length === 0 && (mode === "code" || mode === "debug") && (
              <div className="px-3 py-2">
                <p className="text-xs font-bold text-lime-400/80 mb-1.5 drop-shadow-[0_0_3px_rgba(0,255,0,0.3)]">Quick start:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts[mode].slice(0, 4).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="text-xs px-2.5 py-1 bg-lime-500/10 hover:bg-lime-500/20 rounded-lg text-lime-300 hover:text-lime-200 transition-all font-medium"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-3" ref={scrollRef}>
              <div className="space-y-2.5 py-3">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="inline-flex p-3 rounded-2xl mb-3 bg-lime-500 shadow-[0_0_20px_rgba(0,255,0,0.4)]">
                      <span className="text-3xl">🕹️</span>
                    </div>
                    <h4 className="text-sm font-bold text-lime-400 mb-1 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                      {mode === "code" && "Let's Build Something"}
                      {mode === "design" && "Design Excellence"}
                      {mode === "review" && "Code Quality"}
                      {mode === "debug" && "Debug & Fix Issues"}
                    </h4>
                    <p className="text-xs text-lime-300/60">
                      {mode === "code" && "Generate web components & code"}
                      {mode === "design" && "Get expert design tips"}
                      {mode === "review" && "Submit code for review"}
                      {mode === "debug" && "AI will analyze and fix your code"}
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-xl text-sm",
                        message.role === "user" 
                          ? "bg-lime-500 text-black px-3 py-2 font-medium shadow-[0_0_10px_rgba(0,255,0,0.3)]" 
                          : "bg-[#0d0d18] border-2 border-cyan-500/30 overflow-hidden",
                      )}
                    >
                      {message.content.includes("```") ? (
                        <div className="space-y-2">
                          {message.content.split("```").map((part, i) => {
                            if (i % 2 === 0) {
                              return part ? (
                                <div key={i} className="px-3 py-2">
                                  <p className="whitespace-pre-wrap m-0 text-xs leading-relaxed text-gray-200">{part}</p>
                                </div>
                              ) : null;
                            }
                            const lines = part.split("\n");
                            const lang = lines[0].trim();
                            const codeContent = lines.slice(1).join("\n").trim();

                            return (
                              <div
                                key={i}
                                className="border border-white/10 rounded-lg overflow-hidden"
                              >
                                <div className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 border-b border-white/10">
                                  <div className="flex items-center gap-1.5">
                                    <Code className="w-3 h-3 text-white/70" />
                                    <span className="text-xs font-medium text-white/80 uppercase">
                                      {lang || "code"}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openCodeViewer(codeContent)}
                                      className="h-6 px-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10"
                                      title="Open in full editor"
                                    >
                                      <Maximize2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(codeContent)}
                                      className="h-6 px-1.5 text-white/60 hover:text-white hover:bg-white/10"
                                      title="Copy code"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="max-h-[200px] overflow-auto">
                                  <VFSMonacoEditor
                                    height="200px"
                                    fileName={`snippet.${lang || 'tsx'}`}
                                    value={codeContent}
                                    readOnly={true}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-2">
                          <p className="whitespace-pre-wrap m-0 text-xs leading-relaxed text-white/80">{message.content}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Clickable suggestions for AI to continue iterating */}
                    {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 px-3 pb-2">
                        {message.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isLoading}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border transition-all",
                              "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
                              "border-purple-400/30 hover:border-purple-400/60",
                              "hover:from-purple-500/20 hover:to-blue-500/20",
                              "hover:shadow-sm hover:scale-105",
                              "text-purple-300",
                              isLoading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white/70" />
                      <span className="text-xs text-white/70">AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-2.5 border-t border-white/10">
              {mode === "debug" && currentCode && currentCode.trim().length > 100 && !currentCode.includes('AI-generated code will appear here') && (
                <div className="mb-2 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-center gap-2">
                  <Code2 className="w-3 h-3" />
                  <span>✓ AI will analyze {Math.min(currentCode.length, 6000)} chars of your code</span>
                </div>
              )}
              
              {/* Dropped files preview */}
              {droppedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {droppedFiles.map((file) => (
                    <div key={file.id} className="relative group flex items-center gap-1.5 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/80">
                      {file.type === 'image' && file.preview ? (
                        <img src={file.preview} alt={file.name} className="w-5 h-5 object-cover rounded" />
                      ) : (
                        <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      <span className="max-w-[80px] truncate">{file.name}</span>
                      <button onClick={() => handleRemoveFile(file.id)} className="opacity-60 hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* File drop zone */}
              {showFileZone && (
                <div className="mb-2">
                  <FileDropZone
                    onFilesDropped={handleFilesDropped}
                    files={droppedFiles}
                    onRemoveFile={handleRemoveFile}
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDemoEmbedDialogOpen(true)}
                  className={cn(
                    "h-11 w-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                  )}
                  title="Set demo embed (data-demo-url / data-supademo-url)"
                >
                  <Play className="w-4 h-4 text-white/70" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFileZone(!showFileZone)}
                  className={cn(
                    "h-11 w-11 rounded-lg bg-lime-500/10 hover:bg-lime-500/20",
                    showFileZone && "bg-lime-500/20"
                  )}
                  title="Attach files or images"
                >
                  <Paperclip className="w-4 h-4 text-lime-400" />
                </Button>
                <Textarea
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder={
                      droppedFiles.length > 0 ? "Describe what to do with files..." :
                      mode === "code" ? "Describe what to build or paste an image..." :
                      mode === "design" ? "Ask about design..." :
                      mode === "review" ? "Paste code for review..." :
                      "Describe the issue or error..."
                    }
                    className="min-h-[44px] max-h-[120px] bg-[#0a0a12] rounded-lg resize-none text-sm text-lime-100 placeholder:text-lime-400/40"
                  />
                <Button
                  onClick={() => handleSend()}
                  disabled={(isLoading || analyzing) || (!input.trim() && droppedFiles.length === 0)}
                  className="h-11 w-11 rounded-lg bg-lime-500 hover:bg-lime-400 text-black shadow-[0_0_15px_rgba(0,255,0,0.4)] hover:shadow-[0_0_20px_rgba(0,255,0,0.6)] transition-all"
                >
                  {(isLoading || analyzing) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-lime-400/50 mt-1.5 text-center font-medium">
                📎 Paste images or drop files • Ctrl+Enter to send
              </p>
            </div>
            </Tabs>
          </div>
        </div>
      )}

      <Dialog open={codeViewerOpen} onOpenChange={setCodeViewerOpen}>
        <DialogContent className="max-w-7xl h-[85vh] p-0 gap-0 border border-white/20 bg-black/95">
          <DialogHeader className="px-4 py-3 border-b border-white/10">
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <Code className="w-4 h-4 text-white/70" />
              <span>Code Editor</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-3">
            <div className="h-full border border-white/10 rounded-lg overflow-hidden">
              <VFSMonacoEditor
                height="100%"
                fileName="editor.tsx"
                value={viewerCode}
                onChange={(value) => setViewerCode(value || "")}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={demoEmbedDialogOpen} onOpenChange={setDemoEmbedDialogOpen}>
        <DialogContent className="max-w-lg border border-white/20 bg-black/95">
          <DialogHeader>
            <DialogTitle className="text-white">Set demo embed</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-white/70">Demo URL (preferred)</label>
              <input
                value={demoEmbedUrl}
                onChange={(e) => setDemoEmbedUrl(e.target.value)}
                placeholder="https://... (YouTube embed, Supademo embed, etc.)"
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/70">Supademo URL (optional)</label>
              <input
                value={supademoEmbedUrl}
                onChange={(e) => setSupademoEmbedUrl(e.target.value)}
                placeholder="https://supademo.com/..."
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
              />
            </div>

            <div className="text-xs text-white/50 leading-relaxed">
              This updates demo CTAs by writing <code className="text-white/70">data-demo-url</code> / <code className="text-white/70">data-supademo-url</code>
              onto buttons/links wired to <code className="text-white/70">demo.request</code>.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => setDemoEmbedDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={applyDemoEmbedToCurrentTemplate}
                className={cn(`bg-gradient-to-br ${currentTheme.gradient.button} hover:opacity-90 transition-opacity`)}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
