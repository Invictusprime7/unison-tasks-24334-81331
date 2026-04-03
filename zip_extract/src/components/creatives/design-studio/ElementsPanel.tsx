import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Grid3x3, Square, Circle, Image, Type, Layout, Smartphone, MonitorPlay } from 'lucide-react';

interface ElementsPanelProps {
  onElementSelect: (element: DesignElement) => void;
  onElementDragStart: (element: DesignElement) => void;
}

export interface DesignElement {
  type: 'frame' | 'grid' | 'shape' | 'mockup' | 'text' | 'image';
  variant: string;
  name: string;
  preview?: string;
  config: any;
}

const FRAMES = [
  { 
    variant: 'card-rounded', 
    name: 'Rounded Card',
    config: { width: 300, height: 400, borderRadius: 20, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 2 }
  },
  { 
    variant: 'card-sharp', 
    name: 'Sharp Card',
    config: { width: 300, height: 400, borderRadius: 0, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 2 }
  },
  { 
    variant: 'circle-frame', 
    name: 'Circle Frame',
    config: { radius: 150, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 2 }
  },
  { 
    variant: 'pill-frame', 
    name: 'Pill Frame',
    config: { width: 400, height: 200, borderRadius: 100, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 2 }
  },
];

const GRIDS = [
  { 
    variant: 'grid-2x2', 
    name: '2x2 Grid',
    config: { rows: 2, cols: 2, gap: 10, cellWidth: 150, cellHeight: 150 }
  },
  { 
    variant: 'grid-3x3', 
    name: '3x3 Grid',
    config: { rows: 3, cols: 3, gap: 10, cellWidth: 100, cellHeight: 100 }
  },
  { 
    variant: 'grid-4x3', 
    name: '4x3 Grid',
    config: { rows: 3, cols: 4, gap: 10, cellWidth: 100, cellHeight: 100 }
  },
  { 
    variant: 'masonry', 
    name: 'Masonry Grid',
    config: { cols: 3, gap: 15, cellWidth: 120, heights: [150, 200, 180, 160, 190, 170] }
  },
];

const SHAPES = [
  { 
    variant: 'rectangle', 
    name: 'Rectangle',
    config: { width: 200, height: 150, fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 2 }
  },
  { 
    variant: 'circle', 
    name: 'Circle',
    config: { radius: 100, fill: '#8b5cf6', stroke: '#6d28d9', strokeWidth: 2 }
  },
  { 
    variant: 'triangle', 
    name: 'Triangle',
    config: { width: 200, height: 173, fill: '#ec4899', stroke: '#be185d', strokeWidth: 2 }
  },
  { 
    variant: 'star', 
    name: 'Star',
    config: { points: 5, innerRadius: 50, outerRadius: 100, fill: '#f59e0b', stroke: '#d97706', strokeWidth: 2 }
  },
  { 
    variant: 'hexagon', 
    name: 'Hexagon',
    config: { radius: 100, fill: '#10b981', stroke: '#059669', strokeWidth: 2 }
  },
];

const MOCKUPS = [
  { 
    variant: 'phone', 
    name: 'Phone Mockup',
    config: { width: 180, height: 360, borderRadius: 20, fill: '#1f2937', stroke: '#374151', strokeWidth: 4 }
  },
  { 
    variant: 'laptop', 
    name: 'Laptop Mockup',
    config: { width: 400, height: 250, borderRadius: 10, fill: '#374151', stroke: '#4b5563', strokeWidth: 3 }
  },
  { 
    variant: 'tablet', 
    name: 'Tablet Mockup',
    config: { width: 300, height: 400, borderRadius: 15, fill: '#1f2937', stroke: '#374151', strokeWidth: 4 }
  },
  { 
    variant: 'desktop', 
    name: 'Desktop Mockup',
    config: { width: 500, height: 320, borderRadius: 5, fill: '#111827', stroke: '#1f2937', strokeWidth: 2 }
  },
];

export const ElementsPanel = ({ onElementSelect, onElementDragStart }: ElementsPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'frames' | 'grids' | 'shapes' | 'mockups'>('frames');

  const handleDragStart = (element: DesignElement, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(element));
    onElementDragStart(element);
  };

  const renderElementPreview = (element: DesignElement) => {
    const baseClass = "w-full h-20 rounded-lg border-2 border-gray-300 cursor-move transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/50 shadow-blue-400/20";
    
    switch (element.type) {
      case 'frame':
        if (element.variant.includes('circle')) {
          return <div className={`${baseClass} bg-gray-50 flex items-center justify-center`}>
            <div className="w-12 h-12 rounded-full border-2 border-gray-400" />
          </div>;
        }
        return <div className={`${baseClass} bg-gray-50 flex items-center justify-center`}>
          <div className={`w-16 h-16 ${element.variant.includes('rounded') ? 'rounded-lg' : 'rounded-none'} border-2 border-gray-400`} />
        </div>;
      
      case 'grid': {
        const gridCols = element.config.cols || 2;
        return <div className={`${baseClass} bg-gray-50 p-2`}>
          <div className={`grid grid-cols-${gridCols} gap-1 h-full`}>
            {Array(gridCols * (element.config.rows || 2)).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-300 rounded" />
            ))}
          </div>
        </div>;
      }
      
      case 'shape':
        return <div className={`${baseClass} bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center`}>
          {element.variant === 'circle' && <Circle className="w-8 h-8 text-purple-600" fill="currentColor" />}
          {element.variant === 'rectangle' && <Square className="w-8 h-8 text-blue-600" fill="currentColor" />}
          {element.variant === 'triangle' && <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[28px] border-l-transparent border-r-transparent border-b-pink-600" />}
          {element.variant === 'star' && <span className="text-3xl text-amber-600">★</span>}
          {element.variant === 'hexagon' && <span className="text-3xl text-emerald-600">⬡</span>}
        </div>;
      
      case 'mockup':
        return <div className={`${baseClass} bg-gray-50 flex items-center justify-center`}>
          {element.variant === 'phone' && <Smartphone className="w-8 h-8 text-gray-500" />}
          {element.variant === 'laptop' && <MonitorPlay className="w-8 h-8 text-gray-500" />}
          {element.variant === 'tablet' && <Smartphone className="w-10 h-10 text-gray-500" />}
          {element.variant === 'desktop' && <MonitorPlay className="w-10 h-10 text-gray-500" />}
        </div>;
      
      default:
        return <div className={baseClass} />;
    }
  };

  const categories = [
    { id: 'frames' as const, label: 'Frames', icon: Layout, items: FRAMES },
    { id: 'grids' as const, label: 'Grids', icon: Grid3x3, items: GRIDS },
    { id: 'shapes' as const, label: 'Shapes', icon: Circle, items: SHAPES },
    { id: 'mockups' as const, label: 'Mockups', icon: Smartphone, items: MOCKUPS },
  ];

  const currentItems = categories.find(c => c.id === activeCategory)?.items || [];
  const filteredItems = currentItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search elements"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border text-sm h-9 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </div>

        {/* Category Dropdown */}
        <Select
          value={activeCategory}
          onValueChange={(value: any) => setActiveCategory(value)}
        >
          <SelectTrigger className="w-full bg-secondary border-border h-9 text-sm text-foreground">
            <SelectValue placeholder="Select category">
              {(() => {
                const currentCategory = categories.find(c => c.id === activeCategory);
                if (!currentCategory) return "Select category";
                const Icon = currentCategory.icon;
                return (
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon className="w-4 h-4" />
                    <span className="text-foreground">{currentCategory.label}</span>
                  </div>
                );
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            {categories.map(({ id, label, icon: Icon }) => (
              <SelectItem 
                key={id} 
                value={id}
                className="text-sm text-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center gap-2 text-foreground">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Elements Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-3">
          {filteredItems.map((item, index) => {
            const element: DesignElement = {
              type: activeCategory === 'frames' ? 'frame' : 
                    activeCategory === 'grids' ? 'grid' : 
                    activeCategory === 'shapes' ? 'shape' : 'mockup',
              variant: item.variant,
              name: item.name,
              config: item.config,
            };

            return (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(element, e)}
                onClick={() => onElementSelect(element)}
                className="group"
              >
                {renderElementPreview(element)}
                <p className="text-xs text-purple-300/70 mt-1 text-center group-hover:text-purple-200 transition-colors">
                  {item.name}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
