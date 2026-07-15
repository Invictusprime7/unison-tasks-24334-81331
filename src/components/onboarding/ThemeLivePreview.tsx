/**
 * ThemeLivePreview
 * Renders a live mock site chrome (navbar + hero + card + CTA) using the
 * currently selected ThemePreset's palette + typography. Purely visual —
 * no data fetches, no runtime side effects. Used inside the wizard's
 * "Name & style" step so users can see the aesthetic before generating.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { ThemePreset } from "./themePresets";

interface ThemeLivePreviewProps {
  theme: ThemePreset | null;
  businessName?: string;
  className?: string;
}

const FALLBACK_PALETTE = {
  bg: "#0F172A",
  fg: "#F8FAFC",
  accent: "#3B82F6",
  accent2: "#8B5CF6",
};

export const ThemeLivePreview: React.FC<ThemeLivePreviewProps> = ({
  theme,
  businessName,
  className,
}) => {
  const palette = theme?.palette ?? FALLBACK_PALETTE;
  const typography = theme?.typography ?? {
    headingFont: "Inter",
    bodyFont: "DM Sans",
    headingWeight: "700",
  };
  const accent2 = palette.accent2 ?? palette.accent;
  const name = businessName?.trim() || "Your Brand";

  // Simple luminance check so text stays legible on both light & dark bgs.
  const isDarkBg = (() => {
    const hex = palette.bg.replace("#", "");
    if (hex.length < 6) return true;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  })();
  const subtleFg = isDarkBg
    ? "rgba(255,255,255,0.55)"
    : "rgba(0,0,0,0.55)";
  const borderCol = isDarkBg
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.08)";
  const cardBg = isDarkBg
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)]",
        className
      )}
      aria-label="Live theme preview"
    >
      <div
        className=""
        style={{
          backgroundColor: palette.bg,
          color: palette.fg,
          fontFamily: `'${typography.bodyFont}', ui-sans-serif, system-ui, sans-serif`,
        }}
      >

      {/* Accent gradient wash */}
      <div
        className="absolute inset-x-0 top-0 h-32 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(60% 100% at 50% 0%, ${palette.accent}55 0%, transparent 70%), linear-gradient(90deg, ${palette.accent}22, ${accent2}22)`,
        }}
      />

      {/* Navbar */}
      <div
        className="relative flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${borderCol}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded-md"
            style={{
              background: `linear-gradient(135deg, ${palette.accent}, ${accent2})`,
            }}
          />
          <span
            className="text-[11px] font-semibold tracking-tight truncate max-w-[140px]"
            style={{
              fontFamily: `'${typography.headingFont}', ui-sans-serif, system-ui, sans-serif`,
              fontWeight: typography.headingWeight,
              color: palette.fg,
            }}
          >
            {name}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: subtleFg }}>
          <span>Home</span>
          <span>Services</span>
          <span>Contact</span>
          <span
            className="px-2 py-1 rounded-md text-[10px] font-semibold"
            style={{
              backgroundColor: palette.accent,
              color: isDarkBg ? "#0A0A14" : "#FFFFFF",
            }}
          >
            Book
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative px-5 pt-6 pb-5">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] mb-3 uppercase tracking-widest"
          style={{
            backgroundColor: `${palette.accent}22`,
            color: palette.accent,
            border: `1px solid ${palette.accent}44`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: palette.accent }}
          />
          Now booking
        </div>
        <h3
          className="text-lg leading-tight mb-2"
          style={{
            fontFamily: `'${typography.headingFont}', ui-serif, Georgia, serif`,
            fontWeight: typography.headingWeight,
            color: palette.fg,
          }}
        >
          Crafted for how you actually work.
        </h3>
        <p className="text-[11px] leading-relaxed mb-4 max-w-[85%]" style={{ color: subtleFg }}>
          A live glimpse of your palette, type, and CTAs — exactly how they'll feel across every generated page.
        </p>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${palette.accent}, ${accent2})`,
              color: isDarkBg ? "#0A0A14" : "#FFFFFF",
            }}
          >
            Get started
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-[11px] font-medium"
            style={{
              border: `1px solid ${borderCol}`,
              color: palette.fg,
              backgroundColor: cardBg,
            }}
          >
            Learn more
          </button>
        </div>
      </div>

      {/* Card row */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-2">
        {["Design", "Book", "Grow"].map((label, i) => (
          <div
            key={label}
            className="rounded-lg p-2.5"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderCol}`,
            }}
          >
            <div
              className="h-1.5 w-6 rounded-full mb-2"
              style={{
                backgroundColor: i === 0 ? palette.accent : i === 1 ? accent2 : palette.fg,
                opacity: i === 2 ? 0.3 : 1,
              }}
            />
            <div
              className="text-[10px] font-semibold mb-0.5"
              style={{
                color: palette.fg,
                fontFamily: `'${typography.headingFont}', ui-sans-serif, system-ui, sans-serif`,
                fontWeight: typography.headingWeight,
              }}
            >
              {label}
            </div>
            <div className="text-[9px] leading-snug" style={{ color: subtleFg }}>
              Lorem ipsum dolor sit amet.
            </div>
          </div>
        ))}
        </div>

        {/* Testimonial strip — adds scroll depth */}
        <div
          className="px-5 py-5"
          style={{ borderTop: `1px solid ${borderCol}`, backgroundColor: cardBg }}
        >
          <div
            className="text-[10px] uppercase tracking-widest mb-2"
            style={{ color: palette.accent }}
          >
            What clients say
          </div>
          <p
            className="text-[11px] leading-relaxed italic"
            style={{ color: palette.fg }}
          >
            “Cleanest onboarding I've had in years — the aesthetic and flow felt custom-built for us.”
          </p>
          <div className="mt-2 text-[10px]" style={{ color: subtleFg }}>
            — Alex M., founder
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: `1px solid ${borderCol}` }}
        >
          <div className="grid grid-cols-3 gap-2 text-[9px]" style={{ color: subtleFg }}>
            <div className="space-y-1">
              <div style={{ color: palette.fg }} className="font-semibold text-[10px]">Company</div>
              <div>About</div><div>Team</div>
            </div>
            <div className="space-y-1">
              <div style={{ color: palette.fg }} className="font-semibold text-[10px]">Product</div>
              <div>Features</div><div>Pricing</div>
            </div>
            <div className="space-y-1">
              <div style={{ color: palette.fg }} className="font-semibold text-[10px]">Contact</div>
              <div>Book a call</div><div>Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade edge to hint scrollability */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
        style={{ background: `linear-gradient(to top, ${palette.bg}, transparent)` }}
      />
    </div>
  );
};


export default ThemeLivePreview;
