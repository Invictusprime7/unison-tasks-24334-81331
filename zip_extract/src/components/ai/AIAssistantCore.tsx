/**
 * AIAssistantCore - Reusable AI chat assistant component
 * 
 * This is the shared core logic for AI assistant functionality.
 * Can be used in:
 * - SystemsAIPanel (Homepage as inline panel)
 * - WebBuilder (as floating code assistant widget)
 * 
 * Provides:
 * - Chat interface with message history
 * - Quick action chips
 * - File drop support
 * - Code generation callbacks
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Trash2,
  Paperclip,
  X,
  Bot,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FileDropZone, DroppedFile } from "@/components/creatives/web-builder/FileDropZone";
import { useAIFileAnalysis } from "@/hooks/useAIFileAnalysis";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasCode?: boolean;
  code?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: React.ReactNode;
}

export interface AIAssistantCoreProps {
  /** Custom class name for styling */
  className?: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Quick action chips to show */
  quickActions?: QuickAction[];
  /** Callback when code is generated */
  onCodeGenerated?: (code: string) => void;
  /** Callback when a message is sent (for custom handling) */
  onMessageSent?: (message: string) => Promise<string | null>;
  /** Current context code for the AI */
  contextCode?: string;
  /** System type for context */
  systemType?: string;
  /** Business name for context */
  businessName?: string;
  /** Initial messages to display */
  initialMessages?: AIMessage[];
  /** Whether to show file drop zone */
  showFileUpload?: boolean;
  /** Whether to allow clearing history */
  allowClearHistory?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Header content override */
  headerContent?: React.ReactNode;
  /** Hide the default header */
  hideHeader?: boolean;
  /** Custom send handler - if provided, bypasses default AI logic */
  customSendHandler?: (message: string, files?: DroppedFile[]) => Promise<{ content: string; code?: string } | null>;
}

export const AIAssistantCore: React.FC<AIAssistantCoreProps> = ({
  className,
  placeholder = "Ask me anything about your project...",
  quickActions = [],
  onCodeGenerated,
  onMessageSent,
  contextCode,
  systemType,
  businessName,
  initialMessages = [],
  showFileUpload = true,
  allowClearHistory = true,
  compact = false,
  headerContent,
  hideHeader = false,
  customSendHandler,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [showFileZone, setShowFileZone] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { analyzing, analyzeAndGenerate } = useAIFileAnalysis();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // File handlers
  const handleFilesDropped = useCallback((files: DroppedFile[]) => {
    setDroppedFiles(prev => [...prev, ...files]);
    setShowFileZone(false);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setDroppedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Copy code to clipboard
  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  // Clear conversation
  const handleClearHistory = () => {
    setMessages([]);
    toast({ title: "Conversation cleared" });
  };

  // Send message
  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && droppedFiles.length === 0) return;
    if (isLoading) return;

    const userMessage: AIMessage = {
      role: "user",
      content: trimmedInput || "Analyze these files",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let response: { content: string; code?: string } | null = null;

      // Use custom handler if provided
      if (customSendHandler) {
        response = await customSendHandler(trimmedInput, droppedFiles);
      } 
      // Handle file analysis
      else if (droppedFiles.length > 0) {
        const result = await analyzeAndGenerate(
          trimmedInput || "Analyze these files and suggest improvements",
          droppedFiles
        );
        if (result.success) {
          response = {
            content: result.explanation || "Analysis complete.",
            code: result.code,
          };
        } else {
          response = {
            content: `Sorry, I couldn't process those files: ${result.error || 'Unknown error'}`,
          };
        }
      }
      // Default AI handler via edge function
      else {
        const { data, error } = await supabase.functions.invoke("code-assistant", {
          body: {
            prompt: trimmedInput,
            context: contextCode,
            systemType,
            businessName,
            mode: "code",
          },
        });

        if (error) {
          throw error;
        }

        const content = data?.choices?.[0]?.message?.content || data?.content || "I couldn't generate a response.";
        
        // Extract code blocks if present
        const codeMatch = content.match(/```(?:html|jsx|tsx|javascript|typescript)?\n?([\s\S]*?)```/);
        
        response = {
          content,
          code: codeMatch ? codeMatch[1].trim() : undefined,
        };
      }

      // Clear dropped files
      setDroppedFiles([]);

      if (response) {
        const assistantMessage: AIMessage = {
          role: "assistant",
          content: response.content,
          timestamp: new Date(),
          hasCode: !!response.code,
          code: response.code,
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Notify parent if code was generated
        if (response.code && onCodeGenerated) {
          onCodeGenerated(response.code);
        }

        // Notify parent of message
        if (onMessageSent) {
          await onMessageSent(response.content);
        }
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      const errorMessage: AIMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action click
  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle paste for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith("image/"));

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

          files.push({
            id,
            file,
            name: `pasted-image-${files.length + 1}.png`,
            type: "image",
            preview,
          });
        }
      }

      if (files.length > 0) {
        setDroppedFiles(prev => [...prev, ...files]);
      }
    }
  };

  // Extract code from message content
  const extractCode = (content: string): string | null => {
    const match = content.match(/```(?:html|jsx|tsx|javascript|typescript)?\n?([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  return (
    <div className={cn(
      "flex flex-col bg-background border rounded-lg overflow-hidden",
      compact ? "max-h-[400px]" : "h-full",
      className
    )}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          {headerContent || (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
          )}
          {allowClearHistory && messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="p-2 border-b bg-muted/30">
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="text-xs px-2.5 py-1.5 bg-background border rounded-full hover:bg-primary/10 hover:border-primary/30 transition-colors flex items-center gap-1"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Start a conversation or try a quick action above</p>
            </div>
          )}
          
          {messages.map((message, index) => {
            const code = message.code || extractCode(message.content);
            
            return (
              <div
                key={index}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[85%] rounded-lg p-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Code block with copy button */}
                  {code && message.role === "assistant" && (
                    <div className="mt-2 relative">
                      <pre className="bg-black/10 rounded p-2 text-xs overflow-x-auto max-h-32">
                        <code>{code.substring(0, 500)}{code.length > 500 ? "..." : ""}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-1 right-1 h-6 px-2"
                        onClick={() => handleCopyCode(code, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  {analyzing ? "Analyzing files..." : "Thinking..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* File Drop Zone */}
      {showFileUpload && (showFileZone || droppedFiles.length > 0) && (
        <div className="px-3 py-2 border-t">
          <FileDropZone
            onFilesDropped={handleFilesDropped}
            files={droppedFiles}
            onRemoveFile={handleRemoveFile}
            compact={droppedFiles.length > 0}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2">
          {showFileUpload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFileZone(!showFileZone)}
              className={cn("h-9 w-9", showFileZone && "bg-primary/10 text-primary")}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          )}
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={droppedFiles.length > 0 ? "Describe what to do with files..." : placeholder}
            disabled={isLoading}
            className={cn(
              "flex-1 min-h-[40px] max-h-[120px] resize-none",
              compact && "min-h-[36px]"
            )}
            rows={1}
          />
          
          <Button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && droppedFiles.length === 0)}
            size="icon"
            className="h-9 w-9 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {showFileUpload && (
          <p className="text-xs text-muted-foreground mt-1.5">
            📎 Paste images or drop files • Powered by AI
          </p>
        )}
      </div>
    </div>
  );
};

export default AIAssistantCore;
