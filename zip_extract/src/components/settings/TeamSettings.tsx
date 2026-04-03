/**
 * Team Settings Component
 * 
 * Enterprise team management with:
 * - Member list with roles
 * - Invite members
 * - Role management
 * - Remove members
 * - Ownership transfer
 */

import { useState } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  DialogTrigger,
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
import { toast } from 'sonner';
import {
  useTeamMembers,
  useMyRole,
  teamService,
  TeamMember,
  TeamRole,
  InviteMemberInput,
} from '@/services/teamService';

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  manager: <UserCog className="h-4 w-4 text-purple-500" />,
  member: <User className="h-4 w-4 text-green-500" />,
  viewer: <Eye className="h-4 w-4 text-gray-500" />,
  billing: <CreditCard className="h-4 w-4 text-orange-500" />,
};

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing',
};

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Full access to all features and settings. Can transfer ownership.',
  admin: 'Can manage team members, settings, and all projects.',
  manager: 'Can manage projects and team workflows.',
  member: 'Can create and edit projects and tasks.',
  viewer: 'Read-only access to projects they are added to.',
  billing: 'Can view and manage billing information.',
};

interface TeamSettingsProps {
  organizationId: string;
}

export function TeamSettings({ organizationId }: TeamSettingsProps) {
  const { members, loading, inviteMember, updateMember, removeMember, refresh } = useTeamMembers(organizationId);
  const { role: myRole, canManageMembers, isOwner } = useMyRole(organizationId);

  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<TeamMember | null>(null);
  
  const [inviteForm, setInviteForm] = useState<InviteMemberInput>({
    email: '',
    role: 'member',
    sendEmail: true,
  });

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.fullName?.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      m.role.includes(query)
    );
  });

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      const result = await inviteMember(inviteForm);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Invitation sent to ${inviteForm.email}`);
        setInviteDialogOpen(false);
        setInviteForm({ email: '', role: 'member', sendEmail: true });
      }
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: TeamRole) => {
    const result = await updateMember(member.id, { role: newRole });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Updated ${member.fullName ?? member.email} to ${ROLE_LABELS[newRole]}`);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;

    const result = await removeMember(confirmRemove.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Removed ${confirmRemove.fullName ?? confirmRemove.email} from the team`);
    }
    setConfirmRemove(null);
  };

  const handleTransferOwnership = async () => {
    if (!confirmTransfer) return;

    const result = await teamService.transferOwnership(organizationId, confirmTransfer.userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Ownership transferred to ${confirmTransfer.fullName ?? confirmTransfer.email}`);
      refresh();
    }
    setConfirmTransfer(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage who has access to your organization ({members.length} members)
            </CardDescription>
          </div>
          {canManageMembers && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your team. They will receive an email with a link to join.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as TeamRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['admin', 'manager', 'member', 'viewer', 'billing'] as TeamRole[]).map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {ROLE_ICONS[role]}
                              <span>{ROLE_LABELS[role]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[inviteForm.role]}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-title">Job Title (optional)</Label>
                    <Input
                      id="invite-title"
                      placeholder="e.g. Product Manager"
                      value={inviteForm.title ?? ''}
                      onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-department">Department (optional)</Label>
                    <Input
                      id="invite-department"
                      placeholder="e.g. Engineering"
                      value={inviteForm.department ?? ''}
                      onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={inviting}>
                    {inviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Member List */}
          <div className="space-y-2">
            {filteredMembers.map((member) => {
              const initials = member.fullName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) ?? member.email[0].toUpperCase();

              const isCurrentUser = false; // Would check against current user ID
              const canEdit = canManageMembers && member.role !== 'owner';

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.fullName ?? member.email}
                        </span>
                        {member.role === 'owner' && (
                          <Badge variant="secondary" className="text-xs">
                            Owner
                          </Badge>
                        )}
                        {!member.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.email}
                        {member.title && ` · ${member.title}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role Badge/Selector */}
                    {canEdit ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member, value as TeamRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['admin', 'manager', 'member', 'viewer', 'billing'] as TeamRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                {ROLE_ICONS[role]}
                                <span>{ROLE_LABELS[role]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1">
                        {ROLE_ICONS[member.role]}
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}

                    {/* Actions Menu */}
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isOwner && (
                            <>
                              <DropdownMenuItem onClick={() => setConfirmTransfer(member)}>
                                <Crown className="mr-2 h-4 w-4" />
                                Transfer Ownership
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmRemove(member)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No members found matching your search' : 'No team members yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
          <CardDescription>
            What each role can do in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <div key={role} className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  {ROLE_ICONS[role as TeamRole]}
                  <span className="font-medium">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role as TeamRole]}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{confirmRemove?.fullName ?? confirmRemove?.email}</strong> from the team?
              They will lose access to all organization projects and resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Confirmation */}
      <AlertDialog open={!!confirmTransfer} onOpenChange={(open) => !open && setConfirmTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to transfer ownership to{' '}
              <strong>{confirmTransfer?.fullName ?? confirmTransfer?.email}</strong>?
              <br /><br />
              You will be changed to an Admin role. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransferOwnership}>
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
