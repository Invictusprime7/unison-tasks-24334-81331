import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  Target, 
  Workflow, 
  FileText, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Plus,
  Home,
  Kanban,
  Zap,
  Sparkles,
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

type CRMView = "overview" | "contacts" | "leads" | "pipeline" | "workflows" | "recipes" | "automations" | "forms";

const navItems = [
  { id: "overview" as CRMView, label: "Overview", icon: BarChart3 },
  { id: "contacts" as CRMView, label: "Contacts", icon: Users },
  { id: "leads" as CRMView, label: "Leads", icon: Target },
  { id: "pipeline" as CRMView, label: "Pipeline", icon: Kanban },
  { id: "workflows" as CRMView, label: "Workflows", icon: Workflow },
  { id: "recipes" as CRMView, label: "Prebuilt", icon: Sparkles },
  { id: "automations" as CRMView, label: "Automations", icon: Zap },
  { id: "forms" as CRMView, label: "Form Submissions", icon: FileText },
];

interface CRMDashboardProps {
  initialView?: CRMView;
}

export default function CRMDashboard({ initialView = "overview" }: CRMDashboardProps) {
  const [activeView, setActiveView] = useState<CRMView>(initialView);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeView) {
      case "contacts":
        return <CRMContacts />;
      case "leads":
        return <CRMLeads />;
      case "pipeline":
        return <CRMPipeline />;
      case "workflows":
        return <CRMWorkflows />;
      case "recipes":
        return <PrebuiltWorkflows />;
      case "automations":
        return <CRMAutomations />;
      case "forms":
        return <CRMFormSubmissions />;
      default:
        return <CRMOverview onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
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
            <Link to="/">
              <Button variant="ghost" size="icon" title="Back to Home">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            {sidebarOpen && (
              <h1 className="font-bold text-lg text-foreground">CRM</h1>
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
              onClick={() => setActiveView(item.id)}
            >
              <item.icon className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
              {sidebarOpen && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border">
          <Link to="/business-settings" className="block">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                !sidebarOpen && "justify-center px-2"
              )}
            >
              <Settings className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
              {sidebarOpen && <span>Settings</span>}
            </Button>
          </Link>
        </div>
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
          <div className="flex items-center gap-2">
            {activeView !== "overview" && activeView !== "forms" && activeView !== "pipeline" && activeView !== "automations" && activeView !== "recipes" && (
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add {activeView === "workflows" ? "Workflow" : activeView.slice(0, -1)}
              </Button>
            )}
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
