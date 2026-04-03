/**
 * CLOUD ORGANIZATION - Immersive organization management
 * 
 * Enterprise organization features:
 * - Organization profile
 * - Billing & subscription
 * - Usage analytics
 * - Danger zone (delete org)
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  Trash2,
  Edit2,
  Check,
  X,
  Globe,
  Calendar,
  Loader2,
  AlertTriangle,
  BarChart3,
  Users,
  FolderKanban,
  HardDrive,
  Zap,
  Crown,
  Star,
  ArrowUpRight,
  Shield,
  Settings,
  Receipt,
  Download,
  ChevronRight,
  Sparkles,
  Image,
  Camera,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

interface CloudOrganizationProps {
  userId: string;
  organizationId?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  createdAt: Date;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
}

interface UsageStats {
  members: { current: number; limit: number };
  projects: { current: number; limit: number };
  storage: { current: number; limit: number }; // in GB
  apiCalls: { current: number; limit: number };
}

interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl: string;
}

const PLAN_CONFIG = {
  free: {
    name: 'Free',
    color: 'from-slate-500 to-slate-600',
    badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
  pro: {
    name: 'Pro',
    color: 'from-blue-500 to-cyan-500',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  team: {
    name: 'Team',
    color: 'from-purple-500 to-pink-500',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  enterprise: {
    name: 'Enterprise',
    color: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

// Usage stat card
function UsageStat({
  icon: Icon,
  label,
  current,
  limit,
  unit,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  current: number;
  limit: number;
  unit?: string;
  gradient: string;
}) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg bg-gradient-to-r', gradient)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-500">
            {current.toLocaleString()}{unit ? ` ${unit}` : ''} of {limit.toLocaleString()}{unit ? ` ${unit}` : ''}
          </p>
        </div>
      </div>
      <Progress
        value={percentage}
        className={cn(
          'h-2',
          isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-yellow-500' : ''
        )}
      />
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Approaching limit
        </p>
      )}
      {isAtLimit && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Limit reached
        </p>
      )}
    </div>
  );
}

// Invoice row component
function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusConfig = {
    paid: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Paid' },
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Pending' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
  };
  const config = statusConfig[invoice.status];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/[0.05]">
          <Receipt className="h-4 w-4 text-slate-400" />
        </div>
        <div>
          <p className="font-medium text-white">
            ${invoice.amount.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(invoice.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={cn('border', config.bg, config.color)}>
          {config.label}
        </Badge>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CloudOrganization({ userId, organizationId }: CloudOrganizationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isOwner, setIsOwner] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  // Upgrade dialog
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [userId, organizationId]);

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      // Mock data - would come from organizations/businesses table
      const mockOrg: Organization = {
        id: organizationId || 'org-1',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        logoUrl: null,
        website: 'https://acme.com',
        industry: 'Technology',
        size: '50-100',
        createdAt: new Date('2024-01-15'),
        plan: 'team',
      };

      const mockUsage: UsageStats = {
        members: { current: 12, limit: 25 },
        projects: { current: 45, limit: 100 },
        storage: { current: 4.2, limit: 10 },
        apiCalls: { current: 8500, limit: 10000 },
      };

      const mockInvoices: Invoice[] = [
        {
          id: 'inv-1',
          date: new Date('2026-02-01'),
          amount: 99.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: 'inv-2',
          date: new Date('2026-01-01'),
          amount: 99.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: 'inv-3',
          date: new Date('2025-12-01'),
          amount: 99.00,
          status: 'paid',
          downloadUrl: '#',
        },
      ];

      setOrganization(mockOrg);
      setUsage(mockUsage);
      setInvoices(mockInvoices);
      setEditName(mockOrg.name);
      setEditWebsite(mockOrg.website || '');
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      // Would call update organization API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOrganization({
        ...organization,
        name: editName,
        website: editWebsite || null,
      });

      toast({
        title: 'Organization Updated',
        description: 'Your organization profile has been saved.',
      });
      setEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update organization',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmText !== organization?.name) return;

    setDeleting(true);
    try {
      // Would call delete organization API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Organization Deleted',
        description: 'Your organization has been permanently deleted.',
      });
      setDeleteDialogOpen(false);
      // Would redirect to home/org list
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete organization',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !organization) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const planConfig = PLAN_CONFIG[organization.plan];

  return (
    <div className="space-y-8">
      {/* Organization Hero */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className={cn('absolute inset-0 bg-gradient-to-br', `${planConfig.color}/20`, 'via-transparent to-slate-900/50')} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />

        <div className="relative p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo */}
            <div className="relative group">
              <div className={cn('absolute -inset-1 bg-gradient-to-r rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500', planConfig.color)} />
              <div className={cn('relative w-24 h-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl font-bold text-white shadow-2xl', planConfig.color)}>
                {organization.logoUrl ? (
                  <img src={organization.logoUrl} alt={organization.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  organization.name.charAt(0).toUpperCase()
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-slate-800 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-slate-800/80 border-white/20 text-xl font-bold h-10 max-w-xs"
                      placeholder="Organization name"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="bg-green-600 hover:bg-green-500">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(organization.name); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">{organization.name}</h2>
                    {isOwner && (
                      <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-white transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <Badge className={cn('border', planConfig.badge)}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {planConfig.name}
                </Badge>
                {organization.website && (
                  <a href={organization.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                    <Globe className="h-4 w-4" />
                    {organization.website.replace('https://', '')}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {new Date(organization.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {organization.plan !== 'enterprise' && (
                <Button
                  onClick={() => setUpgradeDialogOpen(true)}
                  className={cn('bg-gradient-to-r hover:opacity-90', planConfig.color)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Analytics */}
      {usage && (
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Usage & Limits</CardTitle>
                <CardDescription>Monitor your organization's resource usage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <UsageStat
                icon={Users}
                label="Team Members"
                current={usage.members.current}
                limit={usage.members.limit}
                gradient="from-purple-500 to-pink-500"
              />
              <UsageStat
                icon={FolderKanban}
                label="Projects"
                current={usage.projects.current}
                limit={usage.projects.limit}
                gradient="from-green-500 to-emerald-500"
              />
              <UsageStat
                icon={HardDrive}
                label="Storage"
                current={usage.storage.current}
                limit={usage.storage.limit}
                unit="GB"
                gradient="from-orange-500 to-amber-500"
              />
              <UsageStat
                icon={Zap}
                label="API Calls"
                current={usage.apiCalls.current}
                limit={usage.apiCalls.limit}
                gradient="from-blue-500 to-cyan-500"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Subscription Card */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-gradient-to-r', planConfig.color)}>
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Subscription</CardTitle>
                <CardDescription>Your current plan and billing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Current Plan</span>
                <Badge className={cn('border', planConfig.badge)}>
                  {planConfig.name}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {organization.plan === 'free' ? 'Free' : organization.plan === 'team' ? '$99' : '$199'}
                {organization.plan !== 'free' && <span className="text-sm font-normal text-slate-400">/month</span>}
              </p>
            </div>

            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Payment Method
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>

            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
              <Settings className="h-4 w-4 mr-2" />
              Billing Settings
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Invoices Card */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Invoices</CardTitle>
                  <CardDescription>Recent billing history</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
              {invoices.length === 0 && (
                <p className="text-center py-8 text-slate-500">No invoices yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-400">Danger Zone</CardTitle>
                <CardDescription className="text-red-400/70">
                  Irreversible and destructive actions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">Delete Organization</p>
                  <p className="text-sm text-slate-400">
                    Permanently delete this organization and all its data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Organization
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription>
              Unlock more features and higher limits for your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(['pro', 'team', 'enterprise'] as const).filter(p => p !== organization.plan).map((plan) => {
              const config = PLAN_CONFIG[plan];
              return (
                <div
                  key={plan}
                  className={cn(
                    'p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer',
                    'bg-gradient-to-r from-white/[0.03] to-transparent'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg bg-gradient-to-r', config.color)}>
                        {plan === 'enterprise' ? <Crown className="h-5 w-5 text-white" /> : <Star className="h-5 w-5 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">{config.name}</p>
                        <p className="text-xs text-slate-400">
                          {plan === 'pro' && 'For professionals and small teams'}
                          {plan === 'team' && 'For growing teams with advanced needs'}
                          {plan === 'enterprise' && 'Custom solutions for large organizations'}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {plan === 'pro' && '$29'}
                      {plan === 'team' && '$99'}
                      {plan === 'enterprise' && 'Custom'}
                      <span className="text-xs font-normal text-slate-400">/mo</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500">
              Contact Sales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Organization
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              <span className="font-semibold text-white"> {organization.name}</span> and all
              associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All projects and files</li>
                <li>Team members and permissions</li>
                <li>Billing and subscription data</li>
                <li>API keys and integrations</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label className="text-sm text-slate-400">
              To confirm, type <span className="font-semibold text-white">{organization.name}</span> below:
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={organization.name}
              className="mt-2 bg-slate-800 border-white/10"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={deleteConfirmText !== organization.name || deleting}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
