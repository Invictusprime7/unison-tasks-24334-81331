/**
 * Advanced CSS System for Industry Templates
 * 
 * Provides modern, professional CSS patterns that can be embedded
 * in templates for advanced visual effects:
 * - Glassmorphism
 * - Advanced gradients
 * - Micro-interactions
 * - Scroll animations
 * - Professional shadows
 * - Typography enhancements
 */

// ============================================================================
// CSS UTILITIES
// ============================================================================

/**
 * Advanced CSS styles to inject into templates
 */
export const ADVANCED_CSS = `
/* ============================================
   CUSTOM PROPERTIES
   ============================================ */
:root {
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  --gradient-shine: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ============================================
   GLASSMORPHISM
   ============================================ */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 24px;
  box-shadow: 
    0 4px 24px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.1);
}

.glass-button {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  transition: all 0.3s var(--ease-out-expo);
}

.glass-button:hover {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

/* ============================================
   GRADIENT EFFECTS
   ============================================ */
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-border {
  position: relative;
  background: transparent;
  border-radius: 16px;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.mesh-gradient {
  background: 
    radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(236, 72, 153, 0.2) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(59, 130, 246, 0.2) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(245, 158, 11, 0.15) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%);
}

.aurora-gradient {
  background: linear-gradient(
    125deg,
    rgba(99, 102, 241, 0.3) 0%,
    rgba(168, 85, 247, 0.2) 25%,
    rgba(236, 72, 153, 0.2) 50%,
    rgba(251, 146, 60, 0.15) 75%,
    rgba(34, 211, 238, 0.2) 100%
  );
  animation: aurora 15s ease infinite;
  background-size: 400% 400%;
}

@keyframes aurora {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ============================================
   SHADOWS & DEPTH
   ============================================ */
.shadow-glow {
  box-shadow: 
    0 0 20px rgba(99, 102, 241, 0.3),
    0 0 40px rgba(99, 102, 241, 0.1);
}

.shadow-elevation-1 {
  box-shadow: 
    0 1px 3px rgba(0,0,0,0.12),
    0 1px 2px rgba(0,0,0,0.24);
}

.shadow-elevation-2 {
  box-shadow: 
    0 3px 6px rgba(0,0,0,0.15),
    0 2px 4px rgba(0,0,0,0.12);
}

.shadow-elevation-3 {
  box-shadow: 
    0 10px 20px rgba(0,0,0,0.15),
    0 3px 6px rgba(0,0,0,0.1);
}

.shadow-elevation-4 {
  box-shadow: 
    0 15px 25px rgba(0,0,0,0.15),
    0 5px 10px rgba(0,0,0,0.05);
}

.shadow-elevation-5 {
  box-shadow: 
    0 20px 40px rgba(0,0,0,0.2),
    0 8px 16px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

/* ============================================
   MICRO-INTERACTIONS
   ============================================ */
.hover-lift {
  transition: transform 0.3s var(--ease-out-expo), box-shadow 0.3s var(--ease-out-expo);
}

.hover-lift:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.hover-scale {
  transition: transform 0.3s var(--ease-out-back);
}

.hover-scale:hover {
  transform: scale(1.05);
}

.hover-glow {
  transition: box-shadow 0.3s ease;
}

.hover-glow:hover {
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
}

.button-press {
  transition: transform 0.1s ease;
}

.button-press:active {
  transform: scale(0.97);
}

/* ============================================
   ANIMATIONS
   ============================================ */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in-scale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s var(--ease-out-expo) both;
}

.animate-fade-in-scale {
  animation: fade-in-scale 0.5s var(--ease-out-back) both;
}

.animate-slide-in-right {
  animation: slide-in-right 0.5s var(--ease-out-expo) both;
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

/* Staggered animation delays */
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
.stagger-5 { animation-delay: 0.5s; }

/* ============================================
   TYPOGRAPHY ENHANCEMENTS
   ============================================ */
.text-balance {
  text-wrap: balance;
}

.text-pretty {
  text-wrap: pretty;
}

.headline-xl {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.headline-lg {
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.headline-md {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

.body-lg {
  font-size: 1.125rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.7);
}

.body-md {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
}

.caption {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

/* ============================================
   LAYOUT UTILITIES
   ============================================ */
.container-tight {
  max-width: 48rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.container-wide {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.section-spacing {
  padding-top: clamp(4rem, 10vw, 8rem);
  padding-bottom: clamp(4rem, 10vw, 8rem);
}

.section-spacing-sm {
  padding-top: clamp(2rem, 6vw, 4rem);
  padding-bottom: clamp(2rem, 6vw, 4rem);
}

/* ============================================
   BUTTON STYLES
   ============================================ */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: 12px;
  transition: all 0.3s var(--ease-out-expo);
  cursor: pointer;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: 12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  transition: all 0.3s var(--ease-out-expo);
  cursor: pointer;
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  font-size: 0.875rem;
  background: transparent;
  color: rgba(255,255,255,0.8);
  transition: color 0.2s ease;
  cursor: pointer;
}

.btn-ghost:hover {
  color: white;
}

/* ============================================
   CARD STYLES
   ============================================ */
.card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 2rem;
  transition: all 0.3s var(--ease-out-expo);
}

.card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.card-highlight {
  position: relative;
  overflow: hidden;
}

.card-highlight::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}

/* ============================================
   INPUT STYLES
   ============================================ */
.input {
  width: 100%;
  padding: 0.875rem 1.25rem;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: white;
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
}

.input::placeholder {
  color: rgba(255,255,255,0.4);
}

.input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-group {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.4);
}

.input-with-icon {
  padding-left: 3rem;
}

/* ============================================
   NAVIGATION
   ============================================ */
.nav-blur {
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  transition: color 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: white;
}

.nav-link-active {
  color: white;
}

.nav-link-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
}

/* ============================================
   BADGE STYLES
   ============================================ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: 9999px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.1);
}

.badge-primary {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
}

.badge-success {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

/* ============================================
   DIVIDERS
   ============================================ */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
}

.divider-vertical {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent);
}

/* ============================================
   SCROLL REVEAL (add via JS)
   ============================================ */
[data-reveal] {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s var(--ease-out-expo), transform 0.6s var(--ease-out-expo);
}

[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}

/* ============================================
   FOCUS STYLES
   ============================================ */
.tw-focus:focus {
  outline: none;
}

.tw-focus:focus-visible {
  outline: 2px solid rgba(99, 102, 241, 0.5);
  outline-offset: 2px;
}
`;

/**
 * Industry-specific color palettes for advanced CSS
 */
export const INDUSTRY_COLOR_PALETTES = {
  restaurant: {
    primary: 'from-amber-500 to-orange-600',
    secondary: 'from-rose-500 to-red-600',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)',
    gradient: 'radial-gradient(at 30% 30%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)',
  },
  salon: {
    primary: 'from-pink-500 to-rose-600',
    secondary: 'from-purple-500 to-violet-600',
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.3)',
    gradient: 'radial-gradient(at 70% 20%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)',
  },
  ecommerce: {
    primary: 'from-emerald-500 to-teal-600',
    secondary: 'from-blue-500 to-indigo-600',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.3)',
    gradient: 'radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
  },
  agency: {
    primary: 'from-violet-500 to-purple-600',
    secondary: 'from-cyan-500 to-blue-600',
    accent: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.3)',
    gradient: 'radial-gradient(at 20% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
  },
  contractor: {
    primary: 'from-amber-500 to-yellow-600',
    secondary: 'from-orange-500 to-red-600',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)',
    gradient: 'radial-gradient(at 80% 20%, rgba(245, 158, 11, 0.15) 0%, transparent 50%)',
  },
  medical: {
    primary: 'from-blue-500 to-cyan-600',
    secondary: 'from-teal-500 to-emerald-600',
    accent: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.3)',
    gradient: 'radial-gradient(at 30% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
  },
  fitness: {
    primary: 'from-red-500 to-orange-600',
    secondary: 'from-yellow-500 to-amber-600',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.3)',
    gradient: 'radial-gradient(at 60% 30%, rgba(239, 68, 68, 0.2) 0%, transparent 50%)',
  },
  event: {
    primary: 'from-purple-500 to-pink-600',
    secondary: 'from-blue-500 to-violet-600',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.3)',
    gradient: 'radial-gradient(at 40% 60%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)',
  },
  content: {
    primary: 'from-slate-700 to-slate-900',
    secondary: 'from-neutral-600 to-neutral-800',
    accent: '#64748b',
    glow: 'rgba(100, 116, 139, 0.2)',
    gradient: 'radial-gradient(at 50% 50%, rgba(100, 116, 139, 0.1) 0%, transparent 50%)',
  },
  saas: {
    primary: 'from-indigo-500 to-blue-600',
    secondary: 'from-violet-500 to-purple-600',
    accent: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.3)',
    gradient: 'radial-gradient(at 30% 20%, rgba(99, 102, 241, 0.2) 0%, transparent 50%)',
  },
  real_estate: {
    primary: 'from-blue-600 to-indigo-700',
    secondary: 'from-slate-600 to-slate-800',
    accent: '#2563eb',
    glow: 'rgba(37, 99, 235, 0.3)',
    gradient: 'radial-gradient(at 70% 30%, rgba(37, 99, 235, 0.15) 0%, transparent 50%)',
  },
  portfolio: {
    primary: 'from-neutral-800 to-neutral-950',
    secondary: 'from-slate-700 to-slate-900',
    accent: '#e5e5e5',
    glow: 'rgba(229, 229, 229, 0.1)',
    gradient: 'radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 50%)',
  },
};

/**
 * Generate CSS with industry-specific colors
 */
export function generateIndustryCss(industryId: keyof typeof INDUSTRY_COLOR_PALETTES): string {
  const palette = INDUSTRY_COLOR_PALETTES[industryId];
  
  return `
${ADVANCED_CSS}

/* Industry-specific overrides for ${industryId} */
.industry-accent {
  color: ${palette.accent};
}

.industry-glow {
  box-shadow: 0 0 30px ${palette.glow};
}

.industry-gradient-bg {
  background: ${palette.gradient};
}

.btn-industry {
  background: linear-gradient(135deg, var(--tw-gradient-stops));
  @apply bg-gradient-to-r ${palette.primary};
}

.btn-industry:hover {
  box-shadow: 0 10px 30px ${palette.glow};
}
`;
}

/**
 * Scroll reveal initialization script
 */
export const SCROLL_REVEAL_SCRIPT = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  });
</script>
`;

/**
 * Interactive elements script (tabs, accordions, etc.)
 */
export const INTERACTIVE_SCRIPT = `
<script>
  // Tabs
  document.querySelectorAll('[data-tabs]').forEach(tabsContainer => {
    const buttons = tabsContainer.querySelectorAll('[data-tab]');
    const panels = tabsContainer.querySelectorAll('[data-tab-panel]');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        buttons.forEach(b => b.classList.remove('bg-white/10'));
        btn.classList.add('bg-white/10');
        panels.forEach(p => p.classList.add('hidden'));
        tabsContainer.querySelector('[data-tab-panel="' + targetTab + '"]')?.classList.remove('hidden');
      });
    });
  });
  
  // Carousel
  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const items = carousel.querySelectorAll('[data-carousel-item]');
    let currentIndex = 0;
    
    const showItem = (index) => {
      items.forEach((item, i) => {
        item.classList.toggle('hidden', i !== index);
      });
    };
    
    carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      showItem(currentIndex);
    });
    
    carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % items.length;
      showItem(currentIndex);
    });
  });
  
  // Sticky dismissal
  document.querySelectorAll('[data-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.dismissKey;
      const sticky = document.querySelector('[data-sticky-key="' + key + '"]');
      if (sticky) {
        sticky.style.display = 'none';
        if (key) localStorage.setItem('dismissed-' + key, 'true');
      }
    });
  });
  
  // Restore dismissed state
  document.querySelectorAll('[data-sticky-key]').forEach(sticky => {
    const key = sticky.dataset.stickyKey;
    if (key && localStorage.getItem('dismissed-' + key) === 'true') {
      sticky.style.display = 'none';
    }
  });
</script>
`;
