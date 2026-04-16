import { Button } from "@/components/ui/button";
import { RecentProjectCard } from "@/components/home/RecentProjectCard";
import { FolderOpen, ArrowRight, Plus } from "lucide-react";
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
    <section className="container mx-auto px-4 py-8 sm:py-12 border-b border-cyan-500/20">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
          <h2 className="text-lg sm:text-2xl font-bold text-white">Your Recent Projects</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/cloud")}
          className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 text-xs sm:text-sm"
        >
          View All
          <ArrowRight className="ml-1 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-cyan-400 mr-3"></div>
          Loading projects...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {projects.map((project) => {
            const canvasData = project.canvas_data as { html?: string; previewCode?: string; css?: string } | null;
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
          
          <button
            onClick={onStartLauncher}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed border-lime-500/30 bg-[#12121e] min-h-[160px] sm:min-h-[200px] cursor-pointer",
              "hover:shadow-[0_0_20px_rgba(132,204,22,0.2)] hover:border-lime-500/60 transition-all text-gray-500 hover:text-lime-400"
            )}
          >
            <Plus className="h-6 w-6 sm:h-8 sm:w-8 mb-2" />
            <span className="text-xs sm:text-sm font-medium">New Project</span>
          </button>
        </div>
      )}
    </section>
  );
}
