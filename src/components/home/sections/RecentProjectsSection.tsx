import { Button } from "@/components/ui/button";
import { RecentProjectCard } from "@/components/home/RecentProjectCard";
import { FolderOpen, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface RecentProject {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  created_at: string;
  canvas_data: any;
}

interface RecentProjectsSectionProps {
  projects: RecentProject[];
  loading: boolean;
  onStartLauncher: () => void;
}

export function RecentProjectsSection({ projects, loading, onStartLauncher }: RecentProjectsSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 py-8 sm:py-12 border-b border-white/5">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-cyan-400" />
          <h2 className="text-base font-semibold text-white/80">Your Projects</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/cloud")}
          className="text-white/30 hover:text-white/60 hover:bg-white/5 text-xs gap-1.5"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8 text-white/30 text-sm gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400" />
          Loading projects...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {projects.map((project) => {
            const canvasData = project.canvas_data as { html?: string; previewCode?: string } | null;
            const previewHtml = canvasData?.previewCode || canvasData?.html || null;
            return (
              <RecentProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                isPublic={project.is_public}
                updatedAt={project.updated_at}
                previewHtml={previewHtml}
                onClick={() => navigate(`/web-builder?id=${project.id}`)}
              />
            );
          })}
          
          {/* New Project tile */}
          <button
            onClick={onStartLauncher}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed border-cyan-500/20 bg-white/[0.02] min-h-[140px] cursor-pointer",
              "hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:shadow-[0_0_20px_rgba(0,200,255,0.1)]",
              "transition-all text-white/30 hover:text-cyan-400"
            )}
          >
            <Zap className="h-6 w-6 mb-2" />
            <span className="text-xs font-medium">New Site</span>
            <span className="text-[10px] text-white/20 mt-0.5">Wizard launcher</span>
          </button>
        </div>
      )}
    </section>
  );
}
