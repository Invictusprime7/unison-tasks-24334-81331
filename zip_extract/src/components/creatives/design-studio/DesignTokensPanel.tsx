import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Ruler, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

interface DesignTokensPanelProps {
  onTokensUpdate?: (tokens: DesignTokens) => void;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  theme: 'light' | 'dark';
}

const defaultTokens: DesignTokens = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#10b981',
    background: '#ffffff',
    text: '#1f2937',
    border: '#e5e7eb',
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'Monaco, monospace',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  theme: 'light',
};

export const DesignTokensPanel = ({ onTokensUpdate }: DesignTokensPanelProps) => {
  const [tokens, setTokens] = useState<DesignTokens>(defaultTokens);

  const updateColor = (key: keyof DesignTokens['colors'], value: string) => {
    const newTokens = {
      ...tokens,
      colors: { ...tokens.colors, [key]: value },
    };
    setTokens(newTokens);
    onTokensUpdate?.(newTokens);
  };

  const updateFont = (key: keyof DesignTokens['fonts'], value: string) => {
    const newTokens = {
      ...tokens,
      fonts: { ...tokens.fonts, [key]: value },
    };
    setTokens(newTokens);
    onTokensUpdate?.(newTokens);
  };

  const updateSpacing = (key: keyof DesignTokens['spacing'], value: string) => {
    const newTokens = {
      ...tokens,
      spacing: { ...tokens.spacing, [key]: value },
    };
    setTokens(newTokens);
    onTokensUpdate?.(newTokens);
  };

  const toggleTheme = () => {
    const newTheme: 'light' | 'dark' = tokens.theme === 'light' ? 'dark' : 'light';
    const newTokens: DesignTokens = {
      ...tokens,
      theme: newTheme,
      colors: newTheme === 'dark' ? {
        ...tokens.colors,
        background: '#1f2937',
        text: '#f9fafb',
        border: '#374151',
      } : {
        ...tokens.colors,
        background: '#ffffff',
        text: '#1f2937',
        border: '#e5e7eb',
      },
    };
    setTokens(newTokens);
    onTokensUpdate?.(newTokens);
    toast.success(`Switched to ${newTheme} mode`);
  };

  const generateCSS = () => {
    const css = `:root {
  /* Colors */
  --color-primary: ${tokens.colors.primary};
  --color-secondary: ${tokens.colors.secondary};
  --color-accent: ${tokens.colors.accent};
  --color-background: ${tokens.colors.background};
  --color-text: ${tokens.colors.text};
  --color-border: ${tokens.colors.border};
  
  /* Fonts */
  --font-heading: ${tokens.fonts.heading};
  --font-body: ${tokens.fonts.body};
  --font-mono: ${tokens.fonts.mono};
  
  /* Spacing */
  --spacing-xs: ${tokens.spacing.xs};
  --spacing-sm: ${tokens.spacing.sm};
  --spacing-md: ${tokens.spacing.md};
  --spacing-lg: ${tokens.spacing.lg};
  --spacing-xl: ${tokens.spacing.xl};
}`;
    
    navigator.clipboard.writeText(css);
    toast.success("CSS variables copied to clipboard");
  };

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Design Tokens</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleTheme}
          className="h-8 w-8 p-0"
        >
          {tokens.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>

      <Tabs defaultValue="colors" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="colors" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="fonts" className="text-xs">
            <Type className="h-3 w-3 mr-1" />
            Fonts
          </TabsTrigger>
          <TabsTrigger value="spacing" className="text-xs">
            <Ruler className="h-3 w-3 mr-1" />
            Spacing
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="colors" className="p-3 space-y-3 m-0">
            {Object.entries(tokens.colors).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs capitalize">{key}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={value}
                    onChange={(e) => updateColor(key as keyof DesignTokens['colors'], e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => updateColor(key as keyof DesignTokens['colors'], e.target.value)}
                    className="flex-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="fonts" className="p-3 space-y-3 m-0">
            {Object.entries(tokens.fonts).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs capitalize">{key}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => updateFont(key as keyof DesignTokens['fonts'], e.target.value)}
                  className="h-9 text-xs"
                  placeholder="Font family"
                />
              </div>
            ))}
            <div className="pt-2 text-xs text-muted-foreground">
              <p>Examples:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Inter, sans-serif</li>
                <li>Playfair Display, serif</li>
                <li>Roboto Mono, monospace</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="spacing" className="p-3 space-y-3 m-0">
            {Object.entries(tokens.spacing).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs uppercase">{key}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => updateSpacing(key as keyof DesignTokens['spacing'], e.target.value)}
                  className="h-9 text-xs font-mono"
                  placeholder="e.g., 16px, 1rem"
                />
              </div>
            ))}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="p-3 border-t">
        <Button onClick={generateCSS} size="sm" className="w-full">
          Copy CSS Variables
        </Button>
      </div>
    </div>
  );
};
