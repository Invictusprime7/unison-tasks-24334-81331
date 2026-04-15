/**
 * Shared Authentication Middleware for Supabase Edge Functions
 * 
 * Provides JWT verification, user extraction, and business ownership
 * validation for all edge functions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
  status: number;
}

/** Cached Supabase admin client (service role) */
let _adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient(): ReturnType<typeof createClient> {
  if (_adminClient) return _adminClient;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  _adminClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _adminClient;
}

/**
 * Extract and verify the Bearer JWT from the Authorization header.
 * Returns the authenticated user or an error.
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: "Invalid or expired token", status: 401 };
    }

    return {
      user: {
        id: user.id,
        email: user.email || "",
        role: user.role || "authenticated",
      },
      error: null,
      status: 200,
    };
  } catch (err) {
    console.error("[auth] Token verification failed:", err);
    return { user: null, error: "Authentication service unavailable", status: 503 };
  }
}

/**
 * Verify that a user owns or has access to a given business.
 * Call after verifyAuth() to enforce business-level authorization.
 */
export async function verifyBusinessAccess(
  userId: string,
  businessId: string
): Promise<{ allowed: boolean; error?: string }> {
  if (!businessId) {
    return { allowed: false, error: "businessId is required" };
  }

  try {
    const admin = getAdminClient();

    // Check if user owns the business
    const { data: business } = await admin
      .from("businesses")
      .select("id, owner_id, organization_id")
      .eq("id", businessId)
      .maybeSingle();

    if (!business) {
      return { allowed: false, error: "Business not found" };
    }

    if (business.owner_id === userId) {
      return { allowed: true };
    }

    // Check explicit business membership when available
    const { data: businessMember } = await admin
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .maybeSingle();

    if (businessMember) {
      return { allowed: true };
    }

    // Check organization membership
    if (business.organization_id) {
      const { data: orgMember } = await admin
        .from("organization_members")
        .select("role")
        .eq("organization_id", business.organization_id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (orgMember) {
        return { allowed: true };
      }
    }

    return { allowed: false, error: "Access denied to this business" };
  } catch (err) {
    console.error("[auth] Business access check failed:", err);
    return { allowed: false, error: "Authorization check failed" };
  }
}

/**
 * Create an error response with consistent format.
 */
export function authError(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
