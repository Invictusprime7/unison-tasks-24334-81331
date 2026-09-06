import { useEffect, useState } from "react";
import { 
  Users, 
  Target, 
  Workflow, 
  FileText, 
  BarChart3, 
  Menu,
  X,
  Kanban,
  Zap,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRMContacts } from "@/components/crm/CRMContacts";
import { CRMLeads } from "@/components/crm/CRMLeads";
import { CRMWorkflows } from "@/components/crm/CRMWorkflows";
import { CRMFormSubmissions } from "@/components/crm/CRMFormSubmissions";
import { CRMOverview } from "@/components/crm/CRMOverview";
import { CRMPipeline } from "@/components/crm/CRMPipeline";
import { CRMAutomations } from "@/components/crm/CRMAutomations";
import { PrebuiltWorkflows } from "@/components/crm/PrebuiltWorkflows";
import { CRMBookings } from "@/components/crm/CRMBookings";

export type CRMView = "overview" | "contacts" | "leads" | "bookings" | "pipeline" | "workflows" | "recipes" | "automations" | "forms";

const navItems = [
  { id: "overview" as CRMView, label: "Overview", icon: BarChart3 },
  { id: "contacts" as CRMView, label: "Contacts", icon: Users },
  { id: "leads" as CRMView, label: "Leads", icon: Target },
  { id: "bookings" as CRMView, label: "Bookings", icon: Calendar },
  { id: "pipeline" as CRMView, label: "Pipeline", icon: Kanban },
  { id: "workflows" as CRMView, label: "Workflows", icon: Workflow },
  { id: "recipes" as CRMView, label: "Prebuilt", icon: Sparkles },
  { id: "automations" as CRMView, label: "Automations", icon: Zap },
  { id: "forms" as CRMView, label: "Form Submissions", icon: FileText },
];

interface CRMDashboardProps {
  initialView?: CRMView;
  businessId: string;
  projectId: string;
  embedded?: boolean;
}

export default function CRMDashboard({
  initialView = "overview",
  businessId,
  projectId,
  embedded = false,
}: CRMDashboardProps) {
  const [activeView, setActiveView] = useState<CRMView>(initialView);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const selectView = (view: CRMView) => {
    setActiveView(view);
  };

  const renderContent = () => {
    switch (activeView) {
      case "contacts":
        return <CRMContacts businessId={businessId} projectId={projectId} />;
      case "leads":
        return <CRMLeads businessId={businessId} projectId={projectId} />;
      case "bookings":
        return <CRMBookings businessId={businessId} projectId={projectId} />;
      case "pipeline":
        return <CRMPipeline businessId={businessId} projectId={projectId} />;
      case "workflows":
        return <CRMWorkflows businessId={businessId} projectId={projectId} />;
      case "recipes":
        return <PrebuiltWorkflows businessId={businessId} />;
      case "automations":
        return <CRMAutomations businessId={businessId} projectId={projectId} />;
      case "forms":
        return <CRMFormSubmissions businessId={businessId} projectId={projectId} />;
      default:
        return (
          <CRMOverview
            businessId={businessId}
            projectId={projectId}
            onNavigate={selectView}
          />
        );
    }
  };

  return (
    <div className={cn("bg-background flex", embedded ? "min-h-[36rem]" : "min-h-screen")}>
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-base text-foreground">CRM</h1>
                {embedded && <p className="text-[11px] text-muted-foreground">Project workspace</p>}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                !sidebarOpen && "justify-center px-2"
              )}
              onClick={() => selectView(item.id)}
            >
              <item.icon className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
              {sidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground capitalize">
              {activeView === "forms" ? "Form Submissions" : activeView === "recipes" ? "Prebuilt Workflows" : activeView}
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {projectId ? "Project scoped" : businessId ? "Business scoped" : "Workspace scope required"}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
