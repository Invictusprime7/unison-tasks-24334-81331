/**
 * CLOUD DASHBOARD - Immersive Unison Tasks Cloud Control Plane
 * 
 * Main hub for all cloud-based functionality:
 * - Profile & Account Management
 * - Business Entities
 * - Projects & Templates
 * - Assets & Media
 * - Email & Notifications
 * - Third-party Integrations
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cloud, User, Building2, FolderKanban, Image, Mail, 
  Plug, ArrowLeft, Settings, LogOut, Shield, 
  Sparkles, Activity, Globe, Database, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Cloud Tab Components
import { 
  CloudProfile, 
  CloudBusinesses, 
  CloudProjects, 
  CloudAssets, 
  CloudEmail, 
  CloudIntegrations,
  CloudSecurity,
  CloudTeams,
} from '@/components/cloud';

// Types
type CloudTab = 'profile' | 'businesses' | 'projects' | 'assets' | 'email' | 'integrations' | 'security' | 'teams';

interface TabConfig {
  id: CloudTab;
  label: string;
  icon: React.ReactNode;
  description: string;
  gradient: string;
}

const TABS: TabConfig[] = [
  { 
    id: 'profile', 
    label: 'Profile', 
    icon: <User className="h-5 w-5" />,
    description: 'Manage your account',
    gradient: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'businesses', 
    label: 'Businesses', 
    icon: <Building2 className="h-5 w-5" />,
    description: 'Organizations & teams',
    gradient: 'from-purple-500 to-pink-500'
  },
  { 
    id: 'projects', 
    label: 'Projects', 
    icon: <FolderKanban className="h-5 w-5" />,
    description: 'Templates & builds',
    gradient: 'from-green-500 to-emerald-500'
  },
  { 
    id: 'assets', 
    label: 'Assets', 
    icon: <Image className="h-5 w-5" />,
    description: 'Files & media',
    gradient: 'from-orange-500 to-yellow-500'
  },
  { 
    id: 'email', 
    label: 'Email', 
    icon: <Mail className="h-5 w-5" />,
    description: 'Notifications & templates',
    gradient: 'from-red-500 to-rose-500'
  },
  { 
    id: 'integrations', 
    label: 'Integrations', 
    icon: <Plug className="h-5 w-5" />,
    description: 'Connected services',
    gradient: 'from-indigo-500 to-violet-500'
  },
  { 
    id: 'security', 
    label: 'Security', 
    icon: <Shield className="h-5 w-5" />,
    description: 'Account protection',
    gradient: 'from-green-500 to-emerald-500'
  },
  { 
    id: 'teams', 
    label: 'Teams', 
    icon: <User className="h-5 w-5" />,
    description: 'Members & roles',
    gradient: 'from-pink-500 to-rose-500'
  },
];

// Animated Background Component
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Animated orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
    </div>
  );
}

// Status Indicator
function CloudStatusIndicator({ status }: { status: 'online' | 'syncing' | 'offline' }) {
  const colors = {
    online: 'bg-green-500',
    syncing: 'bg-yellow-500 animate-pulse',
    offline: 'bg-red-500',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", colors[status])} />
      <span className="text-xs text-slate-400 capitalize">{status}</span>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  gradient 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  gradient: string;
}) {
  return (
    <div className="relative group">
      <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity blur-xl", gradient)} />
      <div className="relative p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors">
        <div className={cn("inline-flex p-2 rounded-xl bg-gradient-to-r mb-3", gradient)}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// Navigation Tab Component
function NavTab({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: TabConfig; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all duration-300",
        isActive 
          ? "bg-white/[0.08] text-white" 
          : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
      )}
    >
      {isActive && (
        <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-r opacity-10", tab.gradient)} />
      )}
      <div className={cn(
        "relative p-2 rounded-lg transition-colors",
        isActive 
          ? cn("bg-gradient-to-r", tab.gradient)
          : "bg-white/[0.05]"
      )}>
        {tab.icon}
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="font-medium truncate">{tab.label}</p>
        <p className="text-xs text-slate-500 truncate">{tab.description}</p>
      </div>
    </button>
  );
}

// Main Cloud Dashboard Component
export default function CloudDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CloudTab>('profile');
  const [cloudStatus, setCloudStatus] = useState<'online' | 'syncing' | 'offline'>('online');
  const [stats, setStats] = useState({
    projects: 0,
    assets: 0,
    businesses: 0,
    integrations: 0,
  });

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        navigate('/');
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to access the Cloud Dashboard.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      // Load project count
      const { count: projectCount } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Load business count
      const { count: businessCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Load asset count (estimate from storage)
      const { data: assets } = await supabase.storage
        .from('project-assets')
        .list(user.id, { limit: 1000 });
      
      setStats({
        projects: projectCount || 0,
        businesses: businessCount || 0,
        assets: assets?.filter(a => a.name !== '.emptyFolderPlaceholder').length || 0,
        integrations: 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.',
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const renderTabContent = () => {
    if (!user) return null;
    
    switch (activeTab) {
      case 'profile':
        return <CloudProfile user={user} />;
      case 'businesses':
        return <CloudBusinesses userId={user.id} />;
      case 'projects':
        return <CloudProjects userId={user.id} />;
      case 'assets':
        return <CloudAssets userId={user.id} />;
      case 'email':
        return <CloudEmail userId={user.id} />;
      case 'integrations':
        return <CloudIntegrations userId={user.id} />;
      case 'security':
        return <CloudSecurity userId={user.id} />;
      case 'teams':
        return <CloudTeams userId={user.id} />;
      default:
        return <CloudProfile user={user} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
            <Cloud className="relative h-16 w-16 text-blue-400 animate-bounce mx-auto" />
          </div>
          <p className="mt-4 text-slate-400">Loading Cloud Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen text-white">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tasks
              </Button>
              <div className="h-6 w-px bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-lg opacity-50" />
                  <div className="relative p-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
                    <Cloud className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h1 className="font-bold text-lg flex items-center gap-2">
                    Unison Cloud
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                      Beta
                    </Badge>
                  </h1>
                  <p className="text-xs text-slate-500">Your personal control plane</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <CloudStatusIndicator status={cloudStatus} />
              <div className="h-6 w-px bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-slate-500">Free Plan</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-72 flex-shrink-0">
            <div className="sticky top-28 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<FolderKanban className="h-4 w-4" />}
                  label="Projects"
                  value={stats.projects}
                  gradient="from-green-500 to-emerald-500"
                />
                <StatCard
                  icon={<Image className="h-4 w-4" />}
                  label="Assets"
                  value={stats.assets}
                  gradient="from-orange-500 to-yellow-500"
                />
                <StatCard
                  icon={<Building2 className="h-4 w-4" />}
                  label="Businesses"
                  value={stats.businesses}
                  gradient="from-purple-500 to-pink-500"
                />
                <StatCard
                  icon={<Plug className="h-4 w-4" />}
                  label="Integrations"
                  value={stats.integrations}
                  gradient="from-indigo-500 to-violet-500"
                />
              </div>
              
              {/* Navigation */}
              <nav className="space-y-1">
                {TABS.map((tab) => (
                  <NavTab
                    key={tab.id}
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </nav>
              
              {/* Sign Out */}
              <div className="pt-4 border-t border-white/5">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </aside>
          
          {/* Main Panel */}
          <main className="flex-1 min-w-0">
            {/* Tab Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-2">
                <div className={cn("p-3 rounded-xl bg-gradient-to-r", activeTabConfig.gradient)}>
                  {activeTabConfig.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{activeTabConfig.label}</h2>
                  <p className="text-slate-400">{activeTabConfig.description}</p>
                </div>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="min-h-[600px]">
              <Suspense 
                fallback={
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                }
              >
                {renderTabContent()}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
