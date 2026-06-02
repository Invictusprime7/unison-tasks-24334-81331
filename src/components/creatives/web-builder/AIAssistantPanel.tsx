import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Sparkles, Loader2, Hammer, Image, Paperclip, AlertTriangle } from 'lucide-react';
import { Canvas as FabricCanvas } from 'fabric';
import { useWebBuilderAI } from '@/hooks/useWebBuilderAI';
import { useAIFileAnalysis } from '@/hooks/useAIFileAnalysis';
import { useIntentFailureWatcher, type IntentDiagnosisRequest } from '@/hooks/useIntentFailureWatcher';
import { useIntentSuccessWatcher, type IntentContinuationRequest } from '@/hooks/useIntentSuccessWatcher';
import { FileDropZone, DroppedFile } from './FileDropZone';
import type { AIGeneratedTemplate } from '@/types/template';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  template?: AIGeneratedTemplate;
  code?: string;
  files?: { name: string; type: string; preview?: string }[];
  suggestions?: string[];
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fabricCanvas: FabricCanvas | null;
  onTemplateGenerated?: (template: any) => void;
  onCodeGenerated?: (code: string) => void;
}

// Get contextual suggestions based on the completed intent
function getSuggestionsForIntent(intent: string): string[] {
  if (intent.includes('booking') || intent.includes('calendar')) {
    return [
      'Add confirmation email template',
      'Customize booking form fields',
      'Add availability calendar',
      'Style the booking widget',
      'Add payment integration',
    ];
  }
  if (intent.includes('contact') || intent.includes('lead')) {
    return [
      'Add follow-up automation',
      'Customize form fields',
      'Add form validation',
      'Style the contact form',
      'Add captcha protection',
    ];
  }
  if (intent.includes('newsletter') || intent.includes('subscribe')) {
    return [
      'Add welcome email template',
      'Customize subscription form',
      'Add double opt-in',
      'Style the signup widget',
      'Add subscriber tags',
    ];
  }
  if (intent.includes('checkout') || intent.includes('cart') || intent.includes('payment')) {
    return [
      'Add order confirmation page',
      'Customize checkout flow',
      'Add discount code field',
      'Style the cart widget',
      'Add shipping calculator',
    ];
  }
  // Default suggestions
  return [
    'Add another section',
    'Improve the styling',
    'Add animations',
    'Wire up more buttons',
    'Test another intent',
  ];
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

  // Auto-diagnosis: watch for intent failures and inject them into chat
  const handleDiagnosisRequest = useCallback((request: IntentDiagnosisRequest) => {
    // Add a system-initiated message showing the failure
    const failureMessage: Message = {
      role: 'assistant',
      content: request.prompt,
    };
    setMessages(prev => [...prev, failureMessage]);

    // Auto-trigger the AI to analyze and fix
    const autoPrompt = `Intent "${request.failure.intent}" failed with error: ${request.failure.error.code} — ${request.failure.error.message}. Source: ${request.failure.source}. Payload keys: ${Object.keys(request.failure.payload || {}).join(', ') || 'none'}. Please diagnose the root cause and generate a fix. If it's a missing alias, add it. If it's a missing handler, create one. If it's a missing business context, set up defaults.`;
    
    // Queue the auto-fix request
    setTimeout(async () => {
      setMessages(prev => [...prev, { role: 'user', content: '🤖 Auto-diagnosing intent failure...' }]);
      const response = await generateTemplate(autoPrompt);
      if (response) {
        const messageIndex = messages.length + 3;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🔧 **Auto-Fix Applied:**\n\n${response.explanation || 'Fix generated. Review the changes below.'}`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Could not auto-fix this issue. Please describe the intended behavior and I\'ll try a different approach.'
        }]);
      }
    }, 500);
  }, [generateTemplate, messages.length]);

  useIntentFailureWatcher(handleDiagnosisRequest, isOpen);

  // Auto-continue: watch for intent successes and offer iteration suggestions
  const handleContinuationRequest = useCallback((request: IntentContinuationRequest) => {
    // Add a success message with clickable suggestions
    const successMessage: Message = {
      role: 'assistant',
      content: request.prompt,
      suggestions: getSuggestionsForIntent(request.success.intent),
    };
    setMessages(prev => [...prev, successMessage]);
  }, []);

  useIntentSuccessWatcher(handleContinuationRequest, isOpen);

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

    // Detect template action (add, remove, modify, restyle, full-control)
    // Use the same logic as in AICodeAssistant.tsx for consistency
    const detectTemplateAction = (message: string): string | undefined => {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.match(/\b(full control|full reign|ai decide|you decide|your choice|go wild|do whatever|improve everything|make it better|optimize everything|enhance everything|fix everything|revamp|overhaul|transform|reimagine)\b/)) {
        return 'full-control';
      }
      if (lowerMessage.match(/\b(add|create|implement|build)\b.*\b(cart|checkout|ecommerce|e-commerce|shopping|payment|buy now|add to cart)\b/)) {
        return 'full-control';
      }
      if (lowerMessage.match(/\b(make|add)\b.*\b(dynamic|interactive|animated|live|real-time)\b/)) {
        return 'full-control';
      }
      // Auth/login flow requests — modify to wire intent attributes
      if (lowerMessage.match(/\b(add|wire|connect|implement|enable)\b.*\b(sign\s*in|sign\s*up|login|logout|auth|authentication)\b/)) {
        return 'modify';
      }
      // Routing/navigation wiring
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
      return undefined;
    };

    // If we have a current template, pass it for targeted changes
    const templateAction = detectTemplateAction(userInput);
    const hasCurrentTemplate = pendingTemplates.size > 0;
    let response;
    if (templateAction && templateAction !== 'full-control' && hasCurrentTemplate) {
      // Targeted edit: pass current template and action
      const currentTemplate = Array.from(pendingTemplates.values()).slice(-1)[0];
      // Compose a prompt that includes the user's request and the current template context
      const prompt = `User request: ${userInput}\n\nCurrent template:\n\`\`\`json\n${JSON.stringify(currentTemplate)}\n\`\`\``;
      response = await generateTemplate(prompt);
      if (response && response.template) {
        const messageIndex = messages.length + 1;
        const assistantMessage: Message = {
          role: 'assistant',
          content: `✨ **Change Applied!**\n\n${response.explanation || 'Your requested change was made.'}\n\nClick "Build to Canvas" below to update your project!`,
          template: response.template
        };
        setMessages(prev => [...prev, assistantMessage]);
        setPendingTemplates(prev => new Map(prev).set(messageIndex, response.template));
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error applying that change. Please try again with a different prompt.'
        }]);
      }
    } else {
      // Full template or first-time request
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
    }
  };

  // Handle clicking a suggestion to auto-continue iteration
  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    if (isProcessing) return;
    
    // Add user message showing the clicked suggestion
    const userMessage: Message = {
      role: 'user',
      content: suggestion,
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Trigger AI to continue with the suggestion
    const response = await generateTemplate(suggestion);
    
    if (response && response.template) {
      const messageIndex = messages.length + 2;
      const assistantMessage: Message = {
        role: 'assistant',
        content: `✨ **Done!**\n\n${response.explanation || 'Changes applied'}\n\nClick "Build to Canvas" to apply!`,
        template: response.template,
        suggestions: [
          'Add another section',
          'Improve the styling',
          'Add animations',
          'Wire up the forms',
        ],
      };
      setMessages(prev => [...prev, assistantMessage]);
      setPendingTemplates(prev => new Map(prev).set(messageIndex, response.template));
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I couldn't complete that change. Try describing it differently or break it into smaller steps.`,
        suggestions: [
          'Try a simpler change',
          'Add a hero section',
          'Adjust colors',
        ],
      }]);
    }
  }, [isProcessing, generateTemplate, messages.length]);

  const handleBuildToCanvas = async (messageIndex: number) => {
    const template = pendingTemplates.get(messageIndex);
    if (template && onTemplateGenerated) {
      console.log('[AIAssistantPanel] Building template to canvas:', template);
      await onTemplateGenerated(template);
      
      // Auto-continue: Add follow-up message with clickable suggestions
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ **Applied!** Template is now live on your canvas.\n\n**Click a suggestion to continue:**`,
          suggestions: [
            'Add testimonials section',
            'Add FAQ section',
            'Add pricing cards',
            'Refine colors & typography',
            'Add animations & hover effects',
            'Wire up form handlers',
          ],
        }]);
      }, 500);
    }
  };

  const handleApplyCode = (messageIndex: number) => {
    const code = pendingCode.get(messageIndex);
    if (code && onCodeGenerated) {
      console.log('[AIAssistantPanel] Applying code to canvas');
      onCodeGenerated(code);
      
      // Auto-continue: Add follow-up message with clickable suggestions
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ **Applied!** Code is now rendering in your preview.\n\n**Click to continue iterating:**`,
          suggestions: [
            'Improve the layout',
            'Add a new section',
            'Make it more responsive',
            'Add hover animations',
            'Change the color scheme',
            'Add form validation',
          ],
        }]);
      }, 500);
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
    'Add sign in logic to auth button',
    'Wire booking button to booking form',
    'Add navigation routing to all links',
    'Add cart + checkout flow',
    'Make everything dynamic',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#0a0a12] shadow-[0_0_30px_rgba(0,255,0,0.2)] z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-[#0d0d18]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-lime-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <h2 className="font-bold text-lime-400 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">AI Design Assistant</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-red-400 hover:bg-red-500/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 bg-[#0d0d18]">
        <p className="text-xs text-lime-400/60 mb-2 font-medium">Quick actions:</p>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-xs px-2 py-1 bg-lime-500/10 rounded-full hover:bg-lime-500/20 transition-colors text-lime-300 font-medium"
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
                        <div className="w-12 h-12 bg-white/[0.04] rounded border flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-white/50" />
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
                    : 'bg-white/[0.04] text-white'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              
              {/* Build to Canvas button for template messages */}
              {message.role === 'assistant' && message.template && (
                <Button
                  onClick={() => handleBuildToCanvas(index)}
                  className="mt-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold shadow-[0_0_15px_rgba(255,0,255,0.4)]"
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
                  className="mt-2 bg-lime-500 hover:bg-lime-400 text-black font-bold shadow-[0_0_15px_rgba(0,255,0,0.4)]"
                  size="sm"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Apply to Canvas
                </Button>
              )}

              {/* Clickable suggestions for AI to continue iterating */}
              {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 max-w-[90%]">
                  {message.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isProcessing}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full transition-all",
                        "bg-cyan-500/10",
                        "hover:bg-cyan-500/20",
                        "hover:shadow-[0_0_10px_rgba(0,255,255,0.3)] hover:scale-105",
                        "text-cyan-300 font-medium",
                        isProcessing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white/[0.04] rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm text-white/50">
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
        <p className="text-xs text-white/50 mt-2">
          📎 Paste images or drop files • Powered by Lovable AI
        </p>
      </div>
    </div>
  );
};
