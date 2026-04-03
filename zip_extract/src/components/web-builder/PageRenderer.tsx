import React, { useMemo, useCallback } from "react";
import type { PageNode } from "@/schemas/SiteGraph";
import { type BrandColors, defaultBrand } from "@/types/brand";

/** Local section type derived from PageNode */
type PageSection = PageNode["sections"][number];

/** Section renderer props */
interface SectionRendererProps {
  section: PageSection;
  brand: BrandColors;
  onIntentTrigger?: (intent: string, payload?: Record<string, unknown>) => void;
}

/** Helper to get first intent from section bindings */
function getFirstIntent(section: PageSection): { intentId: string; label?: string; payload?: Record<string, unknown> } | undefined {
  return section.bindings?.intents?.[0];
}

/**
 * Render a Hero section
 */
function HeroSection({ section, brand, onIntentTrigger }: SectionRendererProps) {
  const firstIntent = getFirstIntent(section);
  
  const handleCTAClick = useCallback(() => {
    if (firstIntent) {
      onIntentTrigger?.(firstIntent.intentId, firstIntent.payload);
    }
  }, [firstIntent, onIntentTrigger]);
  
  return (
    <section
      id={section.id}
      className="hero-section"
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "4rem 2rem",
        background: `linear-gradient(135deg, ${brand.primary}15, ${brand.secondary}10)`,
      }}
    >
      <h1
        style={{
          fontSize: "3.5rem",
          fontWeight: 800,
          color: brand.foreground,
          marginBottom: "1.5rem",
          lineHeight: 1.2,
        }}
      >
        Welcome to Your Site
      </h1>
      <p
        style={{
          fontSize: "1.25rem",
          color: `${brand.foreground}99`,
          maxWidth: "600px",
          marginBottom: "2rem",
        }}
      >
        Your compelling tagline goes here. Describe your value proposition.
      </p>
      <button
        onClick={handleCTAClick}
        data-intent={firstIntent?.intentId || "lead.capture"}
        data-payload={JSON.stringify(firstIntent?.payload || {})}
        style={{
          padding: "1rem 2.5rem",
          fontSize: "1.125rem",
          fontWeight: 600,
          backgroundColor: brand.primary,
          color: "#FFFFFF",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        {firstIntent?.label || "Get Started"}
      </button>
    </section>
  );
}

/**
 * Render a Services section
 */
function ServicesSection({ section, brand, onIntentTrigger }: SectionRendererProps) {
  const intents = section.bindings?.intents || [];
  
  return (
    <section
      id={section.id}
      className="services-section"
      style={{
        padding: "5rem 2rem",
        background: brand.background,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: brand.foreground,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Our Services
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
          }}
        >
          {(intents.length > 0 ? intents : [
            { intentId: "services.view" as const, label: "Service 1" },
            { intentId: "services.view" as const, label: "Service 2" },
            { intentId: "services.view" as const, label: "Service 3" },
          ]).map((intent, i) => (
            <div
              key={i}
              onClick={() => onIntentTrigger?.(intent.intentId, intent.payload)}
              data-intent={intent.intentId}
              style={{
                padding: "2rem",
                background: "#F9FAFB",
                borderRadius: "1rem",
                border: `1px solid ${brand.primary}20`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: `${brand.primary}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>✨</span>
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: brand.foreground,
                  marginBottom: "0.5rem",
                }}
              >
                {intent.label || `Service ${i + 1}`}
              </h3>
              <p style={{ color: `${brand.foreground}80`, lineHeight: 1.6 }}>
                Describe this service and the value it provides to your customers.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Render a Testimonials section
 */
function TestimonialsSection({ section, brand }: SectionRendererProps) {
  return (
    <section
      id={section.id}
      className="testimonials-section"
      style={{
        padding: "5rem 2rem",
        background: `${brand.primary}05`,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: brand.foreground,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          What Our Customers Say
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem",
          }}
        >
          {[1, 2, 3].map(n => (
            <div
              key={n}
              style={{
                padding: "2rem",
                background: brand.background,
                borderRadius: "1rem",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              }}
            >
              <p
                style={{
                  color: brand.foreground,
                  lineHeight: 1.8,
                  marginBottom: "1.5rem",
                  fontStyle: "italic",
                }}
              >
                "Amazing service! Highly recommended to everyone looking for quality."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: `${brand.secondary}30`,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: brand.foreground }}>
                    Customer {n}
                  </div>
                  <div style={{ color: `${brand.foreground}60`, fontSize: "0.875rem" }}>
                    Happy Client
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Render a Gallery section
 */
function GallerySection({ section, brand }: SectionRendererProps) {
  return (
    <section
      id={section.id}
      className="gallery-section"
      style={{
        padding: "5rem 2rem",
        background: brand.background,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: brand.foreground,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Gallery
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <div
              key={n}
              style={{
                aspectRatio: "1",
                background: `linear-gradient(135deg, ${brand.primary}30, ${brand.secondary}20)`,
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: `${brand.foreground}40`,
                fontSize: "1.5rem",
              }}
            >
              📷
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Render a Team section
 */
function TeamSection({ section, brand }: SectionRendererProps) {
  return (
    <section
      id={section.id}
      className="team-section"
      style={{
        padding: "5rem 2rem",
        background: brand.background,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: brand.foreground,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Meet the Team
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
          }}
        >
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${brand.primary}30, ${brand.accent}20)`,
                  margin: "0 auto 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3rem",
                }}
              >
                👤
              </div>
              <h3 style={{ fontWeight: 600, color: brand.foreground, marginBottom: "0.5rem" }}>
                Team Member {n}
              </h3>
              <p style={{ color: `${brand.foreground}60` }}>Position</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Render a Pricing section
 */
function PricingSection({ section, brand, onIntentTrigger }: SectionRendererProps) {
  const plans = [
    { label: "Basic", price: 29 },
    { label: "Pro", price: 59 },
    { label: "Enterprise", price: 99 },
  ];
  
  return (
    <section
      id={section.id}
      className="pricing-section"
      style={{
        padding: "5rem 2rem",
        background: `${brand.primary}05`,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: brand.foreground,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Pricing
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
          }}
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                padding: "2rem",
                background: brand.background,
                borderRadius: "1rem",
                border: i === 1 ? `2px solid ${brand.primary}` : `1px solid ${brand.primary}20`,
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "1.5rem", fontWeight: 600, color: brand.foreground, marginBottom: "1rem" }}>
                {plan.label}
              </h3>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: brand.primary, marginBottom: "1.5rem" }}>
                ${plan.price}<span style={{ fontSize: "1rem", color: `${brand.foreground}60` }}>/mo</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", textAlign: "left" }}>
                {["Feature 1", "Feature 2", "Feature 3"].map((f, fi) => (
                  <li key={fi} style={{ padding: "0.5rem 0", color: brand.foreground, borderBottom: `1px solid ${brand.foreground}10` }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onIntentTrigger?.("subscription.select_plan", { plan: plan.label })}
                data-intent="subscription.select_plan"
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: i === 1 ? brand.primary : "transparent",
                  color: i === 1 ? "#FFF" : brand.primary,
                  border: `2px solid ${brand.primary}`,
                  borderRadius: "0.5rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Choose {plan.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Render a Contact/CTA section
 */
function ContactSection({ section, brand, onIntentTrigger }: SectionRendererProps) {
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onIntentTrigger?.("contact.submit", {});
  }, [onIntentTrigger]);
  
  return (
    <section
      id={section.id}
      className="contact-section"
      style={{
        padding: "5rem 2rem",
        background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
      }}
    >
      <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#FFFFFF",
            marginBottom: "1.5rem",
          }}
        >
          Get In Touch
        </h2>
        <p style={{ color: "rgba(255,255,255,0.9)", marginBottom: "2rem" }}>
          Have questions? We'd love to hear from you.
        </p>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <input
            type="email"
            placeholder="Your email"
            style={{
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "none",
              fontSize: "1rem",
            }}
          />
          <textarea
            placeholder="Your message"
            rows={4}
            style={{
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "none",
              fontSize: "1rem",
              resize: "none",
            }}
          />
          <button
            type="submit"
            data-intent="contact.submit"
            style={{
              padding: "1rem 2rem",
              background: brand.background,
              color: brand.primary,
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}

/**
 * Render a Footer section
 */
function FooterSection({ section, brand }: SectionRendererProps) {
  return (
    <footer
      id={section.id}
      style={{
        padding: "3rem 2rem",
        background: brand.foreground,
        color: brand.background,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ opacity: 0.8 }}>© 2025 Your Brand. All rights reserved.</p>
      </div>
    </footer>
  );
}

/**
 * Generic fallback section
 */
function GenericSection({ section, brand }: SectionRendererProps) {
  return (
    <section
      id={section.id}
      style={{
        padding: "4rem 2rem",
        background: brand.background,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <p style={{ color: `${brand.foreground}60` }}>
          Section: {section.type}
        </p>
      </div>
    </section>
  );
}

/** Map section type to renderer */
const sectionRenderers: Record<string, React.FC<SectionRendererProps>> = {
  hero: HeroSection,
  services: ServicesSection,
  testimonials: TestimonialsSection,
  gallery: GallerySection,
  team: TeamSection,
  pricing: PricingSection,
  contact: ContactSection,
  cta: ContactSection,
  footer: FooterSection,
};

/**
 * Main PageRenderer component props
 */
export interface PageRendererProps {
  page: PageNode;
  brand?: BrandColors;
  onIntentTrigger?: (intent: string, payload?: Record<string, unknown>) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Main PageRenderer component
 */
export function PageRenderer({
  page,
  brand = defaultBrand,
  onIntentTrigger,
  className,
  style,
}: PageRendererProps) {
  const renderedSections = useMemo(() => {
    return page.sections.map((section) => {
      const Renderer = sectionRenderers[section.type] || GenericSection;
      return (
        <Renderer
          key={section.id}
          section={section}
          brand={brand}
          onIntentTrigger={onIntentTrigger}
        />
      );
    });
  }, [page.sections, brand, onIntentTrigger]);
  
  return (
    <div
      className={className}
      style={{
        minHeight: "100vh",
        background: brand.background,
        color: brand.foreground,
        ...style,
      }}
    >
      {renderedSections}
    </div>
  );
}
