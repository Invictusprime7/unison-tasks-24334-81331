import { 
  Layers, 
  Zap, 
  Bot, 
  Workflow, 
  Crown, 
  Paintbrush,
  CreditCard, 
  BarChart3, 
  Webhook, 
  Globe,
  LucideIcon
} from "lucide-react";

export interface PlatformFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const platformFeatures: PlatformFeature[] = [
  {
    icon: Layers,
    title: "11 Industry Templates",
    description: "Salon, restaurant, agency, e-commerce, contractor, portfolio, blog, medical, SaaS, startup, and landing pages — all production-ready."
  },
  {
    icon: Crown,
    title: "Premium Tiers",
    description: "Standard and premium templates per industry. Premium includes advanced layouts, animations, and conversion-optimized sections."
  },
  {
    icon: Paintbrush,
    title: "Design Presets",
    description: "Apply editorial, minimal, luxury, playful, retro, cyberpunk, or glass design presets to any template before launch."
  },
  {
    icon: Bot,
    title: "AI Generation",
    description: "Describe your business and AI builds a full multi-page site with industry-aware content and working forms."
  },
  {
    icon: Zap,
    title: "Intent-Wired Buttons",
    description: "Every button, form, and CTA is pre-wired to real actions — booking, payments, lead capture, CRM updates."
  },
  {
    icon: Workflow,
    title: "Built-in Backend",
    description: "Backend packs install automatically. Database tables, edge functions, and automations — no setup required."
  }
];

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  cta: string;
  popular: boolean;
  variant: "outline" | "default";
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Launch your first business system",
    features: [
      "1 live system",
      "10 AI generations/month",
      "Pre-built templates",
      "Community support",
      "All core features"
    ],
    limitations: [],
    cta: "Start Free",
    popular: false,
    variant: "outline"
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Scale with unlimited systems",
    features: [
      "Unlimited systems",
      "500 AI generations/month",
      "Custom domains",
      "Priority support",
      "Advanced analytics",
      "Remove branding",
      "API access"
    ],
    limitations: [],
    cta: "Start Pro Trial",
    popular: true,
    variant: "default"
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For teams and agencies",
    features: [
      "Everything in Pro",
      "Unlimited AI generations",
      "Team collaboration",
      "White-label exports",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee"
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    variant: "outline"
  }
];

export interface IntegrationItem {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
}

export const integrationsList: IntegrationItem[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: CreditCard,
    color: 'from-purple-500 to-indigo-600',
    description: 'Accept payments and manage subscriptions',
    apiKeyPlaceholder: 'sk_live_...',
    docsUrl: 'https://stripe.com/docs'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: CreditCard,
    color: 'from-blue-500 to-blue-700',
    description: 'Accept PayPal payments globally',
    apiKeyPlaceholder: 'Client ID',
    docsUrl: 'https://developer.paypal.com'
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    icon: BarChart3,
    color: 'from-orange-500 to-yellow-500',
    description: 'Track website traffic and user behavior',
    apiKeyPlaceholder: 'G-XXXXXXXXXX',
    docsUrl: 'https://analytics.google.com'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: Bot,
    color: 'from-green-500 to-emerald-600',
    description: 'GPT-4, DALL-E, and Whisper APIs',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: Bot,
    color: 'from-amber-500 to-orange-600',
    description: 'Claude Sonnet 4.6 — extended thinking & advanced reasoning',
    apiKeyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    icon: Zap,
    color: 'from-orange-400 to-red-500',
    description: 'Connect with 5000+ apps',
    apiKeyPlaceholder: 'Webhook URL',
    docsUrl: 'https://zapier.com/apps'
  },
  {
    id: 'make',
    name: 'Make',
    icon: Webhook,
    color: 'from-violet-500 to-purple-600',
    description: 'Visual automation platform',
    apiKeyPlaceholder: 'API Key',
    docsUrl: 'https://www.make.com/en/api-documentation'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: Globe,
    color: 'from-slate-600 to-slate-800',
    description: 'Deploy frontend applications',
    apiKeyPlaceholder: 'Bearer Token',
    docsUrl: 'https://vercel.com/docs'
  }
];
