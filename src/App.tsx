import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DirectionProvider } from "@radix-ui/react-direction";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { LaunchProvider } from "@/contexts/LaunchContext";
import { AppRouteElement } from "@/routes/AppRouteElement";
import { appRoutes } from "@/routes/routeConfig";

const queryClient = new QueryClient();

const App = () => (
  <RouteErrorBoundary routeName="root">
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir="ltr">
        <TooltipProvider>
          <LaunchProvider>
            <Sonner />
            <BrowserRouter>
            <Routes>
              {appRoutes.map((route) => (
                <Route
                  key={route.meta.id}
                  path={route.path}
                  element={<AppRouteElement route={route} />}
                />
              ))}
          </Routes>
        </BrowserRouter>
        <Analytics />
          </LaunchProvider>
      </TooltipProvider>
    </DirectionProvider>
  </QueryClientProvider>
  </RouteErrorBoundary>
);

export default App;
