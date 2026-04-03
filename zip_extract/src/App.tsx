import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Suspense, lazy } from "react";
import { RouteErrorBoundary, AsyncBoundary } from "@/components/RouteErrorBoundary";

// Static imports for lightweight pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import WebBuilderPage from "./pages/WebBuilderPage";

// Dynamic imports for heavy pages
const Pricing = lazy(() => import("./pages/Pricing"));
const Index = lazy(() => import("./pages/Index"));

// Dynamic imports for heavy pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Project = lazy(() => import("./pages/Project"));
const Files = lazy(() => import("./pages/Files"));
const Creatives = lazy(() => import("./pages/Creatives"));
const TaskPlanning = lazy(() => import("./pages/TaskPlanning"));
const DesignStudioPage = lazy(() => import("./pages/DesignStudioPage"));
const AIPageGenerator = lazy(() => import("./components/creatives/AIPageGenerator").then(m => ({ default: m.AIPageGenerator })));
const CRMDashboard = lazy(() => import("./pages/CRMDashboard"));
const BusinessSettings = lazy(() => import("./pages/BusinessSettings"));
const CloudDashboard = lazy(() => import("./pages/CloudDashboard"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const queryClient = new QueryClient();

// Loading component for better UX
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <RouteErrorBoundary routeName="root">
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir="ltr">
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={
                <AsyncBoundary loading={<PageLoader />}>
                  <Pricing />
                </AsyncBoundary>
              } />
              <Route path="/home" element={
                <AsyncBoundary loading={<PageLoader />}>
                  <Index />
                </AsyncBoundary>
              } />
              <Route path="/dashboard" element={
                <AsyncBoundary loading={<PageLoader />}>
                  <Dashboard />
                </AsyncBoundary>
              } />
              <Route path="/project/:id" element={
                <AsyncBoundary loading={<PageLoader />}>
                  <Project />
                </AsyncBoundary>
            } />
            <Route path="/files" element={
              <AsyncBoundary loading={<PageLoader />}>
                <Files />
              </AsyncBoundary>
            } />
            <Route path="/creatives" element={
              <AsyncBoundary loading={<PageLoader />}>
                <Creatives />
              </AsyncBoundary>
            } />
            <Route path="/planning" element={
              <AsyncBoundary loading={<PageLoader />}>
                <TaskPlanning />
              </AsyncBoundary>
            } />
            <Route path="/design-studio" element={
              <AsyncBoundary loading={<PageLoader />}>
                <DesignStudioPage />
              </AsyncBoundary>
            } />
            <Route path="/web-builder" element={
              <RouteErrorBoundary routeName="web-builder">
                <WebBuilderPage />
              </RouteErrorBoundary>
            } />
            <Route path="/ai-generator" element={
              <AsyncBoundary loading={<PageLoader />}>
                <AIPageGenerator />
              </AsyncBoundary>
            } />
            <Route path="/crm" element={
              <AsyncBoundary loading={<PageLoader />}>
                <CRMDashboard />
              </AsyncBoundary>
            } />
            <Route path="/business-settings" element={
              <AsyncBoundary loading={<PageLoader />}>
                <BusinessSettings />
              </AsyncBoundary>
            } />
            <Route path="/dashboard/leads" element={
              <AsyncBoundary loading={<PageLoader />}>
                <CRMDashboard initialView="leads" />
              </AsyncBoundary>
            } />
            <Route path="/cloud" element={
              <AsyncBoundary loading={<PageLoader />}>
                <CloudDashboard />
              </AsyncBoundary>
            } />
            <Route path="/docs" element={
              <AsyncBoundary loading={<PageLoader />}>
                <DocsPage />
              </AsyncBoundary>
            } />
            <Route path="/settings" element={
              <AsyncBoundary loading={<PageLoader />}>
                <Settings />
              </AsyncBoundary>
            } />
            <Route path="/auth/reset-password" element={
              <AsyncBoundary loading={<PageLoader />}>
                <ResetPassword />
              </AsyncBoundary>
            } />
            <Route path="/auth/callback" element={
              <AsyncBoundary loading={<PageLoader />}>
                <AuthCallback />
              </AsyncBoundary>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DirectionProvider>
  </QueryClientProvider>
  </RouteErrorBoundary>
);

export default App;
