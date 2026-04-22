import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Zap, FolderPlus } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Called with the new project ID right after creation — use this to open the wizard launcher */
  onProjectCreated?: (projectId: string) => void;
}

export const CreateProjectDialog = ({ open, onOpenChange, userId, onProjectCreated }: CreateProjectDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        owner_id: userId,
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
      toast({
        title: "Project created!",
        description: "Now let's build your system...",
      });
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
      if (onProjectCreated && data?.id) {
        onProjectCreated(data.id);
      } else {
        navigate("/creatives");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-[#12121e] border border-lime-500/30",
        "shadow-[0_0_40px_rgba(0,255,0,0.2)]",
        "sm:max-w-md"
      )}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-lg",
              "bg-lime-500/10"
            )}>
              <FolderPlus className="h-5 w-5 text-lime-400 drop-shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
            </div>
            <DialogTitle className="text-xl font-bold text-lime-400 drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">
              Create New Project
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Name your project — then pick a system and launch it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-lime-400 font-medium">Project Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Marketing Campaign"
              required
              className={cn(
                "bg-[#0a0a12] border-lime-500/20 text-white",
                "placeholder:text-gray-500",
                "focus:border-lime-500/60 focus:ring-1 focus:ring-lime-500/40",
                "transition-all duration-200"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-lime-400 font-medium">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your project..."
              rows={3}
              className={cn(
                "bg-[#0a0a12] border-lime-500/20 text-white",
                "placeholder:text-gray-500",
                "focus:border-lime-500/60 focus:ring-1 focus:ring-lime-500/40",
                "transition-all duration-200 resize-none"
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
                "bg-lime-400 text-black font-bold",
                "shadow-[0_0_15px_rgba(0,255,0,0.4)]",
                "hover:bg-lime-300 hover:shadow-[0_0_25px_rgba(0,255,0,0.6)]",
                "active:scale-95 transition-all duration-200"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" />
                  Creating...
                </span>
              ) : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};