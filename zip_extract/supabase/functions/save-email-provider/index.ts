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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SaveProviderRequest {
  userId: string;
  businessId?: string;
  providerId: string;
  apiKey: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's JWT to verify authentication
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SaveProviderRequest = await req.json();
    const { userId, businessId, providerId, apiKey } = body;

    // Validate request
    if (!userId || !providerId || !apiKey) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure the user is the owner of this userId
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate provider ID
    const validProviders = ["resend", "sendgrid", "postmark"];
    if (!validProviders.includes(providerId)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client for secret storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Store the API key in Supabase Vault (secrets table)
    // The secret name follows a pattern: email_provider_{userId}_{providerId}
    const secretName = businessId 
      ? `email_${businessId}_${providerId}`
      : `email_${userId}_${providerId}`;

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
        .update({ secret: apiKey })
        .eq("name", secretName);

      if (updateError) {
        console.error("Error updating secret:", updateError);
        // Fall back to direct SQL if vault table isn't accessible
        try {
          await adminClient.rpc("vault_upsert_secret", {
            p_name: secretName,
            p_secret: apiKey,
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
          secret: apiKey,
        });

      if (insertError) {
        console.error("Error inserting secret:", insertError);
        // Fall back to RPC
        try {
          await adminClient.rpc("vault_upsert_secret", {
            p_name: secretName,
            p_secret: apiKey,
          });
        } catch (e) {
          console.error("Vault RPC failed:", e);
        }
      }
    }

    // Update user_settings or installed_packs to mark provider as configured
    if (businessId) {
      // Business-level: update installed_packs
      await adminClient
        .from("installed_packs")
        .upsert({
          business_id: businessId,
          project_id: null,
          pack_id: "email",
          config: {
            provider: providerId,
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
        .eq("user_id", userId)
        .maybeSingle();

      const currentSettings = existingSettings?.settings || {};
      
      await adminClient
        .from("user_settings")
        .upsert({
          user_id: userId,
          settings: {
            ...currentSettings,
            emailProvider: providerId,
            [`${providerId}_configured`]: true,
            [`${providerId}_secret_name`]: secretName,
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${providerId} configured successfully`,
        provider: providerId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error saving email provider:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to save provider",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
