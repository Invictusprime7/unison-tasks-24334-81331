// supabase/functions/ai-code-assistant/requestSchema.ts
// Extracted Zod validation schema — preserves the exact request contract.

import { z } from "zod";

const messageContentSchema = z.union([
  z.string().min(1).max(200_000),
  z.array(z.unknown()).min(1).max(50),
]);

export const AIRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: messageContentSchema,
      })
    )
    .min(1)
    .max(50),
  mode: z.string().max(30).optional(),
  savePattern: z.boolean().optional(),
  generateImage: z.boolean().optional(),
  imagePlacement: z.string().max(40).optional(),
  currentCode: z.string().max(200_000).optional(),
  editMode: z.boolean().optional(),
  debugMode: z.boolean().optional(),
  templateAction: z.string().max(50).optional(),
  templateAnalysis: z.string().max(20_000).optional(),
  systemType: z.string().max(50).nullish(),
  variationSeed: z.string().max(30).nullish(),
  templateName: z.string().max(100).nullish(),
  aesthetic: z.string().max(80).nullish(),
  source: z.string().max(80).nullish(),
  userDesignProfile: z.object({
    projectCount: z.number().optional(),
    dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
    industryHints: z.array(z.string()).optional(),
  }).optional(),
  navPageGen: z.boolean().optional(),
  /**
   * Hard signal from the Wizard Launcher overlay (6-card flow). When true, the
   * request is ALWAYS routed to Lane A (wizard_template_react) and Lane B is
   * blocked, regardless of any other flags that may have leaked in.
   */
  wizardLaunch: z.boolean().optional(),
  navPageName: z.string().max(100).nullish(),
  navLabel: z.string().max(120).nullish(),
  systemsBuildContext: z.object({
    version: z.string().optional(),
    identity: z.object({
      industry: z.string().max(80).optional(),
      business_model: z.string().max(80).optional(),
      primary_goal: z.string().max(200).optional(),
      locale: z.string().max(20).optional(),
    }).optional(),
    brand: z.object({
      business_name: z.string().max(100).optional(),
      tagline: z.string().max(200).optional(),
      tone: z.string().max(80).optional(),
      palette: z.object({
        primary: z.string().optional(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
        background: z.string().optional(),
        foreground: z.string().optional(),
      }).optional(),
      typography: z.object({ heading: z.string().optional(), body: z.string().optional() }).optional(),
      logo: z.object({ mode: z.string().optional(), text_lockup: z.string().optional() }).optional(),
    }).optional(),
    design: z.object({
      layout: z.object({
        hero_style: z.string().max(40).optional(),
        section_spacing: z.string().max(20).optional(),
        max_width: z.string().max(20).optional(),
        navigation_style: z.string().max(20).optional(),
      }).optional(),
      effects: z.object({
        animations: z.boolean().optional(),
        scroll_animations: z.boolean().optional(),
        hover_effects: z.boolean().optional(),
        gradient_backgrounds: z.boolean().optional(),
        glassmorphism: z.boolean().optional(),
        shadows: z.string().max(20).optional(),
      }).optional(),
      images: z.object({
        style: z.string().max(20).optional(),
        aspect_ratio: z.string().max(20).optional(),
        overlay_style: z.string().max(20).optional(),
      }).optional(),
      buttons: z.object({
        style: z.string().max(20).optional(),
        size: z.string().max(20).optional(),
        hover_effect: z.string().max(20).optional(),
      }).optional(),
      sections: z.object({
        include_stats: z.boolean().optional(),
        include_testimonials: z.boolean().optional(),
        include_faq: z.boolean().optional(),
        include_cta_banner: z.boolean().optional(),
        include_newsletter: z.boolean().optional(),
        include_social_proof: z.boolean().optional(),
        use_counter_animations: z.boolean().optional(),
      }).optional(),
      content: z.object({
        density: z.string().max(20).optional(),
        use_icons: z.boolean().optional(),
        writing_style: z.string().max(30).optional(),
      }).optional(),
    }).optional(),
    style_selection: z.object({
      preset_id: z.string().max(80).optional(),
      preset_label: z.string().max(100).optional(),
      style_directive: z.string().max(2_000).optional(),
      palette_hex: z.object({
        background: z.string().optional(),
        foreground: z.string().optional(),
        primary: z.string().optional(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
      }).optional(),
      typography: z.object({
        heading_font: z.string().max(120).optional(),
        body_font: z.string().max(120).optional(),
        heading_weight: z.string().max(20).optional(),
        body_weight: z.string().max(20).optional(),
      }).optional(),
    }).optional(),
    theme_tokens: z.object({
      primary: z.string().optional(),
      primaryForeground: z.string().optional(),
      secondary: z.string().optional(),
      secondaryForeground: z.string().optional(),
      accent: z.string().optional(),
      accentForeground: z.string().optional(),
      background: z.string().optional(),
      foreground: z.string().optional(),
      muted: z.string().optional(),
      mutedForeground: z.string().optional(),
      card: z.string().optional(),
      cardForeground: z.string().optional(),
      border: z.string().optional(),
      radius: z.string().optional(),
      headingFont: z.string().optional(),
      bodyFont: z.string().optional(),
      headingWeight: z.string().optional(),
      bodyWeight: z.string().optional(),
      isDark: z.boolean().optional(),
      presetId: z.string().optional(),
      presetLabel: z.string().optional(),
      styleDirective: z.string().max(2_000).optional(),
    }).optional(),
    template_selection: z.object({
      template_id: z.string().max(120).optional(),
      template_label: z.string().max(160).optional(),
      description: z.string().max(1_000).optional(),
      industry: z.string().max(80).optional(),
      traits: z.array(z.string().max(80)).max(12).optional(),
      section_order: z.array(z.string().max(60)).max(30).optional(),
      section_ids: z.array(z.string().max(120)).max(30).optional(),
      page_roles: z.array(z.string().max(60)).max(20).optional(),
    }).optional(),
    intents: z.array(z.object({
      intent: z.string().max(60),
      target: z.object({ kind: z.string().optional(), ref: z.string().optional() }).optional(),
    })).max(20).optional(),
    template_sections: z.array(z.string().max(60)).max(20).optional(),
    template_intents: z.array(z.string().max(60)).max(20).optional(),
  }).optional(),
  siteElementsLibraryContext: z.string().max(50_000).optional(),
  /** Page topology + intent bindings — lets chat prompts edit routes & wiring. */
  siteContext: z.object({
    homePageId: z.string().max(120).optional(),
    pages: z.array(z.object({
      pageId: z.string().max(120),
      title: z.string().max(160).optional(),
      path: z.string().max(200).optional(),
      filePath: z.string().max(300).optional(),
      pageRole: z.string().max(40).optional(),
      isHome: z.boolean().optional(),
      showInNav: z.boolean().optional(),
      funnelId: z.string().max(120).optional(),
      funnelRole: z.string().max(40).optional(),
    })).max(60).optional(),
    funnels: z.array(z.object({
      funnelId: z.string().max(120),
      name: z.string().max(160).optional(),
      funnelType: z.string().max(40).optional(),
      steps: z.array(z.object({
        pageId: z.string().max(120),
        role: z.string().max(40).optional(),
        nextStepId: z.string().max(120).nullish(),
      })).max(20).optional(),
    })).max(20).optional(),
    intentBindings: z.array(z.object({
      pagePath: z.string().max(200).optional(),
      elementKey: z.string().max(160).optional(),
      elementLabel: z.string().max(160).optional(),
      intent: z.string().max(80),
      workflowId: z.string().max(120).nullish(),
      enabled: z.boolean().optional(),
    })).max(80).optional(),
  }).optional(),
  surgicalEdit: z.boolean().optional(),
  behavioralEdit: z.boolean().optional(),
  targetFile: z.string().max(300).optional(),
  componentBehaviorContext: z.string().max(15_000).optional(),
  previewDiagnostics: z.string().max(5_000).optional(),
  previewSnapshot: z.string().max(3_000).optional(),
  recentChangedFiles: z.array(z.string().max(200)).max(20).optional(),
  vfsFiles: z.record(z.string(), z.string().max(100_000)).optional(),
  attachments: z.array(z.unknown()).max(10).optional(),
  gatewayOptions: z.object({
    selectedModelId: z.string().max(80).optional(),
    reasoningEffort: z.enum(["none", "low", "medium", "high"]).optional(),
    timeoutMs: z.number().min(5000).max(120000).optional(),
    autoModelSelection: z.boolean().optional(),
    maxTokens: z.number().min(1000).max(128000).optional(),
  }).optional(),
  launchBrief: z.object({
    productBrief: z.string().max(5000).optional(),
    audience: z.string().max(1000).optional(),
    launchDate: z.string().max(100).optional(),
    constraints: z.string().max(2000).optional(),
    availableAssets: z.string().max(2000).optional(),
  }).optional(),
});

export type AIRequest = z.infer<typeof AIRequestSchema>;
