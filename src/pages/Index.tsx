import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { AlertCircle, Zap } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { SystemLauncher } from "@/components/onboarding/SystemLauncher";
import { 
  NavigationBar,
  HeroSection, 
  RecentProjectsSection,
  DifferenceSection,
  IntegrationsSection,
  FeaturesSection,
  PricingSection,
  CTASection,
  FooterSection,
  type RecentProject
} from "@/components/home/sections";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    if (!isSupabaseConfigured) {
      console.warn('⚠️ Backend is not properly configured. Some features may not work.');
    }

    return () => subscription.unsubscribe();
  }, []);

  // Load recent projects when user is authenticated
  useEffect(() => {
    const loadRecentProjects = async () => {
      if (!user || !isSupabaseConfigured) return;
      
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('design_templates')
          .select('id, name, description, is_public, updated_at, created_at, canvas_data')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(4);

        if (error) {
          console.error('Error loading recent projects:', error);
        } else {
          setRecentProjects(data || []);
        }
      } catch (err) {
        console.error('Failed to load recent projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadRecentProjects();
  }, [user]);

  // Load connected integrations when user is authenticated
  useEffect(() => {
    const loadConnectedIntegrations = async () => {
      if (!user || !isSupabaseConfigured) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', user.id)
          .single();

        if (data?.settings) {
          const settings = typeof data.settings === 'string' 
            ? JSON.parse(data.settings) 
            : data.settings;
            
          if (settings.integrations) {
            const connected: Record<string, boolean> = {};
            Object.keys(settings.integrations).forEach(key => {
              connected[key] = settings.integrations[key]?.connected || false;
            });
            setConnectedIntegrations(connected);
          }
        }
      } catch (error) {
        console.error('Error loading connected integrations:', error);
      }
    };

    loadConnectedIntegrations();
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } else {
      setUser(null);
    }
  };

  const handleStartLauncher = () => {
    setLauncherOpen(true);
  };

  const handleConnectIntegration = async (integrationId: string, apiKey: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    const currentSettings = existingSettings?.settings 
      ? (typeof existingSettings.settings === 'string' 
          ? JSON.parse(existingSettings.settings) 
          : existingSettings.settings)
      : {};

    const newSettings = {
      ...currentSettings,
      integrations: {
        ...(currentSettings.integrations || {}),
        [integrationId]: {
          connected: true,
          connectedAt: new Date().toISOString(),
        },
      },
    };

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings: newSettings,
      });

    setConnectedIntegrations(prev => ({
      ...prev,
      [integrationId]: true
    }));
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    if (!user) return;

    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    const currentSettings = existingSettings?.settings 
      ? (typeof existingSettings.settings === 'string' 
          ? JSON.parse(existingSettings.settings) 
          : existingSettings.settings)
      : {};

    const newIntegrations = { ...(currentSettings.integrations || {}) };
    delete newIntegrations[integrationId];

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings: {
          ...currentSettings,
          integrations: newIntegrations,
        },
      });

    setConnectedIntegrations(prev => {
      const updated = { ...prev };
      delete updated[integrationId];
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <Zap className="h-10 w-10 text-cyan-400 animate-pulse mx-auto mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" />
          <p className="text-cyan-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] relative">
      {/* Pixelated grid background - entire page */}
      <div 
        className="fixed inset-0 opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300ffff' fill-opacity='0.15'%3E%3Crect x='0' y='0' width='4' height='4'/%3E%3Crect x='20' y='0' width='4' height='4'/%3E%3Crect x='0' y='20' width='4' height='4'/%3E%3Crect x='20' y='20' width='4' height='4'/%3E%3Crect x='10' y='10' width='4' height='4'/%3E%3Crect x='30' y='10' width='4' height='4'/%3E%3Crect x='10' y='30' width='4' height='4'/%3E%3Crect x='30' y='30' width='4' height='4'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      />
      {/* Scanline effect - entire page */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)',
        }}
      />
      {/* Configuration Warning */}
      {!isSupabaseConfigured && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <div className="container mx-auto flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              <strong>Configuration Warning:</strong> Backend environment variables are not properly set.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <NavigationBar
        user={user}
        docsOpen={docsOpen}
        onDocsOpenChange={setDocsOpen}
        onSignOut={handleSignOut}
        onStartLauncher={handleStartLauncher}
      />

      {/* Hero Section */}
      <HeroSection 
        user={user}
        onStartLauncher={handleStartLauncher}
        onAuthRequired={() => navigate("/auth")}
      />

      {/* Recent Projects Section - Only visible for authenticated users */}
      {user && (
        <RecentProjectsSection
          projects={recentProjects}
          loading={loadingProjects}
          onStartLauncher={handleStartLauncher}
        />
      )}

      {/* The Difference Section */}
      <DifferenceSection />

      {/* Integrations Section */}
      <IntegrationsSection
        connectedIntegrations={connectedIntegrations}
        onConnectIntegration={handleConnectIntegration}
        onDisconnectIntegration={handleDisconnectIntegration}
      />

      {/* Features Section */}
      <FeaturesSection />

      {/* Pricing Section */}
      <PricingSection onStartLauncher={handleStartLauncher} />

      {/* CTA Section */}
      <CTASection onStartLauncher={handleStartLauncher} />

      {/* Footer */}
      <FooterSection />

      {/* System Launcher Wizard - Industry → Theme → Template */}
      <SystemLauncher open={launcherOpen} onOpenChange={setLauncherOpen} />
    </div>
  );
};

export default Index;
