/**
 * Collapsible Properties Panel
 * Industry-level property editing with side arrow toggle
 */

import React, { useState, useEffect } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
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
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
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
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-6 h-16 bg-secondary border border-border rounded-l-lg flex items-center justify-center hover:bg-accent transition-colors"
        title={isCollapsed ? 'Show properties' : 'Hide properties'}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-4 h-4 text-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-foreground" />
        )}
      </button>

      {/* Panel Content */}
      {!isCollapsed && (
        <div className="w-72 bg-card border-l border-border flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border bg-secondary">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Properties
            </h3>
            {selectedHTMLElement && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedHTMLElement.tagName || 'Element'}
                </p>
                <Button variant="ghost" size="sm" onClick={onClearHTMLSelection} className="h-5 px-2 text-xs bg-primary/20 text-primary-foreground hover:bg-primary/30">
                  Clear
                </Button>
              </div>
            )}
            {selectedObject && !selectedHTMLElement && (
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {selectedObject.type || 'Object'}
              </p>
            )}
          </div>

          {selectedHTMLElement ? (
            <ScrollArea className="flex-1">
              <CollapsibleSection title="Content" icon={<Type className="w-4 h-4" />}>
                <div>
                  <Label className="text-xs text-muted-foreground">Text Content</Label>
                  <Input
                    value={htmlTextContent}
                    onChange={(e) => {
                      setHtmlTextContent(e.target.value);
                      updateHTMLElement('textContent', e.target.value);
                    }}
                    className="h-8 text-sm"
                    placeholder="Enter text..."
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Colors" icon={<Palette className="w-4 h-4" />}>
                <div>
                  <Label className="text-xs text-muted-foreground">Text Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={htmlTextColor}
                      onChange={(e) => {
                        setHtmlTextColor(e.target.value);
                        updateHTMLElement('color', e.target.value);
                      }}
                      className="w-10 h-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={htmlTextColor}
                      onChange={(e) => {
                        setHtmlTextColor(e.target.value);
                        updateHTMLElement('color', e.target.value);
                      }}
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Background Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={htmlBgColor === 'transparent' ? '#ffffff' : htmlBgColor}
                      onChange={(e) => {
                        setHtmlBgColor(e.target.value);
                        updateHTMLElement('backgroundColor', e.target.value);
                      }}
                      className="w-10 h-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={htmlBgColor}
                      onChange={(e) => {
                        setHtmlBgColor(e.target.value);
                        updateHTMLElement('backgroundColor', e.target.value);
                      }}
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Typography" icon={<Type className="w-4 h-4" />}>
                <div>
                  <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                  <div className="flex gap-2 items-center">
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
                    <span className="text-xs w-10 text-right">{htmlFontSize}px</span>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Spacing" icon={<Move className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Padding (px)</Label>
                    <Input
                      type="number"
                      value={htmlPadding}
                      onChange={(e) => {
                        setHtmlPadding(e.target.value);
                        updateHTMLElement('padding', e.target.value);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Margin (px)</Label>
                    <Input
                      type="number"
                      value={htmlMargin}
                      onChange={(e) => {
                        setHtmlMargin(e.target.value);
                        updateHTMLElement('margin', e.target.value);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Border Radius (px)</Label>
                  <div className="flex gap-2 items-center">
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
                    <span className="text-xs w-10 text-right">{htmlBorderRadius}px</span>
                  </div>
                </div>
              </CollapsibleSection>
            </ScrollArea>
          ) : selectedObject ? (
            <ScrollArea className="flex-1">
              <div className="px-4 py-3 border-b border-border/50 flex gap-2">
                <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1 h-8">
                  <Copy className="w-3 h-3 mr-1" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} className="flex-1 h-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>

              <CollapsibleSection title="Transform" icon={<Move className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">X</Label>
                    <Input
                      type="number"
                      value={position.x}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPosition({ ...position, x: val });
                        updateObject('left', val);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Y</Label>
                    <Input
                      type="number"
                      value={position.y}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPosition({ ...position, y: val });
                        updateObject('top', val);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Width</Label>
                    <Input
                      type="number"
                      value={size.width}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 100;
                        setSize({ ...size, width: val });
                        updateObject('width', val);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height</Label>
                    <Input
                      type="number"
                      value={size.height}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 100;
                        setSize({ ...size, height: val });
                        updateObject('height', val);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rotation</Label>
                  <div className="flex gap-2 items-center">
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
                    <span className="text-xs w-10 text-right">{rotation}°</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="w-full h-8 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Transform
                </Button>
              </CollapsibleSection>

              <CollapsibleSection title="Appearance" icon={<Palette className="w-4 h-4" />}>
                <div>
                  <Label className="text-xs text-muted-foreground">Fill Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={fill}
                      onChange={(e) => {
                        setFill(e.target.value);
                        updateObject('fill', e.target.value);
                      }}
                      className="w-10 h-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={fill}
                      onChange={(e) => {
                        setFill(e.target.value);
                        updateObject('fill', e.target.value);
                      }}
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Opacity</Label>
                  <div className="flex gap-2 items-center">
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
                    <span className="text-xs w-10 text-right">{opacity}%</span>
                  </div>
                </div>
              </CollapsibleSection>

              {(selectedObject?.type === 'i-text' || selectedObject?.type === 'text' || selectedObject?.type === 'textbox') && (
                <CollapsibleSection title="Typography" icon={<Type className="w-4 h-4" />}>
                  <div>
                    <Label className="text-xs text-muted-foreground">Font Size</Label>
                    <div className="flex gap-2 items-center">
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
                      <span className="text-xs w-10 text-right">{fontSize}px</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Font Family</Label>
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        setFontFamily(e.target.value);
                        updateObject('fontFamily', e.target.value);
                      }}
                      className="w-full h-8 text-sm rounded border border-border px-2 bg-background"
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

              <CollapsibleSection title="Effects" icon={<Sparkles className="w-4 h-4" />} defaultOpen={false}>
                <div className="flex gap-2">
                  <Button
                    variant={isLocked ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setIsLocked(!isLocked);
                      updateObject('lock', !isLocked);
                    }}
                    className="flex-1 h-8"
                  >
                    {isLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                    {isLocked ? 'Locked' : 'Unlocked'}
                  </Button>
                  <Button
                    variant={isVisible ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setIsVisible(!isVisible);
                      updateObject('visible', !isVisible);
                    }}
                    className="flex-1 h-8"
                  >
                    {isVisible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {isVisible ? 'Visible' : 'Hidden'}
                  </Button>
                </div>
              </CollapsibleSection>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No element selected</p>
                <p className="text-xs mt-1">Click an element on the canvas or add a component from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollapsiblePropertiesPanel;
