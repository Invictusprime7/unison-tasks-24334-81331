/**
 * CLOUD PROJECTS - Immersive project/template management
 */

import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, Plus, Globe, Eye, Settings, Trash2, ExternalLink,
  Sparkles, Rocket, Layout, Code2, Palette, Clock, ChevronRight,
  MoreVertical, Copy, Archive, Star, FileText, Home, GripVertical, Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { downloadMultiPageSite } from '@/utils/multiPageExporter';

interface CloudProjectsProps {
  userId: string;
  businessId?: string; // When provided, scope projects to this business
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
}

interface ProjectPage {
  id: string;
  slug: string;
  title: string;
  templateId?: string;
  isHome?: boolean;
  order: number;
}

export function CloudProjects({ userId, businessId: propBusinessId, onProjectSelect }: CloudProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(propBusinessId || null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  
  // Page Map state
  const [pageMapOpen, setPageMapOpen] = useState(false);
  const [pageMapProject, setPageMapProject] = useState<Project | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [savingPages, setSavingPages] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load user's businesses first, then projects
  useEffect(() => {
    if (userId) {
      loadBusinesses();
    }
  }, [userId]);

  // When business is selected (or auto-selected), load projects
  useEffect(() => {
    if (selectedBusinessId) {
      loadProjects();
    } else if (businesses.length > 0 && !selectedBusinessId) {
      // Auto-select first business if none selected
      setSelectedBusinessId(businesses[0].id);
    }
  }, [selectedBusinessId, businesses]);

  const loadBusinesses = async () => {
    try {
      // Load businesses where user is owner OR member
      const { data: ownedBusinesses, error: ownedError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', userId);

      const { data: memberBusinesses, error: memberError } = await supabase
        .from('business_members')
        .select('business:businesses(id, name)')
        .eq('user_id', userId);

      if (ownedError && memberError) {
        console.log('Businesses not available:', ownedError?.message);
        setBusinesses([]);
      } else {
        const owned = (ownedBusinesses || []) as Business[];
        const memberOf = (memberBusinesses || [])
          .map((m: any) => m.business)
          .filter(Boolean) as Business[];
        
        // Combine and dedupe
        const allBusinesses = [...owned];
        memberOf.forEach(b => {
          if (!allBusinesses.find(ob => ob.id === b.id)) {
            allBusinesses.push(b);
          }
        });
        
        setBusinesses(allBusinesses);
        
        // Auto-select if only one business or if propBusinessId provided
        if (propBusinessId) {
          setSelectedBusinessId(propBusinessId);
        } else if (allBusinesses.length === 1) {
          setSelectedBusinessId(allBusinesses[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      setBusinesses([]);
    }
  };

  const loadProjects = async () => {
    if (!selectedBusinessId) {
      setLoading(false);
      return;
    }

    try {
      // Query projects by business_id (not owner_id)
      // This enables team access - all business members see projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('business_id', selectedBusinessId)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to owner_id for backwards compatibility during migration
        console.log('Business-scoped query failed, falling back to owner_id:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.log('Projects table not available:', fallbackError.message);
          setProjects([]);
        } else {
          setProjects(fallbackData || []);
        }
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    if (!selectedBusinessId) {
      toast({
        title: 'No business selected',
        description: 'Please select or create a business first.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      // Generate a URL-friendly slug from the project name
      const slug = newProjectName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 50);

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName,
          description: newProjectDescription || null,
          slug,
          owner_id: userId, // Keep for backwards compatibility
          business_id: selectedBusinessId, // PRIMARY scope - this is the key change
          status: 'draft',
          publish_status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // FIX: Correct spread operator (was [data, .projects] before)
      setProjects([data, ...projects]);
      setCreateOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');

      toast({
        title: 'Project created',
        description: `${newProjectName} has been created.`,
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const duplicateProject = async (project: Project) => {
    setDuplicating(project.id);
    try {
      const newSlug = `${project.slug || project.name.toLowerCase().replace(/\s+/g, '-')}-copy-${Date.now().toString(36)}`;
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: `${project.name} (Copy)`,
          description: project.description,
          slug: newSlug,
          owner_id: userId,
          business_id: project.business_id || selectedBusinessId,
          status: 'draft',
          publish_status: 'draft',
          settings: project.settings,
        })
        .select()
        .single();

      if (error) throw error;

      setProjects([data, ...projects]);
      toast({
        title: 'Project duplicated',
        description: `${project.name} has been duplicated.`,
      });
    } catch (error: any) {
      console.error('Error duplicating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate project.',
        variant: 'destructive',
      });
    } finally {
      setDuplicating(null);
    }
  };

  const toggleFavorite = async (project: Project) => {
    // NOTE: Favorites feature requires 'settings' column in projects table
    // For now, track favorites in local state only
    try {
      setProjects(projects.map(p => 
        p.id === project.id 
          ? { ...p, settings: { ...p.settings, isFavorite: !p.settings?.isFavorite } }
          : p
      ));
      
      toast({
        title: 'Favorites updated',
        description: `${project.name} favorite status updated.`,
      });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status.',
        variant: 'destructive',
      });
    }
  };

  // Open page map for a project
  const openPageMap = (project: Project) => {
    setPageMapProject(project);
    setPageMapOpen(true);
    setNewPageTitle('');
    setNewPageSlug('');
  };

  // Get pages from project settings
  const getProjectPages = (project: Project): ProjectPage[] => {
    const pages = project.settings?.pages || [];
    // If no pages exist, create default home page
    if (pages.length === 0) {
      return [{
        id: 'home',
        slug: '/',
        title: 'Home',
        isHome: true,
        order: 0,
      }];
    }
    return pages.sort((a: ProjectPage, b: ProjectPage) => a.order - b.order);
  };

  // Add a new page
  const addPage = async () => {
    if (!pageMapProject || !newPageTitle.trim()) return;
    
    const pages = getProjectPages(pageMapProject);
    const slug = newPageSlug.trim() 
      || '/' + newPageTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check for duplicate slug
    if (pages.some(p => p.slug === slug)) {
      toast({
        title: 'Duplicate slug',
        description: 'A page with this URL already exists.',
        variant: 'destructive',
      });
      return;
    }
    
    const newPage: ProjectPage = {
      id: `page-${Date.now()}`,
      slug,
      title: newPageTitle.trim(),
      isHome: false,
      order: pages.length,
    };
    
    const updatedPages = [...pages, newPage];
    await saveProjectPages(pageMapProject.id, updatedPages);
    setNewPageTitle('');
    setNewPageSlug('');
  };

  // Remove a page
  const removePage = async (pageId: string) => {
    if (!pageMapProject) return;
    
    const pages = getProjectPages(pageMapProject);
    const page = pages.find(p => p.id === pageId);
    
    if (page?.isHome) {
      toast({
        title: 'Cannot delete home page',
        description: 'Set another page as home first.',
        variant: 'destructive',
      });
      return;
    }
    
    const updatedPages = pages
      .filter(p => p.id !== pageId)
      .map((p, i) => ({ ...p, order: i }));
    
    await saveProjectPages(pageMapProject.id, updatedPages);
  };

  // Set a page as home
  const setAsHomePage = async (pageId: string) => {
    if (!pageMapProject) return;
    
    const pages = getProjectPages(pageMapProject);
    const updatedPages = pages.map(p => ({
      ...p,
      isHome: p.id === pageId,
      slug: p.id === pageId ? '/' : (p.slug === '/' ? `/${p.title.toLowerCase().replace(/\s+/g, '-')}` : p.slug),
    }));
    
    await saveProjectPages(pageMapProject.id, updatedPages);
  };

  // Save pages to project settings
  // NOTE: Requires 'settings' column in projects table - use description field as workaround
  const saveProjectPages = async (projectId: string, pages: ProjectPage[]) => {
    setSavingPages(true);
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      // Store pages in local state only until settings column is added
      const updatedProject = {
        ...project,
        settings: { ...project.settings, pages },
      };
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
      setPageMapProject(updatedProject);
      
      toast({
        title: 'Pages updated',
        description: 'Project pages have been saved locally.',
      });
    } catch (error: any) {
      console.error('Error saving pages:', error);
      toast({
        title: 'Error',
        description: 'Failed to save pages.',
        variant: 'destructive',
      });
    } finally {
      setSavingPages(false);
    }
  };

  // Export multi-page site as ZIP
  const exportSite = async () => {
    if (!pageMapProject) return;
    
    setExporting(true);
    try {
      const pages = getProjectPages(pageMapProject).map(page => ({
        ...page,
        // In a real implementation, fetch HTML/CSS from each page's template
        html: page.templateId 
          ? `<div>Page content for ${page.title}</div>` 
          : `<div><h1>${page.title}</h1><p>Page content here</p></div>`,
        css: '',
      }));
      
      const success = await downloadMultiPageSite({
        projectName: pageMapProject.name,
        pages,
      });
      
      if (success) {
        toast({
          title: 'Export complete',
          description: 'Your site has been downloaded as a ZIP file.',
        });
      } else {
        toast({
          title: 'Export issue',
          description: 'Could not create ZIP file. Check console for file list.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error exporting site:', error);
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export site.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== project.id));
      toast({
        title: 'Project deleted',
        description: `${project.name} has been deleted.`,
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
            <Globe className="h-3 w-3" />
            Published
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1">
            <Code2 className="h-3 w-3" />
            Draft
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="text-slate-400 gap-1">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="h-48 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project List */}
      {projects.length === 0 ? (
        <div className="relative rounded-2xl border-2 border-dashed border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
          <div className="relative text-center py-20 px-4">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-700/50 border border-white/10">
                <Rocket className="h-12 w-12 text-purple-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Launch your first project</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Create a new project to start building stunning websites with AI-powered templates and automation.
            </p>
            <div className="flex gap-3 justify-center">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                      Create New Project
                    </DialogTitle>
                    <DialogDescription>
                      Give your project a name to get started.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="My Landing Page"
                        className="bg-slate-800/50 border-white/10"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10">
                      Cancel
                    </Button>
                    <Button 
                      onClick={createProject} 
                      disabled={creating || !newProjectName.trim()}
                      className="bg-gradient-to-r from-purple-600 to-blue-600"
                    >
                      {creating ? 'Creating...' : 'Create Project'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/web-builder')} className="border-white/10">
                <Layout className="h-4 w-4 mr-2" />
                Open Builder
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <FolderKanban className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-slate-500">Total Projects</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Globe className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.filter(p => p.status === 'published').length}</p>
                <p className="text-xs text-slate-500">Published</p>
              </div>
            </div>
            <div className="flex-1" />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    Create New Project
                  </DialogTitle>
                  <DialogDescription>
                    Give your project a name to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName2">Project Name</Label>
                    <Input
                      id="projectName2"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="My Landing Page"
                      className="bg-slate-800/50 border-white/10"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10">
                    Cancel
                  </Button>
                  <Button 
                    onClick={createProject} 
                    disabled={creating || !newProjectName.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="group relative rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5"
              >
                {/* Preview placeholder */}
                <div className="h-32 bg-gradient-to-br from-purple-500/10 via-slate-800/50 to-blue-500/10 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Palette className="h-8 w-8 text-slate-600" />
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(project.status)}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-500 font-mono">/{project.slug}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                        <DropdownMenuItem onClick={() => openPageMap(project)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Pages ({getProjectPages(project).length})
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem 
                          onClick={() => duplicateProject(project)}
                          disabled={duplicating === project.id}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {duplicating === project.id ? 'Duplicating...' : 'Duplicate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleFavorite(project)}>
                          <Star className={cn(
                            "h-4 w-4 mr-2",
                            project.settings?.isFavorite && "fill-amber-400 text-amber-400"
                          )} />
                          {project.settings?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem 
                          className="text-red-400 focus:text-red-400"
                          onClick={() => deleteProject(project)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white border-0"
                      onClick={() => {
                        // Pass full cloud context to WebBuilder via navigation state
                        // This enables proper business-scoped operations in the builder
                        const builderState = {
                          projectId: project.id,
                          businessId: project.business_id || selectedBusinessId,
                          projectName: project.name,
                          projectSlug: project.slug,
                          publishStatus: project.publish_status || project.status,
                          customDomain: project.custom_domain,
                          // For systems that have specific manifest installed
                          manifestId: project.settings?.manifestId,
                          systemType: project.settings?.systemType,
                        };
                        
                        // Call optional callback for embedded usage
                        if (onProjectSelect) {
                          onProjectSelect(project);
                        }
                        
                        navigate('/web-builder', { state: builderState });
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {(project.status === 'published' || project.publish_status === 'published') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const url = project.custom_domain 
                            ? `https://${project.custom_domain}`
                            : `/preview/${project.slug || project.id}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Page Map Dialog */}
      <Dialog open={pageMapOpen} onOpenChange={setPageMapOpen}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Page Map: {pageMapProject?.name}
            </DialogTitle>
            <DialogDescription>
              Manage multi-page navigation for your project. Each page can have its own template.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Pages List */}
            <div className="space-y-2">
              {pageMapProject && getProjectPages(pageMapProject).map((page) => (
                <div 
                  key={page.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 group"
                >
                  <GripVertical className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 cursor-grab" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{page.title}</span>
                      {page.isHome && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                          <Home className="h-3 w-3 mr-1" />
                          Home
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 font-mono">{page.slug}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!page.isHome && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => setAsHomePage(page.id)}
                        title="Set as home page"
                      >
                        <Home className="h-4 w-4" />
                      </Button>
                    )}
                    {!page.isHome && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        onClick={() => removePage(page.id)}
                        title="Delete page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add New Page */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-medium text-slate-300 mb-3">Add New Page</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      // Auto-generate slug from title
                      const autoSlug = '/' + e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                      if (!newPageSlug || newPageSlug === '/' + newPageTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
                        setNewPageSlug(autoSlug);
                      }
                    }}
                    placeholder="Page title (e.g., About Us)"
                    className="bg-slate-800/50 border-white/10"
                  />
                </div>
                <div className="w-40">
                  <Input
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                    placeholder="/about"
                    className="bg-slate-800/50 border-white/10 font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={addPage}
                  disabled={!newPageTitle.trim() || savingPages}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={exportSite}
              disabled={exporting}
              className="border-white/10"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Site'}
            </Button>
            <Button variant="outline" onClick={() => setPageMapOpen(false)} className="border-white/10">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
