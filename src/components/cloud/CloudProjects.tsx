/**
 * CLOUD PROJECTS - Unified Business & Project Management
 * 
 * Redesigned for a cleaner, less cluttered user experience with:
 * - Clean sidebar navigation
 * - Simplified project cards
 * - Easy project management
 */

import React, { useState, useEffect, Suspense } from 'react';
import { 
  FolderKanban, Plus, Globe, Settings, Trash2, ExternalLink,
  Sparkles, Rocket, Layout, Palette, Clock, ChevronRight,
  MoreVertical, Copy, Star, FileText, Home, Download,
  Building2, Users, Loader2, Paintbrush, ArrowLeft,
  BarChart3, Target, Kanban, Workflow, Zap, UserCircle,
  Search, Grid3X3, List, Edit3, Eye, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { downloadMultiPageSite } from '@/utils/multiPageExporter';

// CRM Components
import { CRMContacts } from '@/components/crm/CRMContacts';
import { CRMLeads } from '@/components/crm/CRMLeads';
import { CRMPipeline } from '@/components/crm/CRMPipeline';
import { CRMWorkflows } from '@/components/crm/CRMWorkflows';
import { CRMFormSubmissions } from '@/components/crm/CRMFormSubmissions';
import { CRMOverview } from '@/components/crm/CRMOverview';
import { CloudTeams } from './CloudTeams';
import { BusinessAutomationSettings } from '@/components/crm/BusinessAutomationSettings';
import { ProjectSettingsPanel } from '@/components/project/ProjectSettingsPanel';

import type { Json } from '@/integrations/supabase/types';

interface CloudProjectsProps {
  userId: string;
  businessId?: string;
  onProjectSelect?: (project: Project) => void;
}

interface Project {
  id: string;
  name: string;
  slug?: string;
  status?: 'draft' | 'published' | 'archived';
  publish_status?: 'draft' | 'publishing' | 'published' | 'unpublished';
  template_type?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  business_id?: string;
  owner_id?: string;
  user_id?: string;
  custom_domain?: string;
  settings?: Record<string, any>;
}

interface Business {
  id: string;
  name: string;
  slug?: string;
  industry?: string;
  website?: string;
  created_at?: string;
  owner_id?: string;
  notification_email?: string;
  notification_phone?: string;
  settings?: Json;
}

const transformBusiness = (data: Record<string, unknown>): Business => ({
  id: data.id as string,
  name: data.name as string,
  slug: data.slug as string | undefined,
  industry: data.industry as string | undefined,
  website: data.website as string | undefined,
  created_at: data.created_at as string | undefined,
  owner_id: data.owner_id as string | undefined,
  notification_email: data.notification_email as string | undefined,
  notification_phone: data.notification_phone as string | undefined,
  settings: data.settings as Json | undefined,
});

type ViewMode = 'grid' | 'list';
type BusinessSection = 'projects' | 'crm' | 'automations' | 'team' | 'settings';
type CRMSubTab = 'overview' | 'contacts' | 'leads' | 'pipeline' | 'workflows' | 'forms';

export function CloudProjects({ userId, businessId: propBusinessId, onProjectSelect }: CloudProjectsProps) {
  // Core state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeSection, setActiveSection] = useState<BusinessSection>('projects');
  const [crmSubTab, setCrmSubTab] = useState<CRMSubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'business' | 'project'; item: Business | Project } | null>(null);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectScopeId, setSelectedProjectScopeId] = useState<string | null>(null);
  const [businessSettingsSaving, setBusinessSettingsSaving] = useState(false);
  const [businessSettingsForm, setBusinessSettingsForm] = useState({
    name: '',
    website: '',
    industry: '',
    notificationEmail: '',
    notificationPhone: '',
  });

  // Form states
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Load businesses on mount
  useEffect(() => {
    if (userId) loadBusinesses();
  }, [userId]);

  // Load projects when business selected
  useEffect(() => {
    if (selectedBusiness) loadProjects(selectedBusiness.id);
  }, [selectedBusiness]);

  useEffect(() => {
    if (!selectedBusiness) {
      setBusinessSettingsForm({
        name: '',
        website: '',
        industry: '',
        notificationEmail: '',
        notificationPhone: '',
      });
      return;
    }

    setBusinessSettingsForm({
      name: selectedBusiness.name || '',
      website: selectedBusiness.website || '',
      industry: selectedBusiness.industry || '',
      notificationEmail: selectedBusiness.notification_email || '',
      notificationPhone: selectedBusiness.notification_phone || '',
    });
  }, [selectedBusiness]);

  // ==================== DATA OPERATIONS ====================

  const loadBusinesses = async () => {
    try {
      const { data: ownedBusinesses, error: ownedError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      const { data: memberBusinesses, error: memberError } = await supabase
        .from('business_members')
        .select('business:businesses(*)')
        .eq('user_id', userId);

      if (ownedError && memberError) {
        setBusinesses([]);
      } else {
        const owned = (ownedBusinesses || []).map(transformBusiness);
        const memberOf = (memberBusinesses || [])
          .map((m: any) => m.business)
          .filter(Boolean)
          .map(transformBusiness);
        
        const allBusinesses = [...owned];
        memberOf.forEach(b => {
          if (!allBusinesses.find(ob => ob.id === b.id)) {
            allBusinesses.push(b);
          }
        });
        
        setBusinesses(allBusinesses);
        
        // Auto-select first or provided business
        if (propBusinessId) {
          const found = allBusinesses.find(b => b.id === propBusinessId);
          if (found) setSelectedBusiness(found);
        } else if (allBusinesses.length > 0) {
          setSelectedBusiness(allBusinesses[0]);
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (error) {
        // Fallback to owner_id
        const { data: fallbackData } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', userId)
          .order('updated_at', { ascending: false });
        setProjects(fallbackData || []);
        setSelectedProjectScopeId((current) =>
          current && (fallbackData || []).some((project) => project.id === current)
            ? current
            : (fallbackData || [])[0]?.id || null
        );
      } else {
        setProjects(data || []);
        setSelectedProjectScopeId((current) =>
          current && (data || []).some((project) => project.id === current)
            ? current
            : (data || [])[0]?.id || null
        );
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createBusiness = async () => {
    if (!newBusinessName.trim()) return;
    setCreatingBusiness(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert({ name: newBusinessName.trim(), owner_id: userId })
        .select()
        .single();

      if (error) throw error;

      const newBiz = transformBusiness(data);
      setBusinesses([newBiz, ...businesses]);
      setSelectedBusiness(newBiz);
      setCreateBusinessOpen(false);
      setNewBusinessName('');
      toast({ title: 'Business created', description: `${newBusinessName} is ready.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create business.', variant: 'destructive' });
    } finally {
      setCreatingBusiness(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim() || !selectedBusiness) return;
    setCreatingProject(true);
    try {
      const slug = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 50);
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName,
          description: newProjectDescription || null,
          slug,
          owner_id: userId,
          business_id: selectedBusiness.id,
          status: 'draft',
          publish_status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      setProjects([data, ...projects]);
      setSelectedProjectScopeId(data.id);
      setCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      toast({ title: 'Project created', description: `${newProjectName} is ready to edit.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create project.', variant: 'destructive' });
    } finally {
      setCreatingProject(false);
    }
  };

  const confirmDelete = (type: 'business' | 'project', item: Business | Project) => {
    setItemToDelete({ type, item });
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    
    const { type, item } = itemToDelete;
    try {
      const { error } = await supabase
        .from(type === 'business' ? 'businesses' : 'projects')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      if (type === 'business') {
        const updated = businesses.filter(b => b.id !== item.id);
        setBusinesses(updated);
        if (selectedBusiness?.id === item.id) {
          setSelectedBusiness(updated[0] || null);
        }
      } else {
        const updatedProjects = projects.filter(p => p.id !== item.id);
        setProjects(updatedProjects);
        setSelectedProjectScopeId((current) =>
          current === item.id ? updatedProjects[0]?.id || null : current
        );
        if (selectedProject?.id === item.id) {
          setSelectedProject(null);
          setProjectSettingsOpen(false);
        }
      }

      toast({ title: `${type === 'business' ? 'Business' : 'Project'} deleted` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete.', variant: 'destructive' });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const duplicateProject = async (project: Project) => {
    try {
      const newSlug = `${project.slug || 'project'}-copy-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: `${project.name} (Copy)`,
          description: project.description,
          slug: newSlug,
          owner_id: userId,
          business_id: project.business_id || selectedBusiness?.id,
          status: 'draft',
          publish_status: 'draft',
          settings: project.settings,
        })
        .select()
        .single();

      if (error) throw error;
      setProjects([data, ...projects]);
      setSelectedProjectScopeId(data.id);
      toast({ title: 'Project duplicated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openInBuilder = (project: Project) => {
    navigate('/web-builder', {
      state: {
        projectId: project.id,
        businessId: project.business_id || selectedBusiness?.id,
        projectName: project.name,
        projectSlug: project.slug,
        publishStatus: project.publish_status || project.status,
      }
    });
  };

  const updateBusinessSetting = (field: keyof typeof businessSettingsForm, value: string) => {
    setBusinessSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveBusinessSettings = async () => {
    if (!selectedBusiness) return;

    const trimmedName = businessSettingsForm.name.trim();
    if (!trimmedName) {
      toast({
        title: 'Business name required',
        description: 'Enter a name before saving business settings.',
        variant: 'destructive',
      });
      return;
    }

    setBusinessSettingsSaving(true);
    try {
      const updates = {
        name: trimmedName,
        website: businessSettingsForm.website.trim() || null,
        industry: businessSettingsForm.industry.trim() || null,
        notification_email: businessSettingsForm.notificationEmail.trim() || null,
        notification_phone: businessSettingsForm.notificationPhone.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', selectedBusiness.id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedBusiness = transformBusiness(data);
      setBusinesses((current) =>
        current.map((business) => (business.id === updatedBusiness.id ? updatedBusiness : business))
      );
      setSelectedBusiness(updatedBusiness);

      toast({
        title: 'Business updated',
        description: `${updatedBusiness.name} settings have been saved.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save business settings.',
        variant: 'destructive',
      });
    } finally {
      setBusinessSettingsSaving(false);
    }
  };

  const openProjectSettings = (project: Project) => {
    setSelectedProject(project);
    setSelectedProjectScopeId(project.id);
    setProjectSettingsOpen(true);
  };

  // ==================== FILTERED DATA ====================

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedScopeProject =
    projects.find((project) => project.id === selectedProjectScopeId) || null;

  const crmTabs: Array<{ id: CRMSubTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: UserCircle },
    { id: 'leads', label: 'Leads', icon: Target },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'workflows', label: 'Workflows', icon: Workflow },
    { id: 'forms', label: 'Forms', icon: FileText },
  ];

  const businessSettingsSnapshot =
    selectedBusiness?.settings && typeof selectedBusiness.settings === 'object' && !Array.isArray(selectedBusiness.settings)
      ? (selectedBusiness.settings as Record<string, any>)
      : {};
  const teamSnapshot =
    businessSettingsSnapshot.team &&
    typeof businessSettingsSnapshot.team === 'object' &&
    !Array.isArray(businessSettingsSnapshot.team)
      ? (businessSettingsSnapshot.team as { members?: Array<any>; invitations?: Array<any> })
      : {};
  const teamMemberCount = Array.isArray(teamSnapshot.members) ? teamSnapshot.members.length : 0;
  const pendingInvitationCount = Array.isArray(teamSnapshot.invitations)
    ? teamSnapshot.invitations.filter((invitation) => invitation?.status === 'pending').length
    : 0;
  const businessIdentityFields = [
    selectedBusiness?.name,
    selectedBusiness?.website,
    selectedBusiness?.industry,
    selectedBusiness?.notification_email,
    selectedBusiness?.notification_phone,
  ];
  const businessIdentityCompletion = Math.round(
    (businessIdentityFields.filter((value) => Boolean(String(value || '').trim())).length /
      businessIdentityFields.length) *
      100
  );

  // ==================== CRM CONTENT ====================

  const renderCRMContent = () => {
    if (!selectedScopeProject || !selectedBusiness) {
      return null;
    }

    switch (crmSubTab) {
      case 'contacts':
        return <CRMContacts businessId={selectedBusiness.id} projectId={selectedScopeProject.id} />;
      case 'leads':
        return <CRMLeads businessId={selectedBusiness.id} projectId={selectedScopeProject.id} />;
      case 'pipeline':
        return <CRMPipeline businessId={selectedBusiness.id} projectId={selectedScopeProject.id} />;
      case 'workflows':
        return <CRMWorkflows businessId={selectedBusiness.id} projectId={selectedScopeProject.id} />;
      case 'forms':
        return <CRMFormSubmissions businessId={selectedBusiness.id} projectId={selectedScopeProject.id} />;
      default:
        return (
          <CRMOverview
            businessId={selectedBusiness.id}
            projectId={selectedScopeProject.id}
            onNavigate={(v) => setCrmSubTab(v as CRMSubTab)}
          />
        );
    }
  };

  // ==================== LOADING ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // ==================== EMPTY STATE ====================

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 mb-6">
          <Building2 className="h-12 w-12 text-fuchsia-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Create your first business</h2>
        <p className="text-white/40 mb-6 max-w-md">
          Businesses help you organize projects, manage clients, and automate workflows.
        </p>
        <Button 
          onClick={() => setCreateBusinessOpen(true)}
          className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Business
        </Button>

        {/* Create Business Dialog */}
        <Dialog open={createBusinessOpen} onOpenChange={setCreateBusinessOpen}>
          <DialogContent className="bg-[#0d0d18] border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle>Create Business</DialogTitle>
              <DialogDescription>Give your business a name to get started.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="bizName">Business Name</Label>
              <Input
                id="bizName"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="My Agency"
                className="mt-2 bg-white/[0.03] border-white/10"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateBusinessOpen(false)}>Cancel</Button>
              <Button onClick={createBusiness} disabled={creatingBusiness || !newBusinessName.trim()}>
                {creatingBusiness ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ==================== MAIN LAYOUT ====================

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-6">
      {/* Left Sidebar - Business List */}
      <aside className="w-64 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-white/40 uppercase tracking-wide">Businesses</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => setCreateBusinessOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 -mx-2">
          <div className="px-2 space-y-1">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => {
                  setSelectedBusiness(business);
                  setActiveSection('projects');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                  selectedBusiness?.id === business.id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-md transition-colors",
                  selectedBusiness?.id === business.id
                    ? "bg-fuchsia-500/30"
                    : "bg-white/5 group-hover:bg-white/8"
                )}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{business.name}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete('business', business);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedBusiness ? (
          <>
            {/* Business Header & Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20">
                  <Building2 className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedBusiness.name}</h2>
                  <p className="text-sm text-white/30">
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/web-builder', { state: { businessId: selectedBusiness.id } })}
              >
                <Paintbrush className="h-4 w-4 mr-2" />
                Open Builder
              </Button>
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-white/10 pb-px">
              {[
                { id: 'projects', label: 'Projects', icon: FolderKanban },
                { id: 'crm', label: 'CRM', icon: Users },
                { id: 'automations', label: 'Automations', icon: Zap },
                { id: 'team', label: 'Team', icon: Users },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as BusinessSection)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative",
                    activeSection === tab.id
                      ? "text-white bg-white/5"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeSection === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Section Content */}
            <div className="flex-1 overflow-auto">
              {activeSection === 'projects' && (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white/[0.03] border-white/10 h-9"
                      />
                    </div>
                    <div className="flex items-center gap-1 border border-white/10 rounded-lg p-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-2", viewMode === 'grid' && "bg-white/10")}
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-2", viewMode === 'list' && "bg-white/10")}
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button onClick={() => setCreateProjectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </div>

                  {/* Projects */}
                  {filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 rounded-2xl bg-white/[0.03] mb-4">
                        <Rocket className="h-10 w-10 text-white/30" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {searchQuery ? 'No projects found' : 'Create your first project'}
                      </h3>
                      <p className="text-white/40 text-sm mb-4">
                        {searchQuery 
                          ? 'Try a different search term.' 
                          : 'Start building something amazing.'}
                      </p>
                      {!searchQuery && (
                        <Button onClick={() => setCreateProjectOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          New Project
                        </Button>
                      )}
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredProjects.map((project) => (
                        <Card 
                          key={project.id}
                          className="bg-white/[0.02] border-white/5 hover:border-cyan-500/30 transition-all group cursor-pointer"
                          onClick={() => openInBuilder(project)}
                        >
                          {/* Thumbnail */}
                          <div className="h-32 bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center border-b border-white/5">
                            <Palette className="h-8 w-8 text-white/20" />
                          </div>
                          
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold truncate group-hover:text-cyan-300 transition-colors">
                                  {project.name}
                                </h4>
                                <p className="text-xs text-white/30 font-mono">/{project.slug}</p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs shrink-0",
                                  project.status === 'published' 
                                    ? "text-cyan-400 border-cyan-500/30" 
                                    : "text-amber-400 border-amber-500/30"
                                )}
                              >
                                {project.status === 'published' ? 'Live' : 'Draft'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-3 text-xs text-white/30">
                              <Clock className="h-3 w-3" />
                              {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="flex-1 h-8 text-xs"
                                onClick={() => openInBuilder(project)}
                              >
                                <Edit3 className="h-3 w-3 mr-1.5" />
                                Edit
                              </Button>
                              {project.status === 'published' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => window.open(`/preview/${project.slug}`, '_blank')}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0d0d18] border-white/10 w-40">
                                  <DropdownMenuItem onSelect={() => duplicateProject(project)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => {
                                    openProjectSettings(project);
                                  }}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem 
                                    className="text-red-400 focus:text-red-400"
                                    onSelect={() => confirmDelete('project', project)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    /* List View */
                    <div className="border border-white/10 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.02]">
                            <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">Name</th>
                            <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">Status</th>
                            <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">Updated</th>
                            <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredProjects.map((project) => (
                            <tr 
                              key={project.id} 
                              className="hover:bg-white/5 cursor-pointer"
                              onClick={() => openInBuilder(project)}
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">{project.name}</p>
                                  <p className="text-xs text-white/30 font-mono">/{project.slug}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    project.status === 'published' 
                                      ? "text-cyan-400 border-cyan-500/30" 
                                      : "text-amber-400 border-amber-500/30"
                                  )}
                                >
                                  {project.status === 'published' ? 'Live' : 'Draft'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-white/40">
                                {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" variant="ghost" className="h-7" onClick={() => openInBuilder(project)}>
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7"
                                    onClick={() => openProjectSettings(project)}
                                  >
                                    <Settings className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => confirmDelete('project', project)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'crm' && (
                <div className="space-y-6">
                  <Card className="bg-white/[0.02] border-white/5">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                              Project CRM Scope
                            </Badge>
                            <Badge variant="outline" className="border-white/10 text-white/50">
                              Business: {selectedBusiness.name}
                            </Badge>
                            {selectedScopeProject && (
                              <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-300">
                                Project: {selectedScopeProject.name}
                              </Badge>
                            )}
                          </div>
                          <div>
                            <CardTitle>Project Workspace</CardTitle>
                            <CardDescription>
                              CRM records, pipeline activity, workflows, and forms now stay inside one project workspace instead of leaking across the entire business.
                            </CardDescription>
                          </div>
                        </div>
                        {selectedScopeProject && (
                          <Button
                            variant="outline"
                            className="border-white/10"
                            onClick={() => openProjectSettings(selectedScopeProject)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Project Settings
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {projects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {projects.map((project) => (
                            <Button
                              key={project.id}
                              variant={selectedProjectScopeId === project.id ? 'secondary' : 'outline'}
                              className={cn(
                                "justify-start border-white/10",
                                selectedProjectScopeId === project.id
                                  ? "bg-white/10 text-white"
                                  : "text-white/60 hover:text-white"
                              )}
                              onClick={() => setSelectedProjectScopeId(project.id)}
                            >
                              <FolderKanban className="mr-2 h-4 w-4" />
                              {project.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-white/50">
                          Create a project first. CRM is now project-scoped, so there is no business-wide fallback view here.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedScopeProject ? (
                    <div className="flex gap-6">
                      <nav className="w-44 flex-shrink-0 space-y-1">
                        {crmTabs.map((tab) => (
                          <Button
                            key={tab.id}
                            variant={crmSubTab === tab.id ? 'secondary' : 'ghost'}
                            className={cn("w-full justify-start", crmSubTab === tab.id && "bg-white/10")}
                            onClick={() => setCrmSubTab(tab.id)}
                          >
                            <tab.icon className="h-4 w-4 mr-2" />
                            {tab.label}
                          </Button>
                        ))}
                      </nav>
                      <div className="flex-1 min-w-0">
                        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                          {renderCRMContent()}
                        </Suspense>
                      </div>
                    </div>
                  ) : (
                    <Card className="bg-white/[0.02] border-white/5">
                      <CardContent className="py-12 text-center text-white/40">
                        Select a project workspace to open CRM.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeSection === 'automations' && (
                <div className="space-y-6">
                  <Card className="bg-white/[0.02] border-white/5">
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                          Business Defaults
                        </Badge>
                        <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-300">
                          Project Workspace
                        </Badge>
                      </div>
                      <CardTitle>Automation Scope</CardTitle>
                      <CardDescription>
                        Business automation settings define shared guardrails and recipe packs. Project settings define how one workspace applies CRM stages, follow-ups, notifications, and local automation behavior.
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
                    <div className="min-w-0">
                      <BusinessAutomationSettings
                        businessId={selectedBusiness.id}
                        businessIndustry={selectedBusiness.industry}
                      />
                    </div>

                    <Card className="bg-white/[0.02] border-white/5 h-fit">
                      <CardHeader>
                        <CardTitle>Project Workspace Settings</CardTitle>
                        <CardDescription>
                          Choose a project and open its dedicated settings panel. These settings do not overwrite the business default automation profile.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {projects.length > 0 ? (
                          <>
                            <div className="space-y-2">
                              {projects.map((project) => (
                                <button
                                  key={project.id}
                                  type="button"
                                  onClick={() => setSelectedProjectScopeId(project.id)}
                                  className={cn(
                                    "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                                    selectedProjectScopeId === project.id
                                      ? "border-cyan-500/40 bg-cyan-500/10"
                                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-white">{project.name}</p>
                                      <p className="text-xs text-white/40 font-mono">/{project.slug}</p>
                                    </div>
                                    {selectedProjectScopeId === project.id && (
                                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                              <p className="text-sm font-medium text-white">
                                {selectedScopeProject ? selectedScopeProject.name : 'No project selected'}
                              </p>
                              <p className="mt-1 text-sm text-white/50">
                                Project settings cover CRM stages, lead routing, project-specific automation toggles, notifications, analytics, and domain-level workspace behavior.
                              </p>
                            </div>
                            <Button
                              className="w-full"
                              disabled={!selectedScopeProject}
                              onClick={() => selectedScopeProject && openProjectSettings(selectedScopeProject)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Open Project Settings
                            </Button>
                          </>
                        ) : (
                          <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-white/50">
                            Create a project before configuring project-level automations.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeSection === 'team' && (
                <CloudTeams userId={userId} organizationId={selectedBusiness.id} />
              )}

              {activeSection === 'settings' && (
                <div className="space-y-8">
                  <Card className="relative overflow-hidden border-white/10 bg-white/[0.03]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.18),transparent_30%)]" />
                    <CardContent className="relative p-6 sm:p-8">
                      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                              Business Layer
                            </Badge>
                            <Badge variant="outline" className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300">
                              Project Layer
                            </Badge>
                            <Badge variant="outline" className="border-white/10 text-white/50">
                              Infrastructure-aligned
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                              Cloud Settings Control Center
                            </h3>
                            <p className="max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                              This settings surface now mirrors the actual platform architecture. Business identity, ownership, and automation defaults live once at the business level. CRM behavior, workflow behavior, and operational overrides live inside each project workspace.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            {
                              label: 'Projects',
                              value: String(projects.length),
                              icon: FolderKanban,
                              tone: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300',
                            },
                            {
                              label: 'Team Members',
                              value: String(teamMemberCount),
                              icon: Users,
                              tone: 'from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300',
                            },
                            {
                              label: 'Pending Invites',
                              value: String(pendingInvitationCount),
                              icon: ChevronRight,
                              tone: 'from-amber-500/20 to-amber-500/5 text-amber-300',
                            },
                            {
                              label: 'Identity Ready',
                              value: `${businessIdentityCompletion}%`,
                              icon: Building2,
                              tone: 'from-lime-500/20 to-lime-500/5 text-lime-300',
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="min-w-[132px] rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm"
                            >
                              <div className={cn("mb-3 inline-flex rounded-xl bg-gradient-to-br p-2", item.tone)}>
                                <item.icon className="h-4 w-4" />
                              </div>
                              <p className="text-xl font-semibold text-white">{item.value}</p>
                              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{item.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
                    <Card className="border-white/5 bg-white/[0.02]">
                      <CardHeader className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle>Business Identity</CardTitle>
                            <CardDescription>
                              Shared brand, website, industry, and notification ownership for {selectedBusiness.name}.
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="w-fit border-white/10 text-white/50">
                            {businessIdentityCompletion}% complete
                          </Badge>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-lime-400 transition-all"
                            style={{ width: `${businessIdentityCompletion}%` }}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Business Name</Label>
                            <Input
                              value={businessSettingsForm.name}
                              onChange={(event) => updateBusinessSetting('name', event.target.value)}
                              placeholder="Studio name, agency name, or operating entity"
                              className="h-11 border-white/10 bg-white/[0.03]"
                            />
                            <p className="text-xs text-white/35">
                              This appears across shared business surfaces and ownership-aware workflows.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                              value={businessSettingsForm.website}
                              onChange={(event) => updateBusinessSetting('website', event.target.value)}
                              placeholder="https://example.com"
                              className="h-11 border-white/10 bg-white/[0.03]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Industry</Label>
                            <Input
                              value={businessSettingsForm.industry}
                              onChange={(event) => updateBusinessSetting('industry', event.target.value)}
                              placeholder="Agency, ecommerce, salon..."
                              className="h-11 border-white/10 bg-white/[0.03]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Notification Email</Label>
                            <Input
                              value={businessSettingsForm.notificationEmail}
                              onChange={(event) => updateBusinessSetting('notificationEmail', event.target.value)}
                              placeholder="ops@example.com"
                              className="h-11 border-white/10 bg-white/[0.03]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Notification Phone</Label>
                            <Input
                              value={businessSettingsForm.notificationPhone}
                              onChange={(event) => updateBusinessSetting('notificationPhone', event.target.value)}
                              placeholder="+1 (555) 555-5555"
                              className="h-11 border-white/10 bg-white/[0.03]"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-sm font-medium text-white">What belongs in this layer</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {[
                              'Business name, site, and industry',
                              'Shared notification ownership',
                              'Team and access routing',
                              'Defaults that every project can inherit',
                            ].map((item) => (
                              <div key={item} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/55">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <Button
                            variant="outline"
                            className="border-white/10"
                            onClick={() =>
                              setBusinessSettingsForm({
                                name: selectedBusiness.name || '',
                                website: selectedBusiness.website || '',
                                industry: selectedBusiness.industry || '',
                                notificationEmail: selectedBusiness.notification_email || '',
                                notificationPhone: selectedBusiness.notification_phone || '',
                              })
                            }
                          >
                            Reset
                          </Button>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                              variant="outline"
                              className="border-white/10"
                              onClick={() => setActiveSection('team')}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Review Team Access
                            </Button>
                            <Button onClick={saveBusinessSettings} disabled={businessSettingsSaving}>
                              {businessSettingsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Save Business Identity
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                          <p className="text-sm font-semibold text-red-300">Danger Zone</p>
                          <p className="mt-1 text-sm text-white/45">
                            Deleting the business removes the shared parent container for every project workspace in this account.
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mt-4"
                            onClick={() => confirmDelete('business', selectedBusiness)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Business
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border-white/5 bg-white/[0.02]">
                        <CardHeader>
                          <CardTitle>Scope Map</CardTitle>
                          <CardDescription>
                            A quick read on where the platform expects each setting to live.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-cyan-300" />
                              <p className="font-medium text-cyan-200">Business Layer</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/55">
                              Identity, owner-level notifications, shared team, and automation defaults should be edited once here and inherited intentionally.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-500/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                                onClick={() => setActiveSection('automations')}
                              >
                                <Zap className="mr-2 h-4 w-4" />
                                Automation Defaults
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-500/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                                onClick={() => setActiveSection('team')}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Team & Roles
                              </Button>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="h-4 w-4 text-fuchsia-300" />
                              <p className="font-medium text-fuchsia-200">Project Layer</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/55">
                              CRM records, pipeline behavior, forms, workflow execution, domain behavior, and local automation overrides stay in a single project workspace.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15"
                                onClick={() => setActiveSection('crm')}
                              >
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Open CRM Scope
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15"
                                onClick={() => selectedScopeProject && openProjectSettings(selectedScopeProject)}
                                disabled={!selectedScopeProject}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Project Settings
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-white/5 bg-white/[0.02]">
                        <CardHeader>
                          <CardTitle>Current Workspace</CardTitle>
                          <CardDescription>
                            Keep one project selected while tuning scoped CRM and automation behavior.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm text-white/35">Active project workspace</p>
                                <p className="mt-1 text-lg font-semibold text-white">
                                  {selectedScopeProject?.name || 'No project selected'}
                                </p>
                                <p className="mt-1 text-sm text-white/45">
                                  {selectedScopeProject
                                    ? `/${selectedScopeProject.slug || selectedScopeProject.id}`
                                    : 'Choose a project below to open workspace-level settings.'}
                                </p>
                              </div>
                              {selectedScopeProject && (
                                <Badge variant="outline" className="border-lime-500/30 text-lime-300">
                                  Active Scope
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Inherited from Business</p>
                              <p className="mt-2 text-sm leading-6 text-white/55">
                                Branding context, notification ownership, team access model, and automation guardrails.
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Owned by Project</p>
                              <p className="mt-2 text-sm leading-6 text-white/55">
                                Pipeline stages, forms, workflow activity, workspace notifications, analytics, and domain behavior.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <Button
                              className="w-full"
                              disabled={!selectedScopeProject}
                              onClick={() => selectedScopeProject && openProjectSettings(selectedScopeProject)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Open Active Project Settings
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full border-white/10"
                              disabled={!selectedScopeProject}
                              onClick={() => setActiveSection('crm')}
                            >
                              <Workflow className="mr-2 h-4 w-4" />
                              Work Inside CRM Scope
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Card className="border-white/5 bg-white/[0.02]">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle>Project Workspace Library</CardTitle>
                          <CardDescription>
                            Each project is an isolated operating space with its own CRM, workflows, and local automation behavior.
                          </CardDescription>
                        </div>
                        <Button onClick={() => setCreateProjectOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          New Project
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {projects.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {projects.map((project) => {
                            const isActiveScope = selectedProjectScopeId === project.id;

                            return (
                              <div
                                key={project.id}
                                className={cn(
                                  "rounded-2xl border p-5 transition-colors",
                                  isActiveScope
                                    ? "border-cyan-500/30 bg-cyan-500/10"
                                    : "border-white/8 bg-black/20 hover:bg-white/[0.03]"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-lg font-semibold text-white">{project.name}</p>
                                    <p className="text-xs font-mono text-white/35">/{project.slug}</p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      isActiveScope
                                        ? "border-cyan-500/30 text-cyan-300"
                                        : "border-white/10 text-white/45"
                                    )}
                                  >
                                    {isActiveScope ? 'Active Scope' : 'Project'}
                                  </Badge>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Badge variant="outline" className="border-white/10 text-white/50">
                                    CRM scoped
                                  </Badge>
                                  <Badge variant="outline" className="border-white/10 text-white/50">
                                    Forms isolated
                                  </Badge>
                                  <Badge variant="outline" className="border-white/10 text-white/50">
                                    Workflow local
                                  </Badge>
                                </div>

                                <p className="mt-4 text-sm leading-6 text-white/50">
                                  Use this workspace when you want separate leads, separate pipeline activity, and separate automation behavior from the rest of the business.
                                </p>

                                <div className="mt-5 flex gap-2">
                                  <Button
                                    variant={isActiveScope ? 'secondary' : 'outline'}
                                    className={cn("flex-1", !isActiveScope && "border-white/10")}
                                    onClick={() => setSelectedProjectScopeId(project.id)}
                                  >
                                    {isActiveScope ? 'Selected' : 'Select'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => openProjectSettings(project)}
                                  >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-white/[0.04] p-4">
                            <FolderKanban className="h-8 w-8 text-white/30" />
                          </div>
                          <p className="text-lg font-semibold text-white">No project workspaces yet</p>
                          <p className="mt-2 text-sm text-white/45">
                            Create the first project to unlock isolated CRM, automation, and workspace settings.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="border-white/5 bg-white/[0.02]">
                      <CardHeader>
                        <CardTitle className="text-base">Automation Defaults</CardTitle>
                        <CardDescription>
                          Configure sender identity, timing, consent, and recipe packs once for this business.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          className="w-full border-white/10"
                          onClick={() => setActiveSection('automations')}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          Open Automation Defaults
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-white/[0.02]">
                      <CardHeader>
                        <CardTitle className="text-base">Team & Access</CardTitle>
                        <CardDescription>
                          Review who can operate this business container and who is still pending invitation.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          className="w-full border-white/10"
                          onClick={() => setActiveSection('team')}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Open Team Management
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-white/[0.02]">
                      <CardHeader>
                        <CardTitle className="text-base">Project CRM Scope</CardTitle>
                        <CardDescription>
                          Jump directly into the currently selected project workspace and manage live CRM activity there.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          className="w-full border-white/10"
                          onClick={() => setActiveSection('crm')}
                          disabled={!selectedScopeProject}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Open Active Workspace
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white/40">
            Select a business to manage
          </div>
        )}
      </main>

      {/* Dialogs */}
      <Dialog open={createBusinessOpen} onOpenChange={setCreateBusinessOpen}>
        <DialogContent className="bg-[#0d0d18] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Create Business</DialogTitle>
            <DialogDescription>Give your business a name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newBizName">Business Name</Label>
            <Input
              id="newBizName"
              value={newBusinessName}
              onChange={(e) => setNewBusinessName(e.target.value)}
              placeholder="My Agency"
              className="mt-2 bg-white/[0.03] border-white/10"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBusinessOpen(false)}>Cancel</Button>
            <Button onClick={createBusiness} disabled={creatingBusiness || !newBusinessName.trim()}>
              {creatingBusiness ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent className="bg-[#0d0d18] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new project in {selectedBusiness?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="projName">Project Name</Label>
              <Input
                id="projName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My Website"
                className="mt-2 bg-white/[0.03] border-white/10"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="projDesc">Description (optional)</Label>
              <Input
                id="projDesc"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="A brief description..."
                className="mt-2 bg-white/[0.03] border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>Cancel</Button>
            <Button onClick={createProject} disabled={creatingProject || !newProjectName.trim()}>
              {creatingProject ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-[#0d0d18] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.item && 'name' in itemToDelete.item ? itemToDelete.item.name : ''}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectSettingsPanel
        projectId={selectedProject?.id || ''}
        open={projectSettingsOpen}
        onOpenChange={(open) => {
          setProjectSettingsOpen(open);
          if (!open) {
            setSelectedProject(null);
          }
        }}
      />
    </div>
  );
}
