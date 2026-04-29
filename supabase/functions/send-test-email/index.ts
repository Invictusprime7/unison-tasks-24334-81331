import { serve } from "serve";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, isValidUUID, sanitizeString } from "../_shared/validate.ts";
import { getUserEmailProvider, sendProviderEmail } from "../_shared/email.ts";

interface SendTestEmailRequest {
  userId: string;
  providerId: string;
  to: string;
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

    const { data: body, error: parseError } = await safeParseBody<SendTestEmailRequest>(req);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const userId = sanitizeString(body.userId || "", 100);
    const providerId = sanitizeString(body.providerId || "", 50).toLowerCase();
    const to = sanitizeString(body.to || "", 320);

    if (!isValidUUID(userId) || !providerId || !to.includes("@")) {
      return errorResponse("Invalid test email request", 400, corsHeaders);
    }

    if (auth.user.id !== userId) {
      return errorResponse("Unauthorized", 403, corsHeaders);
    }

    const config = await getUserEmailProvider(userId);
    if (!config || config.provider !== providerId) {
      return errorResponse("Email provider is not configured", 404, corsHeaders);
    }

    await sendProviderEmail(config, {
      to,
      subject: "Unison Tasks test email",
      html: [
        "<h1>Unison Tasks email is connected</h1>",
        "<p>This test confirms your email provider is configured and reachable.</p>",
      ].join(""),
    });

    return secureJsonResponse(
      { success: true, provider: config.provider, to },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("[send-test-email] failed:", error);
    return errorResponse("Failed to send test email", 500, corsHeaders);
  }
});
