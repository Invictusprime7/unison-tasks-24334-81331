/**
 * PROJECT SETUP - Guided setup flow for business projects
 * 
 * Provides contextual setup steps for:
 * - Payments (Stripe configuration)
 * - Database (Supabase tables)
 * - Email (Notifications & templates)
 * - Calendar (Booking/scheduling)
 * - Content (Products, services, portfolio)
 * - Domain (Custom domain setup)
 * - Analytics (Tracking setup)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, CreditCard, Database, Mail, Calendar, FileText,
  Globe, BarChart3, Shield, CheckCircle2, Circle, Rocket,
  Sparkles, ChevronRight, ExternalLink, Settings, Zap, Bell,
  Users, Palette, Code, Loader2, AlertCircle, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { BusinessSystemType } from '@/data/templates/types';
import { getProjectByIdCompat } from '@/services/projectSchemaCompat';

// Setup section types
type SetupSection = 'payments' | 'database' | 'email' | 'calendar' | 'content' | 'domain' | 'analytics' | 'automations';

interface SetupConfig {
  id: SetupSection;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  requiredFor: BusinessSystemType[];
  estimatedTime: string;
  dependencies?: SetupSection[];
}

const SETUP_SECTIONS: SetupConfig[] = [
  {
    id: 'payments',
    title: 'Payment Processing',
    description: 'Connect Stripe to accept payments, subscriptions, and donations',
    icon: CreditCard,
    gradient: 'from-green-500 to-emerald-600',
    requiredFor: ['store', 'booking', 'saas', 'content', 'agency'],
    estimatedTime: '10 min',
  },
  {
    id: 'database',
    title: 'Database Setup',
    description: 'Configure Supabase tables for your data management needs',
    icon: Database,
    gradient: 'from-blue-500 to-cyan-600',
    requiredFor: ['store', 'booking', 'saas', 'agency', 'portfolio'],
    estimatedTime: '5 min',
    dependencies: [],
  },
  {
    id: 'email',
    title: 'Email Notifications',
    description: 'Set up transactional emails, templates, and notification preferences',
    icon: Mail,
    gradient: 'from-purple-500 to-violet-600',
    requiredFor: ['booking', 'store', 'saas', 'agency', 'content'],
    estimatedTime: '8 min',
  },
  {
    id: 'calendar',
    title: 'Calendar & Scheduling',
    description: 'Configure availability, booking rules, and appointment reminders',
    icon: Calendar,
    gradient: 'from-orange-500 to-amber-600',
    requiredFor: ['booking', 'saas'],
    estimatedTime: '10 min',
    dependencies: ['database'],
  },
  {
    id: 'content',
    title: 'Content Management',
    description: 'Add products, services, portfolio items, or other business content',
    icon: FileText,
    gradient: 'from-pink-500 to-rose-600',
    requiredFor: ['store', 'portfolio', 'agency', 'saas'],
    estimatedTime: '15 min',
    dependencies: ['database'],
  },
  {
    id: 'domain',
    title: 'Custom Domain',
    description: 'Connect your own domain name for a professional web presence',
    icon: Globe,
    gradient: 'from-violet-500 to-indigo-600',
    requiredFor: ['store', 'booking', 'portfolio', 'agency', 'saas', 'content'],
    estimatedTime: '15 min',
    dependencies: [],
  },
  {
    id: 'analytics',
    title: 'Analytics & Tracking',
    description: 'Add Google Analytics, conversion tracking, and performance monitoring',
    icon: BarChart3,
    gradient: 'from-cyan-500 to-teal-600',
    requiredFor: ['store', 'booking', 'portfolio', 'agency'],
    estimatedTime: '5 min',
    dependencies: ['domain'],
  },
  {
    id: 'automations',
    title: 'Automations & Workflows',
    description: 'Set up automated actions, notifications, and business workflows',
    icon: Zap,
    gradient: 'from-yellow-500 to-orange-600',
    requiredFor: ['booking', 'store', 'agency', 'saas'],
    estimatedTime: '12 min',
    dependencies: ['database', 'email'],
  },
];

interface ProjectData {
  id: string;
  name: string;
  slug?: string;
  template_type?: string;
  business_id?: string;
  settings?: Record<string, any>;
  created_at?: string;
}

interface BusinessData {
  id: string;
  name: string;
  industry?: string;
  settings?: Record<string, any>;
}

export default function ProjectSetup() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get initial section from URL params
  const initialSection = (searchParams.get('section') as SetupSection) || 'payments';
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SetupSection>(initialSection);
  const [completedSections, setCompletedSections] = useState<Set<SetupSection>>(new Set());
  const [saving, setSaving] = useState(false);

  // System type for contextual suggestions
  const systemType = useMemo(() => {
    return (project?.template_type as BusinessSystemType) || 'store';
  }, [project?.template_type]);

  // Filter sections relevant to this system type
  const relevantSections = useMemo(() => {
    return SETUP_SECTIONS.filter(s => s.requiredFor.includes(systemType));
  }, [systemType]);

  // Calculate progress
  const progress = useMemo(() => {
    const completed = relevantSections.filter(s => completedSections.has(s.id)).length;
    return Math.round((completed / relevantSections.length) * 100);
  }, [relevantSections, completedSections]);

  // Load project data
  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        navigate('/cloud');
        return;
      }

      try {
        const { data: projectData, error: projectError } = await getProjectByIdCompat(projectId);
        if (projectError || !projectData) {
          throw projectError || new Error('Project not found');
        }
        
        setProject(projectData);

        // Load business if linked
        if (projectData?.business_id) {
          const { data: businessData } = await supabase
            .from('businesses' as any)
            .select('id,name,industry,settings')
            .eq('id', projectData.business_id)
            .single();
          
          if (businessData) {
            setBusiness(businessData as BusinessData);
          }
        }

        const { data: projectSettingsData } = await supabase
          .from('project_settings')
          .select('settings')
          .eq('project_id', projectId)
          .maybeSingle();

        const projectSettings =
          projectSettingsData?.settings && typeof projectSettingsData.settings === 'object' && !Array.isArray(projectSettingsData.settings)
            ? projectSettingsData.settings
            : {};

        // Load completion status from project settings
        const completedFromSettings = Array.isArray(projectSettings.completed_setup_sections)
          ? projectSettings.completed_setup_sections
          : [];
        setCompletedSections(new Set(completedFromSettings));

      } catch (error) {
        console.error('[ProjectSetup] Load error:', error);
        toast.error('Failed to load project');
        navigate('/cloud');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, navigate]);

  // Update URL when section changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('section', activeSection);
    navigate(`/project/${projectId}/setup?${params.toString()}`, { replace: true });
  }, [activeSection, projectId, navigate, searchParams]);

  // Mark section as complete
  const markSectionComplete = async (sectionId: SetupSection) => {
    const newCompleted = new Set(completedSections);
    newCompleted.add(sectionId);
    setCompletedSections(newCompleted);

    // Persist to project settings
    try {
      const nextSettings = {
        ...((project?.settings && typeof project.settings === 'object' && !Array.isArray(project.settings)) ? project.settings : {}),
        completed_setup_sections: Array.from(newCompleted),
      };

      await supabase
        .from('project_settings')
        .upsert(
          {
            project_id: projectId,
            settings: nextSettings,
          },
          { onConflict: 'project_id' },
        );

      setProject((current) => current ? { ...current, settings: nextSettings } : current);
      
      toast.success(`${SETUP_SECTIONS.find(s => s.id === sectionId)?.title} setup complete!`);
    } catch (error) {
      console.error('[ProjectSetup] Failed to save progress:', error);
    }
  };

  // Navigate to next incomplete section
  const goToNextSection = () => {
    const currentIndex = relevantSections.findIndex(s => s.id === activeSection);
    for (let i = currentIndex + 1; i < relevantSections.length; i++) {
      if (!completedSections.has(relevantSections[i].id)) {
        setActiveSection(relevantSections[i].id);
        return;
      }
    }
    // All done - show completion message
    toast.success('All setup steps completed! Your project is ready to launch.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  const activeSectionConfig = SETUP_SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/cloud')}
              className="text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cloud
            </Button>
            <Separator orientation="vertical" className="h-6 bg-white/[0.1]" />
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-violet-400" />
                {project?.name || 'Project'} Setup
              </h1>
              {business && (
                <p className="text-xs text-white/50">{business.name}</p>
              )}
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Progress</span>
              <Progress value={progress} className="w-24 h-2" />
              <span className="text-sm font-medium text-white">{progress}%</span>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate(`/web-builder`, { state: { projectId } })}
              className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06]"
            >
              <Code className="w-4 h-4 mr-2" />
              Edit Site
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Setup Navigation */}
          <div className="col-span-3">
            <Card className="bg-white/[0.02] border-white/[0.06] sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-white/60" />
                  Setup Steps
                </CardTitle>
                <CardDescription className="text-xs text-white/40">
                  Complete these steps to launch your {systemType} site
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-1 p-3">
                    {relevantSections.map((section, index) => {
                      const Icon = section.icon;
                      const isCompleted = completedSections.has(section.id);
                      const isActive = activeSection === section.id;
                      const hasDependencies = section.dependencies?.some(d => !completedSections.has(d));
                      
                      return (
                        <button
                          key={section.id}
                          onClick={() => !hasDependencies && setActiveSection(section.id)}
                          disabled={hasDependencies}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                            isActive 
                              ? "bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30"
                              : "hover:bg-white/[0.04] border border-transparent",
                            hasDependencies && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isCompleted 
                              ? "bg-green-500/20 text-green-400"
                              : `bg-gradient-to-br ${section.gradient} bg-opacity-20`
                          )}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Icon className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              isCompleted ? "text-green-400" : "text-white"
                            )}>
                              {section.title}
                            </p>
                            <p className="text-xs text-white/40 truncate">
                              {isCompleted ? 'Completed' : `~${section.estimatedTime}`}
                            </p>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-violet-400" : "text-white/20"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Active Section */}
          <div className="col-span-9">
            <Card className="bg-white/[0.02] border-white/[0.06]">
              {activeSectionConfig && (
                <>
                  <CardHeader className="border-b border-white/[0.06]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                          activeSectionConfig.gradient
                        )}>
                          <activeSectionConfig.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-white">
                            {activeSectionConfig.title}
                          </CardTitle>
                          <CardDescription className="text-white/50">
                            {activeSectionConfig.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-white/60 border-white/[0.1]">
                        ~{activeSectionConfig.estimatedTime}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <SetupSectionContent
                      section={activeSection}
                      project={project}
                      business={business}
                      systemType={systemType}
                      isCompleted={completedSections.has(activeSection)}
                      onComplete={() => markSectionComplete(activeSection)}
                      onNext={goToNextSection}
                    />
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section-specific content components
interface SetupSectionContentProps {
  section: SetupSection;
  project: ProjectData | null;
  business: BusinessData | null;
  systemType: BusinessSystemType;
  isCompleted: boolean;
  onComplete: () => void;
  onNext: () => void;
}

function SetupSectionContent({ 
  section, 
  project, 
  business, 
  systemType,
  isCompleted,
  onComplete,
  onNext 
}: SetupSectionContentProps) {
  const navigate = useNavigate();

  // Render section-specific content
  switch (section) {
    case 'payments':
      return (
        <PaymentsSetupSection 
          project={project}
          business={business}
          systemType={systemType}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'database':
      return (
        <DatabaseSetupSection
          project={project}
          systemType={systemType}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'email':
      return (
        <EmailSetupSection
          project={project}
          business={business}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'calendar':
      return (
        <CalendarSetupSection
          project={project}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'content':
      return (
        <ContentSetupSection
          project={project}
          systemType={systemType}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'domain':
      return (
        <DomainSetupSection
          project={project}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'analytics':
      return (
        <AnalyticsSetupSection
          project={project}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    case 'automations':
      return (
        <AutomationsSetupSection
          project={project}
          systemType={systemType}
          isCompleted={isCompleted}
          onComplete={onComplete}
          onNext={onNext}
        />
      );
    default:
      return <div className="text-white/60">Section not found</div>;
  }
}

// Payments Setup Section
function PaymentsSetupSection({ project, business, systemType, isCompleted, onComplete, onNext }: any) {
  const [stripeKey, setStripeKey] = useState('');
  const [testing, setTesting] = useState(false);
  const navigate = useNavigate();

  const paymentUseCases = {
    store: ['Accept credit card payments', 'Handle refunds', 'Manage subscriptions'],
    booking: ['Collect deposits', 'Process full payments', 'Handle cancellation fees'],
    consulting: ['Invoice clients', 'Accept retainer payments', 'Recurring billing'],
    content: ['Process donations', 'Subscription memberships', 'Pay-what-you-want'],
    agency: ['Collect listing fees', 'Process escrow payments'],
  };

  return (
    <div className="space-y-6">
      {/* What you'll set up */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          What you'll enable for your {systemType}
        </h4>
        <ul className="space-y-2">
          {(paymentUseCases[systemType as keyof typeof paymentUseCases] || paymentUseCases.store).map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/60">
              <CheckCircle2 className="w-4 h-4 text-green-400/50" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Stripe Connection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-white">Stripe Secret Key</Label>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs text-violet-400 hover:text-violet-300"
            onClick={() => window.open('https://dashboard.stripe.com/apikeys', '_blank')}
          >
            Get your API key <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <Input
          type="password"
          placeholder="sk_live_..."
          value={stripeKey}
          onChange={(e) => setStripeKey(e.target.value)}
          className="bg-white/[0.04] border-white/[0.1] text-white"
        />
        <p className="text-xs text-white/40">
          Your API key is encrypted and stored securely. We never share it with third parties.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <Button
          onClick={() => navigate('/cloud', { state: { tab: 'integrations' } })}
          variant="outline"
          className="border-white/[0.1] text-white/70 hover:text-white"
        >
          <Settings className="w-4 h-4 mr-2" />
          Advanced Settings
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Database Setup Section
function DatabaseSetupSection({ project, systemType, isCompleted, onComplete, onNext }: any) {
  const [autoCreate, setAutoCreate] = useState(true);

  const tables = {
    store: ['products', 'orders', 'customers', 'inventory'],
    booking: ['services', 'appointments', 'availabilities', 'clients'],
    portfolio: ['projects', 'categories', 'testimonials'],
    agency: ['listings', 'agents', 'inquiries', 'viewings'],
    consulting: ['services', 'consultations', 'clients', 'invoices'],
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h4 className="text-sm font-medium text-white mb-3">
          Tables for your {systemType} site
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {(tables[systemType as keyof typeof tables] || tables.store).map((table) => (
            <div key={table} className="flex items-center gap-2 p-2 rounded bg-white/[0.02]">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/80">{table}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg border border-white/[0.06]">
        <div>
          <Label className="text-white">Auto-create tables</Label>
          <p className="text-xs text-white/50">Automatically set up recommended database tables</p>
        </div>
        <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Email Setup Section
function EmailSetupSection({ project, business, isCompleted, onComplete, onNext }: any) {
  const [notificationEmail, setNotificationEmail] = useState(business?.notification_email || '');
  const [enableNotifications, setEnableNotifications] = useState(true);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-white">Notification Email</Label>
        <Input
          type="email"
          placeholder="you@business.com"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          className="bg-white/[0.04] border-white/[0.1] text-white"
        />
        <p className="text-xs text-white/40">
          Receive notifications for new bookings, orders, form submissions, and more.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white">Email Templates</h4>
        {['Booking Confirmation', 'Order Receipt', 'Contact Form Response', 'Reminder'].map((template) => (
          <div key={template} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white/80">{template}</span>
            </div>
            <Badge variant="outline" className="text-xs text-white/50 border-white/[0.1]">
              Ready
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Calendar Setup Section
function CalendarSetupSection({ project, isCompleted, onComplete, onNext }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Default Duration</Label>
          <Input defaultValue="60" type="number" className="bg-white/[0.04] border-white/[0.1] text-white" />
          <p className="text-xs text-white/40">Minutes per appointment</p>
        </div>
        <div className="space-y-2">
          <Label className="text-white">Buffer Time</Label>
          <Input defaultValue="15" type="number" className="bg-white/[0.04] border-white/[0.1] text-white" />
          <p className="text-xs text-white/40">Minutes between appointments</p>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-400" />
          Working Hours
        </h4>
        <p className="text-sm text-white/60">
          Configure your availability in the full calendar settings after setup.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Content Setup Section
function ContentSetupSection({ project, systemType, isCompleted, onComplete, onNext }: any) {
  const contentTypes = {
    store: { type: 'Products', action: 'Add your first product' },
    portfolio: { type: 'Projects', action: 'Add a portfolio piece' },
    agency: { type: 'Listings', action: 'Create a property listing' },
    consulting: { type: 'Services', action: 'Define your services' },
    booking: { type: 'Services', action: 'Add bookable services' },
  };

  const content = contentTypes[systemType as keyof typeof contentTypes] || contentTypes.store;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] p-8 text-center">
        <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-white mb-2">{content.action}</h4>
        <p className="text-sm text-white/50 mb-4">
          Start adding {content.type.toLowerCase()} to your site
        </p>
        <Button className="bg-gradient-to-r from-violet-500 to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Add {content.type.slice(0, -1)}
        </Button>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Domain Setup Section
function DomainSetupSection({ project, isCompleted, onComplete, onNext }: any) {
  const [domain, setDomain] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-white">Custom Domain</Label>
        <Input
          placeholder="yourbusiness.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="bg-white/[0.04] border-white/[0.1] text-white"
        />
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h4 className="text-sm font-medium text-white mb-3">DNS Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Type</span>
            <span className="font-mono">CNAME</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Name</span>
            <span className="font-mono">www</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Value</span>
            <span className="font-mono">cname.unison-tasks.app</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Analytics Setup Section
function AnalyticsSetupSection({ project, isCompleted, onComplete, onNext }: any) {
  const [gaId, setGaId] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-white">Google Analytics ID</Label>
        <Input
          placeholder="G-XXXXXXXXXX"
          value={gaId}
          onChange={(e) => setGaId(e.target.value)}
          className="bg-white/[0.04] border-white/[0.1] text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {['Page Views', 'Conversions', 'User Sessions', 'Bounce Rate'].map((metric) => (
          <div key={metric} className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/80">{metric}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Next Step
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Automations Setup Section
function AutomationsSetupSection({ project, systemType, isCompleted, onComplete, onNext }: any) {
  const automations = {
    store: ['Order confirmation email', 'Low stock alert', 'Abandoned cart reminder'],
    booking: ['Appointment confirmation', '24h reminder', 'Follow-up request review'],
    consulting: ['Meeting confirmation', 'Invoice reminder', 'Session prep email'],
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {(automations[systemType as keyof typeof automations] || automations.booking).map((auto) => (
          <div key={auto} className="flex items-center justify-between p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white/80">{auto}</span>
            </div>
            <Switch defaultChecked />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={onComplete}
          disabled={isCompleted}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button onClick={onNext} className="bg-gradient-to-r from-violet-500 to-purple-600">
          Finish Setup
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Missing import for Plus icon 
import { Plus } from 'lucide-react';
