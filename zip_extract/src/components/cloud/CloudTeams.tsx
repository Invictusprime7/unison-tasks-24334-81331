/**
 * CLOUD TEAMS - Immersive team and member management
 * 
 * Enterprise team management features:
 * - Team members list
 * - Invite members
 * - Role management
 * - Remove members
 * - Pending invitations
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  UserCog,
  User,
  Eye,
  CreditCard,
  MoreHorizontal,
  Trash2,
  Mail,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  ChevronDown,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CloudTeamsProps {
  userId: string;
  organizationId?: string;
}

type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'billing';

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: Date;
  lastActive: Date;
}

interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'expired';
}

const ROLE_CONFIG: Record<TeamRole, { icon: React.ElementType; color: string; gradient: string; label: string; description: string }> = {
  owner: {
    icon: Crown,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-amber-500',
    label: 'Owner',
    description: 'Full access, can transfer ownership',
  },
  admin: {
    icon: Shield,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
    label: 'Admin',
    description: 'Manage team, settings, all projects',
  },
  manager: {
    icon: UserCog,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
    label: 'Manager',
    description: 'Manage projects and workflows',
  },
  member: {
    icon: User,
    color: 'text-green-400',
    gradient: 'from-green-500 to-emerald-500',
    label: 'Member',
    description: 'Create and edit projects',
  },
  viewer: {
    icon: Eye,
    color: 'text-slate-400',
    gradient: 'from-slate-500 to-slate-600',
    label: 'Viewer',
    description: 'Read-only access',
  },
  billing: {
    icon: CreditCard,
    color: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-500',
    label: 'Billing',
    description: 'View and manage billing',
  },
};

// Team stat card
function TeamStat({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
}) {
  return (
    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg bg-gradient-to-r', gradient)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Member card component
function MemberCard({
  member,
  currentUserId,
  canManage,
  onRoleChange,
  onRemove,
  onTransferOwnership,
}: {
  member: TeamMember;
  currentUserId: string;
  canManage: boolean;
  onRoleChange: (role: TeamRole) => void;
  onRemove: () => void;
  onTransferOwnership: () => void;
}) {
  const config = ROLE_CONFIG[member.role];
  const Icon = config.icon;
  const isCurrentUser = member.userId === currentUserId;
  const isOwner = member.role === 'owner';

  const getInitials = () => {
    if (member.fullName) {
      return member.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return member.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-white/10">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className={cn('bg-gradient-to-br', config.gradient)}>
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <div className="absolute -top-1 -right-1 p-1 rounded-full bg-yellow-500">
                <Crown className="h-3 w-3 text-yellow-900" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white truncate">
                {member.fullName || member.email.split('@')[0]}
              </p>
              {isCurrentUser && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  You
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 truncate">{member.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={cn(
                  'border text-xs',
                  `bg-${config.color.split('-')[1]}-500/10 ${config.color} border-${config.color.split('-')[1]}-500/30`
                )}
              >
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-xs text-slate-500">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {canManage && !isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
              {!isOwner && (
                <>
                  <DropdownMenuItem
                    onClick={() => onRoleChange('admin')}
                    className="text-slate-300 hover:text-white focus:text-white"
                  >
                    <Shield className="h-4 w-4 mr-2 text-blue-400" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRoleChange('member')}
                    className="text-slate-300 hover:text-white focus:text-white"
                  >
                    <User className="h-4 w-4 mr-2 text-green-400" />
                    Make Member
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRoleChange('viewer')}
                    className="text-slate-300 hover:text-white focus:text-white"
                  >
                    <Eye className="h-4 w-4 mr-2 text-slate-400" />
                    Make Viewer
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={onTransferOwnership}
                className="text-slate-300 hover:text-white focus:text-white"
              >
                <Crown className="h-4 w-4 mr-2 text-yellow-400" />
                Transfer Ownership
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={onRemove}
                className="text-red-400 hover:text-red-300 focus:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove from Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Invitation card component
function InvitationCard({
  invitation,
  onResend,
  onCancel,
  resending,
}: {
  invitation: Invitation;
  onResend: () => void;
  onCancel: () => void;
  resending: boolean;
}) {
  const config = ROLE_CONFIG[invitation.role];
  const Icon = config.icon;
  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-300',
        isExpired
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Mail className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{invitation.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={cn(
                  'border text-xs',
                  isExpired
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {isExpired ? 'Expired' : 'Pending'}
              </Badge>
              <Badge className="bg-white/5 text-slate-400 border-white/10 text-xs">
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Invited {new Date(invitation.invitedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResend}
            disabled={resending}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CloudTeams({ userId, organizationId }: CloudTeamsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole>('member');

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviting, setInviting] = useState(false);

  // Action dialogs
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [transferTo, setTransferTo] = useState<TeamMember | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);

  const canManage = ['owner', 'admin'].includes(currentUserRole);

  useEffect(() => {
    loadTeamData();
  }, [userId, organizationId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      // Mock data - would come from organization_members table
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          userId: userId,
          email: 'you@example.com',
          fullName: 'Current User',
          avatarUrl: null,
          role: 'owner',
          joinedAt: new Date('2024-01-15'),
          lastActive: new Date(),
        },
        {
          id: '2',
          userId: 'user-2',
          email: 'sarah@acme.com',
          fullName: 'Sarah Chen',
          avatarUrl: null,
          role: 'admin',
          joinedAt: new Date('2024-02-20'),
          lastActive: new Date(Date.now() - 3600000),
        },
        {
          id: '3',
          userId: 'user-3',
          email: 'mike@acme.com',
          fullName: 'Mike Johnson',
          avatarUrl: null,
          role: 'member',
          joinedAt: new Date('2024-03-10'),
          lastActive: new Date(Date.now() - 86400000),
        },
        {
          id: '4',
          userId: 'user-4',
          email: 'emma@acme.com',
          fullName: 'Emma Wilson',
          avatarUrl: null,
          role: 'viewer',
          joinedAt: new Date('2024-04-05'),
          lastActive: new Date(Date.now() - 172800000),
        },
      ];

      const mockInvitations: Invitation[] = [
        {
          id: 'inv-1',
          email: 'john@newteam.com',
          role: 'member',
          invitedBy: 'you@example.com',
          invitedAt: new Date(Date.now() - 86400000),
          expiresAt: new Date(Date.now() + 86400000 * 6),
          status: 'pending',
        },
        {
          id: 'inv-2',
          email: 'expired@oldteam.com',
          role: 'viewer',
          invitedBy: 'you@example.com',
          invitedAt: new Date(Date.now() - 86400000 * 10),
          expiresAt: new Date(Date.now() - 86400000 * 3),
          status: 'expired',
        },
      ];

      setMembers(mockMembers);
      setInvitations(mockInvitations);

      // Set current user role
      const currentMember = mockMembers.find((m) => m.userId === userId);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.fullName?.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      m.role.includes(query)
    );
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      // Would call team invite API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newInvitation: Invitation = {
        id: `inv-${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        invitedBy: 'you@example.com',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000 * 7),
        status: 'pending',
      };

      setInvitations((prev) => [newInvitation, ...prev]);

      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    try {
      // Would call role update API
      await new Promise((resolve) => setTimeout(resolve, 500));

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );

      toast({
        title: 'Role Updated',
        description: 'Member role has been updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) return;

    try {
      // Would call remove member API
      await new Promise((resolve) => setTimeout(resolve, 500));

      setMembers((prev) => prev.filter((m) => m.id !== removeMember.id));

      toast({
        title: 'Member Removed',
        description: `${removeMember.fullName || removeMember.email} has been removed from the team`,
      });
      setRemoveMember(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTo) return;

    try {
      // Would call transfer ownership API
      await new Promise((resolve) => setTimeout(resolve, 500));

      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === transferTo.id) return { ...m, role: 'owner' as TeamRole };
          if (m.userId === userId) return { ...m, role: 'admin' as TeamRole };
          return m;
        })
      );
      setCurrentUserRole('admin');

      toast({
        title: 'Ownership Transferred',
        description: `Ownership transferred to ${transferTo.fullName || transferTo.email}`,
      });
      setTransferTo(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to transfer ownership',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInvite(inviteId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === inviteId
            ? {
                ...inv,
                invitedAt: new Date(),
                expiresAt: new Date(Date.now() + 86400000 * 7),
                status: 'pending' as const,
              }
            : inv
        )
      );

      toast({
        title: 'Invitation Resent',
        description: 'Invitation has been resent',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
    } finally {
      setResendingInvite(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));

      toast({
        title: 'Invitation Cancelled',
        description: 'Invitation has been cancelled',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      });
    }
  };

  const roleStats = {
    owners: members.filter((m) => m.role === 'owner').length,
    admins: members.filter((m) => m.role === 'admin').length,
    members: members.filter((m) => m.role === 'member').length,
    viewers: members.filter((m) => m.role === 'viewer').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-40 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Team Overview Hero */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-rose-600/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Team Management</h2>
                <p className="text-slate-400">Manage your team members and roles</p>
              </div>
            </div>

            {canManage && (
              <Button
                onClick={() => setInviteDialogOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TeamStat
              icon={Users}
              label="Total Members"
              value={members.length}
              gradient="from-purple-500 to-pink-500"
            />
            <TeamStat
              icon={Crown}
              label="Owners"
              value={roleStats.owners}
              gradient="from-yellow-500 to-amber-500"
            />
            <TeamStat
              icon={Shield}
              label="Admins"
              value={roleStats.admins}
              gradient="from-blue-500 to-cyan-500"
            />
            <TeamStat
              icon={Mail}
              label="Pending Invites"
              value={invitations.filter((i) => i.status === 'pending').length}
              gradient="from-orange-500 to-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members by name, email, or role..."
          className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 h-12"
        />
      </div>

      {/* Members List */}
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Team Members ({filteredMembers.length})
          </CardTitle>
          <CardDescription>Active members of your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={userId}
                canManage={canManage}
                onRoleChange={(role) => handleRoleChange(member.id, role)}
                onRemove={() => setRemoveMember(member)}
                onTransferOwnership={() => setTransferTo(member)}
              />
            ))}
            {filteredMembers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No members found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-400" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>Invitations waiting for response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResend={() => handleResendInvite(invitation.id)}
                  onCancel={() => handleCancelInvite(invitation.id)}
                  resending={resendingInvite === invitation.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-400" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
                <SelectTrigger className="bg-slate-800 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {(['admin', 'manager', 'member', 'viewer', 'billing'] as TeamRole[]).map((role) => {
                    const config = ROLE_CONFIG[role];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4', config.color)} />
                          <span>{config.label}</span>
                          <span className="text-xs text-slate-500">- {config.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeMember?.fullName || removeMember?.email} from
              the team? They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog open={!!transferTo} onOpenChange={() => setTransferTo(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Transfer Ownership
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer ownership to{' '}
              {transferTo?.fullName || transferTo?.email}? You will become an Admin of this team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferOwnership}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
            >
              <Crown className="h-4 w-4 mr-2" />
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
