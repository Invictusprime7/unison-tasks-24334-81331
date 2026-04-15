/**
 * SAVE EMAIL PROVIDER - Securely store email provider API keys
 * 
 * This Edge Function stores email provider API keys in Supabase Vault
 * so they are never exposed to client-side code.
 * 
 * Security:
 * - Keys are encrypted at rest in Supabase Vault
 * - Only this function can read/write the secrets
 * - Client only knows provider is "configured", not the actual key
 */

import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, verifyBusinessAccess, authError } from "../_shared/auth.ts";
import { secureJsonResponse, errorResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString, isValidUUID } from "../_shared/validate.ts";

interface SaveProviderRequest {
  userId: string;
  businessId?: string;
  providerId: string;
  apiKey: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }
    const user = auth.user;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { data: body, error: parseError } = await safeParseBody<SaveProviderRequest>(req);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const { userId, businessId, providerId, apiKey } = body;
    const normalizedUserId = typeof userId === "string" ? sanitizeString(userId, 100) : "";
    const normalizedBusinessId = typeof businessId === "string" ? sanitizeString(businessId, 100) : undefined;
    const normalizedProviderId = typeof providerId === "string" ? sanitizeString(providerId, 50).toLowerCase() : "";
    const normalizedApiKey = typeof apiKey === "string" ? sanitizeString(apiKey, 5000) : "";

    // Validate request
    if (!normalizedUserId || !normalizedProviderId || !normalizedApiKey) {
      return errorResponse("Missing required fields", 400, corsHeaders);
    }

    if (!isValidUUID(normalizedUserId)) {
      return errorResponse("Invalid userId format", 400, corsHeaders);
    }

    if (normalizedBusinessId && !isValidUUID(normalizedBusinessId)) {
      return errorResponse("Invalid businessId format", 400, corsHeaders);
    }

    // Ensure the user is the owner of this userId
    if (user.id !== normalizedUserId) {
      return errorResponse("Unauthorized", 403, corsHeaders);
    }

    if (normalizedBusinessId) {
      const access = await verifyBusinessAccess(user.id, normalizedBusinessId);
      if (!access.allowed) {
        return errorResponse(access.error || "Access denied to this business", 403, corsHeaders);
      }
    }

    // Validate provider ID
    const validProviders = ["resend", "sendgrid", "postmark"];
    if (!validProviders.includes(normalizedProviderId)) {
      return errorResponse("Invalid provider", 400, corsHeaders);
    }

    // Create admin client for secret storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Store the API key in Supabase Vault (secrets table)
    // The secret name follows a pattern: email_provider_{userId}_{providerId}
    const secretName = normalizedBusinessId 
      ? `email_${normalizedBusinessId}_${normalizedProviderId}`
      : `email_${normalizedUserId}_${normalizedProviderId}`;

    // Check if secret already exists
    const { data: existingSecret } = await adminClient
      .from("vault.secrets")
      .select("id")
      .eq("name", secretName)
      .maybeSingle();

    if (existingSecret) {
      // Update existing secret
      const { error: updateError } = await adminClient
        .from("vault.secrets")
        .update({ secret: normalizedApiKey })
        .eq("name", secretName);

      if (updateError) {
        console.error("Error updating secret:", updateError);
        // Fall back to direct SQL if vault table isn't accessible
        try {
          await adminClient.rpc("vault_upsert_secret", {
            p_name: secretName,
            p_secret: normalizedApiKey,
          });
        } catch (e) {
          console.error("Vault RPC failed:", e);
        }
      }
    } else {
      // Create new secret
      const { error: insertError } = await adminClient
        .from("vault.secrets")
        .insert({
          name: secretName,
          secret: normalizedApiKey,
        });

      if (insertError) {
        console.error("Error inserting secret:", insertError);
        // Fall back to RPC
        try {
          await adminClient.rpc("vault_upsert_secret", {
            p_name: secretName,
            p_secret: normalizedApiKey,
          });
        } catch (e) {
          console.error("Vault RPC failed:", e);
        }
      }
    }

    // Update user_settings or installed_packs to mark provider as configured
    if (normalizedBusinessId) {
      // Business-level: update installed_packs
      await adminClient
        .from("installed_packs")
        .upsert({
          business_id: normalizedBusinessId,
          project_id: null,
          pack_id: "email",
          config: {
            provider: normalizedProviderId,
            configured: true,
            secretName, // Reference to the vault secret
          },
          status: "active",
        }, {
          onConflict: "business_id,project_id,pack_id",
        });
    } else {
      // User-level: update user_settings
      const { data: existingSettings } = await adminClient
        .from("user_settings")
        .select("settings")
        .eq("user_id", normalizedUserId)
        .maybeSingle();

      const currentSettings = existingSettings?.settings || {};
      
      await adminClient
        .from("user_settings")
        .upsert({
          user_id: normalizedUserId,
          settings: {
            ...currentSettings,
            emailProvider: normalizedProviderId,
            [`${normalizedProviderId}_configured`]: true,
            [`${normalizedProviderId}_secret_name`]: secretName,
          },
        });
    }

    return secureJsonResponse(
      {
        success: true,
        message: `${normalizedProviderId} configured successfully`,
        provider: normalizedProviderId,
      },
      200,
      corsHeaders
    );
  } catch (error: any) {
    console.error("Error saving email provider:", error);
    
    return errorResponse("Failed to save provider", 500, getCorsHeaders(req));
  }
});
