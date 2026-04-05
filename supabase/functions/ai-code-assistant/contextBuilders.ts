/**
 * Context Builders
 * Constructs prompt context blocks from request fields.
 * Extracted from index.ts — no contract changes.
 */

import { hexToHsl } from "./utils.ts";

// ── System type context ──────────────────────────────────────────────────────

export function buildSystemTypeContext(systemType?: string): string {
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

// ── Design profile context ───────────────────────────────────────────────────

export function buildDesignProfileContext(userDesignProfile?: {
  projectCount?: number;
  dominantStyle?: string;
  industryHints?: string[];
}): string {
  if (!userDesignProfile) return '';
  return `
[User Design Profile - Match this established style]
- Analyzed Projects: ${userDesignProfile.projectCount || 0}
- Dominant Style: ${userDesignProfile.dominantStyle || 'mixed'}
- Industry Experience: ${userDesignProfile.industryHints?.join(', ') || 'none'}
Generate a site that matches the user's established design preferences while being unique.
`;
}

// ── Systems build context (blueprint) ────────────────────────────────────────

export function buildSystemsBlueprintContext(systemsBuildContext: unknown): string {
  const resolvedBlueprint = systemsBuildContext ?? null;
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

// ── Template structure analysis ──────────────────────────────────────────────

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
    if (regex.test(code) && !sections.includes(name)) {
      sections.push(name);
    }
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

// ── Elements library block ───────────────────────────────────────────────────

export function buildElementsLibraryBlock(siteElementsLibraryContext: unknown, surgicalEdit: boolean): string {
  if (!siteElementsLibraryContext || surgicalEdit) return '';
  return `\n${siteElementsLibraryContext}\n⚠️ LIBRARY USAGE RULE: The element library above provides STRUCTURE and INTENT WIRING patterns only. For colors, fonts, gradients, card styles, and visual effects, follow the industry variation system, design profile, and brand palette provided elsewhere in this prompt. Do NOT copy visual styles from the library skeletons — create a UNIQUE design each time.\n`;
}

// ── VFS files context ────────────────────────────────────────────────────────

export function buildVfsFilesContext(surgicalEdit: boolean, vfsFiles?: Record<string, string>): string {
  if (!surgicalEdit || !vfsFiles || Object.keys(vfsFiles).length === 0) return '';
  
  const vfsEntries = Object.entries(vfsFiles);
  const sorted = vfsEntries.sort(([a], [b]) => {
    const aReact = /\.(tsx|jsx)$/.test(a) ? 0 : 1;
    const bReact = /\.(tsx|jsx)$/.test(b) ? 0 : 1;
    return aReact - bReact;
  });
  let totalChars = 0;
  const MAX_VFS_CHARS = 80_000;
  const included: string[] = [];
  for (const [path, content] of sorted) {
    if (totalChars + content.length > MAX_VFS_CHARS) continue;
    included.push(`--- FILE: ${path} ---\n${content}\n--- END FILE ---`);
    totalChars += content.length;
  }
  if (included.length === 0) return '';
  return `\n\n📁 CURRENT PROJECT FILES (${included.length} files):\n${included.join('\n\n')}`;
}

// ── Fast-path wizard prompt ──────────────────────────────────────────────────

export function buildFastPathSystemPrompt(opts: {
  systemsBuildContext: Record<string, any>;
  templateName?: string;
  source?: string;
}): string {
  const bp = opts.systemsBuildContext;
  const brandName = bp?.brand?.business_name || opts.templateName || 'My Business';
  const industry = bp?.identity?.industry || opts.source || 'professional services';
  const tone = bp?.brand?.tone || 'professional and friendly';
  const palette = bp?.brand?.palette || {};
  const sections = bp?.template_sections || ['hero', 'services', 'about', 'testimonials', 'cta', 'contact', 'footer'];
  const intents = (bp?.intents || []).map((i: any) => i.intent).join(', ') || 'contact.submit, booking.create';

  const toHsl = (hex: string | undefined, fallback: string): string => {
    if (!hex) return fallback;
    try { return hexToHsl(hex); } catch { return fallback; }
  };
  const primaryHsl = toHsl(palette.primary, '221.2 83.2% 53.3%');
  const secondaryHsl = toHsl(palette.secondary, '160 84.1% 39.4%');
  const accentHsl = toHsl(palette.accent, '38 92.1% 50.2%');
  const backgroundHsl = toHsl(palette.background, '222.2 84% 4.9%');
  const foregroundHsl = toHsl(palette.foreground, '210 40% 98%');

  return `You are an elite React developer. Generate a COMPLETE, premium single-page website as a React application.

BUSINESS: "${brandName}" — ${industry}
TONE: ${tone}
SECTIONS: ${sections.join(' → ')}
INTENTS TO WIRE: ${intents}

BRAND COLORS — HSL values for CSS custom properties (no hsl() wrapper, just the values):
--primary: ${primaryHsl}
--primary-foreground: 210 40% 98%
--secondary: ${secondaryHsl}
--secondary-foreground: 210 40% 98%
--accent: ${accentHsl}
--accent-foreground: 210 40% 98%
--background: ${backgroundHsl}
--foreground: ${foregroundHsl}
--muted: 217.2 32.6% 17.5%
--muted-foreground: 215 20.2% 65.1%
--border: 217.2 32.6% 17.5%
--card: 222.2 84% 4.9%
--card-foreground: 210 40% 98%
--ring: 224.3 76.3% 48%
--radius: 0.75rem

RULES:
1. Output ONLY valid JSON: {"files": {"src/App.tsx": "...", "src/index.css": "..."}}
2. App.tsx: SINGLE FILE, ALL sections inline, starts with: import React, { useState } from 'react';
3. Use ONLY these imports: react, lucide-react, framer-motion (optional). NO other imports. NO ./components/ or ./pages/ imports.
4. In App.tsx use Tailwind classes with semantic tokens: bg-primary, text-foreground, bg-muted, etc.
5. For custom colors reference CSS vars: style={{ color: 'hsl(var(--primary))' }}
6. Wire CTAs with data-ut-intent attributes: data-ut-intent="booking.create", data-ut-intent="contact.submit"
7. Navigation anchor links: <a href="#sectionId" data-ut-intent="nav.anchor">
8. Images: use ONLY these VERIFIED Unsplash URLs (they are guaranteed to load):
   HERO/BACKGROUND by industry:
   - Restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"
   - Salon/Beauty: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"
   - Fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
   - Medical: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80"
   - SaaS/Tech: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
   - Ecommerce: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
   - Portfolio: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80"
   - Contractor: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80"
   - Agency: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
   - Coaching: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
   PEOPLE (for testimonials, team): "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80"
   NEVER construct URLs with template literals or arithmetic. Always use plain static strings.
9. index.css MUST contain: @tailwind base; @tailwind components; @tailwind utilities; then :root { } with ALL the HSL variables above
10. MINIMUM 7 distinct sections, each with rich content
11. Dark theme, premium glassmorphism + gradient effects, responsive (sm:/md:/lg:)
12. export default function App() — must be the default export
13. NO markdown, NO explanations, NO code fences — ONLY the raw JSON object
14. CONTRAST RULE: --foreground MUST be visually distinct from --background. If background is dark (lightness < 30%), foreground MUST be light (lightness > 80%). If background is light (lightness > 70%), foreground MUST be dark (lightness < 25%). Same rule applies to --card vs --card-foreground, --primary vs --primary-foreground. NEVER make text invisible.
15. LUCIDE ICONS — only use these VERIFIED icon names: Menu, X, ChevronDown, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Star, Heart, Phone, Mail, MapPin, Clock, Calendar, Check, CheckCircle, CheckCircle2, Circle, Plus, Minus, Search, Settings, User, Users, Home, Building, Briefcase, Award, Shield, Zap, Sparkles, Sun, Moon, Eye, Camera, Image, Play, Pause, Volume2, MessageCircle, MessageSquare, Send, Share2, ExternalLink, Download, Upload, RefreshCw, RotateCw, Trash2, Edit, Copy, Bookmark, Flag, Bell, Lock, Unlock, Key, Globe, Wifi, Database, Server, Code, Terminal, GitBranch, Package, Layers, Layout, Grid, List, Filter, BarChart3, TrendingUp, DollarSign, CreditCard, ShoppingCart, ShoppingBag, Truck, Gift, Coffee, Utensils, Scissors, Palette, PenTool, Ruler, Wrench, Hammer, Stethoscope, GraduationCap, BookOpen, Lightbulb, Target, Rocket, Crown, Gem, Flame, Leaf, Droplets, Mountain, Waves, Music, Video, Pin, Radio, AtSign, CloudRain, Rss, Slack, Twitch, Dribbble, Figma, Chrome, Instagram, Facebook, Twitter, Linkedin, Youtube, Github
   SOCIAL MEDIA SUBSTITUTIONS (these do NOT exist in lucide-react — use the substitute): TikTok→Music, Pinterest→Pin, Snapchat→Camera, WhatsApp→MessageCircle, Telegram→Send, Discord→MessageSquare, Reddit→MessageCircle, Spotify→Music, Threads→AtSign, Signal→Radio, Vimeo→Video, Behance→Palette, Medium→BookOpen.
   If you need an icon not in this list, use a CLOSE MATCH from the list above. NEVER guess icon names.
16. FRAMER MOTION — only use { motion, AnimatePresence } from 'framer-motion'. Do NOT import useAnimation, useInView, useScroll, or other hooks from framer-motion. For scroll animations, use Intersection Observer via React useEffect + useRef instead.`;
}
