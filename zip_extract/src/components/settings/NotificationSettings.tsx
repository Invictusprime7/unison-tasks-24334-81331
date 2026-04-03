/**
 * Notification Settings Component
 * 
 * Manage notification preferences:
 * - Email notifications
 * - Push notifications  
 * - In-app notifications
 * - Digest settings
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Volume2,
  Loader2,
  Save,
  MessageSquare,
  Calendar,
  AtSign,
  FileText,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useProfile, profileService, NotificationSettings as NotificationSettingsType } from '@/services/profileService';

interface NotificationRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function NotificationRow({ icon, title, description, checked, onChange }: NotificationRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function NotificationSettings() {
  const { profile, loading } = useProfile();
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<NotificationSettingsType>({
    email: {
      projectUpdates: true,
      taskAssignments: true,
      comments: true,
      mentions: true,
      weeklyDigest: true,
    },
    push: {
      enabled: true,
      taskReminders: true,
      directMessages: true,
    },
    inApp: {
      showDesktop: true,
      playSound: true,
    },
  });

  useEffect(() => {
    if (profile?.notificationSettings) {
      setSettings(profile.notificationSettings);
    }
  }, [profile]);

  const updateEmailSetting = (key: keyof NotificationSettingsType['email'], value: boolean) => {
    setSettings({
      ...settings,
      email: { ...settings.email, [key]: value },
    });
  };

  const updatePushSetting = (key: keyof NotificationSettingsType['push'], value: boolean) => {
    setSettings({
      ...settings,
      push: { ...settings.push, [key]: value },
    });
  };

  const updateInAppSetting = (key: keyof NotificationSettingsType['inApp'], value: boolean) => {
    setSettings({
      ...settings,
      inApp: { ...settings.inApp, [key]: value },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await profileService.updateNotificationSettings(settings);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Notification preferences saved');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
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
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which emails you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationRow
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            title="Project Updates"
            description="Get notified when projects you're part of are updated"
            checked={settings.email.projectUpdates}
            onChange={(v) => updateEmailSetting('projectUpdates', v)}
          />
          <Separator />
          <NotificationRow
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            title="Task Assignments"
            description="Receive an email when a task is assigned to you"
            checked={settings.email.taskAssignments}
            onChange={(v) => updateEmailSetting('taskAssignments', v)}
          />
          <Separator />
          <NotificationRow
            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
            title="Comments"
            description="Get notified about new comments on your tasks"
            checked={settings.email.comments}
            onChange={(v) => updateEmailSetting('comments', v)}
          />
          <Separator />
          <NotificationRow
            icon={<AtSign className="h-4 w-4 text-muted-foreground" />}
            title="Mentions"
            description="Receive an email when someone mentions you"
            checked={settings.email.mentions}
            onChange={(v) => updateEmailSetting('mentions', v)}
          />
          <Separator />
          <NotificationRow
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            title="Weekly Digest"
            description="Receive a weekly summary of activity"
            checked={settings.email.weeklyDigest}
            onChange={(v) => updateEmailSetting('weeklyDigest', v)}
          />
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure mobile and browser push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationRow
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
            title="Enable Push Notifications"
            description="Allow notifications to be sent to this device"
            checked={settings.push.enabled}
            onChange={(v) => updatePushSetting('enabled', v)}
          />
          
          {settings.push.enabled && (
            <>
              <Separator />
              <NotificationRow
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                title="Task Reminders"
                description="Get reminded about upcoming task deadlines"
                checked={settings.push.taskReminders}
                onChange={(v) => updatePushSetting('taskReminders', v)}
              />
              <Separator />
              <NotificationRow
                icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                title="Direct Messages"
                description="Receive notifications for direct messages"
                checked={settings.push.directMessages}
                onChange={(v) => updatePushSetting('directMessages', v)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Control how notifications appear while using Unison Tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationRow
            icon={<Smartphone className="h-4 w-4 text-muted-foreground" />}
            title="Desktop Notifications"
            description="Show system notifications on your desktop"
            checked={settings.inApp.showDesktop}
            onChange={(v) => updateInAppSetting('showDesktop', v)}
          />
          <Separator />
          <NotificationRow
            icon={<Volume2 className="h-4 w-4 text-muted-foreground" />}
            title="Notification Sounds"
            description="Play a sound when notifications arrive"
            checked={settings.inApp.playSound}
            onChange={(v) => updateInAppSetting('playSound', v)}
          />
        </CardContent>
      </Card>

      {/* Email Digest Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digest Frequency
          </CardTitle>
          <CardDescription>
            How often you want to receive activity summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Digest Frequency</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Receive a summary of activity at this interval
              </p>
            </div>
            <Select
              value={profile?.preferences?.emailDigest ?? 'weekly'}
              onValueChange={(value) => {
                profileService.updatePreferences({
                  emailDigest: value as 'daily' | 'weekly' | 'never',
                });
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
