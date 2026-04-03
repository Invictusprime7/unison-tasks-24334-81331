// Type definitions for Supabase Edge Functions
// ...existing code...
// Type definitions for Supabase Edge Functions

export interface Pattern {
  pattern_type: string;
  description?: string;
  usage_count: number;
  success_rate: number;
  tags?: string[];
  example?: string;
  code_snippet?: string;
}

export interface LearnedConversation {
  id: string;
  messages: Array<{ role: string; content: string }>;
  pattern_type: string;
  success: boolean;
  created_at: string;
}

export interface RequestBody {
  messages: Array<{ role: string; content: string }>;
  mode?: string;
  savePattern?: boolean;
}