/**
 * Prompt Preprocessor — normalizes messy user NL input into structured intent.
 * 
 * Handles: typos, run-on sentences, unclear grammar, code-mixed language,
 * filler words, duplicate phrasing, and implicit intent extraction.
 */

// ── Common misspellings / typos in web-dev context ──────────────────────────

const TYPO_MAP: Record<string, string> = {
  "backgroud": "background", "backround": "background", "backgorund": "background",
  "buttom": "button", "buton": "button", "botton": "button",
  "continer": "container", "containor": "container",
  "navigaton": "navigation", "naviagtion": "navigation", "navigaiton": "navigation",
  "responsve": "responsive", "reponsive": "responsive", "responisve": "responsive",
  "animaton": "animation", "animaiton": "animation",
  "compnent": "component", "componet": "component", "compoennt": "component",
  "templete": "template", "templat": "template",
  "heder": "header", "headr": "header",
  "foter": "footer", "fotter": "footer",
  "secton": "section", "seciton": "section",
  "colum": "column", "colmn": "column",
  "margn": "margin", "marign": "margin",
  "paddng": "padding", "paddin": "padding",
  "fontt": "font", "fnt": "font",
  "colr": "color", "clor": "color", "colour": "color",
  "widht": "width", "wdith": "width",
  "heigth": "height", "hight": "height",
  "dislpay": "display", "dispaly": "display",
  "flx": "flex", "flexbox": "flex",
  "grd": "grid",
  "boarder": "border", "bordr": "border",
  "shadw": "shadow", "shaodw": "shadow",
  "opactiy": "opacity", "opaciy": "opacity",
  "trasition": "transition", "transiton": "transition",
  "hovr": "hover", "hove": "hover",
  "pge": "page", "pag": "page",
  "img": "image", "imge": "image",
  "ttle": "title", "titl": "title",
  "txt": "text",
  "btn": "button",
  "nav": "navigation",
  "bg": "background",
  "pic": "picture",
  "pics": "pictures",
  "info": "information",
  "abt": "about",
  "thx": "thanks",
  "plz": "please", "pls": "please",
  "chnge": "change", "chagne": "change",
  "updte": "update", "updae": "update",
  "creat": "create", "craete": "create",
  "delet": "delete", "deleet": "delete",
  "remve": "remove", "remov": "remove",
  "modfiy": "modify", "modfy": "modify",
  "stlye": "style", "sytle": "style", "stye": "style",
  "layut": "layout", "laout": "layout", "lyout": "layout",
  "desgin": "design", "desgn": "design", "deisgn": "design",
  "websit": "website", "webiste": "website",
  "darkmode": "dark mode", "lightmode": "light mode",
  "signup": "sign up", "signin": "sign in", "logout": "log out",
};

// ── Filler/noise words to strip ─────────────────────────────────────────────

const FILLER_PATTERN = /\b(um+|uh+|like|basically|actually|just|really|very|so+|okay|ok|well|right|yeah|hey|hi|hello|please|plz|pls|thanks|thx|can you|could you|would you|i want you to|i need you to|i would like you to|go ahead and|i was wondering if you could)\b/gi;

// ── Duplicate phrase detection ──────────────────────────────────────────────

function deduplicatePhrases(text: string): string {
  // Remove repeated consecutive words: "the the" → "the"
  let cleaned = text.replace(/\b(\w+)\s+\1\b/gi, '$1');
  // Remove repeated consecutive phrases (2-4 words)
  cleaned = cleaned.replace(/\b((?:\w+\s+){1,3}\w+)\s+\1\b/gi, '$1');
  return cleaned;
}

// ── Sentence boundary normalization ─────────────────────────────────────────

function normalizeSentences(text: string): string {
  // Add period before sentence-starting words if missing punctuation
  let result = text
    .replace(/\s{2,}/g, ' ')                          // collapse whitespace
    .replace(/([a-z])\s+(I |And |But |Also |Then |Next |After |Before |Make |Add |Change |Update |Remove |Delete |Create |Fix |Move |Set |Put )/g, '$1. $2')
    .replace(/\.{2,}/g, '.')                           // collapse multiple periods
    .replace(/\s*\.\s*/g, '. ')                        // normalize period spacing
    .trim();

  // Ensure ends with period
  if (result && !/[.!?]$/.test(result)) result += '.';

  return result;
}

// ── Intent extraction ───────────────────────────────────────────────────────

export interface ExtractedIntent {
  /** Primary action verb */
  action: string;
  /** Target element/concept */
  target: string;
  /** Additional qualifiers */
  qualifiers: string[];
}

const ACTION_VERBS = [
  'add', 'create', 'make', 'build', 'generate', 'design',
  'change', 'update', 'modify', 'edit', 'adjust', 'tweak',
  'remove', 'delete', 'hide', 'disable',
  'fix', 'repair', 'debug', 'resolve',
  'move', 'reposition', 'rearrange', 'swap',
  'style', 'restyle', 'theme', 'color', 'resize',
  'animate', 'transition',
  'show', 'display', 'reveal', 'enable',
  'connect', 'wire', 'link', 'hook',
  'replace', 'substitute', 'switch',
];

const TARGET_NOUNS = [
  'header', 'footer', 'navbar', 'navigation', 'sidebar', 'menu',
  'hero', 'banner', 'section', 'card', 'button', 'link',
  'form', 'input', 'modal', 'dialog', 'popup', 'dropdown',
  'image', 'icon', 'logo', 'text', 'title', 'heading',
  'background', 'border', 'shadow', 'color', 'font',
  'page', 'layout', 'grid', 'flex', 'container',
  'animation', 'transition', 'effect', 'hover',
  'testimonial', 'pricing', 'faq', 'cta', 'contact',
  'table', 'list', 'tab', 'accordion', 'carousel', 'slider',
];

export function extractIntents(text: string): ExtractedIntent[] {
  const intents: ExtractedIntent[] = [];
  const lower = text.toLowerCase();
  const sentences = lower.split(/[.!?]+/).filter(s => s.trim().length > 3);

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    let action = '';
    let target = '';
    const qualifiers: string[] = [];

    for (const word of words) {
      if (!action && ACTION_VERBS.includes(word)) {
        action = word;
      } else if (action && !target && TARGET_NOUNS.includes(word)) {
        target = word;
      } else if (action && target) {
        qualifiers.push(word);
      }
    }

    if (action) {
      intents.push({
        action,
        target: target || 'element',
        qualifiers: qualifiers.slice(0, 5),
      });
    }
  }

  return intents;
}

// ── Keyword distillation for research ───────────────────────────────────────

export function distillSearchKeywords(text: string, maxKeywords = 8): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'out',
    'up', 'down', 'it', 'its', 'this', 'that', 'these', 'those',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
    'and', 'but', 'or', 'nor', 'not', 'so', 'very', 'just', 'also',
    'some', 'any', 'each', 'every', 'all', 'both', 'few', 'more',
    'want', 'need', 'like', 'make', 'get', 'put', 'thing', 'stuff',
  ]);

  const cleaned = text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  // Count frequency
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  // Prefer domain-specific terms and higher frequency
  const domainBoost = new Set([
    ...ACTION_VERBS, ...TARGET_NOUNS,
    'responsive', 'mobile', 'desktop', 'dark', 'light', 'modern',
    'minimal', 'gradient', 'glassmorphism', 'parallax', 'scroll',
    'accessibility', 'seo', 'performance', 'animation',
    'ecommerce', 'portfolio', 'landing', 'dashboard', 'blog',
  ]);

  return [...freq.entries()]
    .map(([word, count]) => ({
      word,
      score: count + (domainBoost.has(word) ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords)
    .map(e => e.word);
}

// ── Prompt complexity scoring ────────────────────────────────────────────────

export type PromptComplexity = "simple" | "moderate" | "complex" | "advanced";

/**
 * Scores prompt complexity on multiple axes and returns a tier.
 * Used by providerRouter to auto-select the best model.
 */
export function scorePromptComplexity(text: string, intents: ExtractedIntent[]): {
  tier: PromptComplexity;
  score: number;
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 3).length;

  // ── Length / verbosity ────────────────────────────────────────────────
  if (wordCount > 200) { score += 3; factors.push("very_long_prompt"); }
  else if (wordCount > 80) { score += 2; factors.push("long_prompt"); }
  else if (wordCount > 30) { score += 1; factors.push("medium_prompt"); }

  // ── Multi-intent (more instructions = harder to follow) ───────────────
  if (intents.length >= 5) { score += 3; factors.push("many_intents"); }
  else if (intents.length >= 3) { score += 2; factors.push("multi_intent"); }
  else if (intents.length >= 2) { score += 1; factors.push("dual_intent"); }

  // ── Multi-sentence complexity ─────────────────────────────────────────
  if (sentenceCount >= 6) { score += 2; factors.push("multi_sentence"); }
  else if (sentenceCount >= 3) { score += 1; factors.push("several_sentences"); }

  // ── Code references (inline code blocks, file names) ──────────────────
  const codeBlockCount = (text.match(/```/g) || []).length / 2;
  const inlineCodeCount = (text.match(/`[^`]+`/g) || []).length;
  if (codeBlockCount >= 2 || inlineCodeCount >= 4) { score += 2; factors.push("code_heavy"); }
  else if (codeBlockCount >= 1 || inlineCodeCount >= 1) { score += 1; factors.push("has_code"); }

  // ── Technical depth markers ───────────────────────────────────────────
  const techTerms = [
    'api', 'endpoint', 'database', 'schema', 'migration', 'middleware',
    'authentication', 'authorization', 'oauth', 'jwt', 'webhook',
    'state management', 'context', 'reducer', 'useeffect', 'usememo',
    'performance', 'optimization', 'lazy load', 'code splitting',
    'accessibility', 'aria', 'screen reader', 'wcag',
    'responsive', 'breakpoint', 'media query',
    'animation', 'transition', 'keyframe', 'framer',
    'routing', 'navigation', 'redirect', 'dynamic route',
    'typescript', 'generic', 'interface', 'type safety',
    'testing', 'unit test', 'integration test',
    'deployment', 'ci/cd', 'docker', 'serverless',
    'realtime', 'websocket', 'subscription', 'polling',
    'internationalization', 'i18n', 'localization',
    'seo', 'meta tags', 'structured data', 'json-ld',
  ];
  const techMatches = techTerms.filter(t => lower.includes(t));
  if (techMatches.length >= 5) { score += 3; factors.push("highly_technical"); }
  else if (techMatches.length >= 3) { score += 2; factors.push("technical"); }
  else if (techMatches.length >= 1) { score += 1; factors.push("some_tech"); }

  // ── Cross-concern requests (layout + logic + styling) ─────────────────
  const concernAreas = {
    layout: /\b(layout|grid|flex|position|align|center|stack|column|row)\b/i.test(text),
    logic: /\b(state|hook|handler|event|click|submit|fetch|api|function|logic|conditional|if|when)\b/i.test(text),
    styling: /\b(color|font|style|theme|dark|light|gradient|shadow|border|radius|spacing|padding|margin)\b/i.test(text),
    data: /\b(data|database|table|query|crud|form|input|validation|schema)\b/i.test(text),
    animation: /\b(animate|transition|motion|scroll|parallax|fade|slide|bounce)\b/i.test(text),
  };
  const concernCount = Object.values(concernAreas).filter(Boolean).length;
  if (concernCount >= 4) { score += 3; factors.push("cross_concern"); }
  else if (concernCount >= 3) { score += 2; factors.push("multi_concern"); }
  else if (concernCount >= 2) { score += 1; factors.push("dual_concern"); }

  // ── Ambiguity / poor grammar signals ──────────────────────────────────
  const ambiguitySignals = [
    text.split(/\s+and\s+/i).length - 1 >= 4,       // excessive conjunctions
    (text.match(/,/g) || []).length >= 6,              // run-on comma splices
    !/[.!?]/.test(text) && wordCount > 20,             // no punctuation, long
    (text.match(/\b(also|plus|another|too|as well)\b/gi) || []).length >= 3, // piling on
  ];
  const ambiguityCount = ambiguitySignals.filter(Boolean).length;
  if (ambiguityCount >= 2) { score += 2; factors.push("ambiguous_grammar"); }
  else if (ambiguityCount >= 1) { score += 1; factors.push("slightly_ambiguous"); }

  // ── Tier assignment ───────────────────────────────────────────────────
  let tier: PromptComplexity;
  if (score >= 10) tier = "advanced";
  else if (score >= 6) tier = "complex";
  else if (score >= 3) tier = "moderate";
  else tier = "simple";

  return { tier, score, factors };
}

// ── Main preprocessor ───────────────────────────────────────────────────────

export interface PreprocessedPrompt {
  /** Cleaned, normalized prompt text */
  normalized: string;
  /** Original text (untouched) */
  original: string;
  /** Extracted action intents */
  intents: ExtractedIntent[];
  /** Distilled keywords for research queries */
  searchKeywords: string[];
  /** Whether significant normalization was applied */
  wasNormalized: boolean;
  /** Structured intent summary for the AI system prompt */
  intentSummary: string;
  /** Complexity tier for model selection */
  complexity: { tier: PromptComplexity; score: number; factors: string[] };
}

export function preprocessPrompt(rawText: string): PreprocessedPrompt {
  const original = rawText;

  if (!rawText || rawText.trim().length < 3) {
    return {
      normalized: rawText,
      original,
      intents: [],
      searchKeywords: [],
      wasNormalized: false,
      intentSummary: '',
      complexity: { tier: 'simple', score: 0, factors: [] },
    };
  }

  let text = rawText;

  // 1. Fix common typos (word-boundary aware)
  for (const [typo, fix] of Object.entries(TYPO_MAP)) {
    const re = new RegExp(`\\b${typo}\\b`, 'gi');
    text = text.replace(re, fix);
  }

  // 2. Strip filler words
  text = text.replace(FILLER_PATTERN, '');

  // 3. Deduplicate repeated phrases
  text = deduplicatePhrases(text);

  // 4. Normalize sentence boundaries
  text = normalizeSentences(text);

  // 5. Collapse excess whitespace
  text = text.replace(/\s+/g, ' ').trim();

  const wasNormalized = text !== original.replace(/\s+/g, ' ').trim();

  // 6. Extract intents
  const intents = extractIntents(text);

  // 7. Distill search keywords (from original to preserve user language)
  const searchKeywords = distillSearchKeywords(original);

  // 8. Score complexity for model routing
  const complexity = scorePromptComplexity(original, intents);

  // 9. Build intent summary for AI context
  let intentSummary = '';
  if (intents.length > 0) {
    const intentLines = intents.slice(0, 5).map(i =>
      `- ${i.action.toUpperCase()} → ${i.target}${i.qualifiers.length > 0 ? ` (${i.qualifiers.join(', ')})` : ''}`
    );
    intentSummary = `\n[PARSED USER INTENTS]\n${intentLines.join('\n')}\n`;
  }

  return {
    normalized: text,
    original,
    intents,
    searchKeywords,
    wasNormalized,
    intentSummary,
    complexity,
  };
}
