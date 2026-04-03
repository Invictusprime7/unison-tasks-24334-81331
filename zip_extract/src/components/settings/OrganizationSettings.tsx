/**
 * Organization Settings Component
 * 
 * Manage organization-level settings:
 * - Organization profile (name, logo, description)
 * - Billing information
 * - Danger zone (delete org)
 */

import { useState, useRef, useEffect } from 'react';
import {
  Building,
  Camera,
  Save,
  Loader2,
  CreditCard,
  AlertTriangle,
  Users,
  Settings2,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { useMyRole, Organization } from '@/services/teamService';
import { auditLogger } from '@/services/auditLogger';

interface OrganizationSettingsProps {
  organization: Organization;
  onUpdate: () => void;
}

export function OrganizationSettings({ organization, onUpdate }: OrganizationSettingsProps) {
  const { canManageSettings, isOwner } = useMyRole(organization.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [formData, setFormData] = useState({
    name: organization.name,
    slug: organization.slug,
    description: organization.description ?? '',
    website: '',
  });

  useEffect(() => {
    setFormData({
      name: organization.name,
      slug: organization.slug,
      description: organization.description ?? '',
      website: '',
    });
  }, [organization]);

  const handleLogoClick = () => {
    if (!canManageSettings) return;
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const ext = file.name.split('.').pop();
      const filename = `orgs/${organization.id}/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('organizations')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        toast.error('Failed to upload logo');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organizations')
        .getPublicUrl(filename);

      // Update organization
      const { error } = await supabase
        .from('organizations')
        .update({ logo: publicUrl })
        .eq('id', organization.id);

      if (error) {
        toast.error('Failed to update organization');
        return;
      }

      toast.success('Logo updated');
      onUpdate();
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canManageSettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) {
        toast.error('Failed to save changes');
        return;
      }

      await auditLogger.log({
        action: 'update',
        resourceType: 'organization',
        resourceId: organization.id,
        resourceName: formData.name,
      });

      toast.success('Organization updated');
      onUpdate();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmText !== organization.name) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: 'deleted' })
        .eq('id', organization.id);

      if (error) {
        toast.error('Failed to delete organization');
        return;
      }

      await auditLogger.logSecurityEvent('suspicious_activity', {
        event: 'organization_deleted',
        organizationId: organization.id,
        organizationName: organization.name,
      }, 'critical');

      toast.success('Organization deleted');
      setDeleteDialogOpen(false);
      // Redirect would happen in parent component
    } catch {
      toast.error('Failed to delete organization');
    }
  };

  const initials = organization.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization Profile
          </CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={organization.logoUrl ?? undefined} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              {canManageSettings && (
                <button
                  onClick={handleLogoClick}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="font-medium">{organization.name}</h3>
              <p className="text-sm text-muted-foreground">
                {organization.memberCount} member{organization.memberCount !== 1 ? 's' : ''}
                {' · '}
                {organization.projectCount} project{organization.projectCount !== 1 ? 's' : ''}
              </p>
              <Badge variant="outline" className="mt-1">
                {organization.plan === 'free' ? 'Free Plan' : organization.plan}
              </Badge>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!canManageSettings}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">unison.app/</span>
                  <Input
                    id="org-slug"
                    value={formData.slug}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact support to change your URL
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-description">Description</Label>
              <Textarea
                id="org-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does your organization do?"
                disabled={!canManageSettings}
                rows={3}
              />
            </div>
          </div>

          {canManageSettings && (
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
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Plan: {organization.plan === 'free' ? 'Free' : organization.plan}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {organization.plan === 'free' 
                  ? `${organization.memberCount} of 3 seats used`
                  : 'Unlimited seats'
                }
              </p>
            </div>
            <Button variant="outline">
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Organization</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete this organization and all its data
                </p>
              </div>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Organization
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      organization <strong>{organization.name}</strong> and all associated data
                      including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All projects and tasks</li>
                        <li>All files and assets</li>
                        <li>All team member access</li>
                        <li>All billing history</li>
                      </ul>
                      <div className="mt-4">
                        Type <strong>{organization.name}</strong> to confirm:
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={organization.name}
                    className="mt-2"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrganization}
                      disabled={deleteConfirmText !== organization.name}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Organization
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
