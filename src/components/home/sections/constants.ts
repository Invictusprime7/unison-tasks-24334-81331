import { 
  Layers, 
  Zap, 
  Bot, 
  Workflow, 
  Shield, 
  Sparkles,
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
    title: "Ready-to-Run Systems",
    description: "Not just templates. Complete business systems with booking, payments, and CRM pre-wired."
  },
  {
    icon: Zap,
    title: "Buttons That Work",
    description: "Every button knows what it does. Forms submit, carts update, bookings confirm—automatically."
  },
  {
    icon: Bot,
    title: "AI That Understands Context",
    description: "Generate pages, copy, and features that understand your business type and goals."
  },
  {
    icon: Workflow,
    title: "Built-in Automation",
    description: "Lead capture, email notifications, and CRM updates happen without extra setup."
  },
  {
    icon: Shield,
    title: "Enterprise-Ready",
    description: "Secure infrastructure, custom domains, and SSO for growing teams."
  },
  {
    icon: Sparkles,
    title: "One-Click Launch",
    description: "From template to live website in minutes. No deployment headaches."
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
