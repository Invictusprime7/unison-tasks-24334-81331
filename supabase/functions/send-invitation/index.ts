import { serve } from "serve";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, isValidUUID, sanitizeString } from "../_shared/validate.ts";
import { getAdminClient, getUserEmailProvider, sendProviderEmail } from "../_shared/email.ts";

interface SendInvitationRequest {
  invitationId: string;
  email: string;
  organizationId: string;
}

function buildInviteUrl(token: string): string {
  const appUrl = Deno.env.get("APP_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://unisontasks.com";
  return `${appUrl.replace(/\/$/, "")}/accept-invitation?token=${encodeURIComponent(token)}`;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }

    const { data: body, error: parseError } = await safeParseBody<SendInvitationRequest>(req);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const invitationId = sanitizeString(body.invitationId || "", 100);
    const organizationId = sanitizeString(body.organizationId || "", 100);
    const email = sanitizeString(body.email || "", 320).toLowerCase();

    if (!isValidUUID(invitationId) || !isValidUUID(organizationId) || !email.includes("@")) {
      return errorResponse("Invalid invitation request", 400, corsHeaders);
    }

    const admin = getAdminClient();
    const { data: invitation, error: inviteError } = await admin
      .from("team_invitations")
      .select("id, organization_id, email, role, token, status, expires_at, invited_by")
      .eq("id", invitationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (inviteError) {
      console.error("[send-invitation] invitation lookup failed:", inviteError);
      return errorResponse("Invitation lookup failed", 500, corsHeaders);
    }

    if (!invitation) {
      return errorResponse("Invitation not found", 404, corsHeaders);
    }

    const invite = invitation as {
      id: string;
      organization_id: string;
      email: string;
      role: string;
      token?: string | null;
      status?: string | null;
      expires_at?: string | null;
      invited_by: string;
    };

    if (invite.email.toLowerCase() !== email) {
      return errorResponse("Invitation email mismatch", 400, corsHeaders);
    }

    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const memberRole = (membership as { role?: string } | null)?.role;
    const canSend = invite.invited_by === auth.user.id || memberRole === "owner" || memberRole === "admin";
    if (!canSend) {
      return errorResponse("Unauthorized", 403, corsHeaders);
    }

    if (invite.status && invite.status !== "pending") {
      return errorResponse("Invitation is not pending", 409, corsHeaders);
    }

    const config = await getUserEmailProvider(auth.user.id);
    if (!config) {
      return secureJsonResponse(
        { success: true, skipped: true, reason: "email_provider_not_configured" },
        200,
        corsHeaders,
      );
    }

    const inviteUrl = buildInviteUrl(invite.token || invite.id);
    await sendProviderEmail(config, {
      to: email,
      subject: "You have been invited to Unison Tasks",
      html: [
        "<h1>You have been invited to Unison Tasks</h1>",
        `<p>You were invited as <strong>${invite.role}</strong>.</p>`,
        `<p><a href="${inviteUrl}">Accept your invitation</a></p>`,
        invite.expires_at ? `<p>This invitation expires at ${invite.expires_at}.</p>` : "",
      ].join(""),
      text: `You have been invited to Unison Tasks as ${invite.role}. Accept: ${inviteUrl}`,
    });

    return secureJsonResponse(
      { success: true, invitationId, email },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("[send-invitation] failed:", error);
    return errorResponse("Failed to send invitation", 500, corsHeaders);
  }
});
