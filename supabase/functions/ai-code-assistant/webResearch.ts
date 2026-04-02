/**
 * Web Research Module
 * Performs lightweight DDG scraping for design trend context.
 * Extracted from index.ts — no contract changes.
 */

export interface ResearchResult {
  snippets: string[];
  trends: string[];
  keyPhrases: string[];
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

function parseDDGResults(html: string, max = 4): string[] {
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
  const trendKeywords = ["trend", "popular", "modern", "2025", "2024", "latest", "best practice"];
  const featureKeywords = ["feature", "include", "component", "design", "layout", "responsive"];
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
    trends: [...new Set(trends)].slice(0, 3),
    keyPhrases: [...new Set(keyPhrases)].slice(0, 3)
  };
}

export async function performPromptResearch(userPrompt: string): Promise<ResearchResult> {
  const result: ResearchResult = { snippets: [], trends: [], keyPhrases: [] };
  if (!userPrompt || userPrompt.length < 10) return result;
  try {
    const cleanPrompt = userPrompt
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\b(create|make|build|add|change|update|generate|design|I want|I need|please|can you)\b/gi, '')
      .trim();
    if (cleanPrompt.length < 5) return result;
    const searchQuery = `web design ${cleanPrompt.split(/\s+/).slice(0, 5).join(' ')} best practices`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    const html = await fetchWithTimeout(ddgUrl, 4000);
    const snippets = parseDDGResults(html, 4);
    const seenSnippets = new Set<string>();
    for (const snippet of snippets) {
      const normalized = snippet.toLowerCase().substring(0, 40);
      if (!seenSnippets.has(normalized)) {
        seenSnippets.add(normalized);
        result.snippets.push(snippet);
      }
    }
    const insights = extractInsights(result.snippets);
    result.trends = insights.trends;
    result.keyPhrases = insights.keyPhrases;
    console.log(`[ai-code-assistant] Research completed: ${result.snippets.length} snippets`);
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
    for (const snippet of research.snippets.slice(0, 3)) {
      const truncated = snippet.length > 150 ? snippet.substring(0, 150) + "..." : snippet;
      context += `> ${truncated}\n`;
    }
  }
  return context;
}
