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
import { generateCanonicalRouterForFiles } from "@/utils/topologyRouterGenerator";
import type { PageRegistry } from "@/types/pageRegistry";
import { createMinimalValidSnapshot } from "@/platform/core/canonicalRuntimeContract";

/**
 * Pass 1 (Canonical Preview Enforcement): if a draft is being created without
 * a SiteBundleSnapshot AND without wizard evidence in metadata, mint a real
 * minimal snapshot up-front so canonical preview / readiness / publish never
 * have to fall back to a fabricated shell at render time. Blank drafts now
 * enter the system already-canonical.
 */
function bootstrapSnapshotIfMissing(
  metadata: Record<string, unknown>,
  payload?: SaveProjectPayload,
  projectName?: string,
): Record<string, unknown> {
  if (payload?.siteBundleSnapshot) return metadata;
  if (metadata.siteBundleSnapshot) return metadata;
  // Honor explicit wizard handoff if present — wizard pipeline mints its own.
  if (metadata.wizardSeedId || metadata.canonicalPlayground) return metadata;
  try {
    const snapshot = createMinimalValidSnapshot({
      businessName: projectName || 'Untitled project',
      themePresetId: (metadata.themePresetId as string) || 'default',
      systemId: (metadata.systemId as string) || 'manual',
    });
    return { ...metadata, siteBundleSnapshot: snapshot as unknown as Record<string, unknown> };
  } catch (err) {
    console.warn('[useTemplateFiles] minimal snapshot bootstrap failed:', err);
    return metadata;
  }
}

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
  siteBundleSnapshot?: unknown;
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

function emitCloudDraftSaved(detail: {
  draftId: string;
  projectId?: string | null;
  businessId?: string | null;
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('unison:project-draft-saved', { detail }));
}

/** Build the v2 canvas_data envelope. Always includes the legacy fields for fallback rendering. */
const buildCanvasData = (code: string, payload?: SaveProjectPayload): TemplateData => ({
  version: 2,
  html: code,
  previewCode: code,
  ...(payload?.vfsFiles ? { vfsFiles: payload.vfsFiles } : {}),
  ...(payload?.entryPoint ? { entryPoint: payload.entryPoint } : {}),
  ...(payload?.activePagePath ? { activePagePath: payload.activePagePath } : {}),
  ...(payload?.canonicalPlayground ? { canonicalPlayground: payload.canonicalPlayground } : {}),
  ...(payload?.siteBundleSnapshot ? { siteBundleSnapshot: payload.siteBundleSnapshot as Record<string, unknown> } : {}),
});

/** Convert a builder_drafts row to a SavedTemplate envelope. */
const draftRowToTemplate = (row: any): SavedTemplate => {
  const meta = (row.metadata || {}) as Record<string, any>;
  const vfsFiles = (
    row.vfs_files ||
    meta.vfsFiles ||
    (meta.siteBundleSnapshot as { vfsFiles?: Record<string, string> } | undefined)?.vfsFiles ||
    undefined
  ) as Record<string, string> | undefined;
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
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  // Pass 2 (identity hardening): real `projects.id` for the active draft.
  // Tracked separately from `currentDraftId` (which is the draft id) to
  // purge the long-standing `projectId === templateId === draftId` aliasing
  // that fed BuilderIdentity at commit/deploy/AI-apply boundaries.
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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
        setCurrentDraftId(newTemplate.id);
        toast.success("Project saved locally!", {
          description: `"${name}" saved to browser storage`,
        });
        return newTemplate.id;
      }

      // Project name is the canonical identity. The user-supplied `name`
      // argument always wins over any stale metadata fallback (e.g. a wizard
      // "My Business" placeholder). Never fall back to a business name here.
      const trimmedName = (name || '').trim() || 'Untitled project';
      const incomingMeta = (payload?.metadata || {}) as Record<string, unknown>;
      const baseMeta: Record<string, unknown> = {
        ...incomingMeta,
        name: trimmedName,
        projectName: trimmedName,
        description: description || null,
        entryPoint: payload?.entryPoint,
        activePagePath: payload?.activePagePath,
        projectId: payload?.projectId ?? null,
        canonicalPlayground: payload?.canonicalPlayground ?? null,
        siteBundleSnapshot: payload?.siteBundleSnapshot ?? null,
      };
      const metadata = bootstrapSnapshotIfMissing(baseMeta, payload, trimmedName) as unknown as Json;

      // If a draft already exists for this (user, business, project), update it instead of inserting.
      // This prevents `uq_builder_drafts_user_business*` collisions when users save multiple times
      // or rename a project — saving must always succeed and never lose state.
      let existingDraftId: string | null = null;
      {
        let lookup = supabase
          .from("builder_drafts")
          .select("id")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (payload?.projectId) {
          lookup = lookup.eq("project_id", payload.projectId);
        } else if (payload?.businessId) {
          lookup = lookup.eq("business_id", payload.businessId).is("project_id", null);
        } else {
          lookup = lookup.is("business_id", null).is("project_id", null);
        }

        const { data: existingRow } = await lookup.maybeSingle();
        existingDraftId = existingRow?.id ?? null;
      }

      let data: { id: string; project_id?: string | null } | null = null;

      if (existingDraftId) {
        const updatePayload: Record<string, unknown> = {
          name: trimmedName,
          code,
          editor_code: code,
          vfs_files: (payload?.vfsFiles ?? null) as unknown as Json,
          metadata,
          updated_at: new Date().toISOString(),
        };
        if (payload?.businessId !== undefined) updatePayload.business_id = payload.businessId;
        if (payload?.projectId !== undefined) updatePayload.project_id = payload.projectId;
        const { data: updated, error: updateError } = await supabase
          .from("builder_drafts")
          .update(updatePayload)
          .eq("id", existingDraftId)
          .eq("user_id", user.id)
          .select("id, project_id, business_id")
          .single();
        if (updateError) throw updateError;
        data = updated as { id: string; project_id?: string | null };
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("builder_drafts")
          .insert({
            name: trimmedName,
            user_id: user.id,
            business_id: payload?.businessId ?? null,
            project_id: payload?.projectId ?? null,
            code,
            editor_code: code,
            vfs_files: (payload?.vfsFiles ?? null) as unknown as Json,
            metadata,
          })
          .select("id, project_id, business_id")
          .single();
        if (insertError) throw insertError;
        data = inserted as { id: string; project_id?: string | null };
      }

      if (!data) throw new Error("Failed to persist draft");

      await syncCanonicalComponentGraph({
        projectId: (data as { project_id?: string | null }).project_id ?? payload?.projectId ?? null,
        draftId: data.id,
        canonicalPlayground: payload?.canonicalPlayground,
      });

      setCurrentDraftId(data.id);
      const resolvedProjectId =
        (data as { project_id?: string | null }).project_id ??
        payload?.projectId ??
        null;
      setCurrentProjectId(resolvedProjectId);
      emitCloudDraftSaved({
        draftId: data.id,
        projectId: resolvedProjectId,
        businessId: payload?.businessId ?? null,
      });
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
      const incomingMeta = (payload?.metadata || {}) as Record<string, unknown>;
      // Resolve canonical project name. Prefer incoming metadata.name (the
      // user-visible title), else preserve previous, else fallback.
      const resolvedName = (
        (typeof incomingMeta.name === 'string' && incomingMeta.name.trim()) ||
        (typeof incomingMeta.projectName === 'string' && incomingMeta.projectName.trim()) ||
        (typeof prevMeta.name === 'string' && prevMeta.name.trim()) ||
        (typeof prevMeta.projectName === 'string' && prevMeta.projectName.trim()) ||
        ''
      ).trim();

      const nextMeta = {
        ...prevMeta,
        ...(payload?.entryPoint ? { entryPoint: payload.entryPoint } : {}),
        ...(payload?.activePagePath ? { activePagePath: payload.activePagePath } : {}),
        ...(payload?.projectId !== undefined ? { projectId: payload.projectId } : {}),
        ...(payload?.canonicalPlayground !== undefined ? { canonicalPlayground: payload.canonicalPlayground } : {}),
        ...(payload?.siteBundleSnapshot !== undefined ? { siteBundleSnapshot: payload.siteBundleSnapshot } : {}),
        ...incomingMeta,
        ...(resolvedName ? { name: resolvedName, projectName: resolvedName } : {}),
      } as unknown as Json;

      const updatePatch: Record<string, unknown> = {
        code,
        editor_code: code,
        metadata: nextMeta,
        updated_at: new Date().toISOString(),
      };
      if (resolvedName) {
        updatePatch.name = resolvedName;
      }
      if (payload?.vfsFiles !== undefined) {
        updatePatch.vfs_files = payload.vfsFiles as unknown as Json;
      }
      if (payload?.businessId !== undefined) updatePatch.business_id = payload.businessId;
      if (payload?.projectId !== undefined) updatePatch.project_id = payload.projectId;

      const { data: updatedDraft, error } = await supabase
        .from("builder_drafts")
        .update(updatePatch)
        .eq("id", id)
        .select("id, project_id, business_id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!updatedDraft) throw new Error(`Draft ${id} was not updated; access or linkage is invalid.`);
      setCurrentProjectId(updatedDraft.project_id ?? payload?.projectId ?? null);
      await syncCanonicalComponentGraph({
        projectId: updatedDraft.project_id ?? payload?.projectId ?? null,
        draftId: id,
        canonicalPlayground: payload?.canonicalPlayground,
      });
      emitCloudDraftSaved({
        draftId: id,
        projectId: updatedDraft.project_id ?? payload?.projectId ?? null,
        businessId: updatedDraft.business_id ?? payload?.businessId ?? null,
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

    const existingId = currentDraftId || await findBuilderDraftIdForProject({
      projectId: payload?.projectId ?? null,
      projectName: trimmedName,
      businessId: payload?.businessId ?? null,
    });

    if (existingId) {
      const didUpdate = await updateTemplate(existingId, code, payload);
      if (!didUpdate) {
        return null;
      }
      setCurrentDraftId(existingId);
      return existingId;
    }

    return saveTemplate(trimmedName, description, false, code, payload);
  }, [currentDraftId, saveTemplate, updateTemplate]);

  const loadTemplate = useCallback(async (id: string): Promise<SavedTemplate | null> => {
    setLoading(true);
    try {
      if (id.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const template = localTemplates.find(t => t.id === id);
        if (template) {
          setCurrentDraftId(template.id);
          return template;
        }
        throw new Error("Project not found");
      }

      // Try builder_drafts first (canonical store)
      const { data: draftById, error: draftErr } = await supabase
        .from("builder_drafts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (draftErr && draftErr.code !== "PGRST116") {
        // PGRST116 = no rows; anything else is a real error, but legacy/project lookup can still recover.
        console.warn("[useTemplateFiles] builder_drafts lookup error:", draftErr);
      }

      let draft = draftById;
      if (!draft) {
        const { data: draftByProject, error: projectLookupError } = await supabase
          .from("builder_drafts")
          .select("*")
          .eq("project_id", id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (projectLookupError && projectLookupError.code !== 'PGRST116') {
          console.warn('[useTemplateFiles] project-to-draft lookup error:', projectLookupError);
        }
        draft = draftByProject;
      }

      if (draft) {
        setCurrentDraftId(draft.id);
        const draftProjectId =
          (draft as { project_id?: string | null }).project_id ??
          ((draft.metadata as Record<string, unknown> | null)?.projectId as
            | string
            | undefined) ??
          null;
        setCurrentProjectId(draftProjectId ?? null);
        return draftRowToTemplate(draft);
      }

      // Legacy fallback: design_templates (read-only)
      const { data: legacy, error: legacyErr } = await supabase
        .from("design_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (legacyErr && legacyErr.code !== "PGRST116") throw legacyErr;
      if (!legacy) {
        console.warn("[useTemplateFiles] project not found in canonical or legacy stores:", id);
        return null;
      }

      const template: SavedTemplate = {
        ...legacy,
        canvas_data: legacy.canvas_data as unknown as TemplateData,
      };
      setCurrentDraftId(template.id);
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
    if (!currentDraftId) return false;
    try {
      if (currentDraftId.startsWith("local-")) {
        const localTemplates = getLocalTemplates();
        const index = localTemplates.findIndex(t => t.id === currentDraftId);
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

      // ── Deterministic router last-mile guard ──────────────────────────────
      // The PageRegistry-version effect in WebBuilder regenerates /src/App.tsx
      // on every structural mutation, and buildSavePayload's commitToPipeline
      // recompiles the router on every save. As a defensive third line, before
      // we persist the draft we re-derive the canonical router from the
      // payload's canonicalPlayground.pageRegistry and overwrite the App.tsx
      // entry in vfsFiles if it has drifted. This guarantees the saved draft
      // never carries a stale or AI-authored router that disagrees with the
      // current page registry.
      let vfsFilesForSave: Record<string, string> | undefined =
        (payload?.vfsFiles as Record<string, string> | undefined) ?? undefined;
      try {
        const cp = (payload?.canonicalPlayground || {}) as Record<string, unknown>;
        const registry = cp.pageRegistry as PageRegistry | undefined;
        if (
          vfsFilesForSave &&
          registry &&
          registry.pages &&
          Object.keys(registry.pages).length > 0
        ) {
          const businessName =
            (((cp.creatorData || {}) as Record<string, unknown>).businessInfo as
              | Record<string, unknown>
              | undefined)?.businessName as string | undefined;
          const fresh = generateCanonicalRouterForFiles(
            registry,
            vfsFilesForSave,
            businessName,
          );
          const appPath = vfsFilesForSave['/src/App.tsx']
            ? '/src/App.tsx'
            : vfsFilesForSave['/App.tsx']
              ? '/App.tsx'
              : '/src/App.tsx';
          if (fresh && fresh !== vfsFilesForSave[appPath]) {
            vfsFilesForSave = { ...vfsFilesForSave, [appPath]: fresh };
            console.log('[useTemplateFiles.autoSave] Re-derived canonical router before save:', appPath);
          }
        }
      } catch (err) {
        console.warn('[useTemplateFiles.autoSave] Router re-derivation skipped:', err);
      }

      const updatePatch: Record<string, unknown> = {
        code,
        editor_code: code,
        updated_at: new Date().toISOString(),
      };
      if (vfsFilesForSave !== undefined) {
        updatePatch.vfs_files = vfsFilesForSave as unknown as Json;
      }
      if (payload?.businessId !== undefined) updatePatch.business_id = payload.businessId;
      if (payload?.projectId !== undefined) updatePatch.project_id = payload.projectId;
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
          .eq("id", currentDraftId)
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

      const { data: updatedDraft, error } = await supabase
        .from("builder_drafts")
        .update(updatePatch)
        .eq("id", currentDraftId)
        .select("id, project_id, business_id")
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!updatedDraft) {
        throw new Error(`Autosave did not update draft ${currentDraftId}; access or linkage is invalid.`);
      }
      setCurrentProjectId(updatedDraft.project_id ?? payload?.projectId ?? null);
      await syncCanonicalComponentGraph({
        projectId: updatedDraft.project_id ?? payload?.projectId ?? null,
        draftId: currentDraftId,
        canonicalPlayground: payload?.canonicalPlayground,
      });
      emitCloudDraftSaved({
        draftId: currentDraftId,
        projectId: updatedDraft.project_id ?? payload?.projectId ?? null,
        businessId: updatedDraft.business_id ?? payload?.businessId ?? null,
      });
      return true;
    } catch (error) {
      console.error("Auto-save failed:", error);
      return false;
    }
  }, [currentDraftId]);

  const clearCurrentTemplate = useCallback(() => {
    setCurrentDraftId(null);
    setCurrentProjectId(null);
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
    currentDraftId,
    currentProjectId,
    saveTemplate,
    updateTemplate,
    ensureDraft,
    loadTemplate,
    deleteTemplate,
    autoSave,
    clearCurrentTemplate,
    setCurrentDraftId,
    setCurrentProjectId,
    getAllTemplates,
    getLocalTemplates,
  };
}
