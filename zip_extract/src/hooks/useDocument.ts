import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  Document, 
  Page, 
  Layer, 
  Timeline, 
  Track, 
  Clip, 
  BrandKit,
  LayerKind,
  Transform,
  BlendMode,
  Mask,
  EffectNode,
  Fill,
  TransformKeyframes,
  TrackType,
  DesignToken,
} from "@/types/document";

export const useDocument = (documentId: string | null) => {
  const { toast } = useToast();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId) return;

    try {
      // Load document
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (docError) throw docError;

      // Load brand kit
      const { data: brandData } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("document_id", documentId)
        .maybeSingle();

      // Load pages and layers if design mode
      const pages: Page[] = [];
      if (doc.type === "design") {
        const { data: pagesData } = await supabase
          .from("pages")
          .select("*")
          .eq("document_id", documentId)
          .order("sort_order");

        if (pagesData) {
          for (const page of pagesData) {
            const { data: layersData } = await supabase
              .from("layers")
              .select("*")
              .eq("page_id", page.id)
              .order("sort_order");

            const mappedLayers: Layer[] = (layersData || []).map(layer => ({
              id: layer.id,
              kind: layer.kind as LayerKind,
              transform: layer.transform as any as Transform,
              opacity: layer.opacity,
              blend: layer.blend as BlendMode,
              visible: layer.visible,
              locked: layer.locked,
              masks: (layer.masks as any) || undefined,
              adjustments: (layer.adjustments as any) || undefined,
              payload: layer.payload,
              sortOrder: layer.sort_order,
            }));

            pages.push({
              id: page.id,
              documentId: page.document_id,
              width: page.width,
              height: page.height,
              background: page.background as any as Fill,
              layers: mappedLayers,
              sortOrder: page.sort_order,
            });
          }
        }
      }

      // Load timeline if video mode
      let timeline: Timeline | undefined;
      if (doc.type === "video") {
        const { data: timelineData } = await supabase
          .from("timelines")
          .select("*")
          .eq("document_id", documentId)
          .maybeSingle();

        if (timelineData) {
          const { data: tracksData } = await supabase
            .from("tracks")
            .select("*")
            .eq("timeline_id", timelineData.id)
            .order("sort_order");

          const tracks: Track[] = [];
          if (tracksData) {
            for (const track of tracksData) {
              const { data: clipsData } = await supabase
                .from("clips")
                .select("*")
                .eq("track_id", track.id);

              const mappedClips: Clip[] = (clipsData || []).map(clip => ({
                id: clip.id,
                trackId: clip.track_id,
                src: clip.src,
                in: clip.clip_in,
                out: clip.clip_out,
                start: clip.timeline_start,
                transforms: (clip.transforms as any) || undefined,
                effects: (clip.effects as any) || undefined,
              }));

              tracks.push({
                id: track.id,
                timelineId: track.timeline_id,
                type: track.type as TrackType,
                clips: mappedClips,
                sortOrder: track.sort_order,
              });
            }
          }

          timeline = {
            id: timelineData.id,
            documentId: timelineData.document_id,
            fps: timelineData.fps,
            duration: timelineData.duration,
            tracks,
          };
        }
      }

      const brand: BrandKit | undefined = brandData ? {
        id: brandData.id,
        documentId: brandData.document_id,
        colors: (brandData.colors as any) || [],
        fonts: brandData.fonts,
        logoUrl: brandData.logo_url || undefined,
      } : undefined;

      const fullDocument: Document = {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        userId: doc.user_id,
        brand,
        pages: pages.length > 0 ? pages : undefined,
        timeline,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      };

      setDocument(fullDocument);
    } catch (error: any) {
      console.error("Error loading document:", error);
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (updates: Partial<Document>) => {
    if (!documentId) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          title: updates.title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (error) throw error;

      setDocument((prev) => prev ? { ...prev, ...updates } : null);
      toast({ title: "Document updated" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
    }
  };

  const saveSnapshot = async () => {
    if (!documentId || !document) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("document_history").insert([{
        document_id: documentId,
        snapshot: document as any,
        created_by: user.id,
      }]);
    } catch (error) {
      console.error("Error saving snapshot:", error);
    }
  };

  return {
    document,
    loading,
    updateDocument,
    saveSnapshot,
    reloadDocument: loadDocument,
  };
};
