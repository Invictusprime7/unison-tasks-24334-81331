import { AsyncBoundary } from "@/components/RouteErrorBoundary";
import { CloudProvider } from "@/contexts/CloudContext";
import { lazy, type ReactElement } from "react";

import Auth from "@/pages/Auth";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

const Pricing = lazy(() => import("@/pages/Pricing"));
const Index = lazy(() => import("@/pages/Index"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("@/pages/CheckoutCancel"));
const WebBuilderPage = lazy(() => import("@/pages/WebBuilderPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Project = lazy(() => import("@/pages/Project"));
const Files = lazy(() => import("@/pages/Files"));
const Creatives = lazy(() => import("@/pages/Creatives"));
const TaskPlanning = lazy(() => import("@/pages/TaskPlanning"));
const DesignStudioPage = lazy(() => import("@/pages/DesignStudioPage"));
const AIPageGenerator = lazy(() =>
  import("@/components/creatives/AIPageGenerator").then((module) => ({
    default: module.AIPageGenerator,
  })),
);
const CRMDashboard = lazy(() => import("@/pages/CRMDashboard"));
const BusinessSettings = lazy(() => import("@/pages/BusinessSettings"));
const CloudDashboard = lazy(() => import("@/pages/CloudDashboard"));
const DocsPage = lazy(() => import("@/pages/DocsPage"));
const Settings = lazy(() => import("@/pages/Settings"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const ProjectSetup = lazy(() => import("@/pages/ProjectSetup"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));

export type RouteShell = "public" | "onboarding" | "workspace" | "project" | "builder" | "focus";
export type RouteChrome = "none" | "legacy" | "canonical" | "fullscreen";
export type RouteSection =
  | "public"
  | "auth"
  | "onboarding"
  | "workspace"
  | "project"
  | "builder"
  | "operations"
  | "account";

export interface AppRouteMeta {
  id: string;
  title: string;
  section: RouteSection;
  shell: RouteShell;
  chrome: RouteChrome;
  requiresAuth?: boolean;
  requiresWorkspace?: boolean;
  requiresProject?: boolean;
  primaryAction?: string;
  deprecatedAliasFor?: string;
}

export interface AppRouteConfig {
  path: string;
  element: ReactElement;
  meta: AppRouteMeta;
}

const pageLoaderElement = (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const withAsyncBoundary = (element: ReactElement) => (
  <AsyncBoundary loading={pageLoaderElement}>{element}</AsyncBoundary>
);

export const appRoutes: AppRouteConfig[] = [
  {
    path: "/",
    element: <Landing />,
    meta: {
      id: "landing",
      title: "Unison Tasks",
      section: "public",
      shell: "public",
      chrome: "none",
      primaryAction: "Start",
    },
  },
  {
    path: "/auth",
    element: <Auth />,
    meta: {
      id: "auth",
      title: "Sign in",
      section: "auth",
      shell: "public",
      chrome: "none",
    },
  },
  {
    path: "/pricing",
    element: withAsyncBoundary(<Pricing />),
    meta: {
      id: "pricing",
      title: "Pricing",
      section: "public",
      shell: "public",
      chrome: "none",
      primaryAction: "Choose plan",
    },
  },
  {
    path: "/home",
    element: withAsyncBoundary(<Index />),
    meta: {
      id: "home",
      title: "Home",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      deprecatedAliasFor: "/dashboard",
    },
  },
  {
    path: "/dashboard",
    element: withAsyncBoundary(<Dashboard />),
    meta: {
      id: "dashboard",
      title: "Dashboard",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      primaryAction: "Create project",
    },
  },
  {
    path: "/project/:id",
    element: withAsyncBoundary(<Project />),
    meta: {
      id: "project",
      title: "Project",
      section: "project",
      shell: "project",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      requiresProject: true,
      primaryAction: "Open builder",
    },
  },
  {
    path: "/project/:projectId/setup",
    element: withAsyncBoundary(<ProjectSetup />),
    meta: {
      id: "project-setup",
      title: "Project setup",
      section: "project",
      shell: "project",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      requiresProject: true,
      primaryAction: "Resolve blockers",
    },
  },
  {
    path: "/files",
    element: withAsyncBoundary(<Files />),
    meta: {
      id: "files",
      title: "Files",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
    },
  },
  {
    path: "/creatives",
    element: withAsyncBoundary(<Creatives />),
    meta: {
      id: "creatives",
      title: "Creatives",
      section: "builder",
      shell: "builder",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
    },
  },
  {
    path: "/planning",
    element: withAsyncBoundary(<TaskPlanning />),
    meta: {
      id: "planning",
      title: "Planning",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
    },
  },
  {
    path: "/design-studio",
    element: withAsyncBoundary(<DesignStudioPage />),
    meta: {
      id: "design-studio",
      title: "Design studio",
      section: "builder",
      shell: "builder",
      chrome: "fullscreen",
      requiresAuth: true,
      requiresWorkspace: true,
      primaryAction: "Open builder",
    },
  },
  {
    path: "/web-builder",
    element: withAsyncBoundary(<WebBuilderPage />),
    meta: {
      id: "web-builder",
      title: "Web builder",
      section: "builder",
      shell: "builder",
      chrome: "fullscreen",
      requiresAuth: true,
      requiresWorkspace: true,
      primaryAction: "Preview",
    },
  },
  {
    path: "/ai-generator",
    element: withAsyncBoundary(<AIPageGenerator />),
    meta: {
      id: "ai-generator",
      title: "AI generator",
      section: "builder",
      shell: "builder",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      deprecatedAliasFor: "/web-builder",
    },
  },
  {
    path: "/crm",
    element: withAsyncBoundary(<CRMDashboard />),
    meta: {
      id: "crm",
      title: "CRM",
      section: "operations",
      shell: "project",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      primaryAction: "Add lead",
    },
  },
  {
    path: "/business-settings",
    element: withAsyncBoundary(<BusinessSettings />),
    meta: {
      id: "business-settings",
      title: "Business settings",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
    },
  },
  {
    path: "/dashboard/leads",
    element: withAsyncBoundary(<CRMDashboard initialView="leads" />),
    meta: {
      id: "dashboard-leads",
      title: "Leads",
      section: "operations",
      shell: "project",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      deprecatedAliasFor: "/crm",
      primaryAction: "Add lead",
    },
  },
  {
    path: "/cloud",
    element: withAsyncBoundary(
      <CloudProvider>
        <CloudDashboard />
      </CloudProvider>,
    ),
    meta: {
      id: "cloud",
      title: "Cloud",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      primaryAction: "Create workspace",
    },
  },
  {
    path: "/docs",
    element: withAsyncBoundary(<DocsPage />),
    meta: {
      id: "docs",
      title: "Docs",
      section: "public",
      shell: "public",
      chrome: "none",
    },
  },
  {
    path: "/settings",
    element: withAsyncBoundary(<Settings />),
    meta: {
      id: "settings",
      title: "Settings",
      section: "account",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
    },
  },
  {
    path: "/auth/reset-password",
    element: withAsyncBoundary(<ResetPassword />),
    meta: {
      id: "reset-password",
      title: "Reset password",
      section: "auth",
      shell: "public",
      chrome: "none",
    },
  },
  {
    path: "/auth/callback",
    element: withAsyncBoundary(<AuthCallback />),
    meta: {
      id: "auth-callback",
      title: "Authentication callback",
      section: "auth",
      shell: "public",
      chrome: "none",
    },
  },
  {
    path: "/checkout/success",
    element: withAsyncBoundary(<CheckoutSuccess />),
    meta: {
      id: "checkout-success",
      title: "Checkout success",
      section: "public",
      shell: "public",
      chrome: "none",
    },
  },
  {
    path: "/checkout/cancel",
    element: withAsyncBoundary(<CheckoutCancel />),
    meta: {
      id: "checkout-cancel",
      title: "Checkout canceled",
      section: "public",
      shell: "public",
      chrome: "none",
    },
  },
  {
    path: "/onboarding",
    element: withAsyncBoundary(<Onboarding />),
    meta: {
      id: "onboarding",
      title: "Onboarding",
      section: "onboarding",
      shell: "onboarding",
      chrome: "legacy",
      requiresAuth: true,
      primaryAction: "Launch system",
    },
  },
  {
    path: "/team",
    element: withAsyncBoundary(<TeamManagement />),
    meta: {
      id: "team",
      title: "Team",
      section: "workspace",
      shell: "workspace",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      primaryAction: "Invite member",
    },
  },
  {
    path: "*",
    element: <NotFound />,
    meta: {
      id: "not-found",
      title: "Not found",
      section: "public",
      shell: "public",
      chrome: "none",
    },
  },
];

export function getRouteById(routeId: string) {
  return appRoutes.find((route) => route.meta.id === routeId) ?? null;
}

export function getRoutesByShell(shell: RouteShell) {
  return appRoutes.filter((route) => route.meta.shell === shell);
}

export function getRoutesBySection(section: RouteSection) {
  return appRoutes.filter((route) => route.meta.section === section);
}
