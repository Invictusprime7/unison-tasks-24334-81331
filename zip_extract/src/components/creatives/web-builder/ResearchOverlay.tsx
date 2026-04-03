import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2 } from "lucide-react";

export type ResearchOverlayPayload = {
  query: string;
  href?: string;
  pageTitle?: string;
  selection?: string;
};

type ResearchArticle = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  imageUrl?: string;
  relevance?: string;
};

type ResearchVideo = {
  title: string;
  url: string;
  thumbnailUrl?: string;
  channel?: string;
};

type ResearchImage = {
  url: string;
  sourceUrl?: string;
  alt?: string;
};

type ResearchResponse = {
  query: string;
  summary?: string;
  keyPoints?: string[];
  articles: ResearchArticle[];
  videos: ResearchVideo[];
  images: ResearchImage[];
  generatedAt: string;
};

export function ResearchOverlay({
  isOpen,
  onClose,
  payload,
}: {
  isOpen: boolean;
  onClose: () => void;
  payload: ResearchOverlayPayload | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResearchResponse | null>(null);

  const query = useMemo(() => (payload?.query || "").trim(), [payload?.query]);

  useEffect(() => {
    if (!isOpen) return;
    if (!query) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    void (async () => {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("research", {
        body: {
          query,
          href: payload?.href,
          pageTitle: payload?.pageTitle,
          selection: payload?.selection,
        } satisfies ResearchOverlayPayload,
      });

      if (cancelled) return;

      if (fnError) {
        setError(fnError.message);
        setLoading(false);
        return;
      }

      setData(fnData as ResearchResponse);
      setLoading(false);
    })().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, query, payload?.href, payload?.pageTitle, payload?.selection]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Research: {query || "(no topic)"}</DialogTitle>
          <DialogDescription>
            Contextual research pulled from across the web. Links below are the cited sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching sources and generating a brief…
            </div>
          )}

          {error && (
            <div className="rounded-lg border bg-card p-3 text-sm">
              <div className="font-medium">Research failed</div>
              <div className="text-muted-foreground mt-1">{error}</div>
            </div>
          )}

          {data && (
            <div className="rounded-lg border bg-card p-4">
              {data.summary && <p className="text-sm leading-relaxed">{data.summary}</p>}
              {data.keyPoints?.length ? (
                <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {data.keyPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          <Tabs defaultValue="articles">
            <TabsList>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <TabsContent value="articles" className="mt-3">
              <ScrollArea className="h-[420px]">
                <div className="space-y-3 pr-3">
                  {(data?.articles || []).map((a) => (
                    <div key={a.url} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{a.title}</div>
                          {a.source && <div className="text-xs text-muted-foreground mt-0.5">{a.source}</div>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(a.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open
                        </Button>
                      </div>
                      {a.snippet && <p className="text-sm text-muted-foreground mt-2">{a.snippet}</p>}
                      {a.relevance && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium text-foreground">Why relevant:</span> {a.relevance}
                        </p>
                      )}
                    </div>
                  ))}
                  {!loading && !error && (data?.articles?.length ?? 0) === 0 && (
                    <div className="text-sm text-muted-foreground">No article results.</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="videos" className="mt-3">
              <ScrollArea className="h-[420px]">
                <div className="space-y-3 pr-3">
                  {(data?.videos || []).map((v) => (
                    <div key={v.url} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{v.title}</div>
                          {v.channel && <div className="text-xs text-muted-foreground mt-0.5">{v.channel}</div>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(v.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open
                        </Button>
                      </div>
                      {v.thumbnailUrl && (
                        <img
                          src={v.thumbnailUrl}
                          alt={`Thumbnail for ${v.title}`}
                          loading="lazy"
                          className="mt-2 w-full max-w-md rounded-md border"
                        />
                      )}
                    </div>
                  ))}
                  {!loading && !error && (data?.videos?.length ?? 0) === 0 && (
                    <div className="text-sm text-muted-foreground">No video results.</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="images" className="mt-3">
              <ScrollArea className="h-[420px]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-3">
                  {(data?.images || []).map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      className="group rounded-lg border overflow-hidden bg-background text-left"
                      onClick={() => window.open(img.sourceUrl || img.url, "_blank", "noopener,noreferrer")}
                    >
                      <img
                        src={img.url}
                        alt={img.alt || "Related image"}
                        loading="lazy"
                        className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="p-2 text-xs text-muted-foreground truncate">
                        {img.sourceUrl || img.url}
                      </div>
                    </button>
                  ))}
                  {!loading && !error && (data?.images?.length ?? 0) === 0 && (
                    <div className="text-sm text-muted-foreground">No image results.</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
