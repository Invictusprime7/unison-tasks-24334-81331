/**
 * Prompt Intelligence Preprocessor
 * 
 * Parses long-form natural language into structured intent before sending to
 * the AI edge function. This enables users to write full paragraphs and have
 * the system strategically interpret scope, constraints, and priorities.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type PromptIntent =
  | 'full_generation'    // build a full page/site from scratch
  | 'surgical_edit'      // change a specific element/component
  | 'behavioral_edit'    // change functionality: add hooks, handlers, state, interactions
  | 'add_section'        // add a new section or component
  | 'remove_section'     // remove an existing section
  | 'restyle'            // change visual appearance (colors, fonts, layout)
  | 'content_update'     // change text, copy, or data content
  | 'fix_error'          // debug / fix a broken thing
  | 'wire_backend'       // connect to backend, API, database
  | 'refactor'           // restructure code without changing behavior
  | 'general'            // open-ended or ambiguous

export interface PromptConstraint {
  type: 'preserve' | 'avoid' | 'require' | 'match_theme';
  description: string;
}

export interface PromptTarget {
  element?: string;       // "the hero section", "the navbar", "the CTA button"
  file?: string;          // resolved file path if detectable
  section?: string;       // "header", "footer", "pricing"
  component?: string;     // component name if mentioned
}

export interface AnalyzedPrompt {
  /** Original user text */
  raw: string;
  /** Primary detected intent */
  intent: PromptIntent;
  /** Secondary intents (user asked for multiple things) */
  secondaryIntents: PromptIntent[];
  /** Specific targets the user mentioned */
  targets: PromptTarget[];
  /** Constraints extracted from the user's instructions */
  constraints: PromptConstraint[];
  /** Design keywords extracted */
  designKeywords: string[];
  /** Estimated complexity: simple single-change vs multi-step */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Condensed instruction for the AI (structured summary) */
  structuredDirective: string;
  /** Whether the user explicitly referenced specific files or paths */
  hasExplicitFileRefs: boolean;
  /** Extracted color/style references */
  styleRefs: string[];
}

export interface PromptEnhancementOptions {
  maxLength?: number;
  rawExcerptMax?: number;
}

function clampText(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function truncateMiddle(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 40) return clampText(value, max);

  const separator = '\n…\n';
  const remaining = max - separator.length;
  const head = Math.max(16, Math.ceil(remaining * 0.72));
  const tail = Math.max(12, remaining - head);

  return `${value.slice(0, head).trimEnd()}${separator}${value.slice(value.length - tail).trimStart()}`;
}

// ── Intent Detection ────────────────────────────────────────────────────────

const INTENT_PATTERNS: Array<{ intent: PromptIntent; patterns: RegExp[] }> = [
  {
    intent: 'full_generation',
    patterns: [
      /\b(build|create|generate|make|design)\b.*\b(full|entire|complete|whole|new)\b.*\b(page|site|website|landing|template|app)\b/i,
      /\b(from scratch|start fresh|brand new|blank slate)\b/i,
      /\b(full control|full reign|revamp|overhaul|reimagine)\b/i,
    ],
  },
  {
    intent: 'fix_error',
    patterns: [
      /\b(fix|debug|resolve|repair|broken|crash|error|bug|not working|fails|failing|issue|problem)\b/i,
      /\b(TypeError|ReferenceError|SyntaxError|Cannot read|undefined is not|null reference)\b/i,
    ],
  },
  {
    intent: 'wire_backend',
    patterns: [
      /\b(connect|hook up|integrate|wire|link|bind|attach)\b.*\b(api|backend|database|supabase|endpoint|server)\b/i,
      /\b(submit|send data|save data|fetch|post|get request|mutation)\b.*\b(to|from|api|backend|server)\b/i,
    ],
  },
  {
    intent: 'add_section',
    patterns: [
      /\b(add|insert|include|create|put|place|append)\b.*\b(section|element|component|widget|block|card|row|column|feature|testimonial|pricing|faq|hero|footer|header|nav|sidebar|modal|form|gallery|carousel)\b/i,
    ],
  },
  {
    intent: 'remove_section',
    patterns: [
      /\b(remove|delete|hide|get rid of|take out|drop|eliminate|strip)\b.*\b(section|element|component|widget|block|card)\b/i,
    ],
  },
  {
    intent: 'restyle',
    patterns: [
      /\b(restyle|redesign|new look|change color|change style|recolor|theme|rebrand|aesthetic|visual)\b/i,
      /\b(make it|should be|change to|switch to)\b.*\b(dark|light|modern|minimal|bold|elegant|playful|professional|earthy|warm|cool|neon|pastel|muted|vibrant)\b/i,
      /\b(color|font|typography|spacing|padding|margin|border|shadow|gradient|rounded|animation|transition)\b/i,
    ],
  },
  {
    intent: 'content_update',
    patterns: [
      /\b(change|update|replace|modify|edit)\b.*\b(text|copy|heading|title|description|paragraph|label|placeholder|content|wording)\b/i,
      /\b(say|read|display|show)\b.*["'`]/i,
    ],
  },
  {
    intent: 'behavioral_edit',
    patterns: [
      /\b(make|when|on)\b.*\b(click|clicked|press|pressed|tap|tapped|hover|submit|open|close|toggle|expand|collapse|trigger)\b/i,
      /\b(add|create|implement|build|wire)\b.*\b(functionality|behavior|interaction|handler|event|listener|state|hook|toggle|counter|timer|animation|widget|modal|drawer|dropdown|popup|tooltip|chat|form handling)\b/i,
      /\b(open|show|display|reveal|launch|activate|trigger)\b.*\b(a|an|the|new)?\s*(modal|dialog|drawer|sidebar|panel|menu|dropdown|popup|widget|overlay|chat|notification|toast)\b/i,
      /\b(should|needs to|must|will)\b.*\b(open|close|toggle|expand|collapse|submit|navigate|scroll|fetch|load|count|track|animate)\b/i,
      /\badd\b.*\b(onclick|onsubmit|onchange|onkeydown|event)\b/i,
      /\b(collapsible|expandable|toggleable|draggable|sortable|dismissable|interactive)\b/i,
    ],
  },
  {
    intent: 'surgical_edit',
    patterns: [
      /\b(change|modify|update|edit|adjust|tweak|fix|move|swap|reposition|resize|enlarge|shrink|center|align)\b.*\b(the|this|that|my)\b/i,
      /\b(increase|decrease|make the|make it|set the|set it|should be|needs to be)\b/i,
    ],
  },
  {
    intent: 'refactor',
    patterns: [
      /\b(refactor|clean up|simplify|optimize|split|extract|reorganize|modularize|separate)\b/i,
    ],
  },
];

function detectIntents(text: string): { primary: PromptIntent; secondary: PromptIntent[] } {
  const matched: PromptIntent[] = [];

  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      matched.push(intent);
    }
  }

  if (matched.length === 0) return { primary: 'general', secondary: [] };

  // Priority order for primary selection
  const priority: PromptIntent[] = [
    'full_generation', 'fix_error', 'wire_backend', 'add_section',
    'remove_section', 'restyle', 'content_update', 'surgical_edit', 'refactor',
  ];

  const primary = priority.find(p => matched.includes(p)) || matched[0];
  const secondary = matched.filter(m => m !== primary);

  return { primary, secondary };
}

// ── Target Extraction ───────────────────────────────────────────────────────

const SECTION_KEYWORDS = [
  'hero', 'header', 'navbar', 'nav', 'navigation', 'footer', 'sidebar',
  'pricing', 'testimonial', 'faq', 'contact', 'about', 'features', 'services',
  'gallery', 'portfolio', 'team', 'cta', 'call to action', 'banner',
  'form', 'login', 'signup', 'checkout', 'cart', 'menu', 'breadcrumb',
];

function extractTargets(text: string): PromptTarget[] {
  const targets: PromptTarget[] = [];
  const lower = text.toLowerCase();

  // Detect section references
  for (const kw of SECTION_KEYWORDS) {
    const pattern = new RegExp(`\\b(?:the\\s+)?${kw}\\s*(?:section|area|block|component|part)?\\b`, 'i');
    if (pattern.test(lower)) {
      targets.push({ section: kw, element: `${kw} section` });
    }
  }

  // Detect specific element references
  const elementPatterns: Array<[RegExp, string]> = [
    [/\b(?:the\s+)?(?:main\s+)?(?:cta|call[\s-]to[\s-]action)\s*button\b/i, 'CTA button'],
    [/\b(?:the\s+)?logo\b/i, 'logo'],
    [/\b(?:the\s+)?background(?:\s+image)?\b/i, 'background'],
    [/\b(?:the\s+)?title\b/i, 'title'],
    [/\b(?:the\s+)?subtitle\b/i, 'subtitle'],
    [/\b(?:the\s+)?heading\b/i, 'heading'],
  ];

  for (const [pattern, name] of elementPatterns) {
    if (pattern.test(text)) {
      targets.push({ element: name });
    }
  }

  // Detect file path references
  const fileRefs = text.match(/(?:\/src\/|\.\/|\.tsx|\.jsx|\.ts|\.css)[^\s,)]+/g);
  if (fileRefs) {
    for (const ref of fileRefs) {
      targets.push({ file: ref });
    }
  }

  return targets;
}

// ── Constraint Extraction ───────────────────────────────────────────────────

function extractConstraints(text: string): PromptConstraint[] {
  const constraints: PromptConstraint[] = [];
  const lower = text.toLowerCase();

  // "keep/preserve/don't change X"
  const preservePatterns = [
    /(?:keep|preserve|maintain|don't\s+(?:change|modify|touch|remove|delete))\s+(.+?)(?:\.|,|$)/gi,
    /(?:leave|do not alter)\s+(.+?)(?:\.|,|$)/gi,
    /(?:everything else|the rest|other (?:sections?|parts?|elements?))\s+(?:should\s+)?(?:stay|remain)\s+(?:the same|unchanged|intact)/gi,
  ];
  for (const p of preservePatterns) {
    const matches = text.matchAll(p);
    for (const m of matches) {
      constraints.push({ type: 'preserve', description: m[1]?.trim() || 'existing layout' });
    }
  }

  // "avoid/no/don't use X"
  const avoidPatterns = [
    /(?:avoid|don't use|no|never|without)\s+(.+?)(?:\.|,|$)/gi,
  ];
  for (const p of avoidPatterns) {
    const matches = text.matchAll(p);
    for (const m of matches) {
      const desc = m[1]?.trim();
      if (desc && desc.length > 2 && desc.length < 100) {
        constraints.push({ type: 'avoid', description: desc });
      }
    }
  }

  // "must have/ensure/require X"
  const requirePatterns = [
    /(?:must have|ensure|require|needs? to have|should include|make sure)\s+(.+?)(?:\.|,|$)/gi,
  ];
  for (const p of requirePatterns) {
    const matches = text.matchAll(p);
    for (const m of matches) {
      constraints.push({ type: 'require', description: m[1]?.trim() || '' });
    }
  }

  // "match/follow the existing theme/style"
  if (/\b(match|follow|consistent with|same as|align with)\b.*\b(theme|style|design|brand|palette|existing)\b/i.test(lower)) {
    constraints.push({ type: 'match_theme', description: 'match existing design system' });
  }

  return constraints.filter(c => c.description.length > 0);
}

// ── Design Keyword Extraction ───────────────────────────────────────────────

function extractDesignKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\b(dark mode|dark theme|dark)\b/i, 'dark'],
    [/\b(light mode|light theme|light)\b/i, 'light'],
    [/\b(modern|contemporary)\b/i, 'modern'],
    [/\b(minimal|minimalist|clean)\b/i, 'minimal'],
    [/\b(bold|dramatic|striking)\b/i, 'bold'],
    [/\b(elegant|sophisticated|refined|luxury)\b/i, 'elegant'],
    [/\b(playful|fun|whimsical)\b/i, 'playful'],
    [/\b(professional|corporate|business)\b/i, 'professional'],
    [/\b(earthy|natural|organic|warm tones)\b/i, 'earthy'],
    [/\b(neon|cyber|futuristic|sci-fi)\b/i, 'futuristic'],
    [/\b(retro|vintage|nostalgic)\b/i, 'retro'],
    [/\b(glassmorphism|glass effect)\b/i, 'glassmorphism'],
    [/\b(neumorphism|soft ui)\b/i, 'neumorphism'],
    [/\b(gradient|gradients)\b/i, 'gradient'],
    [/\b(rounded|pill|soft corners)\b/i, 'rounded'],
    [/\b(flat|flat design)\b/i, 'flat'],
    [/\b(brutalist|raw|exposed)\b/i, 'brutalist'],
  ];

  for (const [pattern, keyword] of patterns) {
    if (pattern.test(text)) keywords.push(keyword);
  }
  return keywords;
}

// ── Style Reference Extraction ──────────────────────────────────────────────

function extractStyleRefs(text: string): string[] {
  const refs: string[] = [];

  // Hex colors
  const hexColors = text.match(/#[0-9a-fA-F]{3,8}\b/g);
  if (hexColors) refs.push(...hexColors);

  // RGB/HSL
  const colorFns = text.match(/(?:rgb|hsl)a?\([^)]+\)/gi);
  if (colorFns) refs.push(...colorFns);

  // Named color references
  const namedColors = text.match(/\b(red|blue|green|orange|purple|pink|teal|cyan|indigo|amber|emerald|rose|slate|stone|zinc|gray|navy|maroon|gold|silver|coral|salmon|turquoise|lavender|ivory|beige|tan|cream|olive)\b/gi);
  if (namedColors) refs.push(...new Set(namedColors.map(c => c.toLowerCase())));

  // Font references
  const fontMatch = text.match(/\b(?:use|with|in)\s+(?:the\s+)?([\w\s]+?)\s+font\b/i);
  if (fontMatch) refs.push(`font: ${fontMatch[1].trim()}`);

  return refs;
}

// ── Complexity Estimation ───────────────────────────────────────────────────

function estimateComplexity(
  intents: { primary: PromptIntent; secondary: PromptIntent[] },
  targets: PromptTarget[],
  constraints: PromptConstraint[],
  textLength: number
): 'simple' | 'moderate' | 'complex' {
  let score = 0;

  // Multiple intents = more complex
  score += intents.secondary.length;

  // Full generation is inherently complex
  if (intents.primary === 'full_generation') score += 3;
  if (intents.primary === 'wire_backend') score += 2;

  // Multiple targets
  score += Math.min(targets.length, 3);

  // Many constraints
  score += Math.min(constraints.length, 2);

  // Long text suggests detailed request
  if (textLength > 500) score += 1;
  if (textLength > 1000) score += 1;

  if (score <= 1) return 'simple';
  if (score <= 4) return 'moderate';
  return 'complex';
}

// ── Structured Directive Builder ────────────────────────────────────────────

function buildStructuredDirective(analysis: Omit<AnalyzedPrompt, 'structuredDirective'>): string {
  const lines: string[] = [];

  lines.push(`[PROMPT ANALYSIS]`);
  lines.push(`Intent: ${analysis.intent}${analysis.secondaryIntents.length ? ` (+${analysis.secondaryIntents.join(', ')})` : ''}`);
  lines.push(`Complexity: ${analysis.complexity}`);

  if (analysis.targets.length > 0) {
    const targetDescs = analysis.targets.slice(0, 6).map(t =>
      [t.section, t.element, t.component, t.file].filter(Boolean).join('/')
    ).filter(Boolean).map(target => clampText(target, 80));
    const overflow = analysis.targets.length - targetDescs.length;
    lines.push(`Targets: ${targetDescs.join(', ')}${overflow > 0 ? ` (+${overflow} more)` : ''}`);
  }

  if (analysis.designKeywords.length > 0) {
    const keywords = analysis.designKeywords.slice(0, 8);
    lines.push(`Design direction: ${keywords.join(', ')}${analysis.designKeywords.length > keywords.length ? '…' : ''}`);
  }

  if (analysis.styleRefs.length > 0) {
    const refs = analysis.styleRefs.slice(0, 8).map(ref => clampText(ref, 40));
    lines.push(`Style refs: ${refs.join(', ')}${analysis.styleRefs.length > refs.length ? '…' : ''}`);
  }

  if (analysis.constraints.length > 0) {
    for (const c of analysis.constraints.slice(0, 6)) {
      const prefix = c.type === 'preserve' ? '🔒 KEEP' :
                     c.type === 'avoid' ? '🚫 AVOID' :
                     c.type === 'require' ? '✅ REQUIRE' : '🎨 MATCH';
      lines.push(`${prefix}: ${clampText(c.description, 120)}`);
    }
    if (analysis.constraints.length > 6) {
      lines.push(`✅ REQUIRE: honor the remaining ${analysis.constraints.length - 6} user constraints as well`);
    }
  }

  return lines.join('\n');
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Analyze a natural language prompt and extract structured intent, targets,
 * constraints, and design direction. The structured directive is prepended
 * to the user message before sending to the AI edge function.
 */
export function analyzePrompt(rawText: string): AnalyzedPrompt {
  const intents = detectIntents(rawText);
  const targets = extractTargets(rawText);
  const constraints = extractConstraints(rawText);
  const designKeywords = extractDesignKeywords(rawText);
  const styleRefs = extractStyleRefs(rawText);
  const hasExplicitFileRefs = targets.some(t => !!t.file);
  const complexity = estimateComplexity(intents, targets, constraints, rawText.length);

  const partial: Omit<AnalyzedPrompt, 'structuredDirective'> = {
    raw: rawText,
    intent: intents.primary,
    secondaryIntents: intents.secondary,
    targets,
    constraints,
    designKeywords,
    complexity,
    hasExplicitFileRefs,
    styleRefs,
  };

  return {
    ...partial,
    structuredDirective: buildStructuredDirective(partial),
  };
}

/**
 * Enhance a user prompt with structured intelligence.
 * For short/simple prompts, returns the original text unchanged.
 * For rich paragraphs, prepends a structured analysis block.
 */
export function enhancePromptForAI(rawText: string, options: PromptEnhancementOptions = {}): {
  enhancedPrompt: string;
  analysis: AnalyzedPrompt;
  isSurgical: boolean;
  isFullGen: boolean;
} {
  const analysis = analyzePrompt(rawText);
  const maxLength = Math.max(1200, options.maxLength ?? 8500);
  const rawExcerptMax = Math.max(600, options.rawExcerptMax ?? 5000);

  // For very short prompts (< 30 chars), skip enhancement
  if (rawText.length < 30 && analysis.complexity === 'simple' && rawText.length <= maxLength) {
    return {
      enhancedPrompt: rawText,
      analysis,
      isSurgical: analysis.intent === 'surgical_edit' || analysis.intent === 'content_update',
      isFullGen: analysis.intent === 'full_generation',
    };
  }

  const directiveBudget = Math.max(700, Math.min(2200, Math.floor(maxLength * 0.42)));
  const directive = truncateMiddle(analysis.structuredDirective, directiveBudget);
  const requestHeader = '[USER REQUEST]\n';
  const availableForRaw = Math.max(0, maxLength - directive.length - requestHeader.length - 2);
  const requestBody = availableForRaw > 0
    ? truncateMiddle(rawText, Math.min(rawExcerptMax, availableForRaw))
    : '';
  const enhanced = requestBody
    ? `${directive}\n\n${requestHeader}${requestBody}`
    : directive;

  return {
    enhancedPrompt: enhanced,
    analysis,
    isSurgical: ['surgical_edit', 'content_update', 'restyle', 'add_section', 'remove_section'].includes(analysis.intent),
    isFullGen: analysis.intent === 'full_generation',
  };
}
