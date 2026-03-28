/**
 * Generation Contract — Single Source of Truth
 *
 * Defines ALL available libraries, CSS utilities, and design patterns
 * that BOTH the AI edge function and the deterministic siteGenerator
 * can use. The Sandpack preview environment is configured to support
 * every library listed here.
 *
 * When adding a new library:
 *   1. Add to SANDPACK_DEPENDENCIES below
 *   2. Add to ALLOWED_IMPORTS in sandpackFilePrep.ts
 *   3. Add to KNOWN_VERSIONS in dependencyExtractor.ts
 *   4. Reference in AVAILABLE_LIBRARIES_PROMPT for AI
 */

// ============================================================================
// Sandpack Dependencies — exact versions for preview stability
// ============================================================================

export const SANDPACK_DEPENDENCIES: Record<string, string> = {
  react: '^18.2.0',
  'react-dom': '^18.2.0',
  'react-router-dom': '^6.20.0',
  'lucide-react': 'latest',
  'framer-motion': 'latest',
  clsx: 'latest',
  'tailwind-merge': 'latest',
  'class-variance-authority': 'latest',
  '@radix-ui/react-slot': 'latest',
  recharts: 'latest',
  'date-fns': 'latest',
};

// ============================================================================
// Allowed NPM imports (Sandpack module whitelist)
// ============================================================================

export const ALLOWED_NPM_IMPORTS = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'react-router-dom',
  'lucide-react',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  '@radix-ui/react-slot',
  'framer-motion',
  'date-fns',
  'recharts',
]);

// ============================================================================
// Premium CSS utility classes — injected into index.css by BOTH paths
// ============================================================================

export const PREMIUM_CSS_UTILITIES = `
/* ═══ Glass & Surface Effects ═══ */
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.glass-card { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; }
.glass-light { background: rgba(255,255,255,0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0,0,0,0.08); }
.nav-blur { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.08); }

/* ═══ Gradient Utilities ═══ */
.gradient-text { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent, var(--secondary))) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.gradient-primary { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%); }
.gradient-hero { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 50%, hsl(var(--accent, var(--primary))) 100%); }
.gradient-subtle { background: linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%); }

/* ═══ Button Patterns ═══ */
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-weight: 600; padding: 0.75rem 1.5rem; border-radius: var(--radius, 0.5rem); transition: all 0.2s ease; border: none; cursor: pointer; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 14px hsl(var(--primary) / 0.3); }
.btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); font-weight: 600; padding: 0.75rem 1.5rem; border-radius: var(--radius, 0.5rem); transition: all 0.2s ease; border: none; cursor: pointer; }
.btn-secondary:hover { opacity: 0.9; }
.btn-outline { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; background: transparent; color: hsl(var(--foreground)); font-weight: 600; padding: 0.75rem 1.5rem; border-radius: var(--radius, 0.5rem); border: 2px solid hsl(var(--border)); transition: all 0.2s ease; cursor: pointer; }
.btn-outline:hover { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }

/* ═══ Animation & Motion ═══ */
.hover-lift { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
.hover-scale { transition: transform 0.2s ease; }
.hover-scale:hover { transform: scale(1.02); }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-left { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slide-in-right { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
.animate-fade-in-up { opacity: 0; animation: fade-in-up 0.6s ease forwards; }
.animate-fade-in { opacity: 0; animation: fade-in 0.5s ease forwards; }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; } .stagger-4 { animation-delay: 0.4s; } .stagger-5 { animation-delay: 0.5s; }

/* ═══ Shadow Elevations ═══ */
.shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
.shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); }
.shadow-elevation { box-shadow: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1); }

/* ═══ Typography Scale ═══ */
.headline-xl { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
.headline-lg { font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; }
.headline-md { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; line-height: 1.3; }
.body-lg { font-size: 1.125rem; line-height: 1.7; }
.body-md { font-size: 1rem; line-height: 1.6; }
.caption { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }

/* ═══ Layout Utilities ═══ */
.section-spacing { padding: 5rem 1rem; }
.section-spacing-lg { padding: 7rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.container-narrow { max-width: 900px; margin: 0 auto; padding: 0 1rem; }

/* ═══ Card Patterns ═══ */
.card-elevated { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius, 0.75rem); padding: 2rem; transition: all 0.3s ease; }
.card-elevated:hover { border-color: hsl(var(--primary) / 0.3); box-shadow: 0 8px 30px hsl(var(--primary) / 0.1); transform: translateY(-4px); }

/* ═══ Badge ═══ */
.badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }

/* ═══ Dividers ═══ */
.divider-gradient { height: 1px; background: linear-gradient(90deg, transparent, hsl(var(--border)), transparent); border: none; }

/* ═══ Intent feedback ═══ */
.intent-loading { opacity: 0.6; pointer-events: none; cursor: wait; }
.intent-success { animation: intent-pulse 0.3s ease-out; }
@keyframes intent-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
`;

// ============================================================================
// Available Libraries Prompt — shared by BOTH AI generation paths
// ============================================================================

export const AVAILABLE_LIBRARIES_PROMPT = `
## AVAILABLE LIBRARIES (pre-installed in preview — USE THEM):

### Icons:
\`\`\`tsx
import { Star, ArrowRight, Check, Phone, Mail, MapPin, Clock, Users, Heart, Shield, Zap, Menu, X, ChevronDown, ChevronRight, Quote, Calendar, Sparkles, TrendingUp, Award, Target } from "lucide-react";
\`\`\`
Use Lucide icons extensively — they are ALWAYS available. Use semantic icons for every feature card, testimonial, stat, and navigation element.

### Animations (framer-motion):
\`\`\`tsx
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion";

// Scroll-triggered reveal
const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: "-100px" });
<motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>

// Staggered children
<motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
\`\`\`
USE framer-motion for: hero entrance animations, scroll-triggered section reveals, staggered card grids, hover effects, page transitions, and counter animations.

### Charts (recharts):
\`\`\`tsx
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
\`\`\`
Use for: stats sections, pricing comparisons, growth metrics, progress indicators.

### Utilities:
\`\`\`tsx
import { cn } from "@/lib/utils";  // Tailwind class merging (clsx + tailwind-merge)
\`\`\`

### Tailwind CSS:
Full Tailwind CSS is available via CDN with ALL utility classes. The theme's CSS variables are mapped to Tailwind:
- \`bg-primary\`, \`text-primary\`, \`border-primary\` → hsl(var(--primary))
- \`bg-secondary\`, \`bg-muted\`, \`bg-accent\`, \`bg-card\`, \`bg-background\`
- \`text-foreground\`, \`text-muted-foreground\`, \`text-primary-foreground\`
- \`rounded-lg\` / \`rounded-xl\` → uses var(--radius)
Use responsive prefixes: sm:, md:, lg:, xl:

### Premium CSS Utilities (pre-injected in index.css):
Available classes: .glass, .glass-card, .glass-light, .nav-blur, .gradient-text, .gradient-primary, .gradient-hero,
.btn-primary, .btn-secondary, .btn-outline, .hover-lift, .hover-scale, .animate-fade-in-up, .animate-fade-in,
.stagger-1 through .stagger-5, .shadow-elevation, .headline-xl, .headline-lg, .headline-md,
.body-lg, .body-md, .caption, .section-spacing, .container-wide, .container-narrow,
.card-elevated, .badge, .divider-gradient
`;

// ============================================================================
// Unified Component Patterns — shared prompt for both AI paths
// ============================================================================

export const COMPONENT_PATTERNS_PROMPT = `
## COMPONENT PATTERNS (ALL INLINE in App.tsx):

### Button with Intent:
\`\`\`tsx
<button className="btn-primary" data-ut-intent="booking.create">
  <Calendar className="w-4 h-4" /> Book Now
</button>
\`\`\`

### Section with Scroll Reveal:
\`\`\`tsx
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} id={id} className={cn("section-spacing", className)}
      initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}>
      <div className="container-wide">{children}</div>
    </motion.section>
  );
}
\`\`\`

### Feature Card:
\`\`\`tsx
<motion.div className="card-elevated hover-lift" variants={cardVariants}>
  <div className="badge mb-4"><Zap className="w-3 h-3" /> Feature</div>
  <h3 className="headline-md mb-2">Title</h3>
  <p className="body-md text-muted-foreground">Description</p>
</motion.div>
\`\`\`

### Stats with Counter Animation:
\`\`\`tsx
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      start = start || timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end]);
  return <span ref={ref}>{count}{suffix}</span>;
}
\`\`\`

## INTENT HANDLERS (USE HOOKS-SHIM):
\`\`\`tsx
import { useIntentHandlers } from './hooks-shim';
const { handleBooking, handleContact, handleNewsletter, handleNavigation, handleAuth } = useIntentHandlers();
\`\`\`

For buttons/elements, PREFER data-ut-intent attributes:
\`\`\`tsx
<button data-ut-intent="booking.create">Book Now</button>
<button data-ut-intent="nav.goto" data-ut-payload='{"path":"#contact"}'>Contact Us</button>
<form data-ut-intent="contact.submit">...</form>
\`\`\`
`;

// ============================================================================
// Output Format Prompt
// ============================================================================

export const OUTPUT_FORMAT_PROMPT = `
## OUTPUT FORMAT:
Return a single JSON object (no markdown, no explanations).
ONLY include src/App.tsx and src/index.css — no other files:
\`\`\`json
{
  "files": { "src/App.tsx": "...", "src/index.css": "..." },
  "entryPoint": "src/App.tsx",
  "framework": "react",
  "buildTool": "vite"
}
\`\`\`

## ⛔ NEVER INCLUDE: tailwind.config, package.json, vite.config, tsconfig, postcss.config, main.tsx, hooks/, lib/, components/ui/, components/sections/, components/layout/

## QUALITY (NON-NEGOTIABLE):
- MINIMUM 10 section components (ALL INLINE in App.tsx)
- EXACTLY ONE Hero section — no duplicates
- MINIMUM 6 service/feature items, 3 testimonials, 5 FAQ items
- All images from Unsplash with descriptive alt text
- Professional typography hierarchy using headline-xl/lg/md classes
- Responsive with sm/md/lg/xl breakpoints throughout
- Scroll-triggered reveal animations using framer-motion
- Staggered grid animations for cards and features
- Lucide icons on EVERY feature card, stat, and CTA
- Semantic sections with proper id attributes for navigation
`;
