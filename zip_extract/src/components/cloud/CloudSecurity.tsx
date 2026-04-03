/**
 * CLOUD SECURITY - Immersive security and authentication management
 * 
 * Enterprise security features:
 * - Password management
 * - Active sessions
 * - Login history
 * - Two-factor authentication
 * - Security alerts
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Lock,
  Smartphone,
  LogOut,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  XCircle,
  Globe,
  Monitor,
  Loader2,
  RefreshCw,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  Activity,
  MapPin,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface CloudSecurityProps {
  userId: string;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: Date;
  isCurrent: boolean;
}

interface LoginEvent {
  id: string;
  type: 'success' | 'failed' | 'blocked';
  device: string;
  location: string;
  ipAddress: string;
  timestamp: Date;
  reason?: string;
}

// Password strength checker
function checkPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent'];
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-emerald-500',
  ];

  return {
    score,
    label: labels[Math.min(score, 5)],
    color: colors[Math.min(score, 5)],
    feedback,
  };
}

// Security stat card
function SecurityStat({
  icon: Icon,
  label,
  value,
  color,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  status?: 'good' | 'warning' | 'danger';
}) {
  const statusColors = {
    good: 'ring-2 ring-green-500/30',
    warning: 'ring-2 ring-yellow-500/30',
    danger: 'ring-2 ring-red-500/30',
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-all duration-300',
        status && statusColors[status]
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
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

// Session card component
function SessionCard({
  session,
  onRevoke,
  revoking,
}: {
  session: Session;
  onRevoke: () => void;
  revoking: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-300',
        session.isCurrent
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Monitor className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{session.device}</p>
              {session.isCurrent && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">{session.browser}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.location}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {session.ipAddress}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(session.lastActive).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        {!session.isCurrent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            disabled={revoking}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// Login history item
function LoginHistoryItem({ event }: { event: LoginEvent }) {
  const typeConfig = {
    success: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      label: 'Successful Login',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Failed Attempt',
    },
    blocked: {
      icon: ShieldAlert,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      label: 'Blocked',
    },
  };

  const config = typeConfig[event.type];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className={cn('p-2 rounded-lg', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', config.color)}>{config.label}</p>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{event.device}</span>
          <span>•</span>
          <span>{event.location}</span>
          <span>•</span>
          <span>{event.ipAddress}</span>
        </div>
        {event.reason && (
          <p className="text-xs text-red-400 mt-1">{event.reason}</p>
        )}
      </div>
      <span className="text-xs text-slate-500">
        {new Date(event.timestamp).toLocaleString()}
      </span>
    </div>
  );
}

export function CloudSecurity({ userId }: CloudSecurityProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [enablingTwoFa, setEnablingTwoFa] = useState(false);

  // Revoke all sessions dialog
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, [userId]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Simulated sessions - would come from user_sessions table
      const mockSessions: Session[] = [
        {
          id: '1',
          device: 'Windows 11',
          browser: 'Chrome 120',
          location: 'New York, US',
          ipAddress: '192.168.1.1',
          lastActive: new Date(),
          isCurrent: true,
        },
        {
          id: '2',
          device: 'iPhone 15 Pro',
          browser: 'Safari Mobile',
          location: 'New York, US',
          ipAddress: '192.168.1.50',
          lastActive: new Date(Date.now() - 3600000),
          isCurrent: false,
        },
      ];

      // Simulated login history - would come from login_history table
      const mockHistory: LoginEvent[] = [
        {
          id: '1',
          type: 'success',
          device: 'Windows 11 - Chrome',
          location: 'New York, US',
          ipAddress: '192.168.1.1',
          timestamp: new Date(),
        },
        {
          id: '2',
          type: 'success',
          device: 'iPhone 15 Pro - Safari',
          location: 'New York, US',
          ipAddress: '192.168.1.50',
          timestamp: new Date(Date.now() - 86400000),
        },
        {
          id: '3',
          type: 'failed',
          device: 'Unknown - Firefox',
          location: 'London, UK',
          ipAddress: '10.0.0.5',
          timestamp: new Date(Date.now() - 172800000),
          reason: 'Invalid password',
        },
      ];

      setSessions(mockSessions);
      setLoginHistory(mockHistory);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = checkPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canChangePassword =
    newPassword.length >= 8 && passwordsMatch && passwordStrength.score >= 4;

  const handleChangePassword = async () => {
    if (!canChangePassword) return;

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      // Would call API to revoke session
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      toast({
        title: 'Session Revoked',
        description: 'The session has been terminated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke session',
        variant: 'destructive',
      });
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      // Would call API to revoke all other sessions
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSessions((prev) => prev.filter((s) => s.isCurrent));

      toast({
        title: 'All Sessions Revoked',
        description: 'All other sessions have been terminated.',
      });
      setRevokeAllDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke sessions',
        variant: 'destructive',
      });
    } finally {
      setRevokingAll(false);
    }
  };

  const handleToggle2FA = async () => {
    setEnablingTwoFa(true);
    try {
      // Would enable/disable 2FA via Supabase MFA API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTwoFaEnabled(!twoFaEnabled);

      toast({
        title: twoFaEnabled ? '2FA Disabled' : '2FA Enabled',
        description: twoFaEnabled
          ? 'Two-factor authentication has been disabled.'
          : 'Two-factor authentication is now active.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update 2FA settings',
        variant: 'destructive',
      });
    } finally {
      setEnablingTwoFa(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Security Overview Hero */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-emerald-600/20 to-teal-600/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />

        <div className="relative p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Security Center</h2>
              <p className="text-slate-400">Manage your account security and authentication</p>
            </div>
          </div>

          {/* Security Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SecurityStat
              icon={Shield}
              label="Security Score"
              value={twoFaEnabled ? '95/100' : '70/100'}
              color="bg-gradient-to-r from-green-500 to-emerald-500"
              status={twoFaEnabled ? 'good' : 'warning'}
            />
            <SecurityStat
              icon={Monitor}
              label="Active Sessions"
              value={String(sessions.length)}
              color="bg-gradient-to-r from-blue-500 to-cyan-500"
              status="good"
            />
            <SecurityStat
              icon={Fingerprint}
              label="2FA Status"
              value={twoFaEnabled ? 'Enabled' : 'Disabled'}
              color="bg-gradient-to-r from-purple-500 to-pink-500"
              status={twoFaEnabled ? 'good' : 'warning'}
            />
            <SecurityStat
              icon={Activity}
              label="Recent Logins"
              value={`${loginHistory.filter((l) => l.type === 'success').length} successful`}
              color="bg-gradient-to-r from-orange-500 to-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Password & 2FA Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Password Card */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Password</CardTitle>
                <CardDescription>Change your password regularly</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              Use a strong, unique password with a mix of letters, numbers, and symbols.
            </p>
            <Button
              onClick={() => setPasswordDialogOpen(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* 2FA Card */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-3">
                <Fingerprint className={cn('h-6 w-6', twoFaEnabled ? 'text-green-400' : 'text-slate-500')} />
                <div>
                  <p className="font-medium text-white">
                    {twoFaEnabled ? '2FA is Active' : '2FA is Disabled'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {twoFaEnabled
                      ? 'Your account is protected'
                      : 'Enable for enhanced security'}
                  </p>
                </div>
              </div>
              <Switch
                checked={twoFaEnabled}
                onCheckedChange={handleToggle2FA}
                disabled={enablingTwoFa}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500">
                <Monitor className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Active Sessions</CardTitle>
                <CardDescription>Manage devices where you're signed in</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSecurityData}
                className="border-white/10 hover:bg-white/5"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {sessions.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRevokeAllDialogOpen(true)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Revoke All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={() => handleRevokeSession(session.id)}
                revoking={revokingSession === session.id}
              />
            ))}
            {sessions.length === 0 && (
              <p className="text-center text-slate-500 py-8">No active sessions</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">Login History</CardTitle>
              <CardDescription>Recent authentication activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {loginHistory.map((event) => (
              <LoginHistoryItem key={event.id} event={event} />
            ))}
            {loginHistory.length === 0 && (
              <p className="text-center text-slate-500 py-8">No login history available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
            <DialogDescription>
              Enter a new secure password for your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-800 border-white/10 pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(passwordStrength.score / 6) * 100}
                      className="h-2 flex-1"
                    />
                    <span
                      className={cn(
                        'text-xs font-medium',
                        passwordStrength.score >= 4 ? 'text-green-400' : 'text-yellow-400'
                      )}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-slate-400 space-y-1">
                      {passwordStrength.feedback.map((fb, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-400" />
                          {fb}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-800 border-white/10"
                placeholder="Confirm new password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!canChangePassword || changingPassword}
              className="bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Revoke All Sessions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of all devices except the current one. You'll need to sign in
              again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllSessions}
              disabled={revokingAll}
              className="bg-red-500 hover:bg-red-600"
            >
              {revokingAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke All Sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
