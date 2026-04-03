import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Copy, 
  Sparkles, 
  Square, 
  Type, 
  Palette,
  Layers,
  Code
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const codeExamples = [
  {
    id: 'hero-html',
    title: 'Hero Section (HTML)',
    icon: Layers,
    description: 'Modern hero with gradient background',
    code: `<section class="hero">
  <h1>Build Amazing Products</h1>
  <p>Create stunning web experiences</p>
  <button class="cta">Get Started Free</button>
</section>

<style>
.hero {
  padding: 80px 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
}
.hero h1 {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
.hero p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}
.cta {
  background: white;
  color: #667eea;
  padding: 14px 32px;
  border-radius: 8px;
  border: none;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
}
</style>`
  },
  {
    id: 'pricing-card-html',
    title: 'Pricing Card (HTML)',
    icon: Square,
    description: 'Professional pricing card',
    code: `<div class="pricing-card">
  <div class="badge">Popular</div>
  <h3>Pro Plan</h3>
  <div class="price">
    <span class="amount">$29</span>
    <span class="period">/month</span>
  </div>
  <ul class="features">
    <li>✓ Unlimited projects</li>
    <li>✓ Priority support</li>
    <li>✓ Advanced analytics</li>
  </ul>
  <button class="buy-btn">Choose Plan</button>
</div>

<style>
.pricing-card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  max-width: 320px;
  position: relative;
}
.badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #10b981;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.pricing-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1e293b;
}
.price {
  margin-bottom: 1.5rem;
}
.amount {
  font-size: 3rem;
  font-weight: bold;
  color: #6366f1;
}
.period {
  color: #64748b;
}
.features {
  list-style: none;
  margin-bottom: 1.5rem;
}
.features li {
  padding: 8px 0;
  color: #475569;
}
.buy-btn {
  width: 100%;
  background: #6366f1;
  color: white;
  padding: 12px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}
</style>`
  },
  {
    id: 'feature-section',
    title: 'Feature Grid (HTML)',
    icon: Palette,
    description: 'Feature cards with icons',
    code: `<section class="features">
  <h2>Amazing Features</h2>
  <div class="feature-grid">
    <div class="feature">
      <div class="icon">⚡</div>
      <h3>Lightning Fast</h3>
      <p>Optimized for speed</p>
    </div>
    <div class="feature">
      <div class="icon">🔒</div>
      <h3>Secure</h3>
      <p>Enterprise-grade security</p>
    </div>
    <div class="feature">
      <div class="icon">📱</div>
      <h3>Responsive</h3>
      <p>Works on all devices</p>
    </div>
  </div>
</section>

<style>
.features {
  padding: 60px 20px;
  text-align: center;
}
.features h2 {
  font-size: 2.5rem;
  margin-bottom: 3rem;
  color: #1e293b;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}
.feature {
  padding: 2rem;
  background: #f8fafc;
  border-radius: 12px;
  transition: transform 0.2s;
}
.feature:hover {
  transform: translateY(-4px);
}
.icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.feature h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #334155;
}
.feature p {
  color: #64748b;
}
</style>`
  }
];

interface CanvasQuickStartProps {
  onCodeSelect: (code: string) => void;
  className?: string;
}

export const CanvasQuickStart: React.FC<CanvasQuickStartProps> = ({ 
  onCodeSelect,
  className 
}) => {
  const { toast } = useToast();

  const handleCopy = (code: string, title: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Code copied!',
      description: `${title} example copied to clipboard`,
    });
  };

  const handleUse = (code: string, title: string) => {
    onCodeSelect(code);
    toast({
      title: 'Code loaded!',
      description: `${title} example ready to render`,
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-sm">Component Examples</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Click any example to load it into the editor
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {codeExamples.map((example) => {
            const Icon = example.icon;
            return (
              <Card 
                key={example.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500"
                onClick={() => handleUse(example.code, example.title)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">{example.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(example.code, example.title);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {example.description}
                    </p>
                    <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                      <code className="text-muted-foreground">
                        {example.code.split('\n').slice(0, 3).join('\n')}
                        {example.code.split('\n').length > 3 && '\n...'}
                      </code>
                    </pre>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <div className="text-xs space-y-2">
          <p className="font-semibold flex items-center gap-1">
            <Code className="w-3.5 h-3.5" />
            Supports HTML & React
          </p>
          <p className="text-muted-foreground">
            Generate components that render in both Web Builder and on Canvas
          </p>
        </div>
      </div>
    </div>
  );
};
