import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

interface TemplateData {
  html: string;
  css?: string;
  previewCode?: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  canvas_data: TemplateData;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
}

// Local storage key for anonymous templates
const LOCAL_STORAGE_KEY = "webbuilder_templates";

// Get templates from local storage
const getLocalTemplates = (): SavedTemplate[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save templates to local storage
const saveLocalTemplates = (templates: SavedTemplate[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
};

export function useTemplateFiles() {
  const [loading, setLoading] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  const saveTemplate = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean,
    code: string
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user, save to local storage
      if (!user) {
        const localTemplates = getLocalTemplates();
        const newTemplate: SavedTemplate = {
          id: `local-${Date.now()}`,
          name,
          description: description || null,
          canvas_data: { html: code, previewCode: code },
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thumbnail_url: null,
        };
        localTemplates.unshift(newTemplate);
        saveLocalTemplates(localTemplates);
        setCurrentTemplateId(newTemplate.id);
        toast.success("Template saved locally!", {
          description: `"${name}" saved to browser storage`,
        });
        return newTemplate.id;
      }

      const canvasData = {
        html: code,
        previewCode: code,
      } as unknown as Json;

      const { data, error } = await supabase
        .from("design_templates")
        .insert({
          name,
          description: description || null,
          is_public: isPublic,
          user_id: user.id,
          canvas_data: canvasData,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentTemplateId(data.id);
      toast.success("Template saved!", {
        description: `"${name}" has been saved successfully`,
      });
      
      return data.id;
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (
    id: string,
    code: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      // Check if it's a local template
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const index = localTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
          localTemplates[index] = {
            ...localTemplates[index],
            canvas_data: { html: code, previewCode: code },
            updated_at: new Date().toISOString(),
          };
          saveLocalTemplates(localTemplates);
          toast.success("Template updated!");
          return true;
        }
        throw new Error("Template not found");
      }

      const canvasData = {
        html: code,
        previewCode: code,
      } as unknown as Json;

      const { error } = await supabase
        .from("design_templates")
        .update({
          canvas_data: canvasData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Template updated!");
      return true;
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplate = useCallback(async (id: string): Promise<SavedTemplate | null> => {
    setLoading(true);
    try {
      // Check if it's a local template
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const template = localTemplates.find(t => t.id === id);
        if (template) {
          setCurrentTemplateId(template.id);
          return template;
        }
        throw new Error("Template not found");
      }

      const { data, error } = await supabase
        .from("design_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setCurrentTemplateId(data.id);
      
      // Cast canvas_data properly
      const template: SavedTemplate = {
        ...data,
        canvas_data: data.canvas_data as unknown as TemplateData,
      };
      
      return template;
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load template");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Check if it's a local template
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const filtered = localTemplates.filter(t => t.id !== id);
        saveLocalTemplates(filtered);
        toast.success("Template deleted");
        return true;
      }

      const { error } = await supabase
        .from("design_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template deleted");
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
      return false;
    }
  }, []);

  const autoSave = useCallback(async (code: string): Promise<boolean> => {
    if (!currentTemplateId) return false;
    
    try {
      // Check if it's a local template
      if (currentTemplateId.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const index = localTemplates.findIndex(t => t.id === currentTemplateId);
        if (index !== -1) {
          localTemplates[index] = {
            ...localTemplates[index],
            canvas_data: { html: code, previewCode: code },
            updated_at: new Date().toISOString(),
          };
          saveLocalTemplates(localTemplates);
          return true;
        }
        return false;
      }

      const canvasData = {
        html: code,
        previewCode: code,
      } as unknown as Json;

      const { error } = await supabase
        .from("design_templates")
        .update({
          canvas_data: canvasData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentTemplateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Auto-save failed:", error);
      return false;
    }
  }, [currentTemplateId]);

  const clearCurrentTemplate = useCallback(() => {
    setCurrentTemplateId(null);
  }, []);

  // Get all templates (local + cloud if authenticated)
  const getAllTemplates = useCallback(async (): Promise<SavedTemplate[]> => {
    const localTemplates = getLocalTemplates();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return localTemplates;
      }

      const { data, error } = await supabase
        .from("design_templates")
        .select("*")
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      const cloudTemplates = (data || []).map(t => ({
        ...t,
        canvas_data: t.canvas_data as unknown as TemplateData,
      })) as SavedTemplate[];

      // Combine local and cloud templates, local first
      return [...localTemplates, ...cloudTemplates];
    } catch (error) {
      console.error("Error fetching templates:", error);
      return localTemplates;
    }
  }, []); // Empty dependency array for stable reference

  return {
    loading,
    currentTemplateId,
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    autoSave,
    clearCurrentTemplate,
    setCurrentTemplateId,
    getAllTemplates,
    getLocalTemplates,
  };
}
