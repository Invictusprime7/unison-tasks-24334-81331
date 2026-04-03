/**
 * Cloud Panel - Access Cloud features from within Web Builder
 * Shows business settings, notifications, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, Building2, Bell, Settings, ArrowLeft, 
  Mail, Phone, Save, Loader2, ExternalLink, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CloudPanelProps {
  businessId: string | null;
  businessName: string | null;
  onNavigateToCloud?: () => void;
}

interface BusinessSettings {
  id: string;
  name: string;
  notification_email: string | null;
  notification_phone: string | null;
}

export function CloudPanel({ businessId, businessName, onNavigateToCloud }: CloudPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationPhone, setNotificationPhone] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadBusinessSettings();
    }
  }, [businessId]);

  const loadBusinessSettings = async () => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, notification_email, notification_phone')
        .eq('id', businessId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setNotificationEmail(data.notification_email || '');
        setNotificationPhone(data.notification_phone || '');
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setNotificationEmail(value);
    setHasChanges(value !== (settings?.notification_email || '') || 
                  notificationPhone !== (settings?.notification_phone || ''));
  };

  const handlePhoneChange = (value: string) => {
    setNotificationPhone(value);
    setHasChanges(notificationEmail !== (settings?.notification_email || '') || 
                  value !== (settings?.notification_phone || ''));
  };

  const saveSettings = async () => {
    if (!businessId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          notification_email: notificationEmail.trim() || null,
          notification_phone: notificationPhone.trim() || null,
        })
        .eq('id', businessId);

      if (error) throw error;

      setSettings(prev => prev ? {
        ...prev,
        notification_email: notificationEmail.trim() || null,
        notification_phone: notificationPhone.trim() || null,
      } : null);
      
      setHasChanges(false);
      toast.success('Settings saved', {
        description: 'Notification settings updated successfully'
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save', {
        description: error.message || 'Could not update settings'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Cloud className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold text-foreground mb-2">No Business Connected</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Open a project from Cloud to access business settings here.
        </p>
        {onNavigateToCloud && (
          <Button variant="outline" size="sm" onClick={onNavigateToCloud}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Go to Cloud
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Cloud className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Cloud Settings</h3>
              <p className="text-xs text-muted-foreground">Quick access to business config</p>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="p-3 rounded-lg bg-card border border-border/50">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{businessName || settings?.name || 'Business'}</p>
              <p className="text-xs text-muted-foreground truncate">{businessId}</p>
            </div>
            <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">
              Active
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Notifications</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="notificationEmail" className="text-xs flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                Notification Email
              </Label>
              <Input
                id="notificationEmail"
                type="email"
                value={notificationEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="bookings@yourdomain.com"
                className="h-8 text-sm bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                Leads and bookings will be sent here
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notificationPhone" className="text-xs flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                Notification Phone
              </Label>
              <Input
                id="notificationPhone"
                type="tel"
                value={notificationPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+1 555 123 4567"
                className="h-8 text-sm bg-background"
              />
            </div>
          </div>

          {/* Warning if no email */}
          {!notificationEmail && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-400">
                ⚠️ No notification email set. Alerts won't be sent.
              </p>
            </div>
          )}

          {/* Save Button */}
          <Button
            size="sm"
            className="w-full"
            onClick={saveSettings}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Saved
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Quick Actions
          </h4>
          
          {onNavigateToCloud && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onNavigateToCloud}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Cloud Dashboard
            </Button>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
