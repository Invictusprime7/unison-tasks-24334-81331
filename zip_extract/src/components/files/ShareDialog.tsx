import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link2, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: any;
  onShareComplete: () => void;
}

const ShareDialog = ({ open, onOpenChange, file, onShareComplete }: ShareDialogProps) => {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  const { data: shares } = useQuery({
    queryKey: ["shares", file?.id],
    queryFn: async () => {
      if (!file) return [];
      const { data } = await supabase
        .from("shared_files")
        .select("*")
        .eq("file_id", file.id);
      return data || [];
    },
    enabled: !!file,
  });

  const handleShareWithUser = async () => {
    if (!email || !file) return;

    const { data: userData } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${email}%`)
      .single();

    if (!userData) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("shared_files").insert({
      file_id: file.id,
      shared_by: (await supabase.auth.getUser()).data.user?.id,
      shared_with: userData.id,
      permission,
      is_public: false,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to share file",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "File shared successfully" });
      setEmail("");
      onShareComplete();
    }
  };

  const handleTogglePublic = async () => {
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isPublic) {
      const { error } = await supabase
        .from("shared_files")
        .delete()
        .eq("file_id", file.id)
        .eq("is_public", true);

      if (!error) {
        setIsPublic(false);
        toast({ title: "Success", description: "Public link disabled" });
      }
    } else {
      const { error } = await supabase.from("shared_files").insert({
        file_id: file.id,
        shared_by: user.id,
        is_public: true,
        permission: "view",
      });

      if (!error) {
        setIsPublic(true);
        toast({ title: "Success", description: "Public link created" });
      }
    }
    onShareComplete();
  };

  const copyPublicLink = () => {
    const publicShare = shares?.find((s) => s.is_public);
    if (publicShare) {
      navigator.clipboard.writeText(
        `${window.location.origin}/shared/${publicShare.public_token}`
      );
      toast({ title: "Success", description: "Link copied to clipboard" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{file?.name}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Link</Label>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
          </div>

          {isPublic && (
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/shared/${shares?.find((s) => s.is_public)?.public_token || ""}`}
                readOnly
              />
              <Button variant="outline" size="icon" onClick={copyPublicLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Share with specific user</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter user name or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleShareWithUser} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {shares && shares.filter((s) => !s.is_public).length > 0 && (
            <div className="space-y-2">
              <Label>Shared with</Label>
              {shares
                .filter((s) => !s.is_public)
                .map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <span className="text-sm">
                      User {share.shared_with}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {share.permission}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
