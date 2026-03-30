/**
 * BusinessSetupSuggestions - AI-powered setup recommendations after template generation
 * 
 * Displays contextual suggestions for:
 * - Connecting services (Stripe, Supabase, email providers)
 * - Configuring business settings
 * - Setting up automations
 * - Optimizing for conversions
 * 
 * Navigates to project-specific setup pages within Unison Tasks Cloud
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Database,
  Mail,
  Calendar,
  Bell,
  Shield,
  Globe,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronRight,
  Rocket,
  Settings,
  ExternalLink,
  Zap,
  Users,
  FileText,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessSystemType } from '@/data/templates/types';

// Setup section mapping for navigation
type SetupSection = 'payments' | 'database' | 'email' | 'calendar' | 'content' | 'domain' | 'analytics' | 'automations';

// Setup suggestion types
interface SetupSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  priority: 'high' | 'medium' | 'low';
  category: 'payments' | 'database' | 'email' | 'automation' | 'security' | 'analytics' | 'content';
  setupSection: SetupSection; // Maps to ProjectSetup section
  action: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  isCompleted?: boolean;
  timeEstimate?: string;
}

interface BusinessSetupSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemType?: BusinessSystemType | null;
  templateName?: string | null;
  projectId?: string | null;
  businessId?: string | null;
  detectedIntents?: string[];
  onNavigateToSettings?: () => void;
  onNavigateToStripe?: () => void;
  onNavigateToSupabase?: () => void;
  onOpenSetupWizard?: () => void;
  onSkip?: () => void;
}

// Industry-specific setup recommendations
const SYSTEM_SUGGESTIONS: Record<string, Partial<SetupSuggestion>[]> = {
  booking: [
    {
      id: 'calendar',
      title: 'Set Up Booking Calendar',
      description: 'Configure your availability, service durations, and booking buffer times',
      icon: Calendar,
      priority: 'high',
      category: 'automation',
      setupSection: 'calendar',
      timeEstimate: '5 min',
    },
    {
      id: 'reminders',
      title: 'Enable Appointment Reminders',
      description: 'Send automatic email/SMS reminders to reduce no-shows',
      icon: Bell,
      priority: 'high',
      category: 'automation',
      setupSection: 'automations',
      timeEstimate: '3 min',
    },
    {
      id: 'payments',
      title: 'Connect Payment Processing',
      description: 'Accept deposits or full payments at booking time with Stripe',
      icon: CreditCard,
      priority: 'high',
      category: 'payments',
      setupSection: 'payments',
      timeEstimate: '10 min',
    },
  ],
  store: [
    {
      id: 'stripe',
      title: 'Connect Stripe for Payments',
      description: 'Accept credit cards, Apple Pay, and Google Pay securely',
      icon: CreditCard,
      priority: 'high',
      category: 'payments',
      setupSection: 'payments',
      timeEstimate: '10 min',
    },
    {
      id: 'inventory',
      title: 'Set Up Product Inventory',
      description: 'Add products with images, pricing, and stock levels',
      icon: FileText,
      priority: 'high',
      category: 'content',
      setupSection: 'content',
      timeEstimate: '15 min',
    },
    {
      id: 'shipping',
      title: 'Configure Shipping Options',
      description: 'Set shipping zones, rates, and delivery estimates',
      icon: Globe,
      priority: 'medium',
      category: 'automation',
      setupSection: 'automations',
      timeEstimate: '10 min',
    },
  ],
  portfolio: [
    {
      id: 'projects',
      title: 'Add Portfolio Projects',
      description: 'Showcase your best work with images, descriptions, and client details',
      icon: FileText,
      priority: 'high',
      category: 'content',
      setupSection: 'content',
      timeEstimate: '20 min',
    },
    {
      id: 'contact',
      title: 'Configure Contact Form',
      description: 'Set up email notifications for new inquiries',
      icon: Mail,
      priority: 'high',
      category: 'email',
      setupSection: 'email',
      timeEstimate: '5 min',
    },
  ],
  agency: [
    {
      id: 'crm',
      title: 'Set Up Lead Management',
      description: 'Track inquiries and manage client relationships with built-in CRM',
      icon: Users,
      priority: 'high',
      category: 'automation',
      setupSection: 'automations',
      timeEstimate: '10 min',
    },
    {
      id: 'listings',
      title: 'Add Property Listings',
      description: 'Create detailed listings with photos, specs, and virtual tours',
      icon: FileText,
      priority: 'high',
      category: 'content',
      setupSection: 'content',
      timeEstimate: '15 min',
    },
  ],
  content: [
    {
      id: 'newsletter',
      title: 'Set Up Newsletter',
      description: 'Collect subscribers and send updates about your mission',
      icon: Mail,
      priority: 'high',
      category: 'email',
      setupSection: 'email',
      timeEstimate: '5 min',
    },
    {
      id: 'donations',
      title: 'Enable Donation Processing',
      description: 'Accept one-time and recurring donations with Stripe',
      icon: CreditCard,
      priority: 'high',
      category: 'payments',
      setupSection: 'payments',
      timeEstimate: '10 min',
    },
  ],
};

// Universal suggestions that apply to all system types
const UNIVERSAL_SUGGESTIONS: Partial<SetupSuggestion>[] = [
  {
    id: 'supabase',
    title: 'Connect Database',
    description: 'Store form submissions, user data, and content in Supabase',
    icon: Database,
    priority: 'high',
    category: 'database',
    setupSection: 'database',
    timeEstimate: '5 min',
  },
  {
    id: 'analytics',
    title: 'Set Up Analytics',
    description: 'Track visitors, conversions, and site performance',
    icon: BarChart3,
    priority: 'medium',
    category: 'analytics',
    setupSection: 'analytics',
    timeEstimate: '5 min',
  },
  {
    id: 'domain',
    title: 'Connect Custom Domain',
    description: 'Use your own domain name for a professional presence',
    icon: Globe,
    priority: 'medium',
    category: 'security',
    setupSection: 'domain',
    timeEstimate: '10 min',
  },
  {
    id: 'ssl',
    title: 'Enable SSL Security',
    description: 'Secure your site with HTTPS (automatic with hosting)',
    icon: Shield,
    priority: 'low',
    category: 'security',
    setupSection: 'domain',
    timeEstimate: '1 min',
    isCompleted: true, // Usually auto-enabled
  },
];

export function BusinessSetupSuggestions({
  open,
  onOpenChange,
  systemType,
  templateName,
  projectId,
  businessId,
  detectedIntents = [],
  onNavigateToSettings,
  onNavigateToStripe,
  onNavigateToSupabase,
  onOpenSetupWizard,
  onSkip,
}: BusinessSetupSuggestionsProps) {
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(['ssl']));

  // Navigate to project-specific setup section
  const navigateToSetup = useCallback((section: SetupSection) => {
    onOpenChange(false); // Close dialog
    if (projectId) {
      // Navigate to project-specific setup page
      navigate(`/project/${projectId}/setup?section=${section}`);
    } else {
      // Fallback to cloud dashboard
      navigate('/cloud', { state: { tab: 'projects' } });
    }
  }, [navigate, onOpenChange, projectId]);

  // Build suggestions based on system type and detected intents
  const suggestions = useMemo(() => {
    const systemSpecific = SYSTEM_SUGGESTIONS[systemType || 'content'] || [];
    const combined = [...systemSpecific, ...UNIVERSAL_SUGGESTIONS];
    
    // Add action handlers
    return combined.map((s) => ({
      ...s,
      id: s.id!,
      title: s.title!,
      description: s.description!,
      icon: s.icon!,
      priority: s.priority || 'medium',
      category: s.category || 'content',
      setupSection: s.setupSection || 'payments',
      isCompleted: completedSteps.has(s.id!) || s.isCompleted,
      action: {
        label: s.isCompleted || completedSteps.has(s.id!) ? 'Completed' : 'Set Up',
        onClick: () => navigateToSetup(s.setupSection || 'payments'),
      },
    })) as SetupSuggestion[];
  }, [systemType, completedSteps, navigateToSetup]);

  // Calculate progress
  const completedCount = suggestions.filter(s => s.isCompleted).length;
  const progress = Math.round((completedCount / suggestions.length) * 100);

  // Group by priority
  const highPriority = suggestions.filter(s => s.priority === 'high' && !s.isCompleted);
  const otherSuggestions = suggestions.filter(s => s.priority !== 'high' || s.isCompleted);

  const handleMarkComplete = (id: string) => {
    setCompletedSteps(prev => new Set([...prev, id]));
  };

  const getCategoryColor = (category: SetupSuggestion['category']) => {
    const colors = {
      payments: 'text-green-500 bg-green-500/10',
      database: 'text-blue-500 bg-blue-500/10',
      email: 'text-purple-500 bg-purple-500/10',
      automation: 'text-orange-500 bg-orange-500/10',
      security: 'text-red-500 bg-red-500/10',
      analytics: 'text-cyan-500 bg-cyan-500/10',
      content: 'text-yellow-500 bg-yellow-500/10',
    };
    return colors[category] || 'text-gray-500 bg-gray-500/10';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-blue-500/10 border-b">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Launch Your {templateName || 'Site'}</DialogTitle>
                <DialogDescription className="mt-1">
                  Complete these setup steps to go live with full functionality
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Setup Progress
              </span>
              <span className="text-sm font-bold text-violet-600">
                {completedCount}/{suggestions.length} complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Suggestions List */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6 space-y-6">
            {/* High Priority Section */}
            {highPriority.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-orange-600">Recommended First</h3>
                </div>
                <div className="space-y-3">
                  {highPriority.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onComplete={() => handleMarkComplete(suggestion.id)}
                      getCategoryColor={getCategoryColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Suggestions */}
            {otherSuggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {highPriority.length > 0 ? 'Additional Setup' : 'Setup Steps'}
                  </h3>
                </div>
                <div className="space-y-3">
                  {otherSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onComplete={() => handleMarkComplete(suggestion.id)}
                      getCategoryColor={getCategoryColor}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              onSkip?.();
              onOpenChange(false);
            }}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (onOpenSetupWizard) {
                  onOpenSetupWizard();
                } else if (projectId) {
                  navigate(`/project/${projectId}/setup`);
                } else {
                  navigate('/cloud', { state: { tab: 'projects' } });
                }
              }}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Full Setup Wizard
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              Continue Editing
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Individual suggestion card component
function SuggestionCard({
  suggestion,
  onComplete,
  getCategoryColor,
  compact = false,
}: {
  suggestion: SetupSuggestion;
  onComplete: () => void;
  getCategoryColor: (category: SetupSuggestion['category']) => string;
  compact?: boolean;
}) {
  const Icon = suggestion.icon;
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        suggestion.isCompleted
          ? "bg-green-50/50 border-green-200/50 opacity-60"
          : "bg-card hover:bg-muted/50 border-border hover:border-primary/20"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "p-2 rounded-lg shrink-0",
        suggestion.isCompleted ? "bg-green-100" : getCategoryColor(suggestion.category)
      )}>
        {suggestion.isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            "text-sm font-medium",
            suggestion.isCompleted && "line-through text-muted-foreground"
          )}>
            {suggestion.title}
          </h4>
          {suggestion.timeEstimate && !suggestion.isCompleted && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              ~{suggestion.timeEstimate}
            </Badge>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {suggestion.description}
          </p>
        )}
      </div>

      {/* Action */}
      {!suggestion.isCompleted && (
        <Button
          variant="ghost"
          size="sm"
          onClick={suggestion.action.onClick}
          className="shrink-0 h-8 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
        >
          {suggestion.action.label}
          <ChevronRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

export default BusinessSetupSuggestions;
