const cleanEnvValue = (value: unknown): string => {
  if (typeof value !== 'string') return '';

  // Trim and defensively strip pasted quotes/newlines that commonly leak from
  // copied dashboard values and break Supabase auth headers.
  const normalized = value
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/[\r\n]/g, '')
    .replace(/%0d|%0a/gi, '')
    .replace(/\s+/g, '');

  // Decode once so encoded control characters can be removed if present.
  try {
    return decodeURIComponent(normalized)
      .replace(/[\r\n]/g, '')
      .replace(/%0d|%0a/gi, '')
      .replace(/\s+/g, '');
  } catch {
    return normalized;
  }
};

export const SUPABASE_URL =
  cleanEnvValue(import.meta.env.VITE_SUPABASE_URL) ||
  'https://nfrdomdvyrbwuokathtw.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  cleanEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseEnvConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
