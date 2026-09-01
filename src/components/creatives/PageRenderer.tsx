import React, { useState } from 'react';
import { PageSchema, PageSection, PageComponent } from '@/hooks/usePageGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, X } from 'lucide-react';

interface PageRendererProps {
  schema: PageSchema;
  editable?: boolean;
  onUpdate?: (schema: PageSchema) => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({ 
  schema, 
  editable = false,
  onUpdate 
}) => {
  const [localSchema, setLocalSchema] = useState(schema);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);

  const applyTheme = (tokens: PageSchema['themeTokens']) => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --page-primary: ${tokens.primary};
        --page-secondary: ${tokens.secondary};
        --page-accent: ${tokens.accent};
        --page-background: ${tokens.background};
        --page-text: ${tokens.text};
        --page-font-heading: ${tokens.fontHeading};
        --page-font-body: ${tokens.fontBody};
      }
    `;
    return style;
  };

  React.useEffect(() => {
    const styleEl = applyTheme(localSchema.themeTokens);
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [localSchema.themeTokens]);

  const updateContent = (sectionId: string, componentIndex: number, newContent: string) => {
    const newSchema = { ...localSchema };
    const section = newSchema.sections.find(s => s.id === sectionId);
    if (section && section.components[componentIndex]) {
      section.components[componentIndex].content = newContent;
      setLocalSchema(newSchema);
      onUpdate?.(newSchema);
    }
  };

  const renderComponent = (component: PageComponent, sectionId: string, index: number) => {
    const isEditing = editingComponent === `${sectionId}-${index}`;
    const componentId = `${sectionId}-${index}`;

    const baseClasses = component.props?.className || '';

    switch (component.type) {
      case 'heading':
        return (
          <div className="relative group">
            {editable && !isEditing && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingComponent(componentId)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={component.content}
                  onChange={(e) => updateContent(sectionId, index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={() => setEditingComponent(null)}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingComponent(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h1 className={baseClasses} style={{ fontFamily: 'var(--page-font-heading)' }}>
                {component.content}
              </h1>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="relative group">
            {editable && !isEditing && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingComponent(componentId)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {isEditing ? (
              <div className="flex gap-2">
                <Textarea
                  value={component.content}
                  onChange={(e) => updateContent(sectionId, index, e.target.value)}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="icon"
                    onClick={() => setEditingComponent(null)}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingComponent(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className={baseClasses} style={{ fontFamily: 'var(--page-font-body)' }}>
                {component.content}
              </p>
            )}
          </div>
        );

      case 'button':
        return (
          <Button
            className={baseClasses}
            onClick={() => component.props?.href && window.open(component.props.href, '_blank')}
          >
            {component.content}
          </Button>
        );

      case 'image':
        return (
          <img
            src={component.props?.src || 'https://placehold.co/600x400'}
            alt={component.content}
            className={baseClasses}
          />
        );

      case 'grid':
        return (
          <div className={baseClasses}>
            {component.content}
          </div>
        );

      case 'card':
        return (
          <div className={baseClasses}>
            {component.content}
          </div>
        );

      default:
        return <div>{component.content}</div>;
    }
  };

  const renderSection = (section: PageSection) => {
    const containerClass = section.layout === 'container' 
      ? 'container mx-auto px-4' 
      : section.layout === 'split'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
      : 'w-full';

    return (
      <section
        key={section.id}
        className="py-12 md:py-20"
        style={{ backgroundColor: section.backgroundColor }}
      >
        <div className={containerClass}>
          {section.components.map((component, index) => (
            <div key={`${section.id}-${index}`} className="mb-6">
              {renderComponent(component, section.id, index)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--page-font-body)' }}>
      {localSchema.sections.map(renderSection)}
    </div>
  );
};