/**
 * Web Research Module
 * Performs intelligent multi-query DDG scraping for design/dev context.
 * Enhanced with keyword-driven queries and deduplication.
 */

export interface ResearchResult {
  snippets: string[];
  trends: string[];
  keyPhrases: string[];
  queriesUsed: string[];
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtmlTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WebBuilderAI/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseDDGResults(html: string, max = 6): string[] {
  const snippets: string[] = [];
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = snippetRe.exec(html)) && snippets.length < max) {
    const raw = match[1] || match[2] || "";
    const snippet = stripHtmlTags(raw);
    if (snippet && snippet.length > 30) {
      snippets.push(snippet);
    }
  }
  return snippets;
}

function extractInsights(snippets: string[]): { trends: string[]; keyPhrases: string[] } {
  const trends: string[] = [];
  const keyPhrases: string[] = [];
  const trendKeywords = ["trend", "popular", "modern", "2025", "2024", "2026", "latest", "best practice", "emerging"];
  const featureKeywords = ["feature", "include", "component", "design", "layout", "responsive", "pattern", "approach", "technique"];
  for (const snippet of snippets) {
    const lower = snippet.toLowerCase();
    if (trendKeywords.some(kw => lower.includes(kw))) {
      const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences[0] && trendKeywords.some(kw => sentences[0].toLowerCase().includes(kw))) {
        trends.push(sentences[0].trim());
      }
    }
    if (featureKeywords.some(kw => lower.includes(kw))) {
      const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences[0] && featureKeywords.some(kw => sentences[0].toLowerCase().includes(kw))) {
        keyPhrases.push(sentences[0].trim());
      }
    }
  }
  return {
    trends: [...new Set(trends)].slice(0, 4),
    keyPhrases: [...new Set(keyPhrases)].slice(0, 4)
  };
}

// ── Multi-query strategy ────────────────────────────────────────────────────

/**
 * Build multiple search queries from distilled keywords for broader coverage.
 */
function buildSearchQueries(
  userPrompt: string,
  distilledKeywords?: string[],
  maxQueries = 2,
): string[] {
  const queries: string[] = [];

  // Primary query from cleaned prompt
  const cleanPrompt = userPrompt
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\b(create|make|build|add|change|update|generate|design|I want|I need|please|can you)\b/gi, '')
    .trim();

  if (cleanPrompt.length >= 5) {
    const primaryWords = cleanPrompt.split(/\s+/).slice(0, 6).join(' ');
    queries.push(`web design ${primaryWords} best practices 2025`);
  }

  // Secondary query from distilled keywords (different angle)
  if (distilledKeywords && distilledKeywords.length >= 2) {
    const kwQuery = distilledKeywords.slice(0, 4).join(' ');
    queries.push(`${kwQuery} UI UX implementation examples`);
  }

  return queries.slice(0, maxQueries);
}

/**
 * Deduplicate snippets across multiple query results using normalized prefix matching.
 */
function deduplicateSnippets(snippets: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const snippet of snippets) {
    const normalized = snippet.toLowerCase().substring(0, 50).replace(/\s+/g, ' ');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(snippet);
    }
  }
  return unique;
}

// ── Main research function ──────────────────────────────────────────────────

export async function performPromptResearch(
  userPrompt: string,
  distilledKeywords?: string[],
): Promise<ResearchResult> {
  const result: ResearchResult = { snippets: [], trends: [], keyPhrases: [], queriesUsed: [] };
  if (!userPrompt || userPrompt.length < 10) return result;

  try {
    const queries = buildSearchQueries(userPrompt, distilledKeywords);
    result.queriesUsed = queries;

    // Run queries in parallel (max 2 concurrent)
    const fetchPromises = queries.map(async (query) => {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const html = await fetchWithTimeout(ddgUrl, 4000);
      return parseDDGResults(html, 4);
    });

    const allResults = await Promise.all(fetchPromises);
    const allSnippets = deduplicateSnippets(allResults.flat());
    result.snippets = allSnippets.slice(0, 6);

    const insights = extractInsights(result.snippets);
    result.trends = insights.trends;
    result.keyPhrases = insights.keyPhrases;

    console.log(`[ai-code-assistant] Research completed: ${result.snippets.length} snippets from ${queries.length} queries`);
  } catch (error) {
    console.warn("[ai-code-assistant] Research failed (non-blocking):", error);
  }
  return result;
}

export function formatResearchContext(research: ResearchResult): string {
  if (research.snippets.length === 0) return "";
  let context = "\n\n🔬 **LIVE WEB RESEARCH CONTEXT:**\n";
  if (research.trends.length > 0) {
    context += "\n**Current Design Trends:**\n";
    for (const trend of research.trends) { context += `- ${trend}\n`; }
  }
  if (research.keyPhrases.length > 0) {
    context += "\n**Recommended Approaches:**\n";
    for (const phrase of research.keyPhrases) { context += `- ${phrase}\n`; }
  }
  if (research.snippets.length > 0) {
    context += "\n**Relevant Context:**\n";
    for (const snippet of research.snippets.slice(0, 4)) {
      const truncated = snippet.length > 150 ? snippet.substring(0, 150) + "..." : snippet;
      context += `> ${truncated}\n`;
    }
  }
  return context;
}
