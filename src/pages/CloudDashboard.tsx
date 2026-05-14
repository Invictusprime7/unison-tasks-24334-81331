import React, { Component, ErrorInfo, ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FolderKanban,
  HardDrive,
  Image,
  LayoutGrid,
  Loader2,
  LogOut,
  Mail,
  Plug,
  Shield,
  Sparkles,
  User,
  Workflow,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { listProjectsCompat } from '@/services/projectSchemaCompat';
import {
  CloudAIUsage,
  CloudAssets,
  CloudEmail,
  CloudIntegrations,
  CloudProfile,
  CloudProjects,
  CloudSecurity,
} from '@/components/cloud';

type CloudTab =
  | 'overview'
  | 'projects'
  | 'assets'
  | 'email'
  | 'integrations'
  | 'security'
  | 'ai-usage'
  | 'profile';

interface TabConfig {
  id: CloudTab;
  label: string;
  shortLabel: string;
  description: string;
  gradient: string;
  icon: React.ElementType;
}

interface DashboardStats {
  projects: number;
  assets: number;
  businesses: number;
  integrations: number;
}

interface BusinessSummary {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  slug?: string | null;
  status?: string | null;
  publish_status?: string | null;
  business_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

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

interface DashboardSnapshot {
  profileName: string;
  businesses: BusinessSummary[];
  projects: ProjectSummary[];
  connectedIntegrations: string[];
  emailTemplateCount: number;
  notificationsEnabled: number;
}

interface CloudDashboardLocationState {
  tab?: CloudTab;
}

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    description: 'Control plane summary, readiness, and fast paths',
    gradient: 'from-cyan-500 to-blue-500',
    icon: LayoutGrid,
  },
  {
    id: 'projects',
    label: 'Workspaces',
    shortLabel: 'Workspaces',
    description: 'Businesses, projects, CRM, team, and scoped settings',
    gradient: 'from-fuchsia-500 to-cyan-500',
    icon: FolderKanban,
  },
  {
    id: 'assets',
    label: 'Assets',
    shortLabel: 'Assets',
    description: 'Project media, uploads, and reusable files',
    gradient: 'from-amber-500 to-orange-500',
    icon: Image,
  },
  {
    id: 'email',
    label: 'Email',
    shortLabel: 'Email',
    description: 'Templates, notifications, and provider setup',
    gradient: 'from-rose-500 to-red-500',
    icon: Mail,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    shortLabel: 'Integrations',
    description: 'Connected services, API keys, and external systems',
    gradient: 'from-violet-500 to-purple-500',
    icon: Plug,
  },
  {
    id: 'security',
    label: 'Security',
    shortLabel: 'Security',
    description: 'Sessions, password, and account protection',
    gradient: 'from-lime-500 to-cyan-500',
    icon: Shield,
  },
  {
    id: 'ai-usage',
    label: 'AI Usage',
    shortLabel: 'AI',
    description: 'Unison Tasks AI request counts, model usage, error rates',
    gradient: 'from-cyan-500 to-fuchsia-500',
    icon: BarChart3,
  },
  {
    id: 'profile',
    label: 'Profile',
    shortLabel: 'Profile',
    description: 'Identity, billing, usage, and personal account settings',
    gradient: 'from-blue-500 to-cyan-500',
    icon: User,
  },
];

class TabErrorBoundary extends Component<
  { tabName: string; onRetry: () => void; children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { tabName: string; onRetry: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[CloudDashboard] ${this.props.tabName} tab error:`, error, info);
  }

  componentDidUpdate(prevProps: { tabName: string }) {
    if (prevProps.tabName !== this.props.tabName && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
          <Shield className="h-12 w-12 text-red-400 opacity-70" />
          <div>
            <p className="text-lg font-semibold text-white">Section failed to load</p>
            <p className="mt-1 text-sm text-white/45">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <Button onClick={this.props.onRetry}>Try Again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#0d0d18] to-[#0a0a12]" />
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-white/[0.03] blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl animate-pulse"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300ffff' fill-opacity='0.15'%3E%3Crect x='0' y='0' width='4' height='4'/%3E%3Crect x='20' y='0' width='4' height='4'/%3E%3Crect x='0' y='20' width='4' height='4'/%3E%3Crect x='20' y='20' width='4' height='4'/%3E%3Crect x='10' y='10' width='4' height='4'/%3E%3Crect x='30' y='10' width='4' height='4'/%3E%3Crect x='10' y='30' width='4' height='4'/%3E%3Crect x='30' y='30' width='4' height='4'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: 'online' | 'syncing' | 'offline' }) {
  const config = {
    online: 'bg-lime-400 text-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.35)]',
    syncing: 'bg-amber-400 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]',
    offline: 'bg-red-400 text-red-300 shadow-[0_0_18px_rgba(248,113,113,0.35)]',
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#0d0d18]/90 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/45">
      <div className={cn('h-2 w-2 rounded-full', config[status])} />
      {status}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d18]/90 p-4 backdrop-blur-sm">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100', gradient)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
          <Icon className="h-4 w-4 text-white/70" />
        </div>
      </div>
    </div>
  );
}

function RailTab({
  tab,
  isActive,
  onClick,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-2xl border p-3 text-left transition-all',
        isActive
          ? 'border-white/12 bg-white/[0.08] text-white'
          : 'border-white/5 bg-[#0d0d18]/80 text-white/55 hover:border-white/10 hover:bg-[#141420] hover:text-white'
      )}
    >
      <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 transition-opacity', tab.gradient, isActive && 'opacity-10')} />
      <div className="relative flex items-start gap-3">
        <div className={cn('rounded-xl border border-white/10 p-2.5', isActive ? 'bg-black/20' : 'bg-[#141420]')}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{tab.label}</p>
          <p className="mt-1 text-xs text-white/35">{tab.description}</p>
        </div>
      </div>
    </button>
  );
}

function parseSettings(input: unknown): Record<string, any> {
  if (!input) return {};
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, any>;
  }
  return {};
}

function formatRelativeDate(value?: string | null) {
  if (!value) return 'No recent activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No recent activity';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function OverviewPanel({
  user,
  stats,
  snapshot,
  onSelectTab,
}: {
  user: any;
  stats: DashboardStats;
  snapshot: DashboardSnapshot;
  onSelectTab: (tab: CloudTab) => void;
}) {
  const readinessChecks = [
    { label: 'Identity profile', ready: Boolean(snapshot.profileName || user?.email), tab: 'profile' as const },
    { label: 'Business layer', ready: stats.businesses > 0, tab: 'projects' as const },
    { label: 'Project layer', ready: stats.projects > 0, tab: 'projects' as const },
    { label: 'Integrations', ready: stats.integrations > 0, tab: 'integrations' as const },
    { label: 'Email system', ready: snapshot.emailTemplateCount > 0 || snapshot.notificationsEnabled > 0, tab: 'email' as const },
  ];
  const readinessScore = Math.round(
    (readinessChecks.filter((check) => check.ready).length / readinessChecks.length) * 100
  );

  const jumpCards = [
    {
      tab: 'projects' as const,
      title: 'Workspaces',
      description: 'Operate businesses, projects, CRM scope, teams, and automation defaults in one place.',
      metric: `${stats.businesses} business${stats.businesses === 1 ? '' : 'es'} / ${stats.projects} project${stats.projects === 1 ? '' : 's'}`,
      icon: FolderKanban,
      gradient: 'from-fuchsia-500/20 via-cyan-500/10 to-transparent',
    },
    {
      tab: 'assets' as const,
      title: 'Assets',
      description: 'Manage uploaded media and reusable files that feed project workspaces.',
      metric: `${stats.assets} tracked asset${stats.assets === 1 ? '' : 's'}`,
      icon: Image,
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    },
    {
      tab: 'email' as const,
      title: 'Email',
      description: 'Review provider setup, notification rules, and stored email templates.',
      metric: `${snapshot.emailTemplateCount} template${snapshot.emailTemplateCount === 1 ? '' : 's'}`,
      icon: Mail,
      gradient: 'from-rose-500/20 via-red-500/10 to-transparent',
    },
    {
      tab: 'integrations' as const,
      title: 'Integrations',
      description: 'Track connected systems and keep external services aligned with account state.',
      metric: `${stats.integrations} connected service${stats.integrations === 1 ? '' : 's'}`,
      icon: Plug,
      gradient: 'from-violet-500/20 via-purple-500/10 to-transparent',
    },
    {
      tab: 'security' as const,
      title: 'Security',
      description: 'Protect sessions, password flows, and MFA posture from one surface.',
      metric: 'Auth-aware security center',
      icon: Shield,
      gradient: 'from-lime-500/20 via-cyan-500/10 to-transparent',
    },
    {
      tab: 'profile' as const,
      title: 'Profile',
      description: 'Manage account identity, plan context, usage, and personal settings.',
      metric: snapshot.profileName || user?.email || 'Account profile',
      icon: User,
      gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    },
  ];

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden border-white/5 bg-[#0d0d18]/90">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_55%)]" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/70">
                  New Cloud Shell
                </Badge>
                <Badge variant="outline" className="border-white/10 text-white/50">
                  Infrastructure-aligned
                </Badge>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  One control plane for the full cloud stack
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                  The dashboard now reflects the actual product model: workspaces own business and project operations, while the rest of cloud surfaces handle shared identity, assets, integrations, messaging, and security.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => onSelectTab('projects')}
                  className="border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                >
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Open Workspaces
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
                  onClick={() => onSelectTab('integrations')}
                >
                  <Plug className="mr-2 h-4 w-4" />
                  Review Integrations
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-3xl font-semibold text-white">{readinessScore}%</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">Readiness</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-3xl font-semibold text-white">{stats.businesses}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">Businesses</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-3xl font-semibold text-white">{stats.projects}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">Projects</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jumpCards.map((card) => (
          <button
            key={card.tab}
            type="button"
            onClick={() => onSelectTab(card.tab)}
            className="group text-left"
          >
            <Card className="relative h-full overflow-hidden border-white/5 bg-[#0d0d18]/80 transition-all duration-300 group-hover:border-white/12 group-hover:bg-[#141420]">
              <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100', card.gradient)} />
              <CardContent className="relative flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/35 transition-transform group-hover:translate-x-1 group-hover:text-white/70" />
                </div>
                <div className="mt-5 flex-1">
                  <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">{card.description}</p>
                </div>
                <p className="mt-5 text-sm font-medium text-white/75">{card.metric}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card className="border-white/5 bg-[#0d0d18]/80">
          <CardHeader>
            <CardTitle>Operating Model</CardTitle>
            <CardDescription>
              The dashboard IA now mirrors the data boundaries already enforced inside workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-white/80" />
                <p className="font-medium text-white">Business Layer</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Owns identity, website, industry, notification ownership, team access, and automation defaults that can be shared intentionally.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-white/80" />
                <p className="font-medium text-white">Project Layer</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Owns CRM records, pipeline stages, workflows, forms, analytics, domain behavior, and any workspace-specific overrides.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0d0d18]/80">
          <CardHeader>
            <CardTitle>Readiness Checks</CardTitle>
            <CardDescription>
              The fastest way to see which parts of the cloud stack still need attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readinessChecks.map((check) => (
              <div
                key={check.label}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3',
                  check.ready
                    ? 'border-white/8 bg-black/20'
                    : 'border-amber-300/20 bg-amber-300/[0.06]',
                )}
              >
                <span className="text-sm text-white/70">{check.label}</span>
                <div className="flex items-center gap-2 text-sm">
                  {check.ready ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white/80" />
                      <span className="text-white/80">Ready</span>
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 text-amber-300" />
                      <button
                        type="button"
                        onClick={() => onSelectTab(check.tab)}
                        className="font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-4 transition-colors hover:text-amber-200"
                      >
                        Needs setup
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/5 bg-[#0d0d18]/80">
          <CardHeader>
            <CardTitle>Recent Businesses</CardTitle>
            <CardDescription>Accessible business containers driving workspace operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.businesses.length > 0 ? (
              snapshot.businesses.map((business) => (
                <div key={business.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{business.name}</p>
                      <p className="text-sm text-white/40">
                        {business.industry || business.website || 'Business identity not fully defined yet'}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-white/45">
                      {formatRelativeDate(business.updated_at || business.created_at)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/45">
                No businesses yet. Start in Workspaces to create the first operating container.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0d0d18]/80">
          <CardHeader>
            <CardTitle>Recent Project Workspaces</CardTitle>
            <CardDescription>Project-level operating spaces with isolated CRM and automation behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.projects.length > 0 ? (
              snapshot.projects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{project.name}</p>
                      <p className="text-sm text-white/40">/{project.slug || project.id}</p>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-white/45">
                      {project.publish_status || project.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/45">
                No projects yet. Create the first workspace in Workspaces.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContextRail({
  user,
  activeTab,
  stats,
  snapshot,
  onSelectTab,
  onPrimaryAction,
  className,
}: {
  user: any;
  activeTab: CloudTab;
  stats: DashboardStats;
  snapshot: DashboardSnapshot;
  onSelectTab: (tab: CloudTab) => void;
  onPrimaryAction: () => void;
  className?: string;
}) {
  const recommendedNextStep =
    stats.businesses === 0
      ? {
          label: 'Create your first business container',
          action: () => onSelectTab('projects'),
        }
      : stats.projects === 0
        ? {
            label: 'Create the first project workspace',
            action: () => onSelectTab('projects'),
          }
        : stats.integrations === 0
          ? {
              label: 'Connect your first integration',
              action: () => onSelectTab('integrations'),
            }
          : {
              label: 'Review active workspaces',
              action: () => onSelectTab('projects'),
            };

  const activeSectionActionLabels: Record<CloudTab, string> = {
    overview: 'Open Workspaces',
    projects: 'Launch Builder',
    assets: 'Open Workspaces',
    email: 'Review Integrations',
    integrations: 'Open Security',
    security: 'Open Profile',
    'ai-usage': 'Open Profile',
    profile: 'Open Workspaces',
  };

  return (
    <div className={cn('space-y-6 xl:sticky xl:top-28', className)}>
      <Card className="border-white/5 bg-[#0d0d18]/90">
        <CardHeader>
          <CardTitle>Account Context</CardTitle>
          <CardDescription>High-signal state for the current cloud session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-white/35">Signed in as</p>
            <p className="mt-1 font-medium text-white">{snapshot.profileName || user?.email}</p>
            <p className="mt-1 text-sm text-white/45">{user?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Businesses" value={stats.businesses} icon={Building2} gradient="from-cyan-500/15 to-transparent" />
            <MetricCard label="Projects" value={stats.projects} icon={FolderKanban} gradient="from-fuchsia-500/15 to-transparent" />
            <MetricCard label="Assets" value={stats.assets} icon={HardDrive} gradient="from-amber-500/15 to-transparent" />
            <MetricCard label="Connected" value={stats.integrations} icon={Plug} gradient="from-violet-500/15 to-transparent" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#0d0d18]/90">
        <CardHeader>
          <CardTitle>Recommended Next Step</CardTitle>
          <CardDescription>Use the shell as an operations hub instead of navigating blind.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-white/55">{recommendedNextStep.label}</p>
          <Button className="w-full" onClick={recommendedNextStep.action}>
            <Sparkles className="mr-2 h-4 w-4" />
            Continue
          </Button>
          <Button variant="outline" className="w-full border-white/10" onClick={onPrimaryAction}>
            <ChevronRight className="mr-2 h-4 w-4" />
            {activeSectionActionLabels[activeTab]}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#0d0d18]/90">
        <CardHeader>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>Current services detected from persisted user settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.connectedIntegrations.length > 0 ? (
            snapshot.connectedIntegrations.slice(0, 5).map((integration) => (
              <div
                key={integration}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <span className="text-sm capitalize text-white/75">{integration.replace(/_/g, ' ')}</span>
                <CheckCircle2 className="h-4 w-4 text-lime-300" />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/45">
              No integrations connected yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CloudDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<CloudTab>('overview');
  const [cloudStatus, setCloudStatus] = useState<'online' | 'syncing' | 'offline'>('online');
  const [contextRailOpen, setContextRailOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    assets: 0,
    businesses: 0,
    integrations: 0,
  });
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    profileName: '',
    businesses: [],
    projects: [],
    connectedIntegrations: [],
    emailTemplateCount: 0,
    notificationsEnabled: 0,
  });

  useEffect(() => {
    const requestedTab = (location.state as CloudDashboardLocationState | null)?.tab;
    if (requestedTab && TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.state]);

  useEffect(() => {
    void checkUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      void loadCloudContext();
    }
  }, [user, refreshKey]);

  const activeTabConfig = useMemo(() => TABS.find((tab) => tab.id === activeTab) || TABS[0], [activeTab]);

  const checkUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      if (!currentUser) {
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

  const loadCloudContext = async () => {
    if (!user) return;

    setCloudStatus('syncing');

    try {
      const [
        profileResult,
        ownedBusinessesResult,
        memberBusinessesResult,
        userSettingsResult,
        assetCountResult,
      ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('businesses')
          .select('id, name, industry, website, updated_at, created_at')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('business_members')
          .select('business:businesses(id, name, industry, website, updated_at, created_at)')
          .eq('user_id', user.id),
        supabase.from('user_settings').select('settings').eq('user_id', user.id).limit(1),
        supabase.from('project_assets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (userSettingsResult.error && !isMissingUserSettingsError(userSettingsResult.error)) {
        throw userSettingsResult.error;
      }

      const ownedBusinesses = (ownedBusinessesResult.data || []) as unknown as BusinessSummary[];
      const memberBusinesses = ((memberBusinessesResult.data || []) as unknown as Array<{ business?: BusinessSummary | null }>)
        .map((entry) => entry.business)
        .filter(Boolean) as BusinessSummary[];

      const accessibleBusinesses = [...ownedBusinesses];
      memberBusinesses.forEach((business) => {
        if (!accessibleBusinesses.some((existing) => existing.id === business.id)) {
          accessibleBusinesses.push(business);
        }
      });

      const accessibleBusinessIds = accessibleBusinesses.map((business) => business.id);

      const { data: projectData, count: projectCount, error: projectError } = await listProjectsCompat({
        ownerId: user.id,
        businessIds: accessibleBusinessIds,
        limit: 6,
        withCount: true,
      });
      if (projectError) {
        throw projectError;
      }
      const recentProjects = (projectData || []) as ProjectSummary[];

      const settings = parseSettings(userSettingsResult.data?.[0]?.settings);
      const integrationSettings =
        settings.integrations && typeof settings.integrations === 'object' ? settings.integrations : {};
      const connectedIntegrations = Object.entries(integrationSettings)
        .filter(([, value]) => value && typeof value === 'object' && (value as { connected?: boolean }).connected)
        .map(([key]) => key);
      const emailSettings =
        settings.email && typeof settings.email === 'object' && !Array.isArray(settings.email)
          ? settings.email
          : {};
      const notificationSettings = Array.isArray(emailSettings.notifications) ? emailSettings.notifications : [];
      const templateSettings = Array.isArray(emailSettings.templates) ? emailSettings.templates : [];

      setStats({
        projects: projectCount || 0,
        businesses: accessibleBusinesses.length,
        assets: assetCountResult.count || 0,
        integrations: connectedIntegrations.length,
      });
      setSnapshot({
        profileName: profileResult.data?.full_name || '',
        businesses: accessibleBusinesses.slice(0, 5),
        projects: recentProjects,
        connectedIntegrations,
        emailTemplateCount: templateSettings.length,
        notificationsEnabled: notificationSettings.filter((item) => item?.enabled).length,
      });
      setCloudStatus('online');
    } catch (error) {
      console.error('Error loading cloud context:', error);
      setCloudStatus('offline');
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

  const handlePrimaryAction = () => {
    switch (activeTab) {
      case 'overview':
        setActiveTab('projects');
        break;
      case 'projects':
        navigate('/web-builder');
        break;
      case 'assets':
        setActiveTab('projects');
        break;
      case 'email':
        setActiveTab('integrations');
        break;
      case 'integrations':
        setActiveTab('security');
        break;
      case 'security':
        setActiveTab('profile');
        break;
      case 'profile':
        setActiveTab('projects');
        break;
      default:
        setActiveTab('overview');
    }
  };

  const renderTabContent = () => {
    if (!user) return null;

    let content: ReactNode;

    switch (activeTab) {
      case 'overview':
        content = <OverviewPanel user={user} stats={stats} snapshot={snapshot} onSelectTab={setActiveTab} />;
        break;
      case 'projects':
        content = <CloudProjects userId={user.id} />;
        break;
      case 'assets':
        content = <CloudAssets userId={user.id} />;
        break;
      case 'email':
        content = <CloudEmail userId={user.id} />;
        break;
      case 'integrations':
        content = <CloudIntegrations userId={user.id} />;
        break;
      case 'security':
        content = <CloudSecurity userId={user.id} />;
        break;
      case 'profile':
        content = <CloudProfile user={user} />;
        break;
      default:
        content = <OverviewPanel user={user} stats={stats} snapshot={snapshot} onSelectTab={setActiveTab} />;
    }

    return (
      <TabErrorBoundary tabName={activeTab} onRetry={() => setRefreshKey((current) => current + 1)}>
        {content}
      </TabErrorBoundary>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a12] text-white">
          <div className="text-center">
            <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
            <Cloud className="relative mx-auto h-16 w-16 animate-bounce text-white/80" />
            </div>
          <p className="mt-4 text-white/45">Loading cloud dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const ActiveIcon = activeTabConfig.icon;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <AnimatedBackground />

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1900px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white/55 hover:bg-white/[0.05] hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#11111a] p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <Cloud className="h-5 w-5 text-white/85" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">Unison Cloud</h1>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/70">
                    Control Plane
                  </Badge>
                </div>
                <p className="text-xs text-white/35">Redesigned around the actual workspace model</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <StatusPill status={cloudStatus} />
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0d0d18]/90 px-2.5 py-1.5">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{snapshot.profileName || user.email}</p>
                <p className="text-xs text-white/35">{user.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#151520] text-sm font-semibold text-white/85">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1900px] px-4 py-6 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]",
            activeTab === 'projects' && "xl:min-h-[calc(100vh-8.5rem)]",
          )}
        >
          <aside className="hidden xl:block">
            <div className="sticky top-28 space-y-4">
              <Card className="border-white/5 bg-[#0d0d18]/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Navigation</CardTitle>
                  <CardDescription>One shell for every cloud system surface.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {TABS.map((tab) => (
                    <RailTab key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-[#0d0d18]/90">
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>

          <main className={cn("min-w-0", activeTab === 'projects' ? "flex min-h-0 flex-col gap-6" : "space-y-6")}>
            <div className="overflow-x-auto xl:hidden">
              <div className="flex min-w-max gap-2 pb-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                        activeTab === tab.id
                          ? 'border-white/12 bg-white/[0.08] text-white'
                          : 'border-white/5 bg-[#0d0d18]/80 text-white/55'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="relative overflow-hidden border-white/5 bg-[#0d0d18]/90">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_60%)]" />
              <CardContent className="relative p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-white/10 bg-[#11111a] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                      <ActiveIcon className="h-5 w-5 text-white/85" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-white/10 text-white/45">
                          Cloud Section
                        </Badge>
                        {activeTab === 'projects' && (
                          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/70">
                            Business + Project Model
                          </Badge>
                        )}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{activeTabConfig.label}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{activeTabConfig.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      className="border-white/10 text-white/80 hover:bg-white/[0.04] hover:text-white"
                      onClick={() => setContextRailOpen(true)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Account Context
                    </Button>
                    <Button
                      onClick={handlePrimaryAction}
                      className="border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {activeTab === 'projects'
                        ? 'Open Builder'
                        : activeTab === 'integrations'
                          ? 'Go to Security'
                          : activeTab === 'email'
                            ? 'Review Integrations'
                            : activeTab === 'security'
                              ? 'Open Profile'
                              : 'Open Workspaces'}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/10"
                      onClick={() => setRefreshKey((current) => current + 1)}
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Refresh Context
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className={cn(activeTab === 'projects' ? "min-h-0 flex-1" : "min-h-[640px]")}>
              <Suspense
                fallback={
                  <div className="flex h-96 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                  </div>
                }
              >
                {renderTabContent()}
              </Suspense>
            </div>
          </main>
        </div>
      </div>

      <Sheet open={contextRailOpen} onOpenChange={setContextRailOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-white/10 bg-[#0a0a12] p-0 text-white sm:max-w-lg"
        >
          <div className="min-h-full bg-[#0a0a12] p-6">
            <SheetHeader className="border-b border-white/5 pb-4 text-left">
              <SheetTitle className="text-white">Account Context</SheetTitle>
              <SheetDescription className="text-white/45">
                Open this panel when you need account state, recommendations, and connected-service context.
              </SheetDescription>
            </SheetHeader>

            <div className="pt-6">
              <ContextRail
                user={user}
                activeTab={activeTab}
                stats={stats}
                snapshot={snapshot}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setContextRailOpen(false);
                }}
                onPrimaryAction={() => {
                  handlePrimaryAction();
                  setContextRailOpen(false);
                }}
                className="space-y-6"
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
