import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TaskDetails } from "./TaskDetails";
import { CheckCircle2, Circle, Clock, AlertCircle, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface TasksListProps {
  projectId: string;
  userId: string;
}

export const TasksList = ({ projectId, userId }: TasksListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchTasks = async () => {
    const { data, error } = await (supabase as any)
      .from('tasks')
      .select(`
        *,
        profiles!tasks_assignee_id_fkey (
          full_name
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data as Task[]);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-lime-400 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]" />;
      default:
        return <Circle className="h-5 w-5 text-yellow-400/60" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: "bg-lime-500/20 text-lime-400 border border-lime-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
      high: "bg-red-500/20 text-red-400 border border-red-500/30",
    };
    return (
      <Badge className={cn(
        "font-bold uppercase text-xs",
        styles[priority] || styles.medium
      )}>
        {priority}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Zap className="h-6 w-6 text-cyan-400 animate-pulse" />
        <span className="ml-2 text-cyan-400 font-medium">Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={cn(
        "bg-[#12121e] border border-yellow-500/20 rounded-xl p-12 text-center",
        "shadow-[0_0_30px_rgba(255,255,0,0.08)]"
      )}>
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-full",
          "bg-yellow-500/10 flex items-center justify-center"
        )}>
          <AlertCircle className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(255,255,0,0.5)]" />
        </div>
        <h3 className="text-xl font-bold text-yellow-400 mb-2 drop-shadow-[0_0_10px_rgba(255,255,0,0.5)]">
          No tasks yet
        </h3>
        <p className="text-gray-400">
          Create your first task to start tracking work.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "bg-[#12121e] rounded-xl p-5 cursor-pointer",
              "border border-cyan-500/20 transition-all duration-300",
              "shadow-[0_0_20px_rgba(0,255,255,0.06)]",
              "hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(0,255,255,0.15)]"
            )}
            onClick={() => setSelectedTask(task.id)}
          >
            {/* Task Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-white truncate">
                    {task.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {task.description || "No description"}
                  </p>
                </div>
              </div>
              {getPriorityBadge(task.priority)}
            </div>

            {/* Task Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800 text-sm">
              <div className="text-gray-500">
                {task.profiles?.full_name ? (
                  <span>
                    Assigned to: <span className="text-cyan-400/80">{task.profiles.full_name}</span>
                  </span>
                ) : (
                  <span className="text-gray-600">Unassigned</span>
                )}
              </div>
              {task.due_date && (
                <div className="text-fuchsia-400/80">
                  Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskDetails
          taskId={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          userId={userId}
        />
      )}
    </>
  );
};