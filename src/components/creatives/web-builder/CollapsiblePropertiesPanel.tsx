/**
 * Collapsible Properties Panel
 * Industry-level property editing with side arrow toggle
 */

import React, { useState, useEffect } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Move,
  Palette,
  Type,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface SelectedHTMLElement {
  tagName?: string;
  textContent?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
  selector?: string;
}

interface CollapsiblePropertiesPanelProps {
  fabricCanvas: FabricCanvas | null;
  selectedObject: any | null;
  selectedHTMLElement?: SelectedHTMLElement | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: () => void;
  onUpdateHTMLElement?: (updates: Partial<SelectedHTMLElement>) => void;
  onClearHTMLSelection?: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-fuchsia-500/10 transition-colors"
      >
        <div className="flex items-center gap-1.5 text-fuchsia-300">
          {icon}
          <span className="text-xs font-bold drop-shadow-[0_0_3px_rgba(255,0,255,0.4)]">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 text-fuchsia-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-fuchsia-400/60" />
        )}
      </button>
      {isOpen && <div className="px-3 pb-2.5 space-y-2">{children}</div>}
    </div>
  );
};

export const CollapsiblePropertiesPanel: React.FC<CollapsiblePropertiesPanelProps> = ({
  fabricCanvas,
  selectedObject,
  selectedHTMLElement,
  isCollapsed,
  onToggleCollapse,
  onUpdate,
  onUpdateHTMLElement,
  onClearHTMLSelection,
  onDelete,
  onDuplicate,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 100, height: 100 });
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [fill, setFill] = useState('#000000');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // HTML Element state
  const [htmlTextColor, setHtmlTextColor] = useState('#000000');
  const [htmlBgColor, setHtmlBgColor] = useState('#ffffff');
  const [htmlPadding, setHtmlPadding] = useState('0');
  const [htmlMargin, setHtmlMargin] = useState('0');
  const [htmlFontSize, setHtmlFontSize] = useState('16');
  const [htmlBorderRadius, setHtmlBorderRadius] = useState('0');
  const [htmlTextContent, setHtmlTextContent] = useState('');

  useEffect(() => {
    if (selectedObject) {
      setPosition({
        x: Math.round(selectedObject.left || 0),
        y: Math.round(selectedObject.top || 0),
      });
      setSize({
        width: Math.round((selectedObject.width || 100) * (selectedObject.scaleX || 1)),
        height: Math.round((selectedObject.height || 100) * (selectedObject.scaleY || 1)),
      });
      setRotation(Math.round(selectedObject.angle || 0));
      setOpacity(Math.round((selectedObject.opacity || 1) * 100));
      setFill(selectedObject.fill || '#000000');
      setFontSize(selectedObject.fontSize || 16);
      setFontFamily(selectedObject.fontFamily || 'Arial');
      setIsLocked(selectedObject.lockMovementX && selectedObject.lockMovementY);
      setIsVisible(selectedObject.visible !== false);
    }
  }, [selectedObject]);

  // Update HTML element state when selectedHTMLElement changes
  useEffect(() => {
    if (selectedHTMLElement) {
      const styles = selectedHTMLElement.styles || {};
      setHtmlTextColor(styles.color || '#000000');
      setHtmlBgColor(styles.backgroundColor || 'transparent');
      setHtmlPadding(styles.padding?.replace('px', '') || '0');
      setHtmlMargin(styles.margin?.replace('px', '') || '0');
      setHtmlFontSize(styles.fontSize?.replace('px', '') || '16');
      setHtmlBorderRadius(styles.borderRadius?.replace('px', '') || '0');
      setHtmlTextContent(selectedHTMLElement.textContent || '');
    }
  }, [selectedHTMLElement]);

  const updateHTMLElement = (property: string, value: string) => {
    if (!selectedHTMLElement || !onUpdateHTMLElement) return;
    
    const updatedStyles = { ...selectedHTMLElement.styles };
    
    switch (property) {
      case 'color':
        updatedStyles.color = value;
        break;
      case 'backgroundColor':
        updatedStyles.backgroundColor = value;
        break;
      case 'padding':
        updatedStyles.padding = value + 'px';
        break;
      case 'margin':
        updatedStyles.margin = value + 'px';
        break;
      case 'fontSize':
        updatedStyles.fontSize = value + 'px';
        break;
      case 'borderRadius':
        updatedStyles.borderRadius = value + 'px';
        break;
      case 'textContent':
        onUpdateHTMLElement({ textContent: value, styles: updatedStyles });
        return;
    }
    
    onUpdateHTMLElement({ styles: updatedStyles });
  };

  const updateObject = (property: string, value: any) => {
    if (!selectedObject || !fabricCanvas) return;

    switch (property) {
      case 'left':
      case 'top':
        selectedObject.set(property, value);
        break;
      case 'width':
        const scaleX = value / (selectedObject.width || 1);
        selectedObject.set('scaleX', scaleX);
        break;
      case 'height':
        const scaleY = value / (selectedObject.height || 1);
        selectedObject.set('scaleY', scaleY);
        break;
      case 'angle':
        selectedObject.set('angle', value);
        break;
      case 'opacity':
        selectedObject.set('opacity', value / 100);
        break;
      case 'fill':
        selectedObject.set('fill', value);
        break;
      case 'fontSize':
        if (selectedObject.type === 'i-text' || selectedObject.type === 'text' || selectedObject.type === 'textbox') {
          selectedObject.set('fontSize', value);
        }
        break;
      case 'fontFamily':
        if (selectedObject.type === 'i-text' || selectedObject.type === 'text' || selectedObject.type === 'textbox') {
          selectedObject.set('fontFamily', value);
        }
        break;
      case 'lock':
        selectedObject.set({
          lockMovementX: value,
          lockMovementY: value,
          lockScalingX: value,
          lockScalingY: value,
          lockRotation: value,
        });
        break;
      case 'visible':
        selectedObject.set('visible', value);
        break;
    }

    fabricCanvas.renderAll();
    onUpdate();
  };

  const handleReset = () => {
    if (!selectedObject) return;
    selectedObject.set({
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
    });
    fabricCanvas?.renderAll();
    onUpdate();
    toast.success('Transform reset');
  };

  return (
    <div className="relative flex">
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-5 h-14 bg-[#0d0d18] rounded-r-lg flex items-center justify-center hover:bg-fuchsia-500/20 hover:shadow-[0_0_10px_rgba(255,0,255,0.3)] transition-all duration-200"
        title={isCollapsed ? 'Show properties' : 'Hide properties'}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5 text-fuchsia-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-fuchsia-400" />
        )}
      </button>

      {/* Panel Content */}
      {!isCollapsed && (
        <div className="w-full bg-[#0d0d18] flex flex-col h-full shadow-[-10px_0_30px_rgba(255,0,255,0.1)]">
          <div className="px-3 py-2 bg-[#0a0a14]">
            <h3 className="font-bold text-xs flex items-center gap-1.5 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]">
              <Layers className="w-3.5 h-3.5 text-fuchsia-500" />
              Properties
            </h3>
            {selectedHTMLElement && (
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-cyan-400/70 capitalize font-mono">
                  {selectedHTMLElement.tagName || 'Element'}
                </p>
                <Button variant="ghost" size="sm" onClick={onClearHTMLSelection} className="h-4 px-1.5 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_8px_rgba(255,0,0,0.4)] rounded">
                  Clear
                </Button>
              </div>
            )}
            {selectedObject && !selectedHTMLElement && (
              <p className="text-[10px] text-cyan-400/70 mt-0.5 capitalize font-mono">
                {selectedObject.type || 'Object'}
              </p>
            )}
          </div>

          {selectedHTMLElement ? (
            <ScrollArea className="flex-1">
              <CollapsibleSection title="Content" icon={<Type className="w-3.5 h-3.5" />}>
                <div>
                  <Label className="text-[10px] text-white/50">Text Content</Label>
                  <Input
                    value={htmlTextContent}
                    onChange={(e) => {
                      setHtmlTextContent(e.target.value);
                      updateHTMLElement('textContent', e.target.value);
                    }}
                    className="h-6 text-xs"
                    placeholder="Enter text..."
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Colors" icon={<Palette className="w-3.5 h-3.5" />}>
                <div>
                  <Label className="text-[10px] text-white/50">Text Color</Label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={htmlTextColor}
                      onChange={(e) => {
                        setHtmlTextColor(e.target.value);
                        updateHTMLElement('color', e.target.value);
                      }}
                      className="w-7 h-6 rounded border border-white/[0.08] cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={htmlTextColor}
                      onChange={(e) => {
                        setHtmlTextColor(e.target.value);
                        updateHTMLElement('color', e.target.value);
                      }}
                      className="h-6 text-xs flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-white/50">Background Color</Label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={htmlBgColor === 'transparent' ? '#ffffff' : htmlBgColor}
                      onChange={(e) => {
                        setHtmlBgColor(e.target.value);
                        updateHTMLElement('backgroundColor', e.target.value);
                      }}
                      className="w-7 h-6 rounded border border-white/[0.08] cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={htmlBgColor}
                      onChange={(e) => {
                        setHtmlBgColor(e.target.value);
                        updateHTMLElement('backgroundColor', e.target.value);
                      }}
                      className="h-6 text-xs flex-1"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Typography" icon={<Type className="w-3.5 h-3.5" />}>
                <div>
                  <Label className="text-[10px] text-white/50">Font Size (px)</Label>
                  <div className="flex gap-1.5 items-center">
                    <Slider
                      value={[parseInt(htmlFontSize) || 16]}
                      min={8}
                      max={72}
                      step={1}
                      onValueChange={([val]) => {
                        setHtmlFontSize(String(val));
                        updateHTMLElement('fontSize', String(val));
                      }}
                      className="flex-1"
                    />
                    <span className="text-[10px] w-8 text-right">{htmlFontSize}px</span>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Spacing" icon={<Move className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-white/50">Padding</Label>
                    <Input
                      type="number"
                      value={htmlPadding}
                      onChange={(e) => {
                        setHtmlPadding(e.target.value);
                        updateHTMLElement('padding', e.target.value);
                      }}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">Margin</Label>
                    <Input
                      type="number"
                      value={htmlMargin}
                      onChange={(e) => {
                        setHtmlMargin(e.target.value);
                        updateHTMLElement('margin', e.target.value);
                      }}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-white/50">Border Radius</Label>
                  <div className="flex gap-1.5 items-center">
                    <Slider
                      value={[parseInt(htmlBorderRadius) || 0]}
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={([val]) => {
                        setHtmlBorderRadius(String(val));
                        updateHTMLElement('borderRadius', String(val));
                      }}
                      className="flex-1"
                    />
                    <span className="text-[10px] w-8 text-right">{htmlBorderRadius}px</span>
                  </div>
                </div>
              </CollapsibleSection>
            </ScrollArea>
          ) : selectedObject ? (
            <ScrollArea className="flex-1">
              <div className="px-3 py-2 border-b border-white/[0.08]/50 flex gap-1.5">
                <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1 h-6 text-[10px]">
                  <Copy className="w-2.5 h-2.5 mr-0.5" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} className="flex-1 h-6 text-[10px] text-destructive hover:text-destructive">
                  <Trash2 className="w-2.5 h-2.5 mr-0.5" />
                  Delete
                </Button>
              </div>

              <CollapsibleSection title="Transform" icon={<Move className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-white/50">X</Label>
                    <Input
                      type="number"
                      value={position.x}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPosition({ ...position, x: val });
                        updateObject('left', val);
                      }}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">Y</Label>
                    <Input
                      type="number"
                      value={position.y}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPosition({ ...position, y: val });
                        updateObject('top', val);
                      }}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">Width</Label>
                    <Input
                      type="number"
                      value={size.width}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 100;
                        setSize({ ...size, width: val });
                        updateObject('width', val);
                      }}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">Height</Label>
                    <Input
                      type="number"
                      value={size.height}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 100;
                        setSize({ ...size, height: val });
                        updateObject('height', val);
                      }}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-white/50">Rotation</Label>
                  <div className="flex gap-1.5 items-center">
                    <Slider
                      value={[rotation]}
                      min={0}
                      max={360}
                      step={1}
                      onValueChange={([val]) => {
                        setRotation(val);
                        updateObject('angle', val);
                      }}
                      className="flex-1"
                    />
                    <span className="text-[10px] w-8 text-right">{rotation}°</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="w-full h-6 text-[10px]">
                  <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                  Reset Transform
                </Button>
              </CollapsibleSection>

              <CollapsibleSection title="Appearance" icon={<Palette className="w-3.5 h-3.5" />}>
                <div>
                  <Label className="text-[10px] text-white/50">Fill Color</Label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={fill}
                      onChange={(e) => {
                        setFill(e.target.value);
                        updateObject('fill', e.target.value);
                      }}
                      className="w-7 h-6 rounded border border-white/[0.08] cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={fill}
                      onChange={(e) => {
                        setFill(e.target.value);
                        updateObject('fill', e.target.value);
                      }}
                      className="h-6 text-xs flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-white/50">Opacity</Label>
                  <div className="flex gap-1.5 items-center">
                    <Slider
                      value={[opacity]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([val]) => {
                        setOpacity(val);
                        updateObject('opacity', val);
                      }}
                      className="flex-1"
                    />
                    <span className="text-[10px] w-8 text-right">{opacity}%</span>
                  </div>
                </div>
              </CollapsibleSection>

              {(selectedObject?.type === 'i-text' || selectedObject?.type === 'text' || selectedObject?.type === 'textbox') && (
                <CollapsibleSection title="Typography" icon={<Type className="w-3.5 h-3.5" />}>
                  <div>
                    <Label className="text-[10px] text-white/50">Font Size</Label>
                    <div className="flex gap-1.5 items-center">
                      <Slider
                        value={[fontSize]}
                        min={8}
                        max={120}
                        step={1}
                        onValueChange={([val]) => {
                          setFontSize(val);
                          updateObject('fontSize', val);
                        }}
                        className="flex-1"
                      />
                      <span className="text-[10px] w-8 text-right">{fontSize}px</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/50">Font Family</Label>
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        setFontFamily(e.target.value);
                        updateObject('fontFamily', e.target.value);
                      }}
                      className="w-full h-6 text-xs rounded border border-white/[0.08] px-1.5 bg-background"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </div>
                </CollapsibleSection>
              )}

              <CollapsibleSection title="Effects" icon={<Sparkles className="w-3.5 h-3.5" />} defaultOpen={false}>
                <div className="flex gap-1.5">
                  <Button
                    variant={isLocked ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setIsLocked(!isLocked);
                      updateObject('lock', !isLocked);
                    }}
                    className="flex-1 h-6 text-[10px]"
                  >
                    {isLocked ? <Lock className="w-2.5 h-2.5 mr-0.5" /> : <Unlock className="w-2.5 h-2.5 mr-0.5" />}
                    {isLocked ? 'Locked' : 'Unlocked'}
                  </Button>
                  <Button
                    variant={isVisible ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setIsVisible(!isVisible);
                      updateObject('visible', !isVisible);
                    }}
                    className="flex-1 h-6 text-[10px]"
                  >
                    {isVisible ? <Eye className="w-2.5 h-2.5 mr-0.5" /> : <EyeOff className="w-2.5 h-2.5 mr-0.5" />}
                    {isVisible ? 'Visible' : 'Hidden'}
                  </Button>
                </div>
              </CollapsibleSection>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-white/50">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No element selected</p>
                <p className="text-[10px] mt-0.5">Click an element or add a component</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollapsiblePropertiesPanel;
