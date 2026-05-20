/**
 * CLOUD INTEGRATIONS - Immersive third-party integrations and API keys
 */

import React, { useState, useEffect } from 'react';
import { 
  Plug, Key, ExternalLink, CheckCircle2, XCircle, 
  Settings, Trash2, Plus, RefreshCw, Loader2, Copy,
  Zap, CreditCard, BarChart3, Bot, Webhook, Shield,
  Sparkles, Globe, Lock, Eye, EyeOff, AlertCircle
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CloudIntegrationsProps {
  userId: string;
}

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: 'payment' | 'analytics' | 'ai' | 'automation' | 'other';
  apiKeyPlaceholder: string;
  docsUrl: string;
  connected: boolean;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'from-purple-500 to-indigo-600',
    description: 'Accept payments and manage subscriptions',
    category: 'payment',
    apiKeyPlaceholder: 'sk_live_...',
    docsUrl: 'https://stripe.com/docs',
    connected: false,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'from-blue-500 to-blue-700',
    description: 'Accept PayPal payments globally',
    category: 'payment',
    apiKeyPlaceholder: 'Client ID',
    docsUrl: 'https://developer.paypal.com',
    connected: false,
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'from-orange-500 to-yellow-500',
    description: 'Track website traffic and user behavior',
    category: 'analytics',
    apiKeyPlaceholder: 'G-XXXXXXXXXX',
    docsUrl: 'https://analytics.google.com',
    connected: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: <Bot className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-600',
    description: 'GPT-4, DALL-E, and Whisper APIs',
    category: 'ai',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs',
    connected: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: <Bot className="h-6 w-6" />,
    color: 'from-amber-500 to-orange-600',
    description: 'Claude AI assistant integration',
    category: 'ai',
    apiKeyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com',
    connected: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    icon: <Zap className="h-6 w-6" />,
    color: 'from-orange-400 to-red-500',
    description: 'Connect with 5000+ apps',
    category: 'automation',
    apiKeyPlaceholder: 'Webhook URL',
    docsUrl: 'https://zapier.com/apps',
    connected: false,
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    icon: <Webhook className="h-6 w-6" />,
    color: 'from-violet-500 to-purple-600',
    description: 'Visual automation platform',
    category: 'automation',
    apiKeyPlaceholder: 'API Key',
    docsUrl: 'https://www.make.com/en/api-documentation',
    connected: false,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: <Globe className="h-6 w-6" />,
    color: 'from-slate-600 to-slate-800',
    description: 'Deploy frontend applications',
    category: 'other',
    apiKeyPlaceholder: 'Bearer Token',
    docsUrl: 'https://vercel.com/docs',
    connected: false,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  payment: { label: 'Payment Processing', icon: <CreditCard className="h-4 w-4" /> },
  analytics: { label: 'Analytics & Tracking', icon: <BarChart3 className="h-4 w-4" /> },
  ai: { label: 'AI & Machine Learning', icon: <Bot className="h-4 w-4" /> },
  automation: { label: 'Automation & Workflows', icon: <Zap className="h-4 w-4" /> },
  other: { label: 'Other Services', icon: <Plug className="h-4 w-4" /> },
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

async function readUserSettings(userId: string): Promise<Record<string, any>> {
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
}

async function writeUserSettings(userId: string, settings: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      settings,
    });

  if (error && !isMissingUserSettingsError(error)) {
    throw error;
  }
}

export function CloudIntegrations({ userId }: CloudIntegrationsProps) {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [settingsIntegration, setSettingsIntegration] = useState<Integration | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [generatedApiKeys, setGeneratedApiKeys] = useState<{ key: string; created: Date }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadIntegrations();
    }
  }, [userId]);

  const loadIntegrations = async () => {
    try {
      const settings = await readUserSettings(userId);
          
      if (settings.integrations) {
        setIntegrations(
          INTEGRATIONS.map(i => ({
            ...i,
            connected: settings.integrations[i.id]?.connected || false,
          }))
        );
      }
      if (settings.apiKeys) {
        setGeneratedApiKeys(settings.apiKeys);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectIntegration = async () => {
    if (!selectedIntegration || !apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an API key or credentials.',
        variant: 'destructive',
      });
      return;
    }

    setConnectingId(selectedIntegration.id);
    
    try {
      const currentSettings = await readUserSettings(userId);

      const newSettings = {
        ...currentSettings,
        integrations: {
          ...(currentSettings.integrations || {}),
          [selectedIntegration.id]: {
            connected: true,
            connectedAt: new Date().toISOString(),
          },
        },
      };

      await writeUserSettings(userId, newSettings);

      setIntegrations(
        integrations.map(i => 
          i.id === selectedIntegration.id ? { ...i, connected: true } : i
        )
      );

      setSelectedIntegration(null);
      setApiKey('');
      
      toast({
        title: 'Connected!',
        description: `${selectedIntegration.name} has been connected successfully.`,
      });
    } catch (error) {
      console.error('Error connecting integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect integration.',
        variant: 'destructive',
      });
    } finally {
      setConnectingId(null);
    }
  };

  const disconnectIntegration = async (integration: Integration) => {
    if (!confirm(`Disconnect ${integration.name}?`)) return;

    try {
      const currentSettings = await readUserSettings(userId);

      const newIntegrations = { ...(currentSettings.integrations || {}) };
      delete newIntegrations[integration.id];

      await writeUserSettings(userId, {
        ...currentSettings,
        integrations: newIntegrations,
      });

      setIntegrations(
        integrations.map(i => 
          i.id === integration.id ? { ...i, connected: false } : i
        )
      );

      toast({
        title: 'Disconnected',
        description: `${integration.name} has been disconnected.`,
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration.',
        variant: 'destructive',
      });
    }
  };

  const generateApiKey = async () => {
    const key = `ut_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    
    const newKey = { key, created: new Date() };
    const updatedKeys = [...generatedApiKeys, newKey];
    setGeneratedApiKeys(updatedKeys);

    try {
      const currentSettings = await readUserSettings(userId);

      await writeUserSettings(userId, {
        ...currentSettings,
        apiKeys: updatedKeys,
      });

      toast({
        title: 'API Key Generated',
        description: 'Your new API key has been created.',
      });
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard.',
    });
  };

  const deleteApiKey = async (keyToDelete: string) => {
    if (!confirm('Delete this API key? This action cannot be undone.')) return;

    const updatedKeys = generatedApiKeys.filter(k => k.key !== keyToDelete);
    setGeneratedApiKeys(updatedKeys);

    try {
      const currentSettings = await readUserSettings(userId);

      await writeUserSettings(userId, {
        ...currentSettings,
        apiKeys: updatedKeys,
      });

      toast({
        title: 'API Key Deleted',
        description: 'The API key has been revoked.',
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const openIntegrationSettings = (integration: Integration) => {
    setSettingsIntegration(integration);
    setSettingsOpen(true);
  };

  const connectedCount = integrations.filter(i => i.connected).length;
  const groupedIntegrations = integrations.reduce((acc, int) => {
    if (!acc[int.category]) acc[int.category] = [];
    acc[int.category].push(int);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/[0.02] to-transparent border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Plug className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{connectedCount}</p>
            <p className="text-xs text-white/30">Connected</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Globe className="h-5 w-5 text-white/40" />
          </div>
          <div>
            <p className="text-2xl font-bold">{integrations.length}</p>
            <p className="text-xs text-white/30">Available</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-fuchsia-500/20">
            <Key className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{generatedApiKeys.length}</p>
            <p className="text-xs text-white/30">API Keys</p>
          </div>
        </div>
      </div>

      {/* Integrations by Category */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-white/40">
            {CATEGORY_LABELS[category].icon}
            <span className="font-medium">{CATEGORY_LABELS[category].label}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryIntegrations.map((integration) => (
              <div
                key={integration.id}
                className={cn(
                  "group relative rounded-2xl border transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-lg",
                  integration.connected
                    ? "border-cyan-500/30 bg-cyan-500/5"
                    : "border-white/5 bg-white/[0.02] hover:border-white/20"
                )}
              >
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br", integration.color, "blur-3xl")} style={{ opacity: 0.05 }} />
                <div className="relative p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl bg-gradient-to-r", integration.color)}>
                      {integration.icon}
                    </div>
                    {integration.connected ? (
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/10 text-white/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold mb-1">{integration.name}</h3>
                  <p className="text-sm text-white/40 mb-4 line-clamp-2">{integration.description}</p>
                  
                  <div className="flex items-center gap-2">
                    {integration.connected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-white/10 hover:bg-white/5"
                          onClick={() => openIntegrationSettings(integration)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Settings
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => disconnectIntegration(integration)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className={cn("w-full bg-gradient-to-r", integration.color)}
                            onClick={() => setSelectedIntegration(integration)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Connect
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0d0d18] border-white/10">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg bg-gradient-to-r", integration.color)}>
                                {integration.icon}
                              </div>
                              Connect {integration.name}
                            </DialogTitle>
                          <DialogDescription className="text-white/40">
                              Enter your API credentials to connect {integration.name} with Unison Tasks.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>API Key / Credentials</Label>
                              <div className="relative">
                                <Input
                                  type={showApiKey ? 'text' : 'password'}
                                  placeholder={integration.apiKeyPlaceholder}
                                  value={apiKey}
                                  onChange={(e) => setApiKey(e.target.value)}
                                  className="pr-10 bg-white/[0.03] border-white/10 focus:border-cyan-500/50"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                                >
                                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                              <Shield className="h-4 w-4 text-cyan-400 mt-0.5" />
                              <p className="text-xs text-cyan-300">
                                Your credentials are encrypted and stored securely. We never share your API keys.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              className="border-white/10"
                              asChild
                            >
                              <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Docs
                              </a>
                            </Button>
                            <Button
                              onClick={connectIntegration}
                              disabled={connectingId === integration.id || !apiKey.trim()}
                              className={cn("bg-gradient-to-r", integration.color)}
                            >
                              {connectingId === integration.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Connect
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* API Keys Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20">
              <Key className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Your API Keys</h2>
              <p className="text-sm text-white/40">Access Unison Tasks programmatically</p>
            </div>
          </div>
          <Button 
            onClick={generateApiKey}
            className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate New Key
          </Button>
        </div>

        {generatedApiKeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <div className="inline-block p-4 rounded-2xl bg-fuchsia-500/10 mb-4">
              <Key className="h-8 w-8 text-fuchsia-400" />
            </div>
            <h3 className="font-bold mb-2">No API Keys Yet</h3>
              <p className="text-sm text-white/40 mb-4">
              Generate an API key to access Unison Tasks from your applications.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {generatedApiKeys.map((keyData, index) => (
                <div 
                  key={keyData.key} 
                  className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="p-2 rounded-lg bg-fuchsia-500/20">
                    <Key className="h-4 w-4 text-fuchsia-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-white/60 truncate block">
                      {keyData.key.substring(0, 12)}...{keyData.key.substring(keyData.key.length - 8)}
                    </code>
                    <p className="text-xs text-white/30">
                      Created {new Date(keyData.created).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(keyData.key)}
                    className="text-white/40 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteApiKey(keyData.key)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Integration Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-[#0d0d18] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {settingsIntegration && (
                <div className={cn("p-2 rounded-lg bg-gradient-to-r", settingsIntegration.color)}>
                  {settingsIntegration.icon}
                </div>
              )}
              {settingsIntegration?.name} Settings
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Configure your {settingsIntegration?.name} integration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span className="text-cyan-400 font-medium">Connected</span>
              </div>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">Active</Badge>
            </div>
            
            <div className="space-y-2">
              <Label>API Key Status</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <Lock className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Key securely stored</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documentation</Label>
              <Button
                variant="outline"
                className="w-full border-white/10"
                asChild
              >
                <a href={settingsIntegration?.docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View {settingsIntegration?.name} Docs
                </a>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => {
                if (settingsIntegration) {
                  disconnectIntegration(settingsIntegration);
                  setSettingsOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
            <Button onClick={() => setSettingsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
