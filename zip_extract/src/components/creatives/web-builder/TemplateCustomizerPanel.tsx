/**
 * TemplateCustomizerPanel - Rich Sidebar for Full Template Control
 * 
 * Tabs: Theme Presets | Colors | Typography | Sections | Images
 * Provides developer-grade control over every visual aspect of the template.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Palette, Type, Layers, Image, Sparkles, RotateCcw,
  ChevronUp, ChevronDown, Eye, EyeOff, GripVertical,
  Upload, Link, X, Check, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateCustomizerReturn } from '@/hooks/useTemplateCustomizer';

interface TemplateCustomizerPanelProps {
  customizer: TemplateCustomizerReturn;
  onApply: () => void;
  className?: string;
}

// ---- Collapsible Section ----
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, icon, defaultOpen = true, children, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
          {badge && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{badge}</Badge>}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-3">{children}</div>}
    </div>
  );
};

// ---- Color Swatch ----
const ColorSwatch: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-8 h-8 rounded-md border border-border cursor-pointer bg-transparent p-0"
    />
    <div className="flex-1 min-w-0">
      <Label className="text-xs text-muted-foreground block">{label}</Label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-6 text-xs px-1.5 font-mono"
      />
    </div>
  </div>
);

// ---- Main Component ----
export const TemplateCustomizerPanel: React.FC<TemplateCustomizerPanelProps> = ({
  customizer,
  onApply,
  className,
}) => {
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileUpload = useCallback((imageId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      customizer.replaceImage(imageId, dataUrl);
      setReplacingImageId(null);
      // Don't call onApply() here - the overrideVersion useEffect in WebBuilder
      // handles this automatically after React commits the new images state,
      // avoiding a stale closure race condition.
    };
    reader.readAsDataURL(file);
  }, [customizer]);

  const handleSectionMove = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customizer.sections.length) return;
    customizer.reorderSections(index, newIndex);
    onApply();
  }, [customizer, onApply]);

  return (
    <div className={cn('w-80 bg-card border-l border-border flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Customize</h3>
        </div>
        <div className="flex gap-1.5">
          {customizer.isDirty && (
            <Button variant="ghost" size="sm" onClick={() => { customizer.resetAll(); onApply(); }} className="h-7 text-xs gap-1">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          )}
          {customizer.isDirty && (
            <Button size="sm" onClick={onApply} className="h-7 text-xs gap-1">
              <Check className="w-3 h-3" />
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="theme" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 grid grid-cols-5 h-9">
          <TabsTrigger value="theme" className="text-xs px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Type className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="sections" className="text-xs px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layers className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="images" className="text-xs px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Image className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        {/* Theme Presets */}
        <TabsContent value="theme" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <Section title="Theme Presets" icon={<Sparkles className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-2">
                {customizer.presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => { customizer.applyPreset(preset.id); onApply(); }}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-all hover:shadow-md',
                      customizer.activePresetId === preset.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex gap-1 mb-1.5">
                      {[preset.colors.primary, preset.colors.secondary, preset.colors.accent, preset.colors.background].map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-foreground">{preset.name}</span>
                  </button>
                ))}
              </div>
            </Section>
          </ScrollArea>
        </TabsContent>

        {/* Colors */}
        <TabsContent value="colors" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <Section title="Brand Colors" icon={<Palette className="w-4 h-4" />} badge={customizer.isDirty ? 'modified' : undefined}>
              <div className="space-y-3">
                <ColorSwatch label="Primary" value={customizer.colors.primary} onChange={v => { customizer.updateColor('primary', v); onApply(); }} />
                <ColorSwatch label="Secondary" value={customizer.colors.secondary} onChange={v => { customizer.updateColor('secondary', v); onApply(); }} />
                <ColorSwatch label="Accent" value={customizer.colors.accent} onChange={v => { customizer.updateColor('accent', v); onApply(); }} />
              </div>
            </Section>
            <Section title="Background & Surface" icon={<Palette className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                <ColorSwatch label="Background" value={customizer.colors.background} onChange={v => { customizer.updateColor('background', v); onApply(); }} />
                <ColorSwatch label="Surface" value={customizer.colors.surface} onChange={v => { customizer.updateColor('surface', v); onApply(); }} />
                <ColorSwatch label="Border" value={customizer.colors.border} onChange={v => { customizer.updateColor('border', v); onApply(); }} />
              </div>
            </Section>
            <Section title="Text Colors" icon={<Type className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                <ColorSwatch label="Primary Text" value={customizer.colors.text} onChange={v => { customizer.updateColor('text', v); onApply(); }} />
                <ColorSwatch label="Muted Text" value={customizer.colors.textMuted} onChange={v => { customizer.updateColor('textMuted', v); onApply(); }} />
              </div>
            </Section>
          </ScrollArea>
        </TabsContent>

        {/* Typography */}
        <TabsContent value="typography" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <Section title="Font Families" icon={<Type className="w-4 h-4" />}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Heading Font</Label>
                  <Select
                    value={customizer.typography.headingFont.split(',')[0].trim()}
                    onValueChange={v => { customizer.updateTypography('headingFont', `${v}, sans-serif`); onApply(); }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customizer.availableFonts.map(f => (
                        <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Body Font</Label>
                  <Select
                    value={customizer.typography.bodyFont.split(',')[0].trim()}
                    onValueChange={v => { customizer.updateTypography('bodyFont', `${v}, sans-serif`); onApply(); }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customizer.availableFonts.map(f => (
                        <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>
            <Section title="Font Sizes" icon={<Type className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                {[
                  { key: 'h1Size' as const, label: 'H1', min: 1.5, max: 6, step: 0.25 },
                  { key: 'h2Size' as const, label: 'H2', min: 1.25, max: 4, step: 0.25 },
                  { key: 'h3Size' as const, label: 'H3', min: 1, max: 3, step: 0.25 },
                  { key: 'bodySize' as const, label: 'Body', min: 0.75, max: 1.5, step: 0.125 },
                ].map(({ key, label, min, max, step }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <span className="text-xs font-mono text-muted-foreground">{customizer.typography[key]}</span>
                    </div>
                    <Slider
                      value={[parseFloat(customizer.typography[key])]}
                      min={min}
                      max={max}
                      step={step}
                      onValueChange={([v]) => { customizer.updateTypography(key, `${v}rem`); onApply(); }}
                    />
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Text Properties" icon={<Type className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">Line Height</Label>
                    <span className="text-xs font-mono text-muted-foreground">{customizer.typography.lineHeight}</span>
                  </div>
                  <Slider
                    value={[parseFloat(customizer.typography.lineHeight)]}
                    min={1}
                    max={2.5}
                    step={0.1}
                    onValueChange={([v]) => { customizer.updateTypography('lineHeight', String(v)); onApply(); }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Heading Weight</Label>
                  <Select
                    value={customizer.typography.headingWeight}
                    onValueChange={v => { customizer.updateTypography('headingWeight', v); onApply(); }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['300', '400', '500', '600', '700', '800', '900'].map(w => (
                        <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>
            <Section title="Spacing" icon={<ArrowUpDown className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">Section Padding</Label>
                    <span className="text-xs font-mono text-muted-foreground">{customizer.spacing.sectionPadding}</span>
                  </div>
                  <Slider
                    value={[parseInt(customizer.spacing.sectionPadding)]}
                    min={20}
                    max={160}
                    step={10}
                    onValueChange={([v]) => { customizer.updateSpacing('sectionPadding', `${v}px`); onApply(); }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">Max Container Width</Label>
                    <span className="text-xs font-mono text-muted-foreground">{customizer.spacing.containerMaxWidth}</span>
                  </div>
                  <Slider
                    value={[parseInt(customizer.spacing.containerMaxWidth)]}
                    min={800}
                    max={1920}
                    step={40}
                    onValueChange={([v]) => { customizer.updateSpacing('containerMaxWidth', `${v}px`); onApply(); }}
                  />
                </div>
              </div>
            </Section>
          </ScrollArea>
        </TabsContent>

        {/* Sections Manager */}
        <TabsContent value="sections" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <Section title="Page Sections" icon={<Layers className="w-4 h-4" />} badge={`${customizer.sections.length}`}>
              {customizer.sections.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Generate a template to manage sections
                </p>
              ) : (
                <div className="space-y-1">
                  {customizer.sections.map((section, index) => (
                    <div
                      key={section.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border transition-colors',
                        section.visible ? 'border-border bg-card' : 'border-border/30 bg-muted/30 opacity-60'
                      )}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{section.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{section.preview}</p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          disabled={index === 0}
                          onClick={() => handleSectionMove(index, 'up')}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          disabled={index === customizer.sections.length - 1}
                          onClick={() => handleSectionMove(index, 'down')}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { customizer.toggleSectionVisibility(section.id); onApply(); }}
                          className="h-6 w-6 p-0"
                        >
                          {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </ScrollArea>
        </TabsContent>

        {/* Images Manager */}
        <TabsContent value="images" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <Section title="Template Images" icon={<Image className="w-4 h-4" />} badge={`${customizer.images.length}`}>
              {customizer.images.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No images found in template
                </p>
              ) : (
                <div className="space-y-2">
                  {customizer.images.map(img => (
                    <div key={img.id} className="border border-border rounded-lg overflow-hidden">
                      <div className="h-20 bg-muted flex items-center justify-center overflow-hidden">
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="max-w-full max-h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                      </div>
                      <div className="p-2 space-y-1.5">
                        <p className="text-xs text-muted-foreground truncate" title={img.alt}>
                          {img.alt || 'No alt text'}
                        </p>
                        {replacingImageId === img.id ? (
                          <div className="flex gap-1">
                            <input
                              ref={imageFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileUpload(img.id, file);
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => imageFileInputRef.current?.click()}
                              className="flex-1 h-7 text-xs gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              Choose File
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setReplacingImageId(null)} className="h-7 w-7 p-0">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReplacingImageId(img.id)}
                            className="w-full h-7 text-xs gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            Replace Image
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
