/**
 * Shared AI Edge Function Utilities (v2 - split architecture)
 *
 * Common types, constants, and helper functions used across all AI edge functions:
 *   - ai-code-assistant (code/design/review/debug)
 *   - ai-template-generator (template-json/html/react)
 *   - ai-page-generator (navPageGen)
 *   - ai-editor (editMode/surgicalEdit)
 *
 * @module aiShared
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface CodePattern {
  pattern_type: string;
  description: string | null;
  usage_count: number;
  success_rate: number;
  tags: string[] | null;
  code_snippet: string;
}

export interface ResearchResult {
  snippets: string[];
  trends: string[];
  keyPhrases: string[];
}

export type AIProviderResult =
  | { ok: true; content: string; reasoning: string }
  | { ok: false; status: number; error: string; errorType: string };

// ============================================================================
// Constants
// ============================================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================================
// Utility Functions
// ============================================================================

/** Convert hex color to HSL string (CSS format without "hsl()"). Returns "H S% L%". */
export function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Extract text content from message content (string or multimodal array). */
export function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textParts = content
      .map((p: Record<string, unknown>) => {
        if (!p || typeof p !== 'object') return '';
        if (typeof p.text === 'string') return p.text;
        if (p.type === 'text' && typeof p.text === 'string') return p.text;
        return '';
      })
      .filter(Boolean);
    return textParts.join('\n').trim();
  }
  return '';
}

/** Parse and strip <thinking>…</thinking> from a raw model response. */
export function extractThinkingTags(raw: string): { reasoning: string; content: string } {
  const match = raw.match(/^\s*<thinking>([\s\S]*?)<\/thinking>\s*/i);
  if (match) {
    return { reasoning: match[1].trim(), content: raw.slice(match[0].length).trim() };
  }
  const anyMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>\s*/i);
  if (anyMatch) {
    return {
      reasoning: anyMatch[1].trim(),
      content: raw.replace(/<thinking>[\s\S]*?<\/thinking>\s*/i, '').trim(),
    };
  }
  return { reasoning: '', content: raw };
}

// ============================================================================
// Web Research Module
// ============================================================================

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
    keyPhrases: [...new Set(keyPhrases)].slice(0, 3),
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
    console.log(`[aiShared] Research completed: ${result.snippets.length} snippets`);
  } catch (error) {
    console.warn("[aiShared] Research failed (non-blocking):", error);
  }
  return result;
}

export function formatResearchContext(research: ResearchResult): string {
  if (research.snippets.length === 0) return "";
  let context = "\n\n🔬 **LIVE WEB RESEARCH CONTEXT:**\n";
  if (research.trends.length > 0) {
    context += "\n**Current Design Trends:**\n";
    for (const trend of research.trends) context += `- ${trend}\n`;
  }
  if (research.keyPhrases.length > 0) {
    context += "\n**Recommended Approaches:**\n";
    for (const phrase of research.keyPhrases) context += `- ${phrase}\n`;
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

// ============================================================================
// Message Processing
// ============================================================================

/** Message type accepted by processMessages. */
export type AIMessage = { role: string; content: unknown };

/** Truncate message history and individual message content. */
export function processMessages(
  messages: AIMessage[],
  maxMessages = 6
): AIMessage[] {
  const truncated = messages.length > maxMessages ? messages.slice(-maxMessages) : messages;
  return truncated.map((msg) => {
    const content = msg.content;
    if (typeof content === 'string') {
      return {
        role: msg.role,
        content: content.length > 15000
          ? content.substring(0, 15000) + '\n\n[Content truncated for token limit]'
          : content,
      };
    }
    return { role: msg.role, content };
  });
}

// ============================================================================
// AI Provider Fallback Chain
// ============================================================================

/**
 * Call AI providers with 3-phase fallback:
 *   1. Lovable AI Gateway (Gemini models, GPT-5 Mini)
 *   2. Direct OpenAI API (gpt-4o-mini, gpt-4o)
 *   3. Direct Anthropic API (claude-sonnet-4-5 with extended thinking)
 */
export async function callAIProviders(
  aiMessages: { role: string; content: unknown }[],
  options: { navPageGen?: boolean; maxTokens?: number } = {}
): Promise<AIProviderResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
  const navPageGen = options.navPageGen ?? false;
  const pageTokens = options.maxTokens ?? (navPageGen ? 10000 : 32000);

  let content = '';
  let lastError = '';
  let reasoning = '';

  // Phase 1: Lovable AI Gateway
  const gatewayModels = LOVABLE_API_KEY ? [
    { id: 'google/gemini-2.5-flash', maxTokens: pageTokens, label: 'Gemini 2.5 Flash' },
    { id: 'google/gemini-2.5-pro', maxTokens: pageTokens, label: 'Gemini 2.5 Pro' },
    { id: 'openai/gpt-5-mini', maxTokens: pageTokens, label: 'GPT-5 Mini' },
  ] : [];

  for (const model of gatewayModels) {
    try {
      console.log(`[AI-Hybrid] Trying gateway model ${model.label}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.id,
          ...(model.id.startsWith('openai/') ? { max_completion_tokens: model.maxTokens } : { max_tokens: model.maxTokens }),
          messages: aiMessages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.status === 429) {
        console.warn(`[AI-Hybrid] ${model.label} rate-limited (429) — trying next provider`);
        lastError = `${model.label}: rate limited (429)`;
        continue;
      }
      if (resp.status === 402) {
        console.warn(`[AI-Hybrid] ${model.label} payment required (402) — trying next provider`);
        lastError = `${model.label}: payment required (402)`;
        continue;
      }
      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 200)}`);
        lastError = `${model.label}: ${resp.status}`;
        continue;
      }

      const responseText = await resp.text();
      if (!responseText || responseText.trim() === '') {
        lastError = `${model.label}: empty response`;
        continue;
      }

      let data;
      try { data = JSON.parse(responseText); } catch {
        lastError = `${model.label}: invalid JSON`;
        continue;
      }

      const parsed = data.choices?.[0]?.message?.content || '';
      if (!parsed) { lastError = `${model.label}: no content`; continue; }

      const extracted = extractThinkingTags(parsed);
      if (extracted.reasoning) reasoning = extracted.reasoning;
      content = extracted.content;
      console.log(`[AI-Hybrid] Success with ${model.label}`);
      break;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = `${model.label}: timeout`;
      } else {
        lastError = `${model.label}: ${err instanceof Error ? err.message : 'unknown'}`;
      }
      continue;
    }
  }

  // Phase 2: Direct OpenAI API
  if (!content) {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (OPENAI_API_KEY) {
      const openaiModels = [
        { id: 'gpt-4o-mini', maxTokens: 16000, label: 'OpenAI gpt-4o-mini' },
        { id: 'gpt-4o', maxTokens: 16000, label: 'OpenAI gpt-4o' },
      ];
      for (const model of openaiModels) {
        try {
          console.log(`[AI-Hybrid] Trying direct ${model.label}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model.id, max_completion_tokens: model.maxTokens, messages: aiMessages }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!resp.ok) {
            const errText = await resp.text();
            console.warn(`[AI-Hybrid] ${model.label} error ${resp.status}: ${errText.substring(0, 200)}`);
            lastError = `${model.label}: ${resp.status}`;
            continue;
          }
          const data = await resp.json();
          const parsed = data.choices?.[0]?.message?.content || '';
          if (!parsed) { lastError = `${model.label}: no content`; continue; }
          const extracted = extractThinkingTags(parsed);
          if (extracted.reasoning) reasoning = extracted.reasoning;
          content = extracted.content;
          console.log(`[AI-Hybrid] Success with ${model.label}`);
          break;
        } catch (err) {
          lastError = `${model.label}: ${err instanceof Error ? err.message : 'unknown'}`;
          continue;
        }
      }
    }
  }

  // Phase 3: Direct Anthropic API (claude-sonnet-4-5 with extended thinking)
  if (!content) {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (ANTHROPIC_API_KEY) {
      try {
        console.log('[AI-Hybrid] Trying direct Anthropic claude-sonnet-4-5 (extended thinking)...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const systemMsg = aiMessages.find(m => m.role === 'system')?.content || '';
        const userMsgs = aiMessages.filter(m => m.role !== 'system');
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2025-02-19',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: pageTokens > 16000 ? 32000 : pageTokens,
            ...(navPageGen ? {} : { thinking: { type: 'enabled', budget_tokens: 10000 } }),
            system: systemMsg,
            messages: userMsgs,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          const textBlock = (data.content as Array<{ type: string; text?: string; thinking?: string }> | undefined)
            ?.find(b => b.type === 'text');
          const thinkingBlocks = (data.content as Array<{ type: string; thinking?: string }> | undefined)
            ?.filter(b => b.type === 'thinking')
            .map(b => b.thinking || '')
            .filter(Boolean);
          const parsed = textBlock?.text || data.content?.[0]?.text || '';
          if (parsed) {
            if (thinkingBlocks?.length) {
              reasoning = thinkingBlocks.join('\n\n');
              content = parsed;
            } else {
              const extracted = extractThinkingTags(parsed);
              if (extracted.reasoning) reasoning = extracted.reasoning;
              content = extracted.content;
            }
            console.log('[AI-Hybrid] Success with Anthropic claude-sonnet-4-5');
          } else {
            lastError = 'Anthropic: no content';
          }
        } else {
          const errText = await resp.text();
          lastError = `Anthropic: ${resp.status} ${errText.substring(0, 100)}`;
        }
      } catch (err) {
        lastError = `Anthropic: ${err instanceof Error ? err.message : 'unknown'}`;
      }
    }
  }

  if (!content) {
    return {
      ok: false,
      status: 500,
      error: `All AI providers failed. Last error: ${lastError}. Please ensure at least one of LOVABLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY is set in your Supabase secrets.`,
      errorType: 'ai_unavailable',
    };
  }

  return { ok: true, content, reasoning };
}

// ============================================================================
// Post-Processing
// ============================================================================

/** Strip blocked config files (tailwind.config, package.json, etc.) from JSON multi-file output. */
export function stripConfigFilesFromOutput(content: string): string {
  if (!content.includes('"files"') || !content.includes('"src/App.tsx"')) return content;
  try {
    const jsonStr = content.trim().replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.files && typeof parsed.files === 'object') {
      const BLOCKED = /(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json|package-lock)/i;
      let changed = false;
      for (const key of Object.keys(parsed.files)) {
        if (BLOCKED.test(key)) {
          delete parsed.files[key];
          changed = true;
          console.log(`[aiShared] Stripped blocked file from output: ${key}`);
        }
      }
      for (const [key, val] of Object.entries(parsed.files)) {
        if ((key.endsWith('.tsx') || key.endsWith('.jsx')) && typeof val === 'string' && (val as string).includes('module.exports')) {
          parsed.files[key] = (val as string)
            .replace(/\/\/\s*tailwind\.config[^\n]*\n(?:\/\/[^\n]*\n)*\s*module\.exports\s*=\s*\{[\s\S]*?\n\};\s*/gi, '')
            .replace(/\bmodule\.exports\s*=\s*\{[\s\S]*?\n\};\s*/g, '');
          changed = true;
          console.log(`[aiShared] Stripped module.exports from: ${key}`);
        }
      }
      if (changed) return JSON.stringify(parsed);
    }
  } catch { /* not JSON, ignore */ }
  return content;
}

// ============================================================================
// Template Structure Analysis
// ============================================================================

export function analyzeTemplateStructure(code: string): string {
  if (!code) return '';
  const sections: string[] = [];
  const patterns = [
    { regex: /<header[^>]*>|class="[^"]*header[^"]*"/gi, name: 'Header/Navigation' },
    { regex: /<nav[^>]*>|class="[^"]*nav[^"]*"/gi, name: 'Navigation' },
    { regex: /class="[^"]*hero[^"]*"|id="[^"]*hero[^"]*"/gi, name: 'Hero Section' },
    { regex: /class="[^"]*feature[^"]*"|id="[^"]*feature[^"]*"/gi, name: 'Features Section' },
    { regex: /class="[^"]*about[^"]*"|id="[^"]*about[^"]*"/gi, name: 'About Section' },
    { regex: /class="[^"]*pricing[^"]*"|id="[^"]*pricing[^"]*"/gi, name: 'Pricing Section' },
    { regex: /class="[^"]*testimonial[^"]*"|id="[^"]*testimonial[^"]*"/gi, name: 'Testimonials' },
    { regex: /class="[^"]*team[^"]*"|id="[^"]*team[^"]*"/gi, name: 'Team Section' },
    { regex: /class="[^"]*contact[^"]*"|id="[^"]*contact[^"]*"|<form[^>]*>/gi, name: 'Contact/Form Section' },
    { regex: /class="[^"]*cta[^"]*"|id="[^"]*cta[^"]*"/gi, name: 'Call-to-Action' },
    { regex: /<footer[^>]*>|class="[^"]*footer[^"]*"/gi, name: 'Footer' },
    { regex: /class="[^"]*gallery[^"]*"|id="[^"]*gallery[^"]*"/gi, name: 'Gallery/Portfolio' },
    { regex: /class="[^"]*faq[^"]*"|id="[^"]*faq[^"]*"/gi, name: 'FAQ Section' },
    { regex: /class="[^"]*blog[^"]*"|id="[^"]*blog[^"]*"/gi, name: 'Blog/News Section' },
  ];
  patterns.forEach(({ regex, name }) => {
    if (regex.test(code) && !sections.includes(name)) sections.push(name);
  });
  const imageCount = (code.match(/<img[^>]*>/gi) || []).length;
  const buttonCount = (code.match(/<button[^>]*>|class="[^"]*btn[^"]*"/gi) || []).length;
  const linkCount = (code.match(/<a[^>]*href/gi) || []).length;
  return `
📊 **TEMPLATE STRUCTURE ANALYSIS:**
- Detected Sections: ${sections.length > 0 ? sections.join(', ') : 'Basic layout'}
- Images: ${imageCount} | Buttons: ${buttonCount} | Links: ${linkCount}
- Approximate Size: ${code.length} characters
`;
}

// ============================================================================
// Context Builders
// ============================================================================

export function buildSystemTypeContext(systemType: string | null): string {
  if (!systemType) return '';
  return `
[Business System Type: ${systemType}]
Generate content and features appropriate for a ${systemType} business. Consider:
- Industry-specific sections and terminology
- Relevant call-to-actions and conversion elements
- Appropriate color schemes and imagery suggestions
- Business-specific functionality (booking for services, cart for stores, etc.)
`;
}

export function buildDesignProfileContext(userDesignProfile: {
  projectCount?: number;
  dominantStyle?: string;
  industryHints?: string[];
} | null): string {
  if (!userDesignProfile) return '';
  return `
[User Design Profile - Match this established style]
- Analyzed Projects: ${userDesignProfile.projectCount || 0}
- Dominant Style: ${userDesignProfile.dominantStyle || 'mixed'}
- Industry Experience: ${userDesignProfile.industryHints?.join(', ') || 'none'}
Generate a site that matches the user's established design preferences while being unique.
`;
}

export function buildSystemsBuildContextText(systemsBuildContext: Record<string, unknown> | null, systemType: string | null, templateName: string | null): string {
  const resolvedBlueprint = systemsBuildContext ?? (systemType ? {
    identity: { industry: systemType },
    brand: { business_name: templateName ?? systemType },
  } : null);

  if (!resolvedBlueprint) return '';

  const { brand, identity, design, intents, template_sections, template_intents } = resolvedBlueprint as {
    brand?: { business_name?: string; tagline?: string; tone?: string; palette?: Record<string, string | undefined>; typography?: { heading?: string; body?: string } };
    identity?: { industry?: string; primary_goal?: string };
    design?: {
      layout?: { hero_style?: string };
      effects?: { animations?: boolean; glassmorphism?: boolean; shadows?: string };
      sections?: { include_stats?: boolean; include_testimonials?: boolean; include_faq?: boolean; include_cta_banner?: boolean; include_newsletter?: boolean; include_social_proof?: boolean };
      buttons?: { style?: string };
      content?: { writing_style?: string };
    };
    intents?: Array<{ intent: string }>;
    template_sections?: string[];
    template_intents?: string[];
  };

  const lines: string[] = ['\n[🏗️ Business Blueprint — Use for Content, Colors & Intent Wiring]'];
  if (brand?.business_name) lines.push(`Business: ${brand.business_name}`);
  if (brand?.tagline) lines.push(`Tagline: "${brand.tagline}"`);
  if (identity?.industry) lines.push(`Industry: ${identity.industry.replace(/_/g, ' ')}`);
  if (identity?.primary_goal) lines.push(`Goal: ${identity.primary_goal}`);
  if (brand?.tone) lines.push(`Tone: ${brand.tone}`);
  if (brand?.palette) {
    const p = brand.palette;
    lines.push(`Brand Colors: Primary ${p['primary'] || 'auto'} | Secondary ${p['secondary'] || 'auto'} | Accent ${p['accent'] || 'auto'} | BG ${p['background'] || 'auto'} | FG ${p['foreground'] || 'auto'}`);
  }
  if (brand?.typography) lines.push(`Typography: ${brand.typography.heading || 'auto'} (headings) / ${brand.typography.body || 'auto'} (body)`);
  if (design?.layout?.hero_style) lines.push(`Hero Layout: ${design.layout.hero_style}`);
  if (design?.effects?.glassmorphism) lines.push(`Visual FX: glassmorphism enabled`);
  if (design?.effects?.shadows) lines.push(`Shadow Style: ${design.effects.shadows}`);
  if (design?.buttons?.style) lines.push(`Button Style: ${design.buttons.style}`);
  if (design?.content?.writing_style) lines.push(`Writing Style: ${design.content.writing_style}`);
  if (design?.sections) {
    const s = design.sections;
    const included = (Object.entries(s) as [string, boolean | undefined][])
      .filter(([, v]) => v)
      .map(([k]) => k.replace('include_', '').replace(/_/g, ' '));
    if (included.length) lines.push(`Required Sections: ${included.join(', ')}`);
  }
  if (intents?.length) lines.push(`Backend Intents to Wire: ${intents.map(i => i.intent).join(', ')}`);
  if (template_sections?.length) lines.push(`Template Section Layout: ${template_sections.join(' → ')}`);
  if (template_intents?.length) lines.push(`Existing Intent Wiring: ${template_intents.join(', ')}`);
  lines.push('Apply this blueprint: use the brand colors, tone, and wire all listed intents on CTAs.');
  return lines.join('\n');
}

// ============================================================================
// Learned Patterns
// ============================================================================

export function formatLearnedPatterns(patterns: CodePattern[]): string {
  if (!patterns || patterns.length === 0) {
    return 'No learned patterns yet - but I will learn from every successful interaction!';
  }
  return patterns.map((p: CodePattern) => `
📐 **${p.pattern_type.toUpperCase()}** — ${p.description || 'N/A'}
Tags: ${(p.tags || []).join(', ')} | Used ${p.usage_count}× | ${p.success_rate}% success
\`\`\`tsx
${p.code_snippet.substring(0, 600)}${p.code_snippet.length > 600 ? '...' : ''}
\`\`\`
`).join('\n');
}

export async function fetchLearnedPatterns(supabaseUrl: string, supabaseKey: string): Promise<CodePattern[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: patterns } = await supabase
    .from('ai_code_patterns')
    .select('*')
    .order('usage_count', { ascending: false })
    .order('success_rate', { ascending: false })
    .limit(12);
  return (patterns as CodePattern[]) || [];
}

export async function saveLearnSession(
  supabaseUrl: string,
  supabaseKey: string,
  mode: string,
  userPrompt: string,
  aiResponse: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase.from('ai_learning_sessions').insert({
    session_type: mode === 'code' ? 'code_generation' : mode === 'design' ? 'design_review' : mode === 'template-react' ? 'code_generation' : 'code_review',
    user_prompt: userPrompt.substring(0, 500),
    ai_response: aiResponse.substring(0, 500),
    was_successful: true,
    technologies_used: ['React', 'TypeScript', 'Tailwind CSS'],
  });
}

// ============================================================================
// Thinking Instruction
// ============================================================================

export const THINKING_INSTRUCTION = `

[REASONING REQUIREMENT]
Before writing your final answer, reason through the problem step-by-step inside <thinking> tags.
Structure your thinking as follows:
<thinking>
1. UNDERSTAND: What exactly is the user asking for?
2. ANALYSE: What does the current code/context tell me?
3. PLAN: What approach will produce the best result?
4. CONSIDER: Are there edge cases, accessibility concerns, or performance issues?
5. DECIDE: Final plan before I write the output.
</thinking>
Write your <thinking> block FIRST, then immediately follow with your complete response (HTML/code/answer).
Never include the <thinking> block explanation text in your final output.`;

// ============================================================================
// CORS Preflight Handler
// ============================================================================

export function handleCorsOptions(): Response {
  return new Response('ok', { headers: corsHeaders });
}

// ============================================================================
// Error Response Builder
// ============================================================================

export function buildErrorResponse(error: unknown): Response {
  console.error('Error in AI edge function:', error);

  if (error instanceof Error && error.name === 'AbortError') {
    return new Response(
      JSON.stringify({ error: 'Request timed out. The AI service is taking too long. Please try again.', errorType: 'timeout' }),
      { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  let userMessage = message;
  let errorType = 'unknown';

  if (message.includes('All AI providers failed') || message.includes('All AI models failed')) {
    userMessage = 'AI service temporarily unavailable. All models are busy or experiencing issues. Please try again in a moment.';
    errorType = 'ai_unavailable';
  } else if (message.includes('network') || message.includes('fetch')) {
    userMessage = 'Network error connecting to AI service. Please check your connection and try again.';
    errorType = 'network';
  } else if (message.includes('JSON') || message.includes('parse')) {
    userMessage = 'Received invalid response from AI service. Please try again.';
    errorType = 'parse_error';
  }

  return new Response(
    JSON.stringify({ error: userMessage, errorType, details: message !== userMessage ? message : undefined }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
