import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Sparkles, Loader2, Hammer, Image, Paperclip } from 'lucide-react';
import { Canvas as FabricCanvas } from 'fabric';
import { useWebBuilderAI } from '@/hooks/useWebBuilderAI';
import { useAIFileAnalysis } from '@/hooks/useAIFileAnalysis';
import { FileDropZone, DroppedFile } from './FileDropZone';
import type { AIGeneratedTemplate } from '@/types/template';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  template?: AIGeneratedTemplate;
  code?: string;
  files?: { name: string; type: string; preview?: string }[];
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fabricCanvas: FabricCanvas | null;
  onTemplateGenerated?: (template: any) => void;
  onCodeGenerated?: (code: string) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ 
  isOpen, 
  onClose, 
  fabricCanvas, 
  onTemplateGenerated,
  onCodeGenerated 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help you create web designs. Try:\n\n• Drop an image and I\'ll recreate it as code\n• Drop code files for me to analyze\n• Describe what you want to build\n\n📎 Drop files or click the attachment icon!'
    }
  ]);
  const [input, setInput] = useState('');
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [showFileZone, setShowFileZone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingTemplates, setPendingTemplates] = useState<Map<number, AIGeneratedTemplate>>(new Map());
  const [pendingCode, setPendingCode] = useState<Map<number, string>>(new Map());
  
  const { loading, generateDesign, generateTemplate } = useWebBuilderAI(fabricCanvas);
  const { analyzing, analyzeAndGenerate } = useAIFileAnalysis();

  const isProcessing = loading || analyzing;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFilesDropped = useCallback((files: DroppedFile[]) => {
    setDroppedFiles(prev => [...prev, ...files]);
    setShowFileZone(false);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setDroppedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleSend = async () => {
    if ((!input.trim() && droppedFiles.length === 0) || isProcessing) return;

    const hasFiles = droppedFiles.length > 0;
    const userMessage: Message = { 
      role: 'user', 
      content: input || (hasFiles ? 'Analyze these files and create a design' : ''),
      files: droppedFiles.map(f => ({
        name: f.name,
        type: f.type,
        preview: f.preview,
      }))
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    const filesToProcess = [...droppedFiles];
    setInput('');
    setDroppedFiles([]);

    // If files are attached, use file analysis
    if (hasFiles) {
      const result = await analyzeAndGenerate(
        userInput || 'Analyze these files and create a matching React component',
        filesToProcess
      );

      if (result.success && result.code) {
        const messageIndex = messages.length + 1;
        const assistantMessage: Message = {
          role: 'assistant',
          content: `✨ **Code Generated!**\n\n${result.explanation}\n\nClick "Apply to Canvas" to render it!`,
          code: result.code,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setPendingCode(prev => new Map(prev).set(messageIndex, result.code!));
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I couldn't process those files: ${result.error || 'Unknown error'}`
        }]);
      }
      return;
    }

    // Detect if user wants a full template or individual elements
    const isTemplateRequest = /\b(template|page|website|landing page|full design|complete design|entire page)\b/i.test(userInput);

    let response;
    if (isTemplateRequest) {
      response = await generateTemplate(userInput);
      
      if (response && response.template) {
        const messageIndex = messages.length + 1;
        const assistantMessage: Message = {
          role: 'assistant',
          content: `✨ **Template Generated!**\n\n${response.explanation || 'Your template is ready'}\n\n📋 **Template Details:**\n• ${response.template.sections.length} sections\n• ${response.template.name}\n\nClick "Build to Canvas" below to add it as fully editable components!`,
          template: response.template
        };
        setMessages(prev => [...prev, assistantMessage]);
        setPendingTemplates(prev => new Map(prev).set(messageIndex, response.template));
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error creating that template. Please try again with a different prompt.'
        }]);
      }
    } else {
      response = await generateDesign(userInput);
      
      if (response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.explanation || 'Design elements added to canvas!'
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error creating that design. Please try again with a different prompt.'
        }]);
      }
    }
  };

  const handleBuildToCanvas = async (messageIndex: number) => {
    const template = pendingTemplates.get(messageIndex);
    if (template && onTemplateGenerated) {
      console.log('[AIAssistantPanel] Building template to canvas:', template);
      await onTemplateGenerated(template);
    }
  };

  const handleApplyCode = (messageIndex: number) => {
    const code = pendingCode.get(messageIndex);
    if (code && onCodeGenerated) {
      console.log('[AIAssistantPanel] Applying code to canvas');
      onCodeGenerated(code);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle paste for images
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
          
          files.push({
            id,
            file,
            name: `pasted-image-${files.length + 1}.png`,
            type: 'image',
            preview,
          });
        }
      }
      
      if (files.length > 0) {
        setDroppedFiles(prev => [...prev, ...files]);
      }
    }
  };

  const quickPrompts = [
    '🚀 Full AI control - transform this page',
    'Add cart + checkout flow',
    'Make everything dynamic',
    'Create a landing page for a SaaS',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-background shadow-2xl z-50 flex flex-col border-l">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h2 className="font-semibold text-white">AI Design Assistant</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-b bg-muted/50">
        <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-xs px-2 py-1 bg-background border rounded-full hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn("flex flex-col", message.role === 'user' ? 'items-end' : 'items-start')}
            >
              {/* File attachments */}
              {message.files && message.files.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1 max-w-[80%]">
                  {message.files.map((file, i) => (
                    <div key={i} className="relative">
                      {file.type === 'image' && file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              
              {/* Build to Canvas button for template messages */}
              {message.role === 'assistant' && message.template && (
                <Button
                  onClick={() => handleBuildToCanvas(index)}
                  className="mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  size="sm"
                >
                  <Hammer className="w-4 h-4 mr-2" />
                  Build to Canvas
                </Button>
              )}

              {/* Apply Code button for generated code */}
              {message.role === 'assistant' && message.code && (
                <Button
                  onClick={() => handleApplyCode(index)}
                  className="mt-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                  size="sm"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Apply to Canvas
                </Button>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {analyzing ? 'Analyzing files...' : 'Creating your design...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* File Drop Zone */}
      {(showFileZone || droppedFiles.length > 0) && (
        <div className="px-4 py-2 border-t">
          <FileDropZone
            onFilesDropped={handleFilesDropped}
            files={droppedFiles}
            onRemoveFile={handleRemoveFile}
            compact={droppedFiles.length > 0}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFileZone(!showFileZone)}
            className={cn(showFileZone && "bg-primary/10 text-primary")}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder={droppedFiles.length > 0 ? "Describe what to do with files..." : "Describe what you want to create..."}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isProcessing || (!input.trim() && droppedFiles.length === 0)}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          📎 Paste images or drop files • Powered by Lovable AI
        </p>
      </div>
    </div>
  );
};