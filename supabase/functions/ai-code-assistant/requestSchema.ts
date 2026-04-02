// supabase/functions/ai-code-assistant/requestSchema.ts
// Extracted Zod validation schema — preserves the exact request contract.

import { z } from "zod";

const messageContentSchema = z.union([
  z.string().min(1).max(10_000),
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
    intents: z.array(z.object({
      intent: z.string().max(60),
      target: z.object({ kind: z.string().optional(), ref: z.string().optional() }).optional(),
    })).max(20).optional(),
    template_sections: z.array(z.string().max(60)).max(20).optional(),
    template_intents: z.array(z.string().max(60)).max(20).optional(),
  }).optional(),
  siteElementsLibraryContext: z.string().max(50_000).optional(),
  surgicalEdit: z.boolean().optional(),
  previewDiagnostics: z.string().max(5_000).optional(),
  recentChangedFiles: z.array(z.string().max(200)).max(20).optional(),
  vfsFiles: z.record(z.string(), z.string().max(100_000)).optional(),
  gatewayOptions: z.object({
    selectedModelId: z.string().max(80).optional(),
    reasoningEffort: z.enum(["none", "low", "medium", "high"]).optional(),
    timeoutMs: z.number().min(5000).max(120000).optional(),
    autoModelSelection: z.boolean().optional(),
    maxTokens: z.number().min(1000).max(128000).optional(),
  }).optional(),
});

export type AIRequest = z.infer<typeof AIRequestSchema>;
