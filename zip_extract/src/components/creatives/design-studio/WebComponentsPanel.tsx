import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, MousePointer2, Type, Image as ImageIcon, Layout, 
  Navigation, Menu, Smartphone, Mail, MapPin, Calendar,
  Star, ShoppingCart, CreditCard, User, MessageSquare,
  Video, FileText, Download, Upload, Share2, Zap
} from 'lucide-react';

interface WebComponentsPanelProps {
  onComponentSelect: (component: WebComponent) => void;
}

export interface WebComponent {
  category: 'buttons' | 'inputs' | 'navigation' | 'cards' | 'forms' | 'sections' | 'icons';
  type: string;
  name: string;
  preview: string;
  config: any;
}

// Professional Web Components Library
const BUTTONS = [
  {
    type: 'primary-btn',
    name: 'Primary Button',
    preview: 'CTA',
    config: {
      text: 'Get Started',
      width: 200,
      height: 48,
      fill: '#3b82f6',
      textColor: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      borderRadius: 8,
    }
  },
  {
    type: 'secondary-btn',
    name: 'Secondary Button',
    preview: 'Link',
    config: {
      text: 'Learn More',
      width: 180,
      height: 44,
      fill: 'transparent',
      stroke: '#3b82f6',
      strokeWidth: 2,
      textColor: '#3b82f6',
      fontSize: 15,
      borderRadius: 8,
    }
  },
  {
    type: 'icon-btn',
    name: 'Icon Button',
    preview: '→',
    config: {
      text: '→',
      width: 48,
      height: 48,
      fill: '#10b981',
      textColor: '#ffffff',
      fontSize: 24,
      borderRadius: 24,
    }
  },
  {
    type: 'pill-btn',
    name: 'Pill Button',
    preview: 'Buy Now',
    config: {
      text: 'Buy Now',
      width: 160,
      height: 40,
      fill: '#8b5cf6',
      textColor: '#ffffff',
      fontSize: 14,
      borderRadius: 20,
    }
  },
  {
    type: 'gradient-btn',
    name: 'Gradient Button',
    preview: 'Explore',
    config: {
      text: 'Explore',
      width: 180,
      height: 48,
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      borderRadius: 12,
    }
  },
  {
    type: 'ghost-btn',
    name: 'Ghost Button',
    preview: 'Cancel',
    config: {
      text: 'Cancel',
      width: 140,
      height: 42,
      fill: 'transparent',
      textColor: '#6b7280',
      fontSize: 14,
      borderRadius: 8,
    }
  },
  {
    type: 'danger-btn',
    name: 'Danger Button',
    preview: 'Delete',
    config: {
      text: 'Delete',
      width: 160,
      height: 44,
      fill: '#ef4444',
      textColor: '#ffffff',
      fontSize: 15,
      fontWeight: 'bold',
      borderRadius: 8,
    }
  },
  {
    type: 'success-btn',
    name: 'Success Button',
    preview: 'Confirm',
    config: {
      text: 'Confirm',
      width: 160,
      height: 44,
      fill: '#10b981',
      textColor: '#ffffff',
      fontSize: 15,
      fontWeight: 'bold',
      borderRadius: 8,
    }
  },
];

const INPUTS = [
  {
    type: 'text-input',
    name: 'Text Field',
    preview: 'Email',
    config: {
      placeholder: 'Enter your email',
      width: 300,
      height: 48,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      textColor: '#1f2937',
      fontSize: 14,
      borderRadius: 8,
    }
  },
  {
    type: 'search-input',
    name: 'Search Bar',
    preview: '🔍',
    config: {
      placeholder: 'Search...',
      width: 320,
      height: 44,
      fill: '#f9fafb',
      stroke: '#d1d5db',
      strokeWidth: 1,
      textColor: '#6b7280',
      fontSize: 14,
      borderRadius: 12,
    }
  },
  {
    type: 'textarea',
    name: 'Text Area',
    preview: 'Text',
    config: {
      placeholder: 'Your message...',
      width: 400,
      height: 120,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      textColor: '#1f2937',
      fontSize: 14,
      borderRadius: 8,
    }
  },
];

const CARDS = [
  {
    type: 'feature-card',
    name: 'Feature Card',
    preview: 'Card',
    config: {
      width: 320,
      height: 200,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 16,
      shadow: '0 4px 6px rgba(0,0,0,0.1)',
    }
  },
  {
    type: 'pricing-card',
    name: 'Pricing Card',
    preview: '$29',
    config: {
      width: 280,
      height: 360,
      fill: '#ffffff',
      stroke: '#3b82f6',
      strokeWidth: 2,
      borderRadius: 12,
      shadow: '0 10px 15px rgba(59,130,246,0.2)',
    }
  },
  {
    type: 'testimonial-card',
    name: 'Testimonial',
    preview: '★★★★★',
    config: {
      width: 340,
      height: 180,
      fill: '#f9fafb',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 12,
    }
  },
  {
    type: 'product-card',
    name: 'Product Card',
    preview: '🛍️',
    config: {
      width: 260,
      height: 340,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 16,
      shadow: '0 4px 8px rgba(0,0,0,0.08)',
    }
  },
  {
    type: 'blog-card',
    name: 'Blog Card',
    preview: '📝',
    config: {
      width: 360,
      height: 280,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 12,
      shadow: '0 2px 8px rgba(0,0,0,0.1)',
    }
  },
  {
    type: 'team-card',
    name: 'Team Member',
    preview: '👤',
    config: {
      width: 300,
      height: 340,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 16,
      shadow: '0 4px 12px rgba(0,0,0,0.08)',
    }
  },
  {
    type: 'stats-card',
    name: 'Stats Card',
    preview: '📊',
    config: {
      width: 240,
      height: 160,
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: 12,
      shadow: '0 8px 16px rgba(102,126,234,0.3)',
    }
  },
  {
    type: 'image-card',
    name: 'Image Card',
    preview: '🖼️',
    config: {
      width: 320,
      height: 420,
      fill: '#000000',
      borderRadius: 12,
      shadow: '0 4px 12px rgba(0,0,0,0.15)',
    }
  },
];

const SECTIONS = [
  {
    type: 'hero-section',
    name: 'Hero Section',
    preview: 'Hero',
    config: {
      width: 1200,
      height: 500,
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: 0,
    }
  },
  {
    type: 'feature-section',
    name: 'Features Grid',
    preview: 'Grid',
    config: {
      width: 1200,
      height: 400,
      fill: '#ffffff',
      borderRadius: 0,
    }
  },
  {
    type: 'cta-section',
    name: 'CTA Section',
    preview: 'CTA',
    config: {
      width: 1200,
      height: 300,
      fill: '#1f2937',
      borderRadius: 0,
    }
  },
  {
    type: 'footer-section',
    name: 'Footer',
    preview: 'Footer',
    config: {
      width: 1200,
      height: 250,
      fill: '#111827',
      borderRadius: 0,
    }
  },
  {
    type: 'about-section',
    name: 'About Section',
    preview: 'About',
    config: {
      width: 1200,
      height: 450,
      fill: '#f9fafb',
      borderRadius: 0,
    }
  },
  {
    type: 'pricing-section',
    name: 'Pricing Section',
    preview: '💰',
    config: {
      width: 1200,
      height: 500,
      fill: '#ffffff',
      borderRadius: 0,
    }
  },
  {
    type: 'testimonial-section',
    name: 'Testimonials',
    preview: '💬',
    config: {
      width: 1200,
      height: 400,
      fill: '#f3f4f6',
      borderRadius: 0,
    }
  },
  {
    type: 'gallery-section',
    name: 'Gallery',
    preview: '🖼️',
    config: {
      width: 1200,
      height: 450,
      fill: '#000000',
      borderRadius: 0,
    }
  },
];

const NAVIGATION = [
  {
    type: 'navbar',
    name: 'Navigation Bar',
    preview: 'Nav',
    config: {
      width: 1200,
      height: 64,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 0,
    }
  },
  {
    type: 'sidebar',
    name: 'Sidebar Menu',
    preview: '☰',
    config: {
      width: 280,
      height: 600,
      fill: '#1f2937',
      borderRadius: 0,
    }
  },
  {
    type: 'breadcrumb',
    name: 'Breadcrumb',
    preview: 'Home > ...',
    config: {
      width: 400,
      height: 32,
      fill: 'transparent',
      textColor: '#6b7280',
      fontSize: 14,
    }
  },
];

const FORM_ELEMENTS = [
  {
    type: 'contact-form',
    name: 'Contact Form',
    preview: '📧',
    config: {
      width: 500,
      height: 400,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 12,
    }
  },
  {
    type: 'login-form',
    name: 'Login Form',
    preview: '👤',
    config: {
      width: 380,
      height: 320,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      borderRadius: 16,
    }
  },
  {
    type: 'newsletter-form',
    name: 'Newsletter',
    preview: '✉️',
    config: {
      width: 600,
      height: 80,
      fill: '#f9fafb',
      borderRadius: 12,
    }
  },
];

const ICONS = [
  { type: 'mail-icon', name: 'Email', preview: '✉️', icon: Mail, config: { width: 32, height: 32, fill: '#3b82f6' } },
  { type: 'phone-icon', name: 'Phone', preview: '📱', icon: Smartphone, config: { width: 32, height: 32, fill: '#10b981' } },
  { type: 'location-icon', name: 'Location', preview: '📍', icon: MapPin, config: { width: 32, height: 32, fill: '#ef4444' } },
  { type: 'calendar-icon', name: 'Calendar', preview: '📅', icon: Calendar, config: { width: 32, height: 32, fill: '#8b5cf6' } },
  { type: 'star-icon', name: 'Star', preview: '⭐', icon: Star, config: { width: 32, height: 32, fill: '#f59e0b' } },
  { type: 'cart-icon', name: 'Cart', preview: '🛒', icon: ShoppingCart, config: { width: 32, height: 32, fill: '#06b6d4' } },
  { type: 'user-icon', name: 'User', preview: '👤', icon: User, config: { width: 32, height: 32, fill: '#6b7280' } },
  { type: 'message-icon', name: 'Message', preview: '💬', icon: MessageSquare, config: { width: 32, height: 32, fill: '#ec4899' } },
  { type: 'video-icon', name: 'Video', preview: '📹', icon: Video, config: { width: 32, height: 32, fill: '#f97316' } },
  { type: 'file-icon', name: 'File', preview: '📄', icon: FileText, config: { width: 32, height: 32, fill: '#64748b' } },
  { type: 'download-icon', name: 'Download', preview: '⬇️', icon: Download, config: { width: 32, height: 32, fill: '#22c55e' } },
  { type: 'upload-icon', name: 'Upload', preview: '⬆️', icon: Upload, config: { width: 32, height: 32, fill: '#3b82f6' } },
  { type: 'share-icon', name: 'Share', preview: '🔗', icon: Share2, config: { width: 32, height: 32, fill: '#06b6d4' } },
  { type: 'zap-icon', name: 'Zap', preview: '⚡', icon: Zap, config: { width: 32, height: 32, fill: '#eab308' } },
  { type: 'payment-icon', name: 'Payment', preview: '💳', icon: CreditCard, config: { width: 32, height: 32, fill: '#10b981' } },
];

export const WebComponentsPanel = ({ onComponentSelect }: WebComponentsPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'buttons' | 'inputs' | 'cards' | 'sections' | 'navigation' | 'forms' | 'icons'>('buttons');

  const categories = [
    { id: 'buttons' as const, label: 'Buttons', items: BUTTONS, icon: MousePointer2 },
    { id: 'inputs' as const, label: 'Inputs', items: INPUTS, icon: Type },
    { id: 'cards' as const, label: 'Cards', items: CARDS, icon: Layout },
    { id: 'sections' as const, label: 'Sections', items: SECTIONS, icon: Layout },
    { id: 'navigation' as const, label: 'Navigation', items: NAVIGATION, icon: Navigation },
    { id: 'forms' as const, label: 'Forms', items: FORM_ELEMENTS, icon: FileText },
    { id: 'icons' as const, label: 'Icons', items: ICONS, icon: Zap },
  ];

  const currentCategory = categories.find(c => c.id === activeTab);
  const currentItems = currentCategory?.items || [];
  const filteredItems = currentItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderComponentPreview = (item: any, category: string) => {
    const baseClass = "w-full h-20 rounded-lg border-2 border-gray-300 cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/50 shadow-blue-400/20 flex items-center justify-center text-sm font-medium";

    if (category === 'buttons') {
      return (
        <div className={`${baseClass} ${item.config.fill !== 'transparent' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' : 'bg-white text-blue-600 border-blue-500'}`}>
          {item.preview}
        </div>
      );
    }

    if (category === 'inputs') {
      return (
        <div className={`${baseClass} bg-white`}>
          <div className="w-full px-3 py-2 border border-gray-300 rounded text-xs text-gray-400">
            {item.preview}
          </div>
        </div>
      );
    }

    if (category === 'cards') {
      return (
        <div className={`${baseClass} bg-gradient-to-br from-gray-50 to-gray-100`}>
          <div className="text-2xl">{item.preview}</div>
        </div>
      );
    }

    if (category === 'sections') {
      return (
        <div className={`${baseClass} bg-gradient-to-r from-purple-500 to-indigo-600 text-white`}>
          {item.preview}
        </div>
      );
    }

    if (category === 'icons') {
      const IconComponent = item.icon;
      return (
        <div className={`${baseClass} bg-gray-50`}>
          <IconComponent className="w-8 h-8 text-blue-600" />
        </div>
      );
    }

    return <div className={baseClass}>{item.preview}</div>;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-gray-300 text-sm h-9 text-gray-900"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4 gap-1 p-2 bg-gray-50 border-b border-gray-200">
          <TabsTrigger value="buttons" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Buttons
          </TabsTrigger>
          <TabsTrigger value="inputs" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Inputs
          </TabsTrigger>
          <TabsTrigger value="cards" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Cards
          </TabsTrigger>
          <TabsTrigger value="sections" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Sections
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="buttons" className="p-3 m-0">
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onComponentSelect({
                    category: 'buttons',
                    type: item.type,
                    name: item.name,
                    preview: item.preview,
                    config: item.config,
                  })}
                  className="group"
                >
                  {renderComponentPreview(item, 'buttons')}
                  <p className="text-xs text-gray-500 mt-1 text-center group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inputs" className="p-3 m-0">
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onComponentSelect({
                    category: 'inputs',
                    type: item.type,
                    name: item.name,
                    preview: item.preview,
                    config: item.config,
                  })}
                  className="group"
                >
                  {renderComponentPreview(item, 'inputs')}
                  <p className="text-xs text-gray-500 mt-1 text-center group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cards" className="p-3 m-0">
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onComponentSelect({
                    category: 'cards',
                    type: item.type,
                    name: item.name,
                    preview: item.preview,
                    config: item.config,
                  })}
                  className="group"
                >
                  {renderComponentPreview(item, 'cards')}
                  <p className="text-xs text-gray-500 mt-1 text-center group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sections" className="p-3 m-0">
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onComponentSelect({
                    category: 'sections',
                    type: item.type,
                    name: item.name,
                    preview: item.preview,
                    config: item.config,
                  })}
                  className="group"
                >
                  {renderComponentPreview(item, 'sections')}
                  <p className="text-xs text-gray-500 mt-1 text-center group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};