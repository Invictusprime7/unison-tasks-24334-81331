/**
 * useTemplateFiles — saved Web Builder projects
 *
 * Persists into `builder_drafts` so the FULL project state (multi-page VFS,
 * entry point, active page, business/system context) round-trips on save+load.
 *
 * Backward compat: API surface preserved. Legacy `design_templates` rows still
 * load via fallback path (read-only). New saves always go to `builder_drafts`.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { syncCanonicalComponentGraph } from "@/services/componentGraphPersistence";
import { findBuilderDraftIdForProject } from "@/services/builderDraftBridge";

interface TemplateData {
  html: string;
  css?: string;
  previewCode?: string;
  // v2 fields
  vfsFiles?: Record<string, string>;
  entryPoint?: string;
  activePagePath?: string;
  canonicalPlayground?: Record<string, unknown>;
  siteBundleSnapshot?: Record<string, unknown>;
  version?: number;
}

export interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  canvas_data: TemplateData;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
}

export interface SaveProjectPayload {
  vfsFiles?: Record<string, string>;
  entryPoint?: string;
  activePagePath?: string;
  businessId?: string | null;
  projectId?: string | null;
  canonicalPlayground?: Record<string, unknown>;
  siteBundleSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const LOCAL_STORAGE_KEY = "webbuilder_templates";

const getLocalTemplates = (): SavedTemplate[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalTemplates = (templates: SavedTemplate[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
};

/** Build the v2 canvas_data envelope. Always includes the legacy fields for fallback rendering. */
const buildCanvasData = (code: string, payload?: SaveProjectPayload): TemplateData => ({
  version: 2,
  html: code,
  previewCode: code,
  ...(payload?.vfsFiles ? { vfsFiles: payload.vfsFiles } : {}),
  ...(payload?.entryPoint ? { entryPoint: payload.entryPoint } : {}),
  ...(payload?.activePagePath ? { activePagePath: payload.activePagePath } : {}),
  ...(payload?.canonicalPlayground ? { canonicalPlayground: payload.canonicalPlayground } : {}),
  ...(payload?.siteBundleSnapshot ? { siteBundleSnapshot: payload.siteBundleSnapshot } : {}),
});

/** Convert a builder_drafts row to a SavedTemplate envelope. */
const draftRowToTemplate = (row: any): SavedTemplate => {
  const meta = (row.metadata || {}) as Record<string, any>;
  const vfsFiles = (row.vfs_files || meta.vfsFiles || undefined) as Record<string, string> | undefined;
  return {
    id: row.id,
    name: meta.name || "Untitled Project",
    description: meta.description ?? null,
    is_public: false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    thumbnail_url: meta.thumbnail_url ?? null,
    canvas_data: {
      version: 2,
      html: row.code || row.editor_code || "",
      previewCode: row.editor_code || row.code || "",
      vfsFiles,
      entryPoint: meta.entryPoint,
      activePagePath: meta.activePagePath,
      canonicalPlayground: (meta.canonicalPlayground || undefined) as Record<string, unknown> | undefined,
      siteBundleSnapshot: (meta.siteBundleSnapshot || undefined) as Record<string, unknown> | undefined,
    },
  };
};

export function useTemplateFiles() {
  const [loading, setLoading] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  const saveTemplate = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean,
    code: string,
    payload?: SaveProjectPayload,
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Anonymous → local storage
      if (!user) {
        const localTemplates = getLocalTemplates();
        const newTemplate: SavedTemplate = {
          id: `local-${Date.now()}`,
          name,
          description: description || null,
          canvas_data: buildCanvasData(code, payload),
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          thumbnail_url: null,
        };
        localTemplates.unshift(newTemplate);
        saveLocalTemplates(localTemplates);
        setCurrentTemplateId(newTemplate.id);
        toast.success("Project saved locally!", {
          description: `"${name}" saved to browser storage`,
        });
        return newTemplate.id;
      }

      const metadata = {
        name,
        description: description || null,
        entryPoint: payload?.entryPoint,
        activePagePath: payload?.activePagePath,
        projectId: payload?.projectId ?? null,
        canonicalPlayground: payload?.canonicalPlayground ?? null,
        siteBundleSnapshot: payload?.siteBundleSnapshot ?? null,
        ...(payload?.metadata || {}),
      } as unknown as Json;

      const { data, error } = await supabase
        .from("builder_drafts")
        .insert({
          user_id: user.id,
          business_id: payload?.businessId ?? null,
          code,
          editor_code: code,
          vfs_files: (payload?.vfsFiles ?? null) as unknown as Json,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;

      await syncCanonicalComponentGraph({
        projectId: payload?.projectId ?? null,
        draftId: data.id,
        canonicalPlayground: payload?.canonicalPlayground,
      });

      setCurrentTemplateId(data.id);
      toast.success("Project saved!", {
        description: `"${name}" has been saved successfully`,
      });
      return data.id;
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (
    id: string,
    code: string,
    payload?: SaveProjectPayload,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const index = localTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
          localTemplates[index] = {
            ...localTemplates[index],
            canvas_data: buildCanvasData(code, payload),
            updated_at: new Date().toISOString(),
          };
          saveLocalTemplates(localTemplates);
          toast.success("Project updated!");
          return true;
        }
        throw new Error("Project not found");
      }

      // Read existing metadata so we can merge name/description.
      const { data: existing } = await supabase
        .from("builder_drafts")
        .select("metadata")
        .eq("id", id)
        .maybeSingle();

      const prevMeta = (existing?.metadata || {}) as Record<string, any>;
      const nextMeta = {
        ...prevMeta,
        ...(payload?.entryPoint ? { entryPoint: payload.entryPoint } : {}),
        ...(payload?.activePagePath ? { activePagePath: payload.activePagePath } : {}),
        ...(payload?.projectId !== undefined ? { projectId: payload.projectId } : {}),
        ...(payload?.canonicalPlayground !== undefined ? { canonicalPlayground: payload.canonicalPlayground } : {}),
        ...(payload?.siteBundleSnapshot !== undefined ? { siteBundleSnapshot: payload.siteBundleSnapshot } : {}),
        ...(payload?.metadata || {}),
      } as unknown as Json;

      const updatePatch: Record<string, unknown> = {
        code,
        editor_code: code,
        metadata: nextMeta,
        updated_at: new Date().toISOString(),
      };
      if (payload?.vfsFiles !== undefined) {
        updatePatch.vfs_files = payload.vfsFiles as unknown as Json;
      }

      const { error } = await supabase
        .from("builder_drafts")
        .update(updatePatch)
        .eq("id", id);

      if (error) throw error;
      await syncCanonicalComponentGraph({
        projectId: payload?.projectId ?? null,
        draftId: id,
        canonicalPlayground: payload?.canonicalPlayground,
      });
      toast.success("Project updated!");
      return true;
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureDraft = useCallback(async (
    name: string,
    description: string,
    code: string,
    payload?: SaveProjectPayload,
  ): Promise<string | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return null;
    }

    const existingId = currentTemplateId || await findBuilderDraftIdForProject({
      projectId: payload?.projectId ?? null,
      projectName: trimmedName,
      businessId: payload?.businessId ?? null,
    });

    if (existingId) {
      const didUpdate = await updateTemplate(existingId, code, payload);
      if (!didUpdate) {
        return null;
      }
      setCurrentTemplateId(existingId);
      return existingId;
    }

    return saveTemplate(trimmedName, description, false, code, payload);
  }, [currentTemplateId, saveTemplate, updateTemplate]);

  const loadTemplate = useCallback(async (id: string): Promise<SavedTemplate | null> => {
    setLoading(true);
    try {
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const template = localTemplates.find(t => t.id === id);
        if (template) {
          setCurrentTemplateId(template.id);
          return template;
        }
        throw new Error("Project not found");
      }

      // Try builder_drafts first (canonical store)
      const { data: draft, error: draftErr } = await supabase
        .from("builder_drafts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (draftErr && draftErr.code !== "PGRST116") {
        // PGRST116 = no rows; anything else is a real error
        console.warn("[useTemplateFiles] builder_drafts lookup error:", draftErr);
      }

      if (draft) {
        setCurrentTemplateId(draft.id);
        return draftRowToTemplate(draft);
      }

      // Legacy fallback: design_templates (read-only)
      const { data: legacy, error: legacyErr } = await supabase
        .from("design_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (legacyErr) throw legacyErr;

      const template: SavedTemplate = {
        ...legacy,
        canvas_data: legacy.canvas_data as unknown as TemplateData,
      };
      setCurrentTemplateId(template.id);
      return template;
    } catch (error) {
      console.error("Error loading project:", error);
      toast.error("Failed to load project");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const filtered = localTemplates.filter(t => t.id !== id);
        saveLocalTemplates(filtered);
        toast.success("Project deleted");
        return true;
      }

      // Delete from whichever table holds it
      const { error: draftErr } = await supabase.from("builder_drafts").delete().eq("id", id);
      if (draftErr) {
        const { error: legacyErr } = await supabase.from("design_templates").delete().eq("id", id);
        if (legacyErr) throw legacyErr;
      }
      toast.success("Project deleted");
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
      return false;
    }
  }, []);

  const autoSave = useCallback(async (code: string, payload?: SaveProjectPayload): Promise<boolean> => {
    if (!currentTemplateId) return false;
    try {
      if (currentTemplateId.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const index = localTemplates.findIndex(t => t.id === currentTemplateId);
        if (index !== -1) {
          localTemplates[index] = {
            ...localTemplates[index],
            canvas_data: buildCanvasData(code, payload),
            updated_at: new Date().toISOString(),
          };
          saveLocalTemplates(localTemplates);
          return true;
        }
        return false;
      }

      const updatePatch: Record<string, unknown> = {
        code,
        editor_code: code,
        updated_at: new Date().toISOString(),
      };
      if (payload?.vfsFiles !== undefined) {
        updatePatch.vfs_files = payload.vfsFiles as unknown as Json;
      }
      if (
        payload?.entryPoint !== undefined ||
        payload?.activePagePath !== undefined ||
        payload?.projectId !== undefined ||
        payload?.canonicalPlayground !== undefined ||
        payload?.siteBundleSnapshot !== undefined ||
        payload?.metadata
      ) {
        const { data: existing } = await supabase
          .from("builder_drafts")
          .select("metadata")
          .eq("id", currentTemplateId)
          .maybeSingle();

        const prevMeta = (existing?.metadata || {}) as Record<string, unknown>;
        updatePatch.metadata = {
          ...prevMeta,
          ...(payload?.entryPoint !== undefined ? { entryPoint: payload.entryPoint } : {}),
          ...(payload?.activePagePath !== undefined ? { activePagePath: payload.activePagePath } : {}),
          ...(payload?.projectId !== undefined ? { projectId: payload.projectId } : {}),
          ...(payload?.canonicalPlayground !== undefined ? { canonicalPlayground: payload.canonicalPlayground } : {}),
          ...(payload?.siteBundleSnapshot !== undefined ? { siteBundleSnapshot: payload.siteBundleSnapshot } : {}),
          ...(payload?.metadata || {}),
        } as Json;
      }

      const { error } = await supabase
        .from("builder_drafts")
        .update(updatePatch)
        .eq("id", currentTemplateId);
      if (error) throw error;
      await syncCanonicalComponentGraph({
        projectId: payload?.projectId ?? null,
        draftId: currentTemplateId,
        canonicalPlayground: payload?.canonicalPlayground,
      });
      return true;
    } catch (error) {
      console.error("Auto-save failed:", error);
      return false;
    }
  }, [currentTemplateId]);

  const clearCurrentTemplate = useCallback(() => {
    setCurrentTemplateId(null);
  }, []);

  /** List all saved projects for the current user (builder_drafts + local). */
  const getAllTemplates = useCallback(async (): Promise<SavedTemplate[]> => {
    const localTemplates = getLocalTemplates();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localTemplates;

      const { data, error } = await supabase
        .from("builder_drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const cloudTemplates = (data || []).map(draftRowToTemplate);
      return [...localTemplates, ...cloudTemplates];
    } catch (error) {
      console.error("Error fetching projects:", error);
      return localTemplates;
    }
  }, []);

  return {
    loading,
    currentTemplateId,
    saveTemplate,
    updateTemplate,
    ensureDraft,
    loadTemplate,
    deleteTemplate,
    autoSave,
    clearCurrentTemplate,
    setCurrentTemplateId,
    getAllTemplates,
    getLocalTemplates,
  };
}
