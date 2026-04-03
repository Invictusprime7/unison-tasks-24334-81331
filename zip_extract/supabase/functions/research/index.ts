import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ResearchPayload = {
  query: string;
  href?: string;
  pageTitle?: string;
  selection?: string;
};

type Article = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  imageUrl?: string;
  relevance?: string;
};

type Video = {
  title: string;
  url: string;
  thumbnailUrl?: string;
  channel?: string;
};

type Image = {
  url: string;
  sourceUrl?: string;
  alt?: string;
};

function normalizeText(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}

function safeUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableResearch/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, " "));
}

function parseDuckDuckGoResults(html: string, max = 6): Article[] {
  // DuckDuckGo HTML endpoint markup is fairly stable for this regex-based extraction.
  // We only use this to assemble citations (URLs + titles), not to scrape full content.
  const results: Article[] = [];
  const seen = new Set<string>();

  // Example:
  // <a rel="nofollow" class="result__a" href="https://example.com">Title</a>
  const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) && results.length < max) {
    const url = safeUrl(decodeHtmlEntities(m[1] || ""));
    const title = normalizeText(stripTags(m[2] || ""));
    if (!url || !title) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ title, url });
  }

  // Snippets:
  // <a class="result__snippet" ...>...</a> or <div class="result__snippet">...
  // We do a best-effort pass by scanning nearby text blocks.
  // (Not perfect; AI will handle missing snippets.)
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/gi;
  const snippets: string[] = [];
  while ((m = snippetRe.exec(html)) && snippets.length < results.length) {
    const raw = m[1] || m[2] || "";
    const snip = normalizeText(stripTags(raw));
    if (snip) snippets.push(snip);
  }
  for (let i = 0; i < results.length; i++) {
    if (snippets[i]) results[i].snippet = snippets[i];
  }
  return results;
}

function parseYouTubeResults(html: string, max = 6): Video[] {
  const ids: string[] = [];
  const idRe = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(html)) && ids.length < max) {
    const id = m[1];
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.map((id) => ({
    title: "YouTube video",
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  }));
}

function extractOgImage(pageHtml: string): string | null {
  const m = pageHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const url = m?.[1] ? safeUrl(decodeHtmlEntities(m[1])) : null;
  return url;
}

function extractSiteName(pageHtml: string): string | null {
  const m = pageHtml.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  return m?.[1] ? normalizeText(decodeHtmlEntities(m[1])) : null;
}

async function callLovableAI(opts: {
  query: string;
  articles: Article[];
  videos: Video[];
  href?: string;
  pageTitle?: string;
}): Promise<{ summary?: string; keyPoints?: string[]; relevanceByUrl?: Record<string, string> }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const sources = opts.articles.map((a, i) => ({
    n: i + 1,
    title: a.title,
    url: a.url,
    snippet: a.snippet || "",
  }));

  const system =
    "You are a research assistant. Produce a tight summary and key takeaways grounded in the provided sources. " +
    "When referencing facts, cite using [n] where n corresponds to the source list index. " +
    "Return JSON ONLY with keys: summary (string), keyPoints (string[]), relevanceByUrl (object mapping url->short relevance).";

  const user = {
    query: opts.query,
    context: {
      clickedHref: opts.href || null,
      pageTitle: opts.pageTitle || null,
    },
    sources,
    videos: opts.videos.slice(0, 5).map((v) => v.url),
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // User asked for "ChatGPT intelligence" → use an OpenAI-family model through the gateway.
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
      temperature: 0.3,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    if (resp.status === 429) throw new Error("Rate limited. Please try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits depleted. Please add credits to continue.");
    console.error("[research] AI gateway error", resp.status, t);
    throw new Error("AI gateway error");
  }

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content as string | undefined;
  if (!content) return {};

  try {
    const parsed = JSON.parse(content);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter((x: unknown) => typeof x === "string") : undefined,
      relevanceByUrl: typeof parsed.relevanceByUrl === "object" && parsed.relevanceByUrl ? parsed.relevanceByUrl : undefined,
    };
  } catch {
    // Fallback: treat as plain text
    return { summary: content };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as ResearchPayload;
    const query = normalizeText(payload?.query || "");
    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Search the web (no API key) using DuckDuckGo HTML endpoint
    const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const ddgHtml = await fetchText(ddgUrl, 9000);
    const articles = parseDuckDuckGoResults(ddgHtml, 6);

    // 2) Video candidates (best-effort scrape)
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const ytHtml = await fetchText(ytUrl, 9000);
    const videos = parseYouTubeResults(ytHtml, 6);

    // 3) Enrich top articles with og:image + site_name
    const enriched: Article[] = [];
    const images: Image[] = [];
    for (const a of articles.slice(0, 4)) {
      const pageHtml = await fetchText(a.url, 6000);
      const imageUrl = pageHtml ? extractOgImage(pageHtml) : null;
      const source = pageHtml ? extractSiteName(pageHtml) : null;
      const next: Article = { ...a };
      if (imageUrl) {
        next.imageUrl = imageUrl;
        images.push({ url: imageUrl, sourceUrl: a.url, alt: a.title });
      }
      if (source) next.source = source;
      enriched.push(next);
    }

    // Keep remaining articles (un-enriched)
    for (const a of articles.slice(4)) enriched.push(a);

    // 4) AI brief (ChatGPT-like model through gateway), grounded in sources
    let ai: { summary?: string; keyPoints?: string[]; relevanceByUrl?: Record<string, string> } = {};
    try {
      ai = await callLovableAI({
        query,
        href: payload.href,
        pageTitle: payload.pageTitle,
        articles: enriched,
        videos,
      });
    } catch (e) {
      console.warn("[research] AI brief failed; returning raw sources", e);
    }

    const relevanceByUrl = ai.relevanceByUrl || {};
    const finalArticles = enriched.map((a) => ({
      ...a,
      relevance: relevanceByUrl[a.url] || a.relevance,
    }));

    // Add a few more images directly from article list (if present)
    for (const a of finalArticles) {
      if (a.imageUrl && !images.find((i) => i.url === a.imageUrl)) {
        images.push({ url: a.imageUrl, sourceUrl: a.url, alt: a.title });
      }
    }

    // Keep a small payload size
    const responseBody = {
      query,
      summary: ai.summary,
      keyPoints: ai.keyPoints || [],
      articles: finalArticles.slice(0, 8),
      videos: videos.slice(0, 8),
      images: images.slice(0, 12),
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[research] error", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
