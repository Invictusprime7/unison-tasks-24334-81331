/**
 * CLOUD EMAIL - Immersive email and notification settings
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Key,
  Loader2,
  Mail,
  MailCheck,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  previewText: string;
  html: string;
  active: boolean;
  updatedAt: string;
}

type TemplateMode = 'browse' | 'edit';

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

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Sent when a new user signs up.',
    subject: 'Welcome to Unison Tasks',
    previewText: 'Your workspace is ready. Here is how to get started.',
    html: '<h1>Welcome to Unison Tasks</h1><p>Your workspace is ready. Start by creating a business, then launch your first project.</p>',
    active: true,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'password_reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset.',
    subject: 'Reset your password',
    previewText: 'Use the secure link below to reset your password.',
    html: '<h1>Reset your password</h1><p>Click the secure reset link to choose a new password for your account.</p>',
    active: true,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'invoice',
    name: 'Invoice',
    description: 'Sent after a successful payment.',
    subject: 'Your receipt from Unison Tasks',
    previewText: 'Your payment went through and your invoice is attached.',
    html: '<h1>Payment received</h1><p>Thanks for your payment. Your invoice is attached for your records.</p>',
    active: true,
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'notification',
    name: 'Notification',
    description: 'General product and workflow notifications.',
    subject: 'Update from Unison Tasks',
    previewText: 'There is new activity in your workspace.',
    html: '<h1>Workspace update</h1><p>There is new activity in your workspace. Open Unison Tasks to review it.</p>',
    active: true,
    updatedAt: new Date(0).toISOString(),
  },
];

const normalizeTemplate = (template: Partial<EmailTemplate>, fallback: EmailTemplate): EmailTemplate => ({
  id: template.id || fallback.id,
  name: template.name || fallback.name,
  description: template.description || fallback.description,
  subject: template.subject || fallback.subject,
  previewText: template.previewText || fallback.previewText,
  html: template.html || fallback.html,
  active: template.active ?? fallback.active,
  updatedAt: template.updatedAt || fallback.updatedAt,
});

const mergeTemplates = (templates: unknown): EmailTemplate[] => {
  const persistedTemplates = Array.isArray(templates) ? templates : [];

  return DEFAULT_EMAIL_TEMPLATES.map((fallback) => {
    const persisted = persistedTemplates.find(
      (template): template is Partial<EmailTemplate> =>
        typeof template === 'object' && template !== null && 'id' in template && template.id === fallback.id
    );
    return normalizeTemplate(persisted || {}, fallback);
  });
};

function isMissingUserSettingsError(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    status?: number;
    message?: string;
    details?: string;
  } | null;
  const combined = [candidate?.message, candidate?.details].filter(Boolean).join(' ').toLowerCase();
  return (
    candidate?.code === '42P01' ||
    candidate?.code === 'PGRST205' ||
    candidate?.status === 404 ||
    combined.includes('user_settings')
  );
}

export function CloudEmail({ userId }: CloudEmailProps) {
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSetting[]>(DEFAULT_NOTIFICATIONS);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateMode, setTemplateMode] = useState<TemplateMode>('browse');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_EMAIL_TEMPLATES[0].id);
  const [templateDraft, setTemplateDraft] = useState<EmailTemplate>(DEFAULT_EMAIL_TEMPLATES[0]);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const { toast } = useToast();

  const selectedTemplate = useMemo(
    () => emailTemplates.find((template) => template.id === selectedTemplateId) || emailTemplates[0] || DEFAULT_EMAIL_TEMPLATES[0],
    [emailTemplates, selectedTemplateId]
  );

  useEffect(() => {
    if (userId) {
      void loadEmailSettings();
    }
  }, [userId]);

  useEffect(() => {
    if (!templatesOpen || !selectedTemplate) return;
    setTemplateDraft(selectedTemplate);
  }, [selectedTemplate, templatesOpen]);

  const getUserSettings = async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      if (isMissingUserSettingsError(error)) {
        return {};
      }
      throw error;
    }

    const rawSettings = data?.[0]?.settings;
    return typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings || {};
  };

  const saveUserSettings = async (updater: (current: Record<string, any>) => Record<string, any>) => {
    const currentSettings = await getUserSettings();
    const nextSettings = updater(currentSettings);

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      settings: nextSettings,
    });

    if (error && !isMissingUserSettingsError(error)) {
      throw error;
    }

    return nextSettings;
  };

  const loadEmailSettings = async () => {
    try {
      const settings = await getUserSettings();

      if (settings.emailProvider) {
        setSelectedProvider(settings.emailProvider);
      }
      if (Array.isArray(settings.notifications)) {
        setNotifications(settings.notifications);
      }

      const templates = mergeTemplates(settings.emailTemplates);
      setEmailTemplates(templates);
      setSelectedTemplateId(templates[0]?.id || DEFAULT_EMAIL_TEMPLATES[0].id);
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
      const { data, error } = await supabase.functions.invoke('save-email-provider', {
        body: {
          userId,
          providerId: provider.id,
          apiKey: key,
        },
      });

      if (error) {
        throw error;
      }

      if (!data) {
        await saveUserSettings((currentSettings) => ({
          ...currentSettings,
          emailProvider: provider.id,
          [`${provider.id}_configured`]: true,
        }));
      }

      setSelectedProvider(provider.id);
      setApiKeys((current) => ({ ...current, [provider.id]: '' }));

      toast({
        title: 'API Key Saved',
        description: `${provider.name} has been configured securely.`,
      });
    } catch (error: any) {
      console.error('Error saving API key:', error);

      try {
        await saveUserSettings((currentSettings) => ({
          ...currentSettings,
          emailProvider: provider.id,
          [`${provider.id}_configured`]: true,
        }));

        setSelectedProvider(provider.id);
        setApiKeys((current) => ({ ...current, [provider.id]: '' }));

        toast({
          title: 'Provider Selected',
          description: `${provider.name} marked as configured. Secure provider storage still needs the email Edge Function.`,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email;

      if (!email) {
        throw new Error('No email address found for your account.');
      }

      const { error } = await supabase.functions.invoke('send-test-email', {
        body: {
          userId,
          providerId: selectedProvider,
          to: email,
        },
      });

      if (error) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          toast({
            title: 'Test Email',
            description: `Email would be sent to ${email} via ${selectedProvider}. Deploy the send-test-email Edge Function to enable sending.`,
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Test email sent',
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
    const updated = notifications.map((notification) =>
      notification.id === id ? { ...notification, enabled: !notification.enabled } : notification
    );
    setNotifications(updated);

    try {
      await saveUserSettings((currentSettings) => ({
        ...currentSettings,
        notifications: updated,
      }));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const persistTemplates = async (nextTemplates: EmailTemplate[]) => {
    setSavingTemplates(true);
    try {
      await saveUserSettings((currentSettings) => ({
        ...currentSettings,
        emailTemplates: nextTemplates,
      }));
      setEmailTemplates(nextTemplates);
      toast({
        title: 'Templates saved',
        description: 'Email template changes are now persisted.',
      });
    } catch (error) {
      console.error('Error saving templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template changes.',
        variant: 'destructive',
      });
    } finally {
      setSavingTemplates(false);
    }
  };

  const openTemplate = (templateId: string, mode: TemplateMode = 'browse') => {
    const template = emailTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedTemplateId(template.id);
    setTemplateDraft(template);
    setTemplateMode(mode);
  };

  const saveTemplateDraft = async () => {
    const nextTemplate = {
      ...templateDraft,
      subject: templateDraft.subject.trim(),
      previewText: templateDraft.previewText.trim(),
      html: templateDraft.html.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (!nextTemplate.subject || !nextTemplate.previewText || !nextTemplate.html) {
      toast({
        title: 'Template incomplete',
        description: 'Subject, preview text, and body are required.',
        variant: 'destructive',
      });
      return;
    }

    const nextTemplates = emailTemplates.map((template) =>
      template.id === nextTemplate.id ? nextTemplate : template
    );

    setTemplateDraft(nextTemplate);
    await persistTemplates(nextTemplates);
    setTemplateMode('browse');
  };

  const toggleTemplateActive = async (templateId: string) => {
    const nextTemplates = emailTemplates.map((template) =>
      template.id === templateId
        ? { ...template, active: !template.active, updatedAt: new Date().toISOString() }
        : template
    );

    setEmailTemplates(nextTemplates);
    const nextSelected = nextTemplates.find((template) => template.id === templateId);
    if (nextSelected) {
      setTemplateDraft(nextSelected);
    }

    try {
      await saveUserSettings((currentSettings) => ({
        ...currentSettings,
        emailTemplates: nextTemplates,
      }));
    } catch (error) {
      console.error('Error toggling template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template state.',
        variant: 'destructive',
      });
    }
  };

  const restoreDefaultTemplates = async () => {
    const resetTemplates = DEFAULT_EMAIL_TEMPLATES.map((template) => ({
      ...template,
      updatedAt: new Date().toISOString(),
    }));
    setSelectedTemplateId(resetTemplates[0].id);
    setTemplateDraft(resetTemplates[0]);
    setTemplateMode('browse');
    await persistTemplates(resetTemplates);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-gradient-to-r from-white/[0.04] to-white/[0.02]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 p-2">
            <Mail className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Email Provider</h2>
            <p className="text-sm text-white/40">Configure your transactional email service</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {EMAIL_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={cn(
                'relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                selectedProvider === provider.id
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/20'
              )}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10 blur-3xl', provider.color)} />
              <div className="relative p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn('rounded-xl bg-gradient-to-r p-3', provider.color)}>{provider.icon}</div>
                  {selectedProvider === provider.id && (
                    <Badge className="border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </div>
                <h3 className="mb-1 text-lg font-bold">{provider.name}</h3>
                <p className="mb-4 text-sm text-white/40">{provider.description}</p>

                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder={`Enter ${provider.apiKeyName}`}
                    value={apiKeys[provider.id] || ''}
                    onChange={(event) =>
                      setApiKeys((current) => ({ ...current, [provider.id]: event.target.value }))
                    }
                    className="border-white/10 bg-white/[0.03] text-sm focus:border-cyan-500/50"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveApiKey(provider)}
                      disabled={savingKey || !apiKeys[provider.id]}
                      className={cn('flex-1 bg-gradient-to-r', provider.color)}
                    >
                      {savingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Save Key
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5" asChild>
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

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 p-2">
            <Bell className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Notification Preferences</h2>
            <p className="text-sm text-white/40">Control which emails you receive</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/5">
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'rounded-lg p-2 transition-colors',
                      notification.enabled ? 'bg-cyan-500/20' : 'bg-white/[0.03]'
                    )}
                  >
                    {notification.enabled ? (
                      <Bell className="h-4 w-4 text-cyan-400" />
                    ) : (
                      <BellOff className="h-4 w-4 text-white/30" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{notification.label}</p>
                    <p className="text-sm text-white/30">{notification.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification(notification.id)}
                  className={cn('rounded-full p-1 transition-all', notification.enabled ? 'text-cyan-400' : 'text-white/30')}
                >
                  {notification.enabled ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-400/10 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/20 p-2">
              <Send className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="font-bold">Send Test Email</h3>
          </div>
          <p className="mb-4 text-sm text-white/40">Send a test email to verify your configuration.</p>
          <Button
            disabled={!selectedProvider || sendingTest}
            onClick={sendTestEmail}
            className="w-full bg-cyan-500 font-bold text-black shadow-[0_0_20px_rgba(0,200,255,0.3)] hover:bg-cyan-400"
          >
            {sendingTest ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </div>

        <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-fuchsia-500/20 p-2">
              <FileText className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="font-bold">Email Templates</h3>
              <p className="text-sm text-white/40">{emailTemplates.filter((template) => template.active).length} active templates</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-white/40">Switch between browse and edit modes, then persist the copy and markup you want sent.</p>
          <Dialog
            open={templatesOpen}
            onOpenChange={(open) => {
              setTemplatesOpen(open);
              if (open) {
                openTemplate(selectedTemplate.id, 'browse');
              } else {
                setTemplateMode('browse');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10">
                <Sparkles className="mr-2 h-4 w-4" />
                Manage Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-white/10 bg-[#0d0d18]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-fuchsia-400" />
                  Email Templates
                </DialogTitle>
                <DialogDescription>
                  Review the current copy or switch into edit mode to persist changes.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => openTemplate(template.id, template.id === selectedTemplateId ? templateMode : 'browse')}
                      className={cn(
                        'w-full rounded-xl border p-4 text-left transition-colors',
                        selectedTemplateId === template.id
                          ? 'border-fuchsia-500/40 bg-fuchsia-500/10'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-medium text-white">{template.name}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            template.active
                              ? 'border-cyan-500/30 text-cyan-400'
                              : 'border-white/10 text-white/40'
                          )}
                        >
                          {template.active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/40">{template.description}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div>
                      <h3 className="font-semibold text-white">{selectedTemplate.name}</h3>
                      <p className="text-sm text-white/40">{selectedTemplate.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={templateMode === 'browse' ? 'secondary' : 'outline'}
                        className="border-white/10"
                        onClick={() => {
                          setTemplateMode('browse');
                          setTemplateDraft(selectedTemplate);
                        }}
                      >
                        Browse
                      </Button>
                      <Button
                        variant={templateMode === 'edit' ? 'secondary' : 'outline'}
                        className="border-white/10"
                        onClick={() => {
                          setTemplateMode('edit');
                          setTemplateDraft(selectedTemplate);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="border-white/10"
                        onClick={() => void toggleTemplateActive(selectedTemplate.id)}
                      >
                        {selectedTemplate.active ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input
                          value={templateDraft.subject}
                          onChange={(event) =>
                            setTemplateDraft((current) => ({ ...current, subject: event.target.value }))
                          }
                          disabled={templateMode === 'browse'}
                          className="border-white/10 bg-white/[0.03]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preview Text</Label>
                        <Input
                          value={templateDraft.previewText}
                          onChange={(event) =>
                            setTemplateDraft((current) => ({ ...current, previewText: event.target.value }))
                          }
                          disabled={templateMode === 'browse'}
                          className="border-white/10 bg-white/[0.03]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>HTML Body</Label>
                      <Textarea
                        value={templateDraft.html}
                        onChange={(event) =>
                          setTemplateDraft((current) => ({ ...current, html: event.target.value }))
                        }
                        disabled={templateMode === 'browse'}
                        className="min-h-[240px] border-white/10 bg-white/[0.03] font-mono text-xs"
                      />
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/30">Live Summary</p>
                      <p className="text-sm font-medium text-white">{templateDraft.subject}</p>
                      <p className="mt-1 text-sm text-white/40">{templateDraft.previewText}</p>
                      <p className="mt-3 text-xs text-white/30">
                        Last updated {new Date((templateMode === 'edit' ? templateDraft : selectedTemplate).updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => void restoreDefaultTemplates()}
                  disabled={savingTemplates}
                >
                  Restore Defaults
                </Button>
                <Button variant="outline" className="border-white/10" onClick={() => setTemplatesOpen(false)}>
                  Close
                </Button>
                {templateMode === 'edit' && (
                  <Button onClick={() => void saveTemplateDraft()} disabled={savingTemplates}>
                    {savingTemplates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Template
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
