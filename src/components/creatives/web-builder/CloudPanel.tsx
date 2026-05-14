/**
 * Cloud Panel - Full Cloud dashboard access from within Web Builder
 * Exposes profile, projects, assets, email, integrations, security, AI usage,
 * plus inline business notification settings.
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud, Building2, Bell, ArrowLeft,
  Mail, Phone, Save, Loader2, ExternalLink, Check,
  User, FolderKanban, Image as ImageIcon, Plug, Shield, Sparkles, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CloudProfile,
  CloudProjects,
  CloudAssets,
  CloudEmail,
  CloudIntegrations,
  CloudSecurity,
  CloudAIUsage,
} from '@/components/cloud';

interface CloudPanelProps {
  businessId: string | null;
  businessName: string | null;
  onNavigateToCloud?: () => void;
}

interface BusinessSettings {
  id: string;
  name: string;
  notification_email: string | null;
  notification_phone: string | null;
}

type CloudPanelTab =
  | 'settings'
  | 'profile'
  | 'projects'
  | 'assets'
  | 'email'
  | 'integrations'
  | 'security'
  | 'ai-usage';

const TABS: { id: CloudPanelTab; label: string; icon: React.ElementType }[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'assets', label: 'Assets', icon: ImageIcon },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'ai-usage', label: 'AI Usage', icon: Sparkles },
];

export function CloudPanel({ businessId, businessName, onNavigateToCloud }: CloudPanelProps) {
  const [tab, setTab] = useState<CloudPanelTab>('settings');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationPhone, setNotificationPhone] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setAuthLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (businessId) loadBusinessSettings();
  }, [businessId]);

  const loadBusinessSettings = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, notification_email, notification_phone')
        .eq('id', businessId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings(data);
        setNotificationEmail(data.notification_email || '');
        setNotificationPhone(data.notification_phone || '');
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setNotificationEmail(value);
    setHasChanges(value !== (settings?.notification_email || '') ||
                  notificationPhone !== (settings?.notification_phone || ''));
  };

  const handlePhoneChange = (value: string) => {
    setNotificationPhone(value);
    setHasChanges(notificationEmail !== (settings?.notification_email || '') ||
                  value !== (settings?.notification_phone || ''));
  };

  const saveSettings = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          notification_email: notificationEmail.trim() || null,
          notification_phone: notificationPhone.trim() || null,
        })
        .eq('id', businessId);
      if (error) throw error;
      setSettings(prev => prev ? {
        ...prev,
        notification_email: notificationEmail.trim() || null,
        notification_phone: notificationPhone.trim() || null,
      } : null);
      setHasChanges(false);
      toast.success('Settings saved');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Cloud className="h-12 w-12 text-white/40 mb-4" />
        <h3 className="font-semibold text-white mb-2">Sign in required</h3>
        <p className="text-sm text-white/50 mb-4">
          Sign in to access Cloud features.
        </p>
      </div>
    );
  }

  const userId = user.id;

  return (
    <div className="h-full flex flex-col bg-[#0a0a12]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Cloud className="h-4 w-4 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {businessName || settings?.name || 'Cloud'}
            </p>
            {businessId && (
              <p className="text-[10px] text-white/40 truncate">{businessId}</p>
            )}
          </div>
        </div>
        {onNavigateToCloud && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300"
            onClick={onNavigateToCloud}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open full
          </Button>
        )}
      </div>

      {/* Tabs */}
      <ScrollArea className="border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1 px-2 py-1.5">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.25)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'settings' && (
          <SettingsTab
            businessId={businessId}
            loading={loading}
            notificationEmail={notificationEmail}
            notificationPhone={notificationPhone}
            onEmailChange={handleEmailChange}
            onPhoneChange={handlePhoneChange}
            onSave={saveSettings}
            hasChanges={hasChanges}
            saving={saving}
            settings={settings}
            businessName={businessName}
          />
        )}
        {tab === 'profile' && <div className="p-3"><CloudProfile user={user} /></div>}
        {tab === 'projects' && (
          <div className="p-3">
            <CloudProjects userId={userId} businessId={businessId || undefined} />
          </div>
        )}
        {tab === 'assets' && (
          <div className="p-3">
            <CloudAssets userId={userId} businessId={businessId || undefined} />
          </div>
        )}
        {tab === 'email' && <div className="p-3"><CloudEmail userId={userId} /></div>}
        {tab === 'integrations' && <div className="p-3"><CloudIntegrations userId={userId} /></div>}
        {tab === 'security' && <div className="p-3"><CloudSecurity userId={userId} /></div>}
        {tab === 'ai-usage' && <div className="p-3"><CloudAIUsage userId={userId} /></div>}
      </div>
    </div>
  );
}

function SettingsTab({
  businessId, loading, notificationEmail, notificationPhone,
  onEmailChange, onPhoneChange, onSave, hasChanges, saving, settings, businessName,
}: {
  businessId: string | null;
  loading: boolean;
  notificationEmail: string;
  notificationPhone: string;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSave: () => void;
  hasChanges: boolean;
  saving: boolean;
  settings: BusinessSettings | null;
  businessName: string | null;
}) {
  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Building2 className="h-10 w-10 text-white/40 mb-3" />
        <h3 className="font-semibold text-white text-sm mb-1">No business connected</h3>
        <p className="text-xs text-white/50">
          Open a project to manage business notifications.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10">
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-white/60" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {businessName || settings?.name || 'Business'}
            </p>
            <p className="text-[10px] text-white/40 truncate">{businessId}</p>
          </div>
          <Badge variant="outline" className="text-green-400 border-green-500/30 text-[10px]">Active</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-white/60" />
          <h4 className="text-sm font-medium text-white">Notifications</h4>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="np-email" className="text-xs text-white/70 flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> Notification Email
            </Label>
            <Input
              id="np-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="bookings@yourdomain.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-phone" className="text-xs text-white/70 flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Notification Phone
            </Label>
            <Input
              id="np-phone"
              type="tel"
              value={notificationPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+1 555 123 4567"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={onSave} disabled={!hasChanges || saving}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</>
            : hasChanges ? <><Save className="h-3.5 w-3.5 mr-1.5" />Save Changes</>
            : <><Check className="h-3.5 w-3.5 mr-1.5" />Saved</>}
        </Button>
      </div>
    </div>
  );
}
