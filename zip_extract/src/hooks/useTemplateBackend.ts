import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database, Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Template = Database['public']['Tables']['design_templates']['Row'];
type TemplateInsert = Database['public']['Tables']['design_templates']['Insert'];
type TemplateUpdate = Database['public']['Tables']['design_templates']['Update'];

// Type definitions for backend features (stored in canvas_data JSON)
export interface TemplateRedirect {
  id: string;
  path: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
  enabled: boolean;
}

export interface TemplateScheduling {
  publishAt?: string;
  unpublishAt?: string;
  timezone?: string;
  recurring?: {
    enabled: boolean;
    cron?: string;
    action: 'publish' | 'unpublish' | 'toggle';
  };
}

export interface TemplatePayment {
  enabled: boolean;
  provider?: 'stripe' | 'paypal' | 'custom';
  priceId?: string;
  amount?: number;
  currency?: string;
  mode?: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
  webhookSecret?: string;
}

export interface TemplateBackendConfig {
  redirects: TemplateRedirect[];
  scheduling: TemplateScheduling;
  requires_auth: boolean;
  payment: TemplatePayment;
}

// Extended canvas data that includes backend config
interface ExtendedCanvasData {
  // Design data
  objects?: unknown[];
  background?: string;
  // Backend config stored in canvas_data
  backendConfig?: TemplateBackendConfig;
  [key: string]: unknown;
}

// Helper to extract backend config from canvas_data
function getBackendConfigFromCanvas(canvasData: Json): TemplateBackendConfig {
  const data = canvasData as ExtendedCanvasData | null;
  return data?.backendConfig || {
    redirects: [],
    scheduling: {},
    requires_auth: false,
    payment: { enabled: false },
  };
}

// Helper to merge backend config into canvas_data
function mergeBackendConfigIntoCanvas(
  canvasData: Json,
  config: Partial<TemplateBackendConfig>
): Json {
  const data = (canvasData as ExtendedCanvasData) || {};
  const existingConfig = data.backendConfig || {
    redirects: [],
    scheduling: {},
    requires_auth: false,
    payment: { enabled: false },
  };
  
  return {
    ...data,
    backendConfig: {
      ...existingConfig,
      ...config,
    },
  } as unknown as Json;
}

export function useTemplateBackend() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all templates for the current user
  const fetchTemplates = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('design_templates')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      return data as Template[];
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error fetching templates',
        description: err.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create a new template
  const createTemplate = useCallback(async (template: TemplateInsert) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('design_templates')
        .insert(template)
        .select()
        .single();

      if (insertError) throw insertError;
      toast({
        title: 'Template created',
        description: `"${template.name}" has been created.`,
      });
      return data as Template;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error creating template',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update an existing template
  const updateTemplate = useCallback(async (id: string, updates: TemplateUpdate) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('design_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      toast({
        title: 'Template updated',
        description: 'Template has been updated successfully.',
      });
      return data as Template;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error updating template',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Delete a template
  const deleteTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('design_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      toast({
        title: 'Template deleted',
        description: 'Template has been deleted.',
      });
      return true;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error deleting template',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update template redirects (stored in canvas_data)
  const updateRedirects = useCallback(async (id: string, redirects: TemplateRedirect[]) => {
    // First fetch the template to get current canvas_data
    const { data: template, error: fetchError } = await supabase
      .from('design_templates')
      .select('canvas_data')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      toast({ title: 'Error', description: fetchError.message, variant: 'destructive' });
      return null;
    }
    
    const updatedCanvasData = mergeBackendConfigIntoCanvas(template.canvas_data, { redirects });
    return updateTemplate(id, { canvas_data: updatedCanvasData });
  }, [updateTemplate, toast]);

  // Update template scheduling
  const updateScheduling = useCallback(async (id: string, scheduling: TemplateScheduling) => {
    const { data: template, error: fetchError } = await supabase
      .from('design_templates')
      .select('canvas_data')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      toast({ title: 'Error', description: fetchError.message, variant: 'destructive' });
      return null;
    }
    
    const updatedCanvasData = mergeBackendConfigIntoCanvas(template.canvas_data, { scheduling });
    return updateTemplate(id, { canvas_data: updatedCanvasData });
  }, [updateTemplate, toast]);

  // Update template authentication requirement
  const updateRequiresAuth = useCallback(async (id: string, requires_auth: boolean) => {
    const { data: template, error: fetchError } = await supabase
      .from('design_templates')
      .select('canvas_data')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      toast({ title: 'Error', description: fetchError.message, variant: 'destructive' });
      return null;
    }
    
    const updatedCanvasData = mergeBackendConfigIntoCanvas(template.canvas_data, { requires_auth });
    return updateTemplate(id, { canvas_data: updatedCanvasData });
  }, [updateTemplate, toast]);

  // Update template payment configuration
  const updatePayment = useCallback(async (id: string, payment: TemplatePayment) => {
    const { data: template, error: fetchError } = await supabase
      .from('design_templates')
      .select('canvas_data')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      toast({ title: 'Error', description: fetchError.message, variant: 'destructive' });
      return null;
    }
    
    const updatedCanvasData = mergeBackendConfigIntoCanvas(template.canvas_data, { payment });
    return updateTemplate(id, { canvas_data: updatedCanvasData });
  }, [updateTemplate, toast]);

  // Get full backend configuration for a template
  const getBackendConfig = useCallback((template: Template): TemplateBackendConfig => {
    return getBackendConfigFromCanvas(template.canvas_data);
  }, []);

  // Update full backend configuration for a template
  const updateBackendConfig = useCallback(async (id: string, config: Partial<TemplateBackendConfig>) => {
    const { data: template, error: fetchError } = await supabase
      .from('design_templates')
      .select('canvas_data')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      toast({ title: 'Error', description: fetchError.message, variant: 'destructive' });
      return null;
    }
    
    const updatedCanvasData = mergeBackendConfigIntoCanvas(template.canvas_data, config);
    return updateTemplate(id, { canvas_data: updatedCanvasData });
  }, [updateTemplate, toast]);

  // Publish a template (set is_public to true)
  const publishTemplate = useCallback(async (id: string) => {
    return updateTemplate(id, { is_public: true });
  }, [updateTemplate]);

  // Archive a template (set is_public to false)
  const archiveTemplate = useCallback(async (id: string) => {
    return updateTemplate(id, { is_public: false });
  }, [updateTemplate]);

  // Duplicate a template
  const duplicateTemplate = useCallback(async (id: string, newName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: original, error: fetchError } = await supabase
        .from('design_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const duplicate: TemplateInsert = {
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        canvas_data: original.canvas_data,
        thumbnail_url: original.thumbnail_url,
        is_public: false,
        user_id: original.user_id,
      };

      const { data, error: insertError } = await supabase
        .from('design_templates')
        .insert(duplicate)
        .select()
        .single();

      if (insertError) throw insertError;
      toast({
        title: 'Template duplicated',
        description: `"${duplicate.name}" has been created.`,
      });
      return data as Template;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error duplicating template',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Check if a path matches any template redirect (via Edge Function)
  const checkRedirect = useCallback(async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('template-backend', {
        body: { action: 'check-redirect', path },
      });
      if (error) throw error;
      return data as { redirect: boolean; destination?: string; statusCode?: number; templateId?: string };
    } catch (err: any) {
      console.error('Error checking redirect:', err);
      return { redirect: false };
    }
  }, []);

  // Process payment for a template (via Edge Function)
  const createPaymentSession = useCallback(async (templateId: string, returnUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('template-backend', {
        body: { 
          action: 'create-payment-session', 
          templateId,
          returnUrl,
        },
      });
      if (error) throw error;
      return data as { url: string; sessionId: string };
    } catch (err: any) {
      toast({
        title: 'Error creating payment session',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Check template access (for auth-protected templates)
  const checkAccess = useCallback(async (templateId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('template-backend', {
        body: { action: 'check-access', templateId },
      });
      if (error) throw error;
      return data as { allowed: boolean; reason?: string };
    } catch (err: any) {
      console.error('Error checking access:', err);
      return { allowed: false, reason: err.message };
    }
  }, []);

  // Fetch public templates
  const fetchPublicTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('design_templates')
        .select('*')
        .eq('is_public', true)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      return data as Template[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchTemplates,
    fetchPublicTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    publishTemplate,
    archiveTemplate,
    updateRedirects,
    updateScheduling,
    updateRequiresAuth,
    updatePayment,
    getBackendConfig,
    updateBackendConfig,
    checkRedirect,
    createPaymentSession,
    checkAccess,
  };
}
