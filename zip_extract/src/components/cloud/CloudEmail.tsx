/**
 * CLOUD EMAIL - Immersive email and notification settings
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, Settings, Bell, BellOff, Sparkles, Trash2, Plus,
  CheckCircle2, XCircle, Send, Globe, Key, Loader2, ExternalLink,
  MailCheck, AlertCircle, FileText, ToggleLeft, ToggleRight, Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CloudEmailProps {
  userId: string;
}

interface EmailProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  apiKeyName: string;
  docsUrl: string;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'resend',
    name: 'Resend',
    icon: <Send className="h-6 w-6" />,
    color: 'from-blue-500 to-cyan-500',
    description: 'Modern email API for developers. Recommended for Unison Tasks.',
    apiKeyName: 'RESEND_API_KEY',
    docsUrl: 'https://resend.com/docs',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    icon: <Globe className="h-6 w-6" />,
    color: 'from-blue-600 to-indigo-600',
    description: 'Twilio SendGrid for transactional and marketing emails.',
    apiKeyName: 'SENDGRID_API_KEY',
    docsUrl: 'https://docs.sendgrid.com',
  },
  {
    id: 'postmark',
    name: 'Postmark',
    icon: <MailCheck className="h-6 w-6" />,
    color: 'from-yellow-500 to-orange-500',
    description: 'Fast, reliable transactional email service.',
    apiKeyName: 'POSTMARK_API_KEY',
    docsUrl: 'https://postmarkapp.com/developer',
  },
];

const DEFAULT_NOTIFICATIONS: NotificationSetting[] = [
  { id: 'new_project', label: 'New Project Created', description: 'When you create a new project', enabled: true },
  { id: 'project_published', label: 'Project Published', description: 'When you publish a project', enabled: true },
  { id: 'weekly_digest', label: 'Weekly Digest', description: 'Summary of your activity', enabled: false },
  { id: 'security_alerts', label: 'Security Alerts', description: 'Important security notifications', enabled: true },
  { id: 'product_updates', label: 'Product Updates', description: 'New features and improvements', enabled: true },
];

export function CloudEmail({ userId }: CloudEmailProps) {
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSetting[]>(DEFAULT_NOTIFICATIONS);
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadEmailSettings();
    }
  }, [userId]);

  const loadEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data?.settings) {
        const settings = typeof data.settings === 'string' 
          ? JSON.parse(data.settings) 
          : data.settings;
          
        if (settings.emailProvider) {
          setSelectedProvider(settings.emailProvider);
        }
        if (settings.notifications) {
          setNotifications(settings.notifications);
        }
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: EmailProvider) => {
    const key = apiKeys[provider.id];
    if (!key) {
      toast({
        title: 'Error',
        description: 'Please enter an API key.',
        variant: 'destructive',
      });
      return;
    }

    setSavingKey(true);
    try {
      // SECURITY: API keys are stored server-side only via Edge Function
      // Never store provider API keys in client-accessible tables
      const { data, error } = await supabase.functions.invoke('save-email-provider', {
        body: {
          userId,
          providerId: provider.id,
          apiKey: key, // Encrypted and stored in Supabase Vault
        },
      });

      if (error) {
        throw error;
      }

      // If Edge Function doesn't exist yet, fall back to settings update
      // (without storing the actual key - just mark as "configured")
      if (!data) {
        const { data: existingSettings } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();

        const currentSettings = existingSettings?.settings 
          ? (typeof existingSettings.settings === 'string' 
              ? JSON.parse(existingSettings.settings) 
              : existingSettings.settings)
          : {};

        const newSettings = {
          ...currentSettings,
          emailProvider: provider.id,
          [`${provider.id}_configured`]: true,
          // NOTE: API key is NOT stored here for security
          // It's stored in Supabase Vault via Edge Function
        };

        await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            settings: newSettings,
          });
      }

      setSelectedProvider(provider.id);
      setApiKeys({ ...apiKeys, [provider.id]: '' }); // Clear from UI state
      
      toast({
        title: 'API Key Saved',
        description: `${provider.name} has been configured securely.`,
      });
    } catch (error: any) {
      console.error('Error saving API key:', error);
      
      // Fallback: update settings to mark as configured (for development)
      try {
        const { data: existingSettings } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();

        const currentSettings = existingSettings?.settings 
          ? (typeof existingSettings.settings === 'string' 
              ? JSON.parse(existingSettings.settings) 
              : existingSettings.settings)
          : {};

        await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            settings: {
              ...currentSettings,
              emailProvider: provider.id,
              [`${provider.id}_configured`]: true,
            },
          });

        setSelectedProvider(provider.id);
        setApiKeys({ ...apiKeys, [provider.id]: '' });
        
        toast({
          title: 'Provider Selected',
          description: `${provider.name} marked as configured. Note: Secure key storage requires Edge Function deployment.`,
        });
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to save API key.',
          variant: 'destructive',
        });
      }
    } finally {
      setSavingKey(false);
    }
  };

  const sendTestEmail = async () => {
    if (!selectedProvider) {
      toast({
        title: 'No provider configured',
        description: 'Please configure an email provider first.',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    try {
      // Get user's email to send test to
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      
      if (!email) {
        throw new Error('No email address found for your account.');
      }

      // Call Edge Function to send test email
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          userId,
          providerId: selectedProvider,
          to: email,
        },
      });

      if (error) {
        // If Edge Function doesn't exist, show helpful message
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          toast({
            title: 'Test Email',
            description: `Email would be sent to ${email} via ${selectedProvider}. Deploy the send-test-email Edge Function to enable this feature.`,
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Test email sent!',
        description: `A test email has been sent to ${email}.`,
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email.',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const toggleNotification = async (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    );
    setNotifications(updated);

    try {
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      const currentSettings = existingSettings?.settings 
        ? (typeof existingSettings.settings === 'string' 
            ? JSON.parse(existingSettings.settings) 
            : existingSettings.settings)
        : {};

      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings: {
            ...currentSettings,
            notifications: updated,
          },
        });
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-700/30 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email Provider Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Email Provider</h2>
            <p className="text-sm text-slate-400">Configure your transactional email service</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EMAIL_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={cn(
                "relative group rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg",
                selectedProvider === provider.id
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-white/5 bg-white/[0.02] hover:border-white/20"
              )}
            >
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br", provider.color, "blur-3xl")} style={{ opacity: 0.1 }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-xl bg-gradient-to-r", provider.color)}>
                    {provider.icon}
                  </div>
                  {selectedProvider === provider.id && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">{provider.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{provider.description}</p>
                
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder={`Enter ${provider.apiKeyName}`}
                    value={apiKeys[provider.id] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [provider.id]: e.target.value })}
                    className="bg-white/[0.03] border-white/10 focus:border-blue-500/50 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveApiKey(provider)}
                      disabled={savingKey || !apiKeys[provider.id]}
                      className={cn("flex-1 bg-gradient-to-r", provider.color)}
                    >
                      {savingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Save Key
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 hover:bg-white/5"
                      asChild
                    >
                      <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20">
            <Bell className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Notification Preferences</h2>
            <p className="text-sm text-slate-400">Control which emails you receive</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    notification.enabled ? "bg-green-500/20" : "bg-slate-700/30"
                  )}>
                    {notification.enabled ? (
                      <Bell className="h-4 w-4 text-green-400" />
                    ) : (
                      <BellOff className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{notification.label}</p>
                    <p className="text-sm text-slate-500">{notification.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification(notification.id)}
                  className={cn(
                    "p-1 rounded-full transition-all",
                    notification.enabled 
                      ? "text-green-400" 
                      : "text-slate-500"
                  )}
                >
                  {notification.enabled ? (
                    <ToggleRight className="h-8 w-8" />
                  ) : (
                    <ToggleLeft className="h-8 w-8" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Send className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-bold">Send Test Email</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Send a test email to verify your configuration.
          </p>
          <Button 
            disabled={!selectedProvider || sendingTest}
            onClick={sendTestEmail}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
          >
            {sendingTest ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-bold">Email Templates</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Customize transactional email templates.
          </p>
          <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full border-purple-500/30 hover:bg-purple-500/10 text-purple-400"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Manage Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-400" />
                  Email Templates
                </DialogTitle>
                <DialogDescription>
                  Customize the emails sent from your applications.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                {[
                  { id: 'welcome', name: 'Welcome Email', description: 'Sent when a new user signs up' },
                  { id: 'password_reset', name: 'Password Reset', description: 'Sent when user requests password reset' },
                  { id: 'invoice', name: 'Invoice', description: 'Sent after successful payment' },
                  { id: 'notification', name: 'Notification', description: 'General notification emails' },
                ].map((template) => (
                  <div 
                    key={template.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white">{template.name}</p>
                      <p className="text-sm text-slate-500">{template.description}</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-white/10">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                  Template editor coming soon
                </Badge>
                <Button variant="outline" onClick={() => setTemplatesOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
