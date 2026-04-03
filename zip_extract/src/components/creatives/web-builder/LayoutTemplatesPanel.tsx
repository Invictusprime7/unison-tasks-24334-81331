import React, { useState, useMemo } from 'react';
import { Layout, Search, Zap, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  layoutTemplates,
  getTemplatesByCategory,
  searchTemplates,
  getAllCategories,
  businessSystems,
  getSystemContract,
  type LayoutCategory,
  type LayoutTemplate,
  type BusinessSystemType,
} from '@/data/layoutTemplates';
import { TemplateDetailCard } from '@/components/web-builder/TemplateDetailCard';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface LayoutTemplatesPanelProps {
  onSelectTemplate: (
    code: string,
    name: string,
    systemType?: BusinessSystemType,
    templateId?: string
  ) => void;
  onDemoTemplate?: (
    code: string,
    name: string,
    systemType?: BusinessSystemType,
    templateId?: string
  ) => void;
  previewDevice?: PreviewDevice;
  previewWidth?: string;
}

const categoryLabels: Record<LayoutCategory, string> = {
  salon: 'Salon & Spa',
  landing: 'Landing Pages',
  restaurant: 'Restaurant',
  contractor: 'Contractor',
  portfolio: 'Portfolio',
  agency: 'Agency',
  store: 'Store',
  saas: 'SaaS',
  content: 'Content & Blog',
  coaching: 'Coaching',
  realestate: 'Real Estate',
  nonprofit: 'Nonprofit',
};

const categoryIcons: Record<LayoutCategory, string> = {
  salon: '💅',
  landing: '🚀',
  restaurant: '🍽️',
  contractor: '🔧',
  portfolio: '🎨',
  agency: '🏢',
  store: '🛍️',
  saas: '💻',
  content: '📝',
  coaching: '🎯',
  realestate: '🏠',
  nonprofit: '💚',
};

export const LayoutTemplatesPanel: React.FC<LayoutTemplatesPanelProps> = ({
  onSelectTemplate,
  onDemoTemplate,
  previewDevice = 'desktop',
  previewWidth = '100%',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LayoutCategory | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<BusinessSystemType | null>(null);
  const [viewMode, setViewMode] = useState<'systems' | 'categories'>('systems');

  const featuredEditorialLanding = useMemo(() => {
    return layoutTemplates
      .filter((t) => t.category === 'landing' && (t.tags || []).includes('editorial'))
      .slice(0, 3);
  }, []);

  const categories = getAllCategories();
  
  const filteredTemplates = useMemo(() => {
    if (searchQuery) {
      return searchTemplates(searchQuery);
    }
    if (selectedSystem) {
      const system = businessSystems.find(s => s.id === selectedSystem);
      if (system) {
        return layoutTemplates.filter(t => system.templateCategories.includes(t.category));
      }
    }
    if (selectedCategory) {
      return getTemplatesByCategory(selectedCategory);
    }
    return layoutTemplates;
  }, [searchQuery, selectedSystem, selectedCategory]);

  const handleTemplateClick = (template: LayoutTemplate) => {
    const system = businessSystems.find(s => s.templateCategories.includes(template.category));
    onSelectTemplate(template.code, template.name, system?.id, template.id);
    toast.success(`Loaded: ${template.name}`);
  };

  const handleDemoClick = (template: LayoutTemplate) => {
    const system = businessSystems.find(s => s.templateCategories.includes(template.category));
    onDemoTemplate?.(template.code, template.name, system?.id, template.id);
    toast.info(`Demo mode: ${template.name} - Interactions return mock responses`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Launch Library</h3>
          </div>
          {/* View Toggle */}
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'systems' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                setViewMode('systems');
                setSelectedCategory(null);
              }}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Systems
            </Button>
            <Button
              variant={viewMode === 'categories' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                setViewMode('categories');
                setSelectedSystem(null);
              }}
            >
              Categories
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
      </div>

      {/* Systems or Categories Filter */}
      {!searchQuery && (
        <div className="p-3 border-b border-border">
          <ScrollArea className="w-full">
            {viewMode === 'systems' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSystem === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSystem(null)}
                  className="h-7 text-xs"
                >
                  All Systems
                </Button>
                {businessSystems.map((system) => {
                  const contract = getSystemContract(system.id);
                  const intentCount = contract?.requiredIntents.length || 0;
                  return (
                    <Button
                      key={system.id}
                      variant={selectedSystem === system.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSystem(system.id)}
                      className="h-7 text-xs"
                    >
                      <span className="mr-1">{system.icon}</span>
                      {system.name}
                      <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 h-4">
                        {intentCount} intents
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="h-7 text-xs"
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="h-7 text-xs"
                  >
                    <span className="mr-1">{categoryIcons[category]}</span>
                    {categoryLabels[category]}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* System Info Banner */}
      {selectedSystem && (
        <div className="p-3 border-b border-border bg-primary/5">
          {(() => {
            const system = businessSystems.find(s => s.id === selectedSystem);
            const contract = getSystemContract(selectedSystem);
            if (!system) return null;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{system.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium">{system.name}</h4>
                    <p className="text-xs text-muted-foreground">{system.tagline}</p>
                  </div>
                </div>
                {contract && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Pre-wired:</span>
                    {contract.requiredIntents.slice(0, 3).map(intent => (
                      <Badge key={intent} variant="secondary" className="text-[10px] px-1.5 py-0">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-primary" />
                        {intent.split('.')[1]}
                      </Badge>
                    ))}
                    {contract.requiredIntents.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +{contract.requiredIntents.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Templates List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Featured: Editorial Landing */}
          {!searchQuery && !selectedSystem && !selectedCategory && featuredEditorialLanding.length > 0 && (
            <Card className="border-border/60 bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        Featured
                      </Badge>
                      <h4 className="text-sm font-semibold truncate">Editorial Landing</h4>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      3 unique editorial starts (SaaS / Agency / Content) with standardized CTA + intent wiring.
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-0.5">
                    Landing
                  </Badge>
                </div>

                <div className="mt-3 grid gap-2">
                  {featuredEditorialLanding.map((template) => (
                    <TemplateDetailCard
                      key={template.id}
                      template={template}
                      onSelect={handleTemplateClick}
                      onDemo={onDemoTemplate ? handleDemoClick : undefined}
                      showDemoButton={!!onDemoTemplate}
                      previewDevice={previewDevice}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Layout className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No templates found</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <TemplateDetailCard
                key={template.id}
                template={template}
                onSelect={handleTemplateClick}
                onDemo={onDemoTemplate ? handleDemoClick : undefined}
                showDemoButton={!!onDemoTemplate}
                previewDevice={previewDevice}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
