import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Zap, ListPlus } from "lucide-react";
import { sendInngestEvent } from "@/services/inngestService";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
}

interface Profile {
  id: string;
  full_name: string | null;
}

export const CreateTaskDialog = ({ open, onOpenChange, projectId, userId }: CreateTaskDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, projectId]);

  const fetchMembers = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .order('full_name');

    if (data) {
      setMembers(data as Profile[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const assigneeId = formData.get("assignee") as string;
    const dueDate = formData.get("due_date") as string;

    const { data: inserted, error } = await (supabase as any)
      .from('tasks')
      .insert({
        title,
        description,
        priority,
        project_id: projectId,
        created_by: userId,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
      })
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Fire automation event for task creation
      if (inserted?.id) {
        sendInngestEvent('automation/trigger', {
          automationId: `task-${inserted.id}`,
          businessId: projectId,
          triggerId: `task_created_${Date.now()}`,
          triggerType: 'task.created',
          payload: { taskId: inserted.id, title, priority, assigneeId, projectId },
          source: 'create-task-dialog',
        }).catch(console.warn);
      }

      toast({
        title: "Success",
        description: "Task created successfully!",
      });
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-[#12121e] border border-cyan-500/30",
        "shadow-[0_0_40px_rgba(0,255,255,0.2)]",
        "max-w-md"
      )}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-lg",
              "bg-cyan-500/10"
            )}>
              <ListPlus className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
            </div>
            <DialogTitle className="text-xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              Create New Task
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Add a new task to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-cyan-400 font-medium">Task Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Implement user authentication"
              required
              className={cn(
                "bg-[#0a0a12] border-cyan-500/20 text-white",
                "placeholder:text-gray-500",
                "focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40",
                "transition-all duration-200"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-cyan-400 font-medium">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the task..."
              rows={3}
              className={cn(
                "bg-[#0a0a12] border-cyan-500/20 text-white",
                "placeholder:text-gray-500",
                "focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40",
                "transition-all duration-200 resize-none"
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-yellow-400 font-medium">Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger className={cn(
                  "bg-[#0a0a12] border-yellow-500/20 text-white",
                  "focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/40"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#12121e] border-yellow-500/20">
                  <SelectItem value="low" className="text-lime-400 focus:bg-lime-500/20">Low</SelectItem>
                  <SelectItem value="medium" className="text-yellow-400 focus:bg-yellow-500/20">Medium</SelectItem>
                  <SelectItem value="high" className="text-red-400 focus:bg-red-500/20">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-fuchsia-400 font-medium">Assignee</Label>
              <Select name="assignee">
                <SelectTrigger className={cn(
                  "bg-[#0a0a12] border-fuchsia-500/20 text-white",
                  "focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/40"
                )}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-[#12121e] border-fuchsia-500/20">
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="text-gray-300 focus:bg-fuchsia-500/20">
                      {member.full_name || "Unnamed User"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date" className="text-purple-400 font-medium">Due Date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              className={cn(
                "bg-[#0a0a12] border-purple-500/20 text-white",
                "[color-scheme:dark]",
                "focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40",
                "transition-all duration-200"
              )}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className={cn(
                "border border-gray-600/30 text-gray-400 font-medium",
                "hover:bg-gray-500/20 hover:text-gray-300",
                "transition-all duration-200"
              )}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className={cn(
                "bg-cyan-500 text-black font-bold",
                "shadow-[0_0_15px_rgba(0,255,255,0.4)]",
                "hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]",
                "active:scale-95 transition-all duration-200"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" />
                  Creating...
                </span>
              ) : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};