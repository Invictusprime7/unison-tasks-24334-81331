/**
 * AI Design Assistant
 * 
 * Floating AI panel for Design Studio that enables:
 * - Natural language mockup generation
 * - Inline editing via AI prompts
 * - Section management
 * - Theme switching
 * - Quick export
 * 
 * Uses the Design Intent Compiler for mockup generation.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Palette,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Wand2,
  Layout,
  Download,
  Undo2,
  Redo2,
  Layers,
  Settings2,
  X,
  Plus,
  Image as ImageIcon,
  Type,
  Grid,
  Moon,
  Sun,
  Zap,
  Check,
  Trash2,
  Copy,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDesignStudio, DesignStudioState, DesignStudioActions } from "@/hooks/useDesignStudio";
import { THEME_PRESETS } from "@/services/designTokens";
import { getComponentLibrary } from "@/services/componentLibrary";
import type { SlotNode } from "@/types/scene";

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "mockup" | "edit" | "error";
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  category: "mockup" | "edit" | "section";
}

interface AIDesignAssistantProps {
  className?: string;
  state: DesignStudioState;
  actions: DesignStudioActions;
  onMockupGenerated?: () => void;
}

// ============================================
// QUICK ACTIONS
// ============================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "landing-page",
    label: "Landing Page",
    icon: <Layout className="w-3 h-3" />,
    prompt: "Create a modern landing page with hero, features, and CTA",
    category: "mockup",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: <Grid className="w-3 h-3" />,
    prompt: "Build a creative portfolio page with project grid and about section",
    category: "mockup",
  },
  {
    id: "saas",
    label: "SaaS Product",
    icon: <Zap className="w-3 h-3" />,
    prompt: "Create a SaaS landing page with pricing, features, and testimonials",
    category: "mockup",
  },
  {
    id: "creator",
    label: "Creator Page",
    icon: <Sparkles className="w-3 h-3" />,
    prompt: "Build a creator landing page with bold dark theme, video grid and collab CTA",
    category: "mockup",
  },
  {
    id: "add-hero",
    label: "Add Hero",
    icon: <Plus className="w-3 h-3" />,
    prompt: "add hero section",
    category: "section",
  },
  {
    id: "add-features",
    label: "Add Features",
    icon: <Plus className="w-3 h-3" />,
    prompt: "add features section",
    category: "section",
  },
  {
    id: "center-selected",
    label: "Center It",
    icon: <Type className="w-3 h-3" />,
    prompt: "make it centered",
    category: "edit",
  },
  {
    id: "add-gradient",
    label: "Add Gradient",
    icon: <Palette className="w-3 h-3" />,
    prompt: "add a gradient background",
    category: "edit",
  },
];

// ============================================
// THEME OPTIONS
// ============================================

const THEME_OPTIONS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: "dark-bold", label: "Dark Bold", icon: <Moon className="w-3 h-3" /> },
  { id: "dark-modern", label: "Dark Modern", icon: <Moon className="w-3 h-3" /> },
  { id: "dark-minimal", label: "Dark Minimal", icon: <Moon className="w-3 h-3" /> },
  { id: "dark-elegant", label: "Dark Elegant", icon: <Moon className="w-3 h-3" /> },
  { id: "light-bold", label: "Light Bold", icon: <Sun className="w-3 h-3" /> },
  { id: "light-modern", label: "Light Modern", icon: <Sun className="w-3 h-3" /> },
  { id: "light-minimal", label: "Light Minimal", icon: <Sun className="w-3 h-3" /> },
  { id: "light-playful", label: "Light Playful", icon: <Sun className="w-3 h-3" /> },
];

// ============================================
// COMPONENT
// ============================================

export const AIDesignAssistant: React.FC<AIDesignAssistantProps> = ({
  className,
  state,
  actions,
  onMockupGenerated,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "sections" | "slots">("chat");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportCode, setExportCode] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const componentLibrary = getComponentLibrary();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Generate unique ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add message to chat
  const addMessage = useCallback((role: "user" | "assistant", content: string, type?: Message["type"]) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      type,
    }]);
  }, []);

  // Handle send message
  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || state.isCompiling) return;

    setInput("");
    addMessage("user", prompt);

    try {
      // Check if this is a mockup generation or an edit
      const isNewMockup = !state.scene || 
        prompt.toLowerCase().includes("create") || 
        prompt.toLowerCase().includes("build") ||
        prompt.toLowerCase().includes("make a") ||
        prompt.toLowerCase().includes("generate");

      if (isNewMockup) {
        // Generate new mockup
        addMessage("assistant", "🎨 Generating your mockup...", "text");
        
        const scene = await actions.createFromPrompt(prompt);
        
        if (scene) {
          addMessage("assistant", `✨ Created "${scene.name}" with ${scene.children.length} sections. You can now select elements to edit them.`, "mockup");
          onMockupGenerated?.();
        } else {
          addMessage("assistant", `❌ ${state.lastError || "Failed to generate mockup. Try a different prompt."}`, "error");
        }
      } else {
        // Apply edit to selected element or scene
        addMessage("assistant", "🔧 Applying your changes...", "text");
        
        await actions.applyAIEdit(prompt, state.selectedNodeId || undefined);
        addMessage("assistant", "✅ Changes applied!", "edit");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      addMessage("assistant", `❌ ${message}`, "error");
    }
  };

  // Handle quick action
  const handleQuickAction = async (action: QuickAction) => {
    setInput(action.prompt);
    
    // Auto-send for mockup actions
    if (action.category === "mockup") {
      addMessage("user", action.prompt);
      addMessage("assistant", "🎨 Generating your mockup...", "text");
      
      const scene = await actions.createFromPrompt(action.prompt);
      
      if (scene) {
        addMessage("assistant", `✨ Created "${scene.name}" with ${scene.children.length} sections!`, "mockup");
        onMockupGenerated?.();
      } else {
        addMessage("assistant", `❌ ${state.lastError || "Failed to generate. Try again."}`, "error");
      }
    } else if (action.category === "section") {
      // Add section
      const sectionType = action.prompt.includes("hero") ? "hero" : 
                          action.prompt.includes("feature") ? "features" :
                          action.prompt.includes("cta") ? "cta" : "hero";
      actions.addSection(sectionType);
      addMessage("user", action.prompt);
      addMessage("assistant", `✅ Added ${sectionType} section!`, "edit");
    }
  };

  // Handle theme change
  const handleThemeChange = (preset: string) => {
    actions.applyThemePreset(preset);
    toast({
      title: "Theme Applied",
      description: `Switched to ${preset.replace("-", " ")} theme`,
    });
  };

  // Handle export
  const handleExport = () => {
    const tsx = actions.exportToTSX();
    setExportCode(tsx);
    setExportDialogOpen(true);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  // Get available sections
  const availableSections = actions.getAvailableSections();
  const slots = actions.getSlots();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && document.activeElement === textareaRef.current) {
        e.preventDefault();
        handleSend();
      }
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        if (state.canUndo) actions.undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        if (state.canRedo) actions.redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.canUndo, state.canRedo, actions]);

  return (
    <>
      {/* Floating Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-in-out",
          isMaximized
            ? "inset-4 rounded-xl"
            : isExpanded
            ? "bottom-4 right-4 w-96 h-[32rem] rounded-xl"
            : "bottom-4 right-4 w-14 h-14 rounded-full",
          "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
          "border border-white/10 shadow-2xl shadow-black/50",
          className
        )}
      >
        {/* Collapsed State - Just Button */}
        {!isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
            onClick={() => setIsExpanded(true)}
          >
            <Sparkles className="w-6 h-6" />
          </Button>
        )}

        {/* Expanded State */}
        {isExpanded && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Design</h3>
                  <p className="text-[10px] text-white/50">Design Intent Compiler</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Undo/Redo */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  disabled={!state.canUndo}
                  onClick={() => actions.undo()}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  disabled={!state.canRedo}
                  onClick={() => actions.redo()}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </Button>
                
                {/* Theme Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10">
                      <Palette className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs">Theme Presets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {THEME_OPTIONS.map(theme => (
                      <DropdownMenuItem
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className="text-xs"
                      >
                        {theme.icon}
                        <span className="ml-2">{theme.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Export */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={handleExport}
                  disabled={!state.scene}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>

                {/* Maximize */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setIsMaximized(!isMaximized)}
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-3 mt-2 h-8 bg-white/5">
                <TabsTrigger value="chat" className="text-xs h-6 data-[state=active]:bg-white/10">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="sections" className="text-xs h-6 data-[state=active]:bg-white/10">
                  <Layers className="w-3 h-3 mr-1" />
                  Sections
                </TabsTrigger>
                <TabsTrigger value="slots" className="text-xs h-6 data-[state=active]:bg-white/10">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Slots
                </TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
                {/* Quick Actions */}
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-[10px] text-white/40 mb-1.5">Quick Start</p>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_ACTIONS.filter(a => a.category === "mockup").map(action => (
                      <Button
                        key={action.id}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                        onClick={() => handleQuickAction(action)}
                        disabled={state.isCompiling}
                      >
                        {action.icon}
                        <span className="ml-1">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-3" ref={scrollRef}>
                  <div className="py-3 space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <Sparkles className="w-8 h-8 mx-auto text-purple-400/50 mb-2" />
                        <p className="text-xs text-white/40">
                          Describe your page and I'll create a mockup
                        </p>
                        <p className="text-[10px] text-white/30 mt-1">
                          "Build a creator landing page with bold dark theme"
                        </p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "text-xs rounded-lg px-3 py-2",
                          msg.role === "user"
                            ? "bg-purple-600/20 text-purple-100 ml-6"
                            : msg.type === "error"
                            ? "bg-red-600/20 text-red-200 mr-6"
                            : "bg-white/5 text-white/80 mr-6"
                        )}
                      >
                        {msg.content}
                      </div>
                    ))}
                    {state.isCompiling && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating...
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t border-white/10">
                  {/* Edit Actions (when element selected) */}
                  {state.selectedNodeId && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] bg-purple-600/20 border-purple-500/30 text-purple-200">
                        Editing: {state.selectedNodeId.split("_")[0]}
                      </Badge>
                      {QUICK_ACTIONS.filter(a => a.category === "edit").map(action => (
                        <Button
                          key={action.id}
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] bg-white/5 hover:bg-white/10 text-white/60"
                          onClick={() => {
                            setInput(action.prompt);
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={state.selectedNodeId ? "Describe the change..." : "Describe your page..."}
                      className="flex-1 min-h-[2.5rem] max-h-24 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                      onClick={handleSend}
                      disabled={!input.trim() || state.isCompiling}
                    >
                      {state.isCompiling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Sections Tab */}
              <TabsContent value="sections" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full px-3 py-3">
                  <p className="text-[10px] text-white/40 mb-2">Available Sections</p>
                  <div className="space-y-2">
                    {availableSections.map(section => (
                      <div key={section.type} className="bg-white/5 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-white capitalize">{section.type}</span>
                          <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">
                            {section.variants.length} variants
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {section.variants.map(variant => (
                            <Button
                              key={variant}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white/60"
                              onClick={() => actions.addSection(section.type, variant)}
                            >
                              <Plus className="w-2.5 h-2.5 mr-1" />
                              {variant}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Slots Tab */}
              <TabsContent value="slots" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full px-3 py-3">
                  <p className="text-[10px] text-white/40 mb-2">Image Slots ({slots.length})</p>
                  {slots.length === 0 ? (
                    <div className="text-center py-8">
                      <ImageIcon className="w-6 h-6 mx-auto text-white/20 mb-2" />
                      <p className="text-xs text-white/40">No image slots yet</p>
                      <p className="text-[10px] text-white/30">Generate a mockup to create slots</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((slot: SlotNode) => (
                        <div key={slot.slotId} className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                          <div className={cn(
                            "w-10 h-10 rounded flex items-center justify-center",
                            slot.currentAsset ? "bg-purple-600/20" : "bg-white/5 border border-dashed border-white/20"
                          )}>
                            {slot.currentAsset ? (
                              <Check className="w-4 h-4 text-purple-400" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-white/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{slot.name}</p>
                            <p className="text-[10px] text-white/40">{slot.slotType}</p>
                          </div>
                          {slot.currentAsset && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white/40 hover:text-red-400"
                              onClick={() => actions.unbindSlot(slot.slotId)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Export TSX</DialogTitle>
            <DialogDescription>
              Copy the generated React component code
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 rounded-lg border bg-gray-950 p-4">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
              {exportCode || "// Generate a mockup first"}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => copyToClipboard(exportCode)} disabled={!exportCode}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIDesignAssistant;
