import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Settings,
  Trash2,
  CheckSquare,
  ArrowLeft,
  Crown,
  Eye,
  Zap,
  Globe,
  BarChart3,
  CreditCard,
  FolderOpen,
  Palette,
  Bot,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberPermissions {
  crm: boolean;
  automations: boolean;
  web_builder: boolean;
  analytics: boolean;
  billing: boolean;
  team_management: boolean;
  file_storage: boolean;
  design_studio: boolean;
}

interface TeamMember {
  workspace_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_email: string | null;
  display_name: string | null;
  permissions: MemberPermissions;
  created_at: string | null;
}

const DEFAULT_PERMISSIONS: MemberPermissions = {
  crm: true,
  automations: true,
  web_builder: true,
  analytics: false,
  billing: false,
  team_management: false,
  file_storage: true,
  design_studio: false,
};

const PERMISSION_META: Array<{
  key: keyof MemberPermissions;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { key: "crm", label: "CRM & Leads", description: "Access contacts, deals, and pipeline", icon: Users },
  { key: "automations", label: "Automations", description: "Create and manage workflow automations", icon: Bot },
  { key: "web_builder", label: "Web Builder", description: "Build and edit site pages", icon: Globe },
  { key: "analytics", label: "Analytics", description: "View traffic and conversion data", icon: BarChart3 },
  { key: "billing", label: "Billing", description: "View and manage billing info", icon: CreditCard },
  { key: "team_management", label: "Team Management", description: "Invite and manage team members", icon: Shield },
  { key: "file_storage", label: "Files & Assets", description: "Access file storage", icon: FolderOpen },
  { key: "design_studio", label: "Design Studio", description: "Access advanced design tools", icon: Palette },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  admin: { label: "Admin", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  member: { label: "Member", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  viewer: { label: "Viewer", color: "text-white/50 bg-white/5 border-white/10" },
};

// ─── Invite Dialog ────────────────────────────────────────────────────────────

function InviteMemberDialog({
  workspaceId,
  onInvited,
}: {
  workspaceId: string;
  onInvited: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      // Check if this email already has an auth account
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", email) // fallback — email isn't in profiles
        .maybeSingle();

      const memberId = existingUser?.id ?? crypto.randomUUID();

      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: memberId,
        role,
        invited_email: email.trim(),
        display_name: displayName.trim() || null,
        is_active: false, // pending until they accept
        permissions: DEFAULT_PERMISSIONS,
      });

      if (error) throw error;

      toast({ title: "Invite sent", description: `Invitation recorded for ${email}` });
      setEmail("");
      setDisplayName("");
      setRole("member");
      setOpen(false);
      onInvited();
    } catch (err: unknown) {
      toast({
        title: "Invite failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d0d18] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Invite a Team Member</DialogTitle>
          <DialogDescription className="text-white/50">
            Add a client or collaborator to your workspace. They'll receive access based on their role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm text-white/70">Email address</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3">
              <Mail className="h-4 w-4 text-white/30 shrink-0" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@example.com"
                required
                className="border-0 bg-transparent text-white placeholder:text-white/30 focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-white/70">Display name (optional)</label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Client name or company"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-white/70">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d18] border-white/10">
                <SelectItem value="admin" className="text-white focus:bg-white/10">Admin</SelectItem>
                <SelectItem value="member" className="text-white focus:bg-white/10">Member</SelectItem>
                <SelectItem value="viewer" className="text-white focus:bg-white/10">Viewer (read-only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          >
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Permission Toggles ───────────────────────────────────────────────────────

function PermissionToggles({
  member,
  onUpdate,
}: {
  member: TeamMember;
  onUpdate: (member: TeamMember, permissions: MemberPermissions) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = async (key: keyof MemberPermissions) => {
    setSaving(key);
    const updated = { ...member.permissions, [key]: !member.permissions[key] };
    await onUpdate(member, updated);
    setSaving(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {PERMISSION_META.map(({ key, label, description, icon: Icon }) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{label}</p>
              <p className="text-[10px] text-white/30 truncate hidden sm:block">{description}</p>
            </div>
          </div>
          <Switch
            checked={member.permissions[key]}
            onCheckedChange={() => handleToggle(key)}
            disabled={saving === key || member.role === "owner"}
            className="data-[state=checked]:bg-cyan-500 shrink-0"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isCurrentUser,
  onRoleChange,
  onPermissionUpdate,
  onRemove,
  onToggleActive,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
  onRoleChange: (member: TeamMember, role: string) => Promise<void>;
  onPermissionUpdate: (member: TeamMember, permissions: MemberPermissions) => Promise<void>;
  onRemove: (member: TeamMember) => Promise<void>;
  onToggleActive: (member: TeamMember) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleInfo = ROLE_LABELS[member.role] ?? ROLE_LABELS.member;
  const displayLabel = member.display_name || member.invited_email || member.user_id.slice(0, 8);

  return (
    <Card className="bg-[#0d0d18] border-white/8 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white/70">
                {(displayLabel[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold truncate">{displayLabel}</span>
                {isCurrentUser && (
                  <span className="text-[10px] text-white/30 italic">(you)</span>
                )}
                {member.role === "owner" && (
                  <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                )}
              </div>
              {member.invited_email && member.display_name && (
                <p className="text-xs text-white/40 truncate">{member.invited_email}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Active toggle */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${member.is_active ? "text-emerald-400" : "text-white/30"}`}>
                {member.is_active ? "Active" : "Pending"}
              </span>
              {!isCurrentUser && member.role !== "owner" && (
                <Switch
                  checked={member.is_active}
                  onCheckedChange={() => onToggleActive(member)}
                  className="data-[state=checked]:bg-emerald-500 scale-75"
                />
              )}
            </div>

            {/* Role badge */}
            <Badge className={`text-[10px] border font-medium px-2 py-0.5 ${roleInfo.color}`}>
              {roleInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Role selector */}
        {!isCurrentUser && member.role !== "owner" && (
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-white/30" />
            <Select
              value={member.role}
              onValueChange={(val) => onRoleChange(member, val)}
            >
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d0d18] border-white/10">
                <SelectItem value="admin" className="text-white text-xs focus:bg-white/10">Admin</SelectItem>
                <SelectItem value="member" className="text-white text-xs focus:bg-white/10">Member</SelectItem>
                <SelectItem value="viewer" className="text-white text-xs focus:bg-white/10">Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-white/40 hover:text-white/70 ml-auto"
              onClick={() => setExpanded(e => !e)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              {expanded ? "Hide" : "Permissions"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0d0d18] border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove member?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    This will revoke {displayLabel}'s access to your workspace.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRemove(member)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Permission toggles */}
        {expanded && !isCurrentUser && member.role !== "owner" && (
          <PermissionToggles member={member} onUpdate={onPermissionUpdate} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TeamManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Use the first project as the "workspace" for now
  // Future: let user pick which project's team to manage
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);

      // Get user's first project as workspace
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const wsId = project?.id ?? session.user.id; // fallback to user ID if no project
      setWorkspaceId(wsId);
      await loadMembers(wsId);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const loadMembers = useCallback(async (wsId: string) => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load members:", error);
      return;
    }

    setMembers(
      (data ?? []).map((row: Record<string, unknown>) => ({
        workspace_id: row.workspace_id as string,
        user_id: row.user_id as string,
        role: (row.role as string) ?? "member",
        is_active: (row.is_active as boolean) ?? false,
        invited_email: (row.invited_email as string | null) ?? null,
        display_name: (row.display_name as string | null) ?? null,
        permissions: ((row.permissions as MemberPermissions) ?? DEFAULT_PERMISSIONS),
        created_at: (row.created_at as string | null) ?? null,
      }))
    );
  }, []);

  const handleRoleChange = async (member: TeamMember, role: string) => {
    const { error } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", member.workspace_id)
      .eq("user_id", member.user_id);

    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
      return;
    }
    setMembers(prev =>
      prev.map(m => m.user_id === member.user_id ? { ...m, role } : m)
    );
    toast({ title: "Role updated" });
  };

  const handlePermissionUpdate = async (member: TeamMember, permissions: MemberPermissions) => {
    const { error } = await supabase
      .from("workspace_members")
      .update({ permissions })
      .eq("workspace_id", member.workspace_id)
      .eq("user_id", member.user_id);

    if (error) {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
      return;
    }
    setMembers(prev =>
      prev.map(m => m.user_id === member.user_id ? { ...m, permissions } : m)
    );
  };

  const handleRemove = async (member: TeamMember) => {
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", member.workspace_id)
      .eq("user_id", member.user_id);

    if (error) {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
      return;
    }
    setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
    toast({ title: "Member removed" });
  };

  const handleToggleActive = async (member: TeamMember) => {
    const { error } = await supabase
      .from("workspace_members")
      .update({ is_active: !member.is_active })
      .eq("workspace_id", member.workspace_id)
      .eq("user_id", member.user_id);

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setMembers(prev =>
      prev.map(m => m.user_id === member.user_id ? { ...m, is_active: !m.is_active } : m)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070711]">
        <Zap className="h-8 w-8 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  const activeCount = members.filter(m => m.is_active).length;
  const pendingCount = members.filter(m => !m.is_active).length;

  return (
    <div className="min-h-screen bg-[#070711] text-white">
      {/* Header */}
      <header className="bg-[#0a0a14]/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-cyan-400" />
            <span className="font-bold">Unison Tasks</span>
            <span className="text-white/20 mx-1">/</span>
            <span className="text-white/60 text-sm">Team Management</span>
          </div>
        </div>

        {workspaceId && (
          <InviteMemberDialog
            workspaceId={workspaceId}
            onInvited={() => workspaceId && loadMembers(workspaceId)}
          />
        )}
      </header>

      {/* Page content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Members", value: members.length, icon: Users, color: "text-cyan-400" },
            { label: "Active", value: activeCount, icon: Eye, color: "text-emerald-400" },
            { label: "Pending Invite", value: pendingCount, icon: Mail, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-[#0d0d18] border border-white/5 rounded-xl p-4 flex items-center gap-3"
            >
              <Icon className={`h-5 w-5 ${color} shrink-0`} />
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Member list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Workspace Members
            </h2>
            <span className="text-xs text-white/30">{members.length} total</span>
          </div>

          {members.length === 0 ? (
            <div className="bg-[#0d0d18] border border-white/5 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 text-center">
              <Users className="h-8 w-8 text-white/20" />
              <p className="text-white/40 text-sm">No team members yet</p>
              <p className="text-white/25 text-xs max-w-xs">
                Invite clients or collaborators to give them access to your workspace tools.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <MemberCard
                  key={`${member.workspace_id}-${member.user_id}`}
                  member={member}
                  isCurrentUser={member.user_id === user?.id}
                  onRoleChange={handleRoleChange}
                  onPermissionUpdate={handlePermissionUpdate}
                  onRemove={handleRemove}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </div>

        {/* Role legend */}
        <div className="bg-[#0d0d18] border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Role Permissions Guide</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(ROLE_LABELS).map(([role, { label, color }]) => (
              <div key={role} className="flex items-start gap-2">
                <Badge className={`${color} border text-[10px] shrink-0`}>{label}</Badge>
                <span className="text-white/40 leading-relaxed">
                  {role === "owner" && "Full access. Cannot be changed."}
                  {role === "admin" && "Can manage content, team, and settings."}
                  {role === "member" && "Can use assigned features. Cannot manage team."}
                  {role === "viewer" && "Read-only access to assigned features."}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeamManagement;
