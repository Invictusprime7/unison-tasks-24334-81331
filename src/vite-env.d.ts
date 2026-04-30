/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_LOVABLE_API_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_CLAUDE_API_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
  readonly VITE_ENABLE_ROUTE_SHELLS?: string;
  readonly VITE_ROUTE_SHELLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
