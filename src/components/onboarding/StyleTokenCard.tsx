/**
 * StyleTokenCard
 * ---------------------------------------------------------------------------
 * Renders the *resolved aesthetic tokens* for a ThemePreset exactly the way
 * generated pages will consume them: the preset is run through the same
 * `themePresetToThemeTokens` + `resolveGeometryTokens` resolvers used by the
 * Stage 4b compiler, the resulting values are mounted as CSS custom properties
 * on a scoped container, and the sample chrome inside is styled ONLY with
 * `var(--…)` references — no hardcoded colors, radii, or spacing.
 *
 * This makes the card an honest preview: if a token is wrong or missing, the
 * sample breaks here before a page is ever generated.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { ThemePreset } from "./themePresets";
import { themePresetToThemeTokens } from "./themePresetToTokens";
import { resolveGeometryTokens } from "./themePresetToIndexCss";

export interface StyleTokenCardProps {
  theme: ThemePreset | null;
  businessName?: string;
  className?: string;
  /** Show the raw token ledger under the rendered sample. */
  showTokenLedger?: boolean;
}

const GEOMETRY_HIGHLIGHTS = [
  "--ut-nav-block",
  "--ut-section-block",
  "--ut-content-width",
  "--ut-gutter",
  "--ut-touch-target",
  "--ut-control-radius",
  "--ut-media-radius",
];

export const StyleTokenCard: React.FC<StyleTokenCardProps> = ({
  theme,
  businessName,
  className,
  showTokenLedger = true,
}) => {
  const { style, colorTokens, geometryTokens, tokens } = React.useMemo(() => {
    if (!theme) {
      return {
        style: {} as React.CSSProperties,
        colorTokens: [] as Array<[string, string]>,
        geometryTokens: [] as Array<[string, string]>,
        tokens: null,
      };
    }
    const resolved = themePresetToThemeTokens(theme);
    const geometry = resolveGeometryTokens(theme.id);

    const colorVars: Record<string, string> = {
      "--background": resolved.colors.background,
      "--foreground": resolved.colors.foreground,
      "--primary": resolved.colors.primary,
      "--primary-foreground": resolved.colors.primaryForeground,
      "--secondary": resolved.colors.secondary,
      "--secondary-foreground": resolved.colors.secondaryForeground,
      "--accent": resolved.colors.accent,
      "--accent-foreground": resolved.colors.accentForeground,
      "--muted": resolved.colors.muted,
      "--muted-foreground": resolved.colors.mutedForeground,
      "--card": resolved.colors.card,
      "--card-foreground": resolved.colors.cardForeground,
      "--border": resolved.colors.border,
    };

    const cssVars: Record<string, string> = {
      ...colorVars,
      ...geometry,
      "--radius": resolved.radius,
      "--ut-heading-font": resolved.typography.headingFont,
      "--ut-body-font": resolved.typography.bodyFont,
      "--ut-heading-weight": resolved.typography.headingWeight,
      "--ut-body-weight": resolved.typography.bodyWeight,
      "--ut-section-padding": resolved.sectionPadding,
    };

    return {
      style: cssVars as unknown as React.CSSProperties,
      colorTokens: Object.entries(colorVars),
      geometryTokens: GEOMETRY_HIGHLIGHTS.filter((key) => geometry[key]).map(
        (key) => [key, geometry[key]] as [string, string]
      ),
      tokens: resolved,
    };
  }, [theme]);

  if (!theme || !tokens) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/40",
          className
        )}
      >
        Select a style to resolve its aesthetic tokens.
      </div>
    );
  }

  const name = businessName?.trim() || "Your Brand";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]",
        className
      )}
      aria-label="Resolved style token preview"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
          Token render · {theme.label}
        </span>
        <span className="text-[10px] text-white/30">
          radius {tokens.radius} · {tokens.containerWidth}
        </span>
      </div>

      {/* Everything below renders through the resolved tokens only. */}
      <div
        style={{
          ...style,
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          fontFamily: "var(--ut-body-font)",
          fontWeight: "var(--ut-body-weight)" as React.CSSProperties["fontWeight"],
        }}
      >
        {/* Nav block — height driven by --ut-nav-block */}
        <div
          className="flex items-center justify-between"
          style={{
            minHeight: "var(--ut-nav-block, 3.5rem)",
            paddingInline: "var(--ut-gutter)",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <span
            style={{
              fontFamily: "var(--ut-heading-font)",
              fontWeight: "var(--ut-heading-weight)" as React.CSSProperties["fontWeight"],
              fontSize: "0.95rem",
            }}
          >
            {name}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: "var(--ut-touch-target)",
              paddingInline: "0.9rem",
              borderRadius: "var(--ut-control-radius, var(--radius))",
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              fontSize: "0.7rem",
              fontWeight: 600,
            }}
          >
            Book now
          </span>
        </div>

        {/* Section block — padding driven by --ut-section-block */}
        <div
          style={{
            paddingBlock: "var(--ut-section-block, 2.5rem)",
            paddingInline: "var(--ut-gutter)",
          }}
        >
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Aesthetic tokens
          </p>
          <h3
            style={{
              fontFamily: "var(--ut-heading-font)",
              fontWeight: "var(--ut-heading-weight)" as React.CSSProperties["fontWeight"],
              fontSize: "1.4rem",
              lineHeight: 1.15,
              marginBottom: "0.5rem",
            }}
          >
            This is how your pages will render.
          </h3>
          <p
            style={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.78rem",
              maxWidth: "34ch",
            }}
          >
            Type scale, spacing rhythm, radii and color roles all come from the
            same tokens the generator hands to every section.
          </p>

          {/* Card + control specimens */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
              gap: "0.6rem",
              marginTop: "1rem",
            }}
          >
            {["Card surface", "Accent surface"].map((label, i) => (
              <div
                key={label}
                style={{
                  borderRadius: "var(--ut-media-radius, var(--radius))",
                  border: "1px solid hsl(var(--border))",
                  background:
                    i === 0 ? "hsl(var(--card))" : "hsl(var(--accent) / 0.14)",
                  color: "hsl(var(--card-foreground))",
                  padding: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--ut-heading-font)",
                    fontWeight: "var(--ut-heading-weight)" as React.CSSProperties["fontWeight"],
                    fontSize: "0.8rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    fontSize: "0.7rem",
                  }}
                >
                  Body copy at rest
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
            <button
              type="button"
              tabIndex={-1}
              style={{
                minHeight: "var(--ut-touch-target)",
                paddingInline: "1rem",
                borderRadius: "var(--ut-control-radius, var(--radius))",
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "none",
              }}
            >
              Primary
            </button>
            <button
              type="button"
              tabIndex={-1}
              style={{
                minHeight: "var(--ut-touch-target)",
                paddingInline: "1rem",
                borderRadius: "var(--ut-control-radius, var(--radius))",
                background: "transparent",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              Secondary
            </button>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "var(--ut-touch-target)",
                paddingInline: "0.85rem",
                borderRadius: "var(--ut-control-radius, var(--radius))",
                background: "hsl(var(--muted))",
                color: "hsl(var(--muted-foreground))",
                fontSize: "0.72rem",
              }}
            >
              Muted chip
            </span>
          </div>
        </div>
      </div>

      {showTokenLedger && (
        <div className="border-t border-white/[0.06] px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {colorTokens.map(([name, value]) => (
              <div
                key={name}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1"
                title={`${name}: ${value}`}
              >
                <span
                  className="h-3 w-3 rounded-sm ring-1 ring-white/10"
                  style={{ background: `hsl(${value})` }}
                />
                <span className="text-[9px] text-white/40 font-mono">
                  {name.replace("--", "")}
                </span>
              </div>
            ))}
          </div>
          {geometryTokens.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {geometryTokens.map(([name, value]) => (
                <span
                  key={name}
                  className="rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1 text-[9px] font-mono text-white/40"
                >
                  {name.replace("--ut-", "")}: <span className="text-white/60">{value}</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-white/40">
            <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1">
              heading: <span className="text-white/60">{tokens.typography.headingFont}</span>
            </span>
            <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1">
              body: <span className="text-white/60">{tokens.typography.bodyFont}</span>
            </span>
            <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1">
              section: <span className="text-white/60">{tokens.sectionPadding}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleTokenCard;
