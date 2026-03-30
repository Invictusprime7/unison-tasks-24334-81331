/**
 * ElementFloatingToolbar - Context-Sensitive Toolbar for Element-Level Editing
 *
 * Appears above/below selected elements in the preview.
 * Provides quick access to typography, colors, spacing, actions, and
 * a full inline AI chat panel for natural-language element edits.
 */

import React, { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Trash2, Copy, MoveUp, MoveDown, Edit3,
  ChevronDown, Image, Maximize2, Undo2, Sparkles,
  Send, X, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SystemsBuildContext } from '@/types/systemsBuildContext';
import type { BusinessSystemType } from '@/data/templates/types';

interface SelectedElement {
  tagName?: string;
  textContent?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
  selector?: string;
  html?: string;
  section?: string;
}

interface ElementFloatingToolbarProps {
  element: SelectedElement | null;
  onUpdateStyles: (selector: string, styles: Record<string, string>) => void;
  onUpdateText: (selector: string, text: string) => void;
  onReplaceImage: (selector: string, src: string) => void;
  onDelete: (selector: string) => void;
  onDuplicate: (selector: string) => void;
  onClear: () => void;
  /** Move element/section up in DOM order */
  onMoveUp?: (selector: string) => void;
  /** Move element/section down in DOM order */
  onMoveDown?: (selector: string) => void;
  /**
   * Called with the selector and AI-generated HTML snippet.
   * Return true/void to confirm the update was applied, false to signal failure.
   */
  onAIEditComplete?: (selector: string, html: string) => boolean | Promise<boolean>;
  /** Legacy — kept for backward compatibility; prefer onAIEditComplete */
  onRequestAI?: (selector: string) => void;
  className?: string;
  /** Business system type for context-aware AI edits (e.g. 'salon', 'restaurant') */
  systemType?: BusinessSystemType | null;
  /** Full business blueprint from systems-build for richer AI context */
  systemsBuildContext?: SystemsBuildContext | null;
}

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'DM Sans', 'Space Grotesk',
  'Outfit', 'Manrope', 'JetBrains Mono',
];

const SIZE_OPTIONS = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '42', '48', '56', '64', '72'];

// ─── Inline AI Panel ─────────────────────────────────────────────────────────

interface InlineAIPanelProps {
  element: SelectedElement;
  onClose: () => void;
  onAIEditComplete?: (selector: string, html: string) => boolean | Promise<boolean>;
  onRequestAI?: (selector: string) => void;
  systemType?: BusinessSystemType | null;
  systemsBuildContext?: SystemsBuildContext | null;
}

const InlineAIPanel: React.FC<InlineAIPanelProps> = ({
  element,
  onClose,
  onAIEditComplete,
  onRequestAI,
  systemType,
  systemsBuildContext,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;
    const selector = element.selector!;

    // Fall back to legacy modal when no inline handler is provided
    if (!onAIEditComplete) {
      onRequestAI?.(selector);
      onClose();
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const elementHtml =
        element.html ||
        `<${element.tagName || 'div'}>${element.textContent || ''}</${element.tagName || 'div'}>`;

      const surgicalPrompt = [
        '🎯 ELEMENT EDIT MODE — Return ONLY the modified HTML for this specific element.',
        '',
        'Current element HTML:',
        '```html',
        elementHtml.length > 3000 ? elementHtml.slice(0, 3000) + '\n<!-- ...truncated... -->' : elementHtml,
        '```',
        `Element type: ${element.tagName || 'unknown'} · Section: "${element.section || 'unknown'}"`,
        `Current styles: ${JSON.stringify(element.styles || {})}`,
        '',
        `User Request: ${trimmedPrompt}`,
        '',
        '⚠️ STRICT OUTPUT RULES:',
        '1. Return ONLY the modified HTML element — nothing else.',
        '2. No <!DOCTYPE>, no <html>, no <head>, no <body> wrappers.',
        '3. No explanation text, no markdown fences, no extra commentary.',
        '4. Preserve existing class names and data attributes unless explicitly asked to change them.',
        '5. Make ONLY the requested change — do not alter other aspects of the element.',
      ].join('\n');

      const { data, error: fnError } = await supabase.functions.invoke('ai-code-assistant', {
        body: {
          messages: [{ role: 'user', content: surgicalPrompt }],
          mode: 'code',
          editMode: true,
          templateAction: 'modify',
          systemType: systemType ?? undefined,
          systemsBuildContext: systemsBuildContext ?? undefined,
        },
      });

      if (fnError) {
        // data may carry the edge function's descriptive { error: '...' } body even on failure
        const bodyMsg = (data as { error?: string } | null)?.error;
        throw new Error(bodyMsg || fnError.message || 'AI request failed');
      }

      // Extract HTML — strip markdown fences if present
      let generatedHtml: string = data?.content || data?.html || data?.code || '';
      generatedHtml = generatedHtml
        .replace(/^```(?:html)?\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

      if (!generatedHtml) {
        throw new Error('AI returned an empty response. Please try a more specific prompt.');
      }

      const applied = await onAIEditComplete(selector, generatedHtml);
      if (applied !== false) {
        setSuccess(true);
        setPrompt('');
        setTimeout(() => onClose(), 1200);
      } else {
        throw new Error('Failed to apply the AI edit. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, element, onAIEditComplete, onRequestAI, onClose]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="w-full border-t border-white/10 pt-2 mt-1 animate-in fade-in-0 slide-in-from-top-1">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
        <span className="text-[10px] font-semibold text-cyan-300 shrink-0">AI Edit</span>
        <span className="text-[10px] text-white/40 truncate max-w-[220px]">
          {element.tagName?.toUpperCase()}
          {element.selector ? ` · ${element.selector.slice(0, 30)}` : ''}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-white/30 hover:text-white/70 transition-colors"
          title="Close AI panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-1.5">
        <Textarea
          ref={inputRef}
          value={prompt}
          onChange={e => { setPrompt(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          placeholder={`Describe changes to this ${element.tagName || 'element'}… (Enter to send, Shift+Enter for newline)`}
          rows={2}
          disabled={loading || success}
          className={cn(
            'flex-1 min-w-0 resize-none text-xs py-1.5 px-2.5 rounded-lg',
            'bg-white/[0.07] border-white/10 text-white placeholder:text-white/30',
            'focus-visible:ring-1 focus-visible:ring-cyan-400/60 focus-visible:border-cyan-400/40',
            'transition-all',
          )}
        />
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading || success}
          size="sm"
          className={cn(
            'h-[54px] w-9 p-0 shrink-0 rounded-lg',
            'bg-cyan-500 hover:bg-cyan-400 text-black',
            'disabled:opacity-50',
            'shadow-[0_0_12px_rgba(0,255,255,0.35)]',
          )}
          title="Send (Enter)"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : success ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      {/* Status */}
      {error && (
        <div className="flex items-start gap-1 mt-1.5 text-[10px] text-red-400">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>Applied! Closing…</span>
        </div>
      )}
      {!error && !success && (
        <p className="text-[9px] text-white/25 mt-1">Shift+Enter for new line · Esc to close</p>
      )}
    </div>
  );
};

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export const ElementFloatingToolbar: React.FC<ElementFloatingToolbarProps> = ({
  element,
  onUpdateStyles,
  onUpdateText,
  onReplaceImage,
  onDelete,
  onDuplicate,
  onClear,
  onMoveUp,
  onMoveDown,
  onAIEditComplete,
  onRequestAI,
  className,
  systemType,
  systemsBuildContext,
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (element?.textContent) setEditText(element.textContent);
    setIsEditingText(false);
    setIsAIOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, [element]);

  if (!element || !element.selector) return null;

  const selector = element.selector;
  const styles = element.styles || {};
  const isImage = element.tagName?.toLowerCase() === 'img';
  const isTextElement = ['h1','h2','h3','h4','h5','h6','p','span','a','button','li','label','td','th'].includes(
    (element.tagName || '').toLowerCase()
  );
  const hasAI = !!(onAIEditComplete || onRequestAI);

  const currentFontSize = parseInt(styles.fontSize || '16');
  const currentFontWeight = styles.fontWeight || '400';
  const currentFontStyle = styles.fontStyle || 'normal';
  const currentTextDecoration = styles.textDecoration || 'none';
  const currentTextAlign = styles.textAlign || 'left';
  const currentColor = styles.color || '#000000';
  const currentBgColor = styles.backgroundColor || 'transparent';

  const updateStyle = (prop: string, value: string) => onUpdateStyles(selector, { [prop]: value });

  const handleTextSave = () => {
    if (editText.trim() !== element.textContent) onUpdateText(selector, editText.trim());
    setIsEditingText(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onReplaceImage(selector, reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn(
      'bg-[#0d0d18] rounded-xl shadow-[0_0_25px_rgba(0,255,255,0.3)] p-2 flex flex-col gap-0',
      'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2',
      className
    )}>
      {/* ── Buttons row ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Element badge */}
        <div className="px-2.5 py-1 bg-cyan-500 text-black rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.4)]">
          {element.tagName || 'element'}
        </div>

        <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />

        {/* Text editors */}
        {isTextElement && (
          <>
            {isEditingText ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleTextSave(); if (e.key === 'Escape') setIsEditingText(false); }}
                  className="h-7 text-xs w-40"
                  autoFocus
                />
                <Button size="sm" onClick={handleTextSave} className="h-7 text-xs px-2">Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingText(false)} className="h-7 text-xs px-2">Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingText(true)} className="h-7 text-xs gap-1">
                <Edit3 className="w-3 h-3" />Edit Text
              </Button>
            )}

            <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />

            {/* Font size */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                  <Type className="w-3 h-3" />{currentFontSize}px<ChevronDown className="w-2.5 h-2.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="start">
                <Label className="text-xs text-muted-foreground mb-2 block">Font Size</Label>
                <Slider value={[currentFontSize]} min={8} max={96} step={1} onValueChange={([v]) => updateStyle('fontSize', `${v}px`)} />
                <div className="flex flex-wrap gap-1 mt-2">
                  {SIZE_OPTIONS.map(s => (
                    <Button key={s} variant={currentFontSize === parseInt(s) ? 'secondary' : 'ghost'} size="sm" onClick={() => updateStyle('fontSize', `${s}px`)} className="h-6 text-[10px] px-1.5">{s}</Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Font style buttons */}
            <div className="flex items-center gap-0.5">
              <Button variant={currentFontWeight === 'bold' || parseInt(currentFontWeight) >= 700 ? 'secondary' : 'ghost'} size="sm" onClick={() => updateStyle('fontWeight', currentFontWeight === 'bold' || parseInt(currentFontWeight) >= 700 ? '400' : 'bold')} className="h-7 w-7 p-0"><Bold className="w-3.5 h-3.5" /></Button>
              <Button variant={currentFontStyle === 'italic' ? 'secondary' : 'ghost'} size="sm" onClick={() => updateStyle('fontStyle', currentFontStyle === 'italic' ? 'normal' : 'italic')} className="h-7 w-7 p-0"><Italic className="w-3.5 h-3.5" /></Button>
              <Button variant={currentTextDecoration === 'underline' ? 'secondary' : 'ghost'} size="sm" onClick={() => updateStyle('textDecoration', currentTextDecoration === 'underline' ? 'none' : 'underline')} className="h-7 w-7 p-0"><Underline className="w-3.5 h-3.5" /></Button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5">
              {(['left', 'center', 'right'] as const).map(align => {
                const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                return (
                  <Button key={align} variant={currentTextAlign === align ? 'secondary' : 'ghost'} size="sm" onClick={() => updateStyle('textAlign', align)} className="h-7 w-7 p-0">
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                );
              })}
            </div>

            <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />
          </>
        )}

        {/* Image replace */}
        {isImage && (
          <>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => imageInputRef.current?.click()}>
              <Image className="w-3 h-3" />Replace
            </Button>
            <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />
          </>
        )}

        {/* Color picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
              <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: currentColor }} />
              <ChevronDown className="w-2.5 h-2.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-3" align="start">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Text Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={currentColor} onChange={e => updateStyle('color', e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                <Input value={currentColor} onChange={e => updateStyle('color', e.target.value)} className="h-7 text-xs flex-1 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Background</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={currentBgColor === 'transparent' ? '#ffffff' : currentBgColor} onChange={e => updateStyle('backgroundColor', e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                <Input value={currentBgColor} onChange={e => updateStyle('backgroundColor', e.target.value)} className="h-7 text-xs flex-1 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Quick Colors</Label>
              <div className="flex flex-wrap gap-1">
                {['#000000','#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280'].map(c => (
                  <button key={c} onClick={() => updateStyle('color', c)} className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Spacing */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
              <Maximize2 className="w-3 h-3" /><ChevronDown className="w-2.5 h-2.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-3" align="start">
            {(['padding', 'margin', 'borderRadius'] as const).map(prop => (
              <div key={prop}>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground capitalize">{prop.replace(/([A-Z])/g, ' $1')}</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">{styles[prop] || '0'}</span>
                </div>
                <Slider value={[parseInt(styles[prop] || '0')]} min={0} max={prop === 'borderRadius' ? 50 : 80} step={2} onValueChange={([v]) => updateStyle(prop, `${v}px`)} />
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />

        {/* AI toggle */}
        {hasAI && (
          <Button
            variant={isAIOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setIsAIOpen(v => !v)}
            className={cn(
              'h-7 gap-1 px-2 transition-all',
              isAIOpen
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10',
            )}
            title={isAIOpen ? 'Close AI panel' : 'AI Edit — describe changes for this element'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">AI</span>
          </Button>
        )}

        {/* Section/element reorder */}
        {(onMoveUp || onMoveDown) && (
          <>
            <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />
            {onMoveUp && (
              <Button variant="ghost" size="sm" onClick={() => onMoveUp(selector)} className="h-7 w-7 p-0" title="Move Up">
                <MoveUp className="w-3.5 h-3.5" />
              </Button>
            )}
            {onMoveDown && (
              <Button variant="ghost" size="sm" onClick={() => onMoveDown(selector)} className="h-7 w-7 p-0" title="Move Down">
                <MoveDown className="w-3.5 h-3.5" />
              </Button>
            )}
          </>
        )}

        <Separator orientation="vertical" className="h-6 mx-0.5 bg-white/[0.1]" />

        <Button variant="ghost" size="sm" onClick={() => onDuplicate(selector)} className="h-7 w-7 p-0" title="Duplicate"><Copy className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(selector)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 w-7 p-0" title="Deselect"><Undo2 className="w-3.5 h-3.5" /></Button>
      </div>

      {/* ── Inline AI panel (expands below the buttons row) ── */}
      {isAIOpen && (
        <InlineAIPanel
          element={element}
          onClose={() => setIsAIOpen(false)}
          onAIEditComplete={onAIEditComplete}
          onRequestAI={onRequestAI}
          systemType={systemType}
          systemsBuildContext={systemsBuildContext}
        />
      )}
    </div>
  );
};

// Minimal label helper
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={className}>{children}</label>
);
