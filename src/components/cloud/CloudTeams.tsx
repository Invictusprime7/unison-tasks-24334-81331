/**
 * CLOUD TEAMS - Business-scoped team and invitation management
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Crown,
  CreditCard,
  Eye,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  User,
  UserCog,
  UserPlus,
  Users,
  XCircle,
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
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface CloudTeamsProps {
  userId: string;
  organizationId?: string;
}

type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'billing';

interface TeamMember {
  id: string;
  userId: string | null;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: TeamRole;
  joinedAt: string;
  lastActive: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'expired';
}

interface TeamState {
  members: TeamMember[];
  invitations: Invitation[];
}

interface BusinessRecord {
  id: string;
  name: string;
  owner_id: string;
  notification_email: string | null;
  settings: Json | null;
}

const ROLE_CONFIG: Record<
  TeamRole,
  {
    icon: React.ElementType;
    label: string;
    description: string;
    badgeClassName: string;
    gradient: string;
  }
> = {
  owner: {
    icon: Crown,
    label: 'Owner',
    description: 'Full access, can transfer ownership',
    badgeClassName: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    gradient: 'from-yellow-500 to-amber-500',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    description: 'Manage team, settings, and projects',
    badgeClassName: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
  },
  manager: {
    icon: UserCog,
    label: 'Manager',
    description: 'Manage delivery, workflows, and execution',
    badgeClassName: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
  },
  member: {
    icon: User,
    label: 'Member',
    description: 'Create and edit projects',
    badgeClassName: 'border-green-500/30 bg-green-500/10 text-green-400',
    gradient: 'from-green-500 to-emerald-500',
  },
  viewer: {
    icon: Eye,
    label: 'Viewer',
    description: 'Read-only access',
    badgeClassName: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    gradient: 'from-slate-500 to-slate-600',
  },
  billing: {
    icon: CreditCard,
    label: 'Billing',
    description: 'View and manage billing',
    badgeClassName: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    gradient: 'from-orange-500 to-amber-500',
  },
};

const EMPTY_TEAM_STATE: TeamState = {
  members: [],
  invitations: [],
};

// Guardrail: settings is untrusted JSON and can grow unexpectedly large.
// Keep processing bounded so one malformed business record cannot freeze the UI.
const MAX_MEMBERS_FROM_SETTINGS = 500;
const MAX_INVITATIONS_FROM_SETTINGS = 500;

const parseBusinessSettings = (settings: Json | null) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }

  return settings as Record<string, any>;
};

const normalizeMember = (member: Partial<TeamMember>): TeamMember => ({
  id: member.id || crypto.randomUUID(),
  userId: member.userId ?? null,
  email: member.email || '',
  fullName: member.fullName ?? null,
  avatarUrl: member.avatarUrl ?? null,
  role: (member.role as TeamRole) || 'member',
  joinedAt: member.joinedAt || new Date().toISOString(),
  lastActive: member.lastActive || null,
});

const normalizeInvitation = (invitation: Partial<Invitation>): Invitation => {
  const expiresAt = invitation.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: invitation.id || crypto.randomUUID(),
    email: invitation.email || '',
    role: (invitation.role as TeamRole) || 'member',
    invitedBy: invitation.invitedBy || 'system',
    invitedAt: invitation.invitedAt || new Date().toISOString(),
    expiresAt,
    status: new Date(expiresAt) < new Date() ? 'expired' : 'pending',
  };
};

const dedupeMembers = (members: TeamMember[]) => {
  const seenIds = new Set<string>();
  const seenUserIds = new Set<string>();
  const seenEmails = new Set<string>();
  const deduped: TeamMember[] = [];

  for (const member of members) {
    const memberId = member.id;
    const memberUserId = member.userId || '';
    const memberEmail = member.email.toLowerCase();

    if (seenIds.has(memberId)) continue;
    if (memberUserId && seenUserIds.has(memberUserId)) continue;
    if (seenEmails.has(memberEmail)) continue;

    seenIds.add(memberId);
    if (memberUserId) seenUserIds.add(memberUserId);
    seenEmails.add(memberEmail);
    deduped.push(member);
  }

  return deduped;
};

const getInitials = (member: TeamMember) => {
  if (member.fullName) {
    return member.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return member.email.substring(0, 2).toUpperCase();
};

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
    <div className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-4 transition-all duration-300 hover:border-white/10">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg bg-gradient-to-r p-2', gradient)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-white/10">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className={cn('bg-gradient-to-br', config.gradient)}>
                {getInitials(member)}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <div className="absolute -right-1 -top-1 rounded-full bg-yellow-500 p-1">
                <Crown className="h-3 w-3 text-yellow-950" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-white">
                {member.fullName || member.email.split('@')[0]}
              </p>
              {isCurrentUser && (
                <Badge className="border-blue-500/30 bg-blue-500/20 text-xs text-blue-400">You</Badge>
              )}
            </div>
            <p className="truncate text-sm text-slate-400">{member.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className={cn('border text-xs', config.badgeClassName)}>
                <Icon className="mr-1 h-3 w-3" />
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
            <DropdownMenuContent align="end" className="border-white/10 bg-slate-900">
              {!isOwner && (
                <>
                  {(['admin', 'manager', 'member', 'viewer', 'billing'] as TeamRole[]).map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => onRoleChange(role)}
                      className="text-slate-300 focus:text-white"
                    >
                      {React.createElement(ROLE_CONFIG[role].icon, {
                        className: 'mr-2 h-4 w-4',
                      })}
                      Make {ROLE_CONFIG[role].label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onTransferOwnership} className="text-slate-300 focus:text-white">
                <Crown className="mr-2 h-4 w-4 text-yellow-400" />
                Transfer Ownership
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onRemove} className="text-red-400 focus:text-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

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
  const isExpired = invitation.status === 'expired';

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-300',
        isExpired ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-white/[0.05] p-2">
            <Mail className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{invitation.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  'border text-xs',
                  isExpired
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                )}
              >
                {isExpired ? 'Expired' : 'Pending'}
              </Badge>
              <Badge className={cn('border text-xs', config.badgeClassName)}>
                <Icon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
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
            className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
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
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole>('viewer');
  const [businessRecord, setBusinessRecord] = useState<BusinessRecord | null>(null);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviting, setInviting] = useState(false);

  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [transferTo, setTransferTo] = useState<TeamMember | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);

  const canManage = ['owner', 'admin'].includes(currentUserRole);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      setMembers([]);
      setInvitations([]);
      return;
    }

    void loadTeamData();
  }, [organizationId, userId]);

  const persistTeamState = async (nextState: TeamState, ownerId?: string) => {
    if (!organizationId || !businessRecord) return null;

    const currentSettings = parseBusinessSettings(businessRecord.settings);
    const nextSettings = {
      ...currentSettings,
      team: {
        members: nextState.members,
        invitations: nextState.invitations,
      },
    };

    const { data, error } = await supabase
      .from('businesses')
      .update({
        settings: nextSettings,
        owner_id: ownerId || businessRecord.owner_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select('id, name, owner_id, notification_email, settings')
      .single();

    if (error) throw error;

    const nextRecord = data as unknown as BusinessRecord;
    setBusinessRecord(nextRecord);
    return nextRecord;
  };

  const loadTeamData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('id, name, owner_id, notification_email, settings')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      const businessData = business as unknown as BusinessRecord;
      const settings = parseBusinessSettings(businessData.settings);
      const storedTeam = settings.team as Partial<TeamState> | undefined;
      const authResult = await supabase.auth.getUser();
      const authUser = authResult.data.user;

      let normalizedMembers = Array.isArray(storedTeam?.members)
        ? storedTeam!.members
            .slice(0, MAX_MEMBERS_FROM_SETTINGS)
            .map((member) => normalizeMember(member))
        : [];
      const normalizedInvitations = Array.isArray(storedTeam?.invitations)
        ? storedTeam!.invitations
            .slice(0, MAX_INVITATIONS_FROM_SETTINGS)
            .map((invitation) => normalizeInvitation(invitation))
        : [];

      if (Array.isArray(storedTeam?.members) && storedTeam.members.length > MAX_MEMBERS_FROM_SETTINGS) {
        console.warn('[CloudTeams] Truncated oversized members array from business settings', {
          businessId: organizationId,
          originalLength: storedTeam.members.length,
          maxLength: MAX_MEMBERS_FROM_SETTINGS,
        });
      }

      if (Array.isArray(storedTeam?.invitations) && storedTeam.invitations.length > MAX_INVITATIONS_FROM_SETTINGS) {
        console.warn('[CloudTeams] Truncated oversized invitations array from business settings', {
          businessId: organizationId,
          originalLength: storedTeam.invitations.length,
          maxLength: MAX_INVITATIONS_FROM_SETTINGS,
        });
      }

      const ownerExists = normalizedMembers.some((member) => member.userId === businessData.owner_id || member.role === 'owner');
      if (!ownerExists) {
        normalizedMembers = [
          {
            id: `owner-${businessData.owner_id}`,
            userId: businessData.owner_id,
            email:
              authUser?.id === businessData.owner_id
                ? authUser.email || businessData.notification_email || 'owner@unison.local'
                : businessData.notification_email || 'owner@unison.local',
            fullName: authUser?.id === businessData.owner_id ? authUser.user_metadata?.full_name || null : null,
            avatarUrl: authUser?.id === businessData.owner_id ? authUser.user_metadata?.avatar_url || null : null,
            role: 'owner',
            joinedAt: new Date().toISOString(),
            lastActive: authUser?.id === businessData.owner_id ? new Date().toISOString() : null,
          },
          ...normalizedMembers,
        ];
      }

      const dedupedMembers = dedupeMembers(normalizedMembers);

      const myMember = dedupedMembers.find((member) => member.userId === userId);

      setBusinessRecord(businessData);
      setMembers(dedupedMembers);
      setInvitations(normalizedInvitations);
      setCurrentUserRole(myMember?.role || (businessData.owner_id === userId ? 'owner' : 'viewer'));
    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data for this business.',
        variant: 'destructive',
      });
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      return (
        member.fullName?.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.role.includes(query)
      );
    });
  }, [members, searchQuery]);

  const handleInvite = async () => {
    if (!organizationId || !businessRecord) return;
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const emailAlreadyOnTeam = members.some((member) => member.email.toLowerCase() === normalizedEmail);
    const invitationExists = invitations.some((invitation) => invitation.email.toLowerCase() === normalizedEmail);

    if (emailAlreadyOnTeam || invitationExists) {
      toast({
        title: 'Already tracked',
        description: `${normalizedEmail} is already a member or has a pending invitation.`,
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      const nextInvitation = normalizeInvitation({
        email: normalizedEmail,
        role: inviteRole,
        invitedBy: userId,
        invitedAt: new Date().toISOString(),
      });

      const nextState = {
        members,
        invitations: [nextInvitation, ...invitations],
      };

      await persistTeamState(nextState);
      setInvitations(nextState.invitations);

      toast({
        title: 'Invitation Saved',
        description: `${normalizedEmail} has been added to this business as a pending invite.`,
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save the invitation.',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    const nextMembers = members.map((member) =>
      member.id === memberId ? { ...member, role: newRole } : member
    );

    try {
      await persistTeamState({ members: nextMembers, invitations });
      setMembers(nextMembers);

      toast({
        title: 'Role Updated',
        description: 'Team member permissions have been updated.',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the team role.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) return;
    if (removeMember.role === 'owner') {
      toast({
        title: 'Owner cannot be removed',
        description: 'Transfer ownership before removing the owner.',
        variant: 'destructive',
      });
      return;
    }

    const nextMembers = members.filter((member) => member.id !== removeMember.id);

    try {
      await persistTeamState({ members: nextMembers, invitations });
      setMembers(nextMembers);
      toast({
        title: 'Member Removed',
        description: `${removeMember.fullName || removeMember.email} has been removed from this business.`,
      });
      setRemoveMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove the team member.',
        variant: 'destructive',
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTo || !businessRecord) return;

    const nextMembers = members.map((member) => {
      if (member.id === transferTo.id) return { ...member, role: 'owner' as TeamRole };
      if (member.userId === businessRecord.owner_id) return { ...member, role: 'admin' as TeamRole };
      return member;
    });

    try {
      await persistTeamState(
        { members: nextMembers, invitations },
        transferTo.userId || businessRecord.owner_id
      );
      setMembers(nextMembers);
      setCurrentUserRole(transferTo.userId === userId ? 'owner' : businessRecord.owner_id === userId ? 'admin' : currentUserRole);
      toast({
        title: 'Ownership Transferred',
        description: `${transferTo.fullName || transferTo.email} is now the owner of this business.`,
      });
      setTransferTo(null);
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast({
        title: 'Error',
        description: 'Failed to transfer ownership.',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInvite(inviteId);
    try {
      const nextInvitations = invitations.map((invitation) =>
        invitation.id === inviteId
          ? normalizeInvitation({
              ...invitation,
              invitedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
          : invitation
      );

      await persistTeamState({ members, invitations: nextInvitations });
      setInvitations(nextInvitations);

      toast({
        title: 'Invitation Refreshed',
        description: 'The pending invitation expiry window has been extended.',
      });
    } catch (error) {
      console.error('Error refreshing invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh the invitation.',
        variant: 'destructive',
      });
    } finally {
      setResendingInvite(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const nextInvitations = invitations.filter((invitation) => invitation.id !== inviteId);

    try {
      await persistTeamState({ members, invitations: nextInvitations });
      setInvitations(nextInvitations);
      toast({
        title: 'Invitation Cancelled',
        description: 'The invitation has been removed from this business.',
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel the invitation.',
        variant: 'destructive',
      });
    }
  };

  const roleStats = {
    owners: members.filter((member) => member.role === 'owner').length,
    admins: members.filter((member) => member.role === 'admin').length,
    members: members.filter((member) => member.role === 'member').length,
    viewers: members.filter((member) => member.role === 'viewer').length,
  };

  if (!organizationId) {
    return <div className="py-12 text-center text-white/40">Select a business to manage its team.</div>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-40 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-700/50" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-800/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl">
        <div className="absolute inset-0" />
        <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-rose-600/20 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-3">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Team Management</h2>
                <p className="text-slate-400">
                  Persisted for {businessRecord?.name || 'this business'} via business settings
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="border-white/10 hover:bg-white/5" onClick={() => void loadTeamData()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {canManage && (
                <Button
                  onClick={() => setInviteDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <TeamStat icon={Users} label="Total Members" value={members.length} gradient="from-purple-500 to-pink-500" />
            <TeamStat icon={Crown} label="Owners" value={roleStats.owners} gradient="from-yellow-500 to-amber-500" />
            <TeamStat icon={Shield} label="Admins" value={roleStats.admins} gradient="from-blue-500 to-cyan-500" />
            <TeamStat
              icon={Mail}
              label="Pending Invites"
              value={invitations.filter((invitation) => invitation.status === 'pending').length}
              gradient="from-orange-500 to-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search members by name, email, or role..."
          className="h-12 border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-slate-500"
        />
      </div>

      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-purple-400" />
            Team Members ({filteredMembers.length})
          </CardTitle>
          <CardDescription>Active members of this business workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={userId}
                canManage={canManage}
                onRoleChange={(role) => void handleRoleChange(member.id, role)}
                onRemove={() => setRemoveMember(member)}
                onTransferOwnership={() => setTransferTo(member)}
              />
            ))}
            {filteredMembers.length === 0 && (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <p className="text-slate-400">No members found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Mail className="h-5 w-5 text-orange-400" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>Invitations waiting for acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResend={() => void handleResendInvite(invitation.id)}
                  onCancel={() => void handleCancelInvite(invitation.id)}
                  resending={resendingInvite === invitation.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="border-white/10 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5 text-purple-400" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>Save a pending invitation for this business workspace.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="colleague@company.com"
                className="border-white/10 bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRole)}>
                <SelectTrigger className="border-white/10 bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900">
                  {(['admin', 'manager', 'member', 'viewer', 'billing'] as TeamRole[]).map((role) => {
                    const config = ROLE_CONFIG[role];
                    const Icon = config.icon;

                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{config.label}</span>
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
              onClick={() => void handleInvite()}
              disabled={!inviteEmail.trim() || inviting}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Save Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <AlertDialogContent className="border-white/10 bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeMember?.fullName || removeMember?.email} from this business? They will lose stored team access and role metadata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemoveMember()} className="bg-red-500 hover:bg-red-600">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transferTo} onOpenChange={() => setTransferTo(null)}>
        <AlertDialogContent className="border-white/10 bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Crown className="h-5 w-5 text-yellow-400" />
              Transfer Ownership
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transfer business ownership to {transferTo?.fullName || transferTo?.email}. Your role will be downgraded to admin if you are the current owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleTransferOwnership()}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
            >
              <Crown className="mr-2 h-4 w-4" />
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
