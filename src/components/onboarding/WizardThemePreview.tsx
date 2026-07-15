/**
 * WizardThemePreview
 *
 * Live semantic-token preview shown inside the SystemLauncher wizard's
 * "Name & style" step. Renders a scoped mini-page (hero + card + button +
 * type sample) using the SAME HSL semantic tokens (`--background`,
 * `--foreground`, `--card`, `--primary`, `--muted-foreground`, `--border`,
 * `--radius`, `--font-heading`, `--font-body`) that the wizard injects into
 * `/src/index.css` at generation time via `themePresetToIndexCss`.
 *
 * This gives the user an accurate "what will my site look like" surface
 * BEFORE pages are finalized, and guarantees the preview + generated routes
 * share one source of truth (the wizard preset). Fully scoped via a wrapper
 * — never leaks tokens into the launcher chrome.
 */
import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { ThemePreset } from "./themePresets";
import { themePresetToThemeTokens } from "./themePresetToTokens";

interface WizardThemePreviewProps {
  preset: ThemePreset | null;
  businessName?: string;
}

const FONT_LINK_ID = "wizard-theme-preview-fonts";

function ensureFontLoaded(preset: ThemePreset) {
  if (typeof document === "undefined") return;
  const families = Array.from(
    new Set([preset.typography.headingFont, preset.typography.bodyFont]),
  )
    .map(
      (f) =>
        `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800`,
    )
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

export function WizardThemePreview({
  preset,
  businessName,
}: WizardThemePreviewProps) {
  const tokens = useMemo(
    () => (preset ? themePresetToThemeTokens(preset) : null),
    [preset],
  );

  useEffect(() => {
    if (preset) ensureFontLoaded(preset);
  }, [preset]);

  if (!preset || !tokens) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <p className="text-[11px] text-white/30">
          Select a visual style above to preview live semantic tokens.
        </p>
      </div>
    );
  }

  const c = tokens.colors;
  const scopeStyle: CSSProperties & Record<string, string> = {
    // Semantic HSL tokens — mirror the wizard's /src/index.css injection
    ["--background"]: c.background,
    ["--foreground"]: c.foreground,
    ["--card"]: c.card,
    ["--card-foreground"]: c.cardForeground,
    ["--primary"]: c.primary,
    ["--primary-foreground"]: c.primaryForeground,
    ["--secondary"]: c.secondary,
    ["--secondary-foreground"]: c.secondaryForeground,
    ["--accent"]: c.accent,
    ["--accent-foreground"]: c.accentForeground,
    ["--muted"]: c.muted,
    ["--muted-foreground"]: c.mutedForeground,
    ["--border"]: c.border,
    ["--ring"]: c.primary,
    ["--radius"]: tokens.radius,
    ["--font-heading"]: tokens.typography.headingFont,
    ["--font-body"]: tokens.typography.bodyFont,
    background: `hsl(${c.background})`,
    color: `hsl(${c.foreground})`,
    fontFamily: tokens.typography.bodyFont,
    borderRadius: tokens.radius,
    border: `1px solid hsl(${c.border})`,
  };

  const name = businessName?.trim() || preset.label + " Studio";

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Live theme preview
        </label>
        <span className="text-[10px] text-white/25">
          semantic tokens · updates instantly
        </span>
      </div>
      <div
        aria-label={`Live preview of ${preset.label} theme`}
        style={scopeStyle}
        className="overflow-hidden transition-colors duration-300"
      >
        {/* Nav row */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: `1px solid hsl(${c.border})` }}
        >
          <div
            style={{
              fontFamily: tokens.typography.headingFont,
              fontWeight: tokens.typography.headingWeight,
              color: `hsl(${c.foreground})`,
              fontSize: 14,
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </div>
          <div className="flex items-center gap-4">
            {["Services", "About", "Contact"].map((l) => (
              <span
                key={l}
                style={{
                  color: `hsl(${c.mutedForeground})`,
                  fontSize: 11,
                  fontFamily: tokens.typography.bodyFont,
                }}
              >
                {l}
              </span>
            ))}
            <span
              style={{
                background: `hsl(${c.primary})`,
                color: `hsl(${c.primaryForeground})`,
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: tokens.radius,
                fontWeight: 600,
              }}
            >
              Book
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="px-6 py-8">
          <div
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: `hsl(${c.primary})`,
              background: `hsl(${c.primary} / 0.12)`,
              border: `1px solid hsl(${c.primary} / 0.25)`,
              padding: "3px 10px",
              borderRadius: 999,
              marginBottom: 12,
            }}
          >
            {preset.label} aesthetic
          </div>
          <h3
            style={{
              fontFamily: tokens.typography.headingFont,
              fontWeight: tokens.typography.headingWeight,
              color: `hsl(${c.foreground})`,
              fontSize: 26,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </h3>
          <p
            style={{
              fontFamily: tokens.typography.bodyFont,
              color: `hsl(${c.mutedForeground})`,
              fontSize: 13,
              lineHeight: 1.55,
              margin: "8px 0 16px",
              maxWidth: 420,
            }}
          >
            A live sample of your semantic tokens. Every generated route
            inherits these colors, fonts, and radii — no drift between pages.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              style={{
                background: `linear-gradient(135deg, hsl(${c.primary}), hsl(${c.secondary}))`,
                color: `hsl(${c.primaryForeground})`,
                padding: "9px 18px",
                borderRadius: tokens.radius,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: tokens.typography.bodyFont,
                cursor: "default",
                boxShadow: `0 4px 14px hsl(${c.primary} / 0.25)`,
              }}
            >
              Primary CTA
            </button>
            <button
              type="button"
              style={{
                background: "transparent",
                color: `hsl(${c.foreground})`,
                padding: "9px 18px",
                borderRadius: tokens.radius,
                border: `1px solid hsl(${c.border})`,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: tokens.typography.bodyFont,
                cursor: "default",
              }}
            >
              Outline
            </button>
          </div>
        </div>

        {/* Card row */}
        <div
          className="grid grid-cols-3 gap-3 px-6 pb-6"
          style={{ background: `hsl(${c.background})` }}
        >
          {["Services", "Booking", "Reviews"].map((t, i) => (
            <div
              key={t}
              style={{
                background: `hsl(${c.card})`,
                color: `hsl(${c.cardForeground})`,
                border: `1px solid hsl(${c.border})`,
                borderRadius: tokens.radius,
                padding: 12,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: `hsl(${i === 1 ? c.accent : c.primary} / 0.18)`,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  fontFamily: tokens.typography.headingFont,
                  fontWeight: tokens.typography.headingWeight,
                  fontSize: 12,
                  color: `hsl(${c.cardForeground})`,
                }}
              >
                {t}
              </div>
              <div
                style={{
                  fontFamily: tokens.typography.bodyFont,
                  fontSize: 10,
                  color: `hsl(${c.mutedForeground})`,
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                Semantic card surface using --card and --border tokens.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
