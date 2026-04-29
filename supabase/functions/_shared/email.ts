import { createClient } from "@supabase/supabase-js";

export type EmailProvider = "resend" | "sendgrid" | "postmark";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailProviderConfig {
  provider: EmailProvider;
  apiKey: string;
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function normalizeProvider(value: unknown): EmailProvider | null {
  const provider = typeof value === "string" ? value.toLowerCase() : "";
  if (provider === "resend" || provider === "sendgrid" || provider === "postmark") {
    return provider;
  }
  return null;
}

async function readVaultSecret(admin: ReturnType<typeof createClient>, secretName: string): Promise<string | null> {
  const { data: decrypted } = await admin
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", secretName)
    .maybeSingle();

  const decryptedSecret = (decrypted as { decrypted_secret?: unknown } | null)?.decrypted_secret;
  if (typeof decryptedSecret === "string" && decryptedSecret) {
    return decryptedSecret;
  }

  const { data: rawSecret } = await admin
    .from("vault.secrets")
    .select("secret")
    .eq("name", secretName)
    .maybeSingle();

  const secret = (rawSecret as { secret?: unknown } | null)?.secret;
  return typeof secret === "string" && secret ? secret : null;
}

export async function getUserEmailProvider(userId: string): Promise<EmailProviderConfig | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();

  const settings = (data as { settings?: Record<string, unknown> } | null)?.settings || {};
  const provider = normalizeProvider(settings.emailProvider);
  if (!provider || settings[`${provider}_configured`] !== true) {
    return null;
  }

  const secretName =
    (typeof settings[`${provider}_secret_name`] === "string" && settings[`${provider}_secret_name`]) ||
    `email_${userId}_${provider}`;
  const apiKey = await readVaultSecret(admin, secretName);

  return apiKey ? { provider, apiKey } : null;
}

export async function getBusinessEmailProvider(businessId: string): Promise<EmailProviderConfig | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("installed_packs")
    .select("config")
    .eq("business_id", businessId)
    .eq("pack_id", "email")
    .eq("status", "active")
    .maybeSingle();

  const config = (data as { config?: Record<string, unknown> } | null)?.config || {};
  const provider = normalizeProvider(config.provider);
  const secretName = typeof config.secretName === "string" ? config.secretName : null;
  if (!provider || !secretName) {
    return null;
  }

  const apiKey = await readVaultSecret(admin, secretName);
  return apiKey ? { provider, apiKey } : null;
}

export async function sendProviderEmail(config: EmailProviderConfig, message: EmailMessage): Promise<void> {
  const from = message.from || Deno.env.get("EMAIL_FROM") || "Unison Tasks <onboarding@resend.dev>";
  const text = message.text || message.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (config.provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend failed with ${response.status}: ${await response.text()}`);
    }
    return;
  }

  if (config.provider === "sendgrid") {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: Deno.env.get("EMAIL_FROM_ADDRESS") || "noreply@unisontasks.com", name: "Unison Tasks" },
        subject: message.subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: message.html },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid failed with ${response.status}: ${await response.text()}`);
    }
    return;
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: from,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.html,
      TextBody: text,
      MessageStream: Deno.env.get("POSTMARK_MESSAGE_STREAM") || "outbound",
    }),
  });

  if (!response.ok) {
    throw new Error(`Postmark failed with ${response.status}: ${await response.text()}`);
  }
}
