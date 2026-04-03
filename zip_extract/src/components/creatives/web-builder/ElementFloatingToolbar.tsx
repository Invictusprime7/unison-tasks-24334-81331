/**
 * ElementFloatingToolbar - Context-Sensitive Toolbar for Element-Level Editing
 * 
 * Appears above/below selected elements in the preview.
 * Provides quick access to typography, colors, spacing, and actions.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Trash2, Copy, MoveUp, MoveDown, Edit3,
  ChevronDown, Image, Maximize2, Undo2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  /** Trigger AI-assisted editing for this element */
  onRequestAI?: (selector: string) => void;
  className?: string;
}

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'DM Sans', 'Space Grotesk',
  'Outfit', 'Manrope', 'JetBrains Mono',
];

const SIZE_OPTIONS = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '42', '48', '56', '64', '72'];

export const ElementFloatingToolbar: React.FC<ElementFloatingToolbarProps> = ({
  element,
  onUpdateStyles,
  onUpdateText,
  onReplaceImage,
  onDelete,
  onDuplicate,
  onClear,
  onRequestAI,
  className,
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (element?.textContent) {
      setEditText(element.textContent);
    }
    setIsEditingText(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, [element]);

  if (!element || !element.selector) return null;

  const selector = element.selector;
  const styles = element.styles || {};
  const isImage = element.tagName?.toLowerCase() === 'img';
  const isTextElement = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'li', 'label', 'td', 'th'].includes(
    (element.tagName || '').toLowerCase()
  );

  const currentFontSize = parseInt(styles.fontSize || '16');
  const currentFontWeight = styles.fontWeight || '400';
  const currentFontStyle = styles.fontStyle || 'normal';
  const currentTextDecoration = styles.textDecoration || 'none';
  const currentTextAlign = styles.textAlign || 'left';
  const currentColor = styles.color || '#000000';
  const currentBgColor = styles.backgroundColor || 'transparent';

  const updateStyle = (prop: string, value: string) => {
    onUpdateStyles(selector, { [prop]: value });
  };

  const handleTextSave = () => {
    if (editText.trim() !== element.textContent) {
      onUpdateText(selector, editText.trim());
    }
    setIsEditingText(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onReplaceImage(selector, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn(
      'bg-popover border border-border rounded-xl shadow-xl p-1.5 flex items-center gap-1 flex-wrap',
      'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2',
      className
    )}>
      {/* Element type badge */}
      <div className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">
        {element.tagName || 'element'}
      </div>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Text editing */}
      {isTextElement && (
        <>
          {isEditingText ? (
            <div className="flex items-center gap-1">
              <Input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextSave()}
                className="h-7 text-xs w-40"
                autoFocus
              />
              <Button size="sm" onClick={handleTextSave} className="h-7 text-xs px-2">Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingText(false)} className="h-7 text-xs px-2">Cancel</Button>
            </div>
          ) : (
            <Button
              variant="ghost" size="sm"
              onClick={() => setIsEditingText(true)}
              className="h-7 text-xs gap-1"
            >
              <Edit3 className="w-3 h-3" />
              Edit Text
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 mx-0.5" />

          {/* Font Size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                <Type className="w-3 h-3" />
                {currentFontSize}px
                <ChevronDown className="w-2.5 h-2.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <Label className="text-xs text-muted-foreground mb-2 block">Font Size</Label>
              <Slider
                value={[currentFontSize]}
                min={8}
                max={96}
                step={1}
                onValueChange={([v]) => updateStyle('fontSize', `${v}px`)}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {SIZE_OPTIONS.map(s => (
                  <Button
                    key={s}
                    variant={currentFontSize === parseInt(s) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => updateStyle('fontSize', `${s}px`)}
                    className="h-6 text-[10px] px-1.5"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Font formatting */}
          <div className="flex items-center gap-0.5">
            <Button
              variant={currentFontWeight === 'bold' || parseInt(currentFontWeight) >= 700 ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateStyle('fontWeight', currentFontWeight === 'bold' || parseInt(currentFontWeight) >= 700 ? '400' : 'bold')}
              className="h-7 w-7 p-0"
            >
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={currentFontStyle === 'italic' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateStyle('fontStyle', currentFontStyle === 'italic' ? 'normal' : 'italic')}
              className="h-7 w-7 p-0"
            >
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={currentTextDecoration === 'underline' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateStyle('textDecoration', currentTextDecoration === 'underline' ? 'none' : 'underline')}
              className="h-7 w-7 p-0"
            >
              <Underline className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-0.5">
            {(['left', 'center', 'right'] as const).map(align => {
              const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
              return (
                <Button
                  key={align}
                  variant={currentTextAlign === align ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => updateStyle('textAlign', align)}
                  className="h-7 w-7 p-0"
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              );
            })}
          </div>

          <Separator orientation="vertical" className="h-6 mx-0.5" />
        </>
      )}

      {/* Image replace */}
      {isImage && (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => imageInputRef.current?.click()}
          >
            <Image className="w-3 h-3" />
            Replace
          </Button>
          <Separator orientation="vertical" className="h-6 mx-0.5" />
        </>
      )}

      {/* Colors */}
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
          {/* Quick color presets */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Quick Colors</Label>
            <div className="flex flex-wrap gap-1">
              {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'].map(c => (
                <button
                  key={c}
                  onClick={() => updateStyle('color', c)}
                  className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Spacing */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
            <Maximize2 className="w-3 h-3" />
            <ChevronDown className="w-2.5 h-2.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 space-y-3" align="start">
          {(['padding', 'margin', 'borderRadius'] as const).map(prop => (
            <div key={prop}>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground capitalize">{prop.replace(/([A-Z])/g, ' $1')}</Label>
                <span className="text-[10px] font-mono text-muted-foreground">{styles[prop] || '0'}</span>
              </div>
              <Slider
                value={[parseInt(styles[prop] || '0')]}
                min={0}
                max={prop === 'borderRadius' ? 50 : 80}
                step={2}
                onValueChange={([v]) => updateStyle(prop, `${v}px`)}
              />
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Actions */}
      {onRequestAI && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRequestAI(selector)}
          className="h-7 gap-1 px-2 text-primary hover:text-primary hover:bg-primary/10"
          title="AI Edit — describe changes for this element"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold">AI</span>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => onDuplicate(selector)} className="h-7 w-7 p-0" title="Duplicate">
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onDelete(selector)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear} className="h-7 w-7 p-0" title="Deselect">
        <Undo2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

// Need Label import for popover labels
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={className}>{children}</label>
);
