/**
 * TemplateLivePreview
 * Vertically stacked mock render of a template's section flow using its
 * composition theme colors. Scrollable so users can scan the entire
 * generated topology before selecting it. Visual-only — no runtime side
 * effects, no data fetches.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface TemplateCardLike {
  id: string;
  label: string;
  description: string;
  industry: string;
  sectionTypes: string[];
  traits: string[];
  themeColors?: { primary: string; secondary: string };
}

interface TemplateLivePreviewProps {
  template: TemplateCardLike | null;
  businessName?: string;
  className?: string;
}

const primaryFallback = "217.2 91.2% 59.8%";
const secondaryFallback = "279 50% 55%";

const SectionBlock: React.FC<{
  type: string;
  primary: string;
  secondary: string;
  businessName: string;
}> = ({ type, primary, secondary, businessName }) => {
  const t = type.toLowerCase();
  const accent = `hsl(${primary})`;
  const accentSoft = `hsl(${primary} / 0.15)`;
  const accentMuted = `hsl(${primary} / 0.45)`;
  const secondarySoft = `hsl(${secondary} / 0.12)`;

  if (t === "navbar" || t === "header") {
    return (
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ background: `linear-gradient(135deg, ${accent}, hsl(${secondary}))` }} />
          <span className="text-[10px] font-semibold text-white/85 truncate max-w-[120px]">{businessName}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-white/45">
          <span>Home</span><span>Services</span><span>About</span>
          <span className="px-1.5 py-0.5 rounded text-white text-[9px]" style={{ backgroundColor: accent }}>Book</span>
        </div>
      </div>
    );
  }

  if (t === "hero") {
    return (
      <div className="relative px-5 py-6" style={{ background: `radial-gradient(80% 100% at 50% 0%, ${accentSoft}, transparent 70%)` }}>
        <div className="inline-block text-[8px] uppercase tracking-widest mb-2 px-1.5 py-0.5 rounded"
          style={{ backgroundColor: accentSoft, color: accent }}>
          Featured
        </div>
        <div className="h-3 w-3/4 rounded bg-white/85 mb-1.5" />
        <div className="h-3 w-1/2 rounded bg-white/60 mb-3" />
        <div className="h-1.5 w-4/5 rounded bg-white/25 mb-1" />
        <div className="h-1.5 w-3/5 rounded bg-white/20 mb-3" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded" style={{ backgroundColor: accent }} />
          <div className="h-5 w-14 rounded border" style={{ borderColor: accentMuted }} />
        </div>
      </div>
    );
  }

  if (t === "services" || t === "features") {
    return (
      <div className="px-5 py-5">
        <div className="h-2 w-24 rounded bg-white/60 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="h-3 w-3 rounded mb-1.5" style={{ backgroundColor: i === 1 ? `hsl(${secondary})` : accent }} />
              <div className="h-1.5 w-3/4 rounded bg-white/60 mb-1" />
              <div className="h-1 w-full rounded bg-white/20" />
              <div className="h-1 w-2/3 rounded bg-white/15 mt-0.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === "testimonials" || t === "reviews") {
    return (
      <div className="px-5 py-5" style={{ backgroundColor: secondarySoft }}>
        <div className="h-2 w-28 rounded bg-white/60 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex gap-0.5 mb-1">
                {[0, 1, 2, 3, 4].map((s) => (
                  <div key={s} className="h-1 w-1 rounded-full" style={{ backgroundColor: accent }} />
                ))}
              </div>
              <div className="h-1 w-full rounded bg-white/30" />
              <div className="h-1 w-4/5 rounded bg-white/25 mt-0.5" />
              <div className="h-1 w-2/5 rounded bg-white/50 mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === "pricing" || t === "packages" || t === "plans") {
    return (
      <div className="px-5 py-5">
        <div className="h-2 w-20 rounded bg-white/60 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("p-2 rounded", i === 1 && "ring-1")}
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: i === 1 ? `0 0 0 1px ${accent}` : undefined,
              }}>
              <div className="h-1.5 w-1/2 rounded bg-white/60 mb-1" />
              <div className="h-3 w-3/4 rounded mb-1.5" style={{ backgroundColor: i === 1 ? accent : "rgba(255,255,255,0.5)" }} />
              <div className="h-0.5 w-full bg-white/10 mb-1" />
              <div className="h-1 w-full rounded bg-white/20 mb-0.5" />
              <div className="h-1 w-4/5 rounded bg-white/20 mb-0.5" />
              <div className="h-1 w-3/5 rounded bg-white/20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (t === "gallery" || t === "portfolio" || t === "menu" || t === "products") {
    return (
      <div className="px-5 py-5">
        <div className="h-2 w-24 rounded bg-white/60 mb-3" />
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="aspect-square rounded"
              style={{ background: i % 3 === 0
                ? `linear-gradient(135deg, ${accentSoft}, ${accent})`
                : `linear-gradient(135deg, ${secondarySoft}, hsl(${secondary} / 0.35))` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (t === "cta") {
    return (
      <div className="px-5 py-6 text-center"
        style={{ background: `linear-gradient(135deg, ${accent}, hsl(${secondary}))` }}>
        <div className="h-2 w-1/2 rounded bg-white/85 mx-auto mb-1.5" />
        <div className="h-1.5 w-2/3 rounded bg-white/60 mx-auto mb-3" />
        <div className="h-5 w-24 rounded bg-white mx-auto" />
      </div>
    );
  }

  if (t === "contact") {
    return (
      <div className="px-5 py-5">
        <div className="h-2 w-20 rounded bg-white/60 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="h-6 rounded bg-white/[0.05]" />
            <div className="h-6 rounded bg-white/[0.05]" />
            <div className="h-12 rounded bg-white/[0.05]" />
            <div className="h-5 w-20 rounded" style={{ backgroundColor: accent }} />
          </div>
          <div className="rounded" style={{ background: `linear-gradient(135deg, ${accentSoft}, ${secondarySoft})`, minHeight: 90 }} />
        </div>
      </div>
    );
  }

  if (t === "footer") {
    return (
      <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(0,0,0,0.25)" }}>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-1.5 w-3/4 rounded bg-white/60" />
              <div className="h-1 w-full rounded bg-white/15" />
              <div className="h-1 w-4/5 rounded bg-white/15" />
              <div className="h-1 w-2/3 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generic fallback block
  return (
    <div className="px-5 py-4">
      <div className="h-2 w-24 rounded bg-white/50 mb-2" />
      <div className="h-1.5 w-full rounded bg-white/15 mb-1" />
      <div className="h-1.5 w-3/4 rounded bg-white/15" />
      <div className="mt-2 text-[8px] uppercase tracking-widest text-white/25">{type}</div>
    </div>
  );
};

export const TemplateLivePreview: React.FC<TemplateLivePreviewProps> = ({
  template,
  businessName,
  className,
}) => {
  const primary = template?.themeColors?.primary ?? primaryFallback;
  const secondary = template?.themeColors?.secondary ?? secondaryFallback;
  const name = businessName?.trim() || "Your Brand";
  const sections = template?.sectionTypes?.length
    ? template.sectionTypes
    : ["navbar", "hero", "services", "cta", "footer"];

  // Ensure navbar/footer bookend the preview if template didn't already list them.
  const bookended = [
    sections.includes("navbar") || sections.includes("header") ? null : "navbar",
    ...sections,
    sections.includes("footer") ? null : "footer",
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)] bg-[#0A0B14]",
        className
      )}
      aria-label="Live template preview"
    >
      <div className="max-h-[420px] overflow-y-auto scrollbar-hide">
        {bookended.map((type, idx) => (
          <SectionBlock
            key={`${type}-${idx}`}
            type={type}
            primary={primary}
            secondary={secondary}
            businessName={name}
          />
        ))}
      </div>
      {/* Fade edge to hint scrollability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0A0B14] to-transparent" />
    </div>
  );
};

export default TemplateLivePreview;
