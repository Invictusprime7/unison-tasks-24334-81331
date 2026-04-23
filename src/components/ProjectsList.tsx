import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Folder, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { listProjectsCompat } from "@/services/projectSchemaCompat";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ProjectsListProps {
  userId: string;
}

export const ProjectsList = ({ userId }: ProjectsListProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchProjects = async () => {
    try {
      if (!userId) {
        setProjects([]);
        return;
      }

      const [
        { data: ownedBusinesses, error: ownedError },
        { data: memberBusinesses, error: memberError },
      ] = await Promise.all([
        supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', userId),
        supabase
          .from('business_members')
          .select('business:businesses(id)')
          .eq('user_id', userId),
      ]);

      if (ownedError && memberError) {
        throw ownedError || memberError;
      }

      const accessibleBusinessIds = Array.from(new Set([
        ...((ownedBusinesses || []).map((business) => business.id)),
        ...((memberBusinesses || [])
          .map((entry: any) => entry.business?.id)
          .filter((businessId: string | undefined): businessId is string => Boolean(businessId))),
      ]));

      if (accessibleBusinessIds.length === 0) {
        setProjects([]);
        return;
      }

      const { data, error } = await listProjectsCompat({
        ownerId: userId,
        businessIds: accessibleBusinessIds,
      });

      if (error) throw error;
      setProjects((data || []).map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description || null,
        created_at: project.created_at || new Date().toISOString(),
      })));
    } catch (error) {
      console.error('Error loading workspace projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Zap className="h-6 w-6 text-cyan-400 animate-pulse" />
        <span className="ml-2 text-cyan-400 font-medium">Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={cn(
        "bg-[#12121e] border border-cyan-500/20 rounded-xl p-12 text-center",
        "shadow-[0_0_30px_rgba(0,255,255,0.08)]"
      )}>
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-full",
          "bg-cyan-500/10 flex items-center justify-center"
        )}>
          <Folder className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
        </div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
          No projects yet
        </h3>
        <p className="text-gray-400 mb-6">
          Create your first project to get started with task management.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => {
        // Cycle through different neon colors for variety
        const colors = ['cyan', 'lime', 'fuchsia', 'yellow', 'purple'] as const;
        const color = colors[index % colors.length];
        
        const colorStyles = {
          cyan: {
            border: "border-cyan-500/20 hover:border-cyan-500/50",
            shadow: "shadow-[0_0_20px_rgba(0,255,255,0.08)] hover:shadow-[0_0_30px_rgba(0,255,255,0.2)]",
            icon: "bg-cyan-500/10 text-cyan-400",
            title: "text-cyan-400",
            button: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30",
          },
          lime: {
            border: "border-lime-500/20 hover:border-lime-500/50",
            shadow: "shadow-[0_0_20px_rgba(0,255,0,0.08)] hover:shadow-[0_0_30px_rgba(0,255,0,0.2)]",
            icon: "bg-lime-500/10 text-lime-400",
            title: "text-lime-400",
            button: "bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 border-lime-500/30",
          },
          fuchsia: {
            border: "border-fuchsia-500/20 hover:border-fuchsia-500/50",
            shadow: "shadow-[0_0_20px_rgba(255,0,255,0.08)] hover:shadow-[0_0_30px_rgba(255,0,255,0.2)]",
            icon: "bg-fuchsia-500/10 text-fuchsia-400",
            title: "text-fuchsia-400",
            button: "bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/30 border-fuchsia-500/30",
          },
          yellow: {
            border: "border-yellow-500/20 hover:border-yellow-500/50",
            shadow: "shadow-[0_0_20px_rgba(255,255,0,0.08)] hover:shadow-[0_0_30px_rgba(255,255,0,0.2)]",
            icon: "bg-yellow-500/10 text-yellow-400",
            title: "text-yellow-400",
            button: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-yellow-500/30",
          },
          purple: {
            border: "border-purple-500/20 hover:border-purple-500/50",
            shadow: "shadow-[0_0_20px_rgba(168,85,247,0.08)] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
            icon: "bg-purple-500/10 text-purple-400",
            title: "text-purple-400",
            button: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/30",
          },
        };

        const style = colorStyles[color];

        return (
          <div
            key={project.id}
            className={cn(
              "bg-[#12121e] rounded-xl p-6 cursor-pointer",
              "border transition-all duration-300",
              style.border,
              style.shadow
            )}
            onClick={() => navigate(`/project/${project.id}`)}
          >
            {/* Card Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className={cn(
                "p-2 rounded-lg",
                style.icon
              )}>
                <Folder className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-bold text-lg truncate",
                  style.title
                )}>
                  {project.name}
                </h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                  {project.description || "No description"}
                </p>
              </div>
            </div>

            {/* Card Footer */}
            <Button 
              variant="ghost"
              className={cn(
                "w-full border font-medium",
                style.button,
                "transition-all duration-200"
              )}
            >
              View Project
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
