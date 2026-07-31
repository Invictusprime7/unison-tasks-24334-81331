import { createClient } from "npm:@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { publicCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { secureJsonResponse, errorResponse } from "../_shared/response.ts";
import { safeParseBody } from "../_shared/validate.ts";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";

const RATE_LIMIT_CONFIG = { maxRequests: 60, windowSeconds: 60 };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RuntimeSlot = {
  slot?: unknown;
  intent?: unknown;
  status?: unknown;
};

type RuntimeComponent = {
  instanceId?: unknown;
  componentSlug?: unknown;
  pageLess?: unknown;
  catalogSurfaces?: unknown;
  writeIntent?: unknown;
  slots?: unknown;
};

type PersistedRuntimeManifest = {
  version: string;
  siteId: string;
  snapshotId: string | null;
  readiness: { status: "ready" | "blocked"; blockers: string[] };
  enabledCapabilities: string[];
  components: RuntimeComponent[];
};

type RuntimeContext = {
  businessId: string;
  manifest: PersistedRuntimeManifest;
};

type BookingActionPayload = {
  componentId: string;
  slot: string;
  serviceId: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
};

class RuntimeActionError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseManifest(value: unknown, siteId: string): PersistedRuntimeManifest | null {
  const manifest = asRecord(value);
  const readiness = asRecord(manifest?.readiness);
  if (
    !manifest ||
    manifest.version !== "1.0" ||
    manifest.siteId !== siteId ||
    (typeof manifest.snapshotId !== "string" && manifest.snapshotId !== null) ||
    !readiness ||
    (readiness.status !== "ready" && readiness.status !== "blocked") ||
    !Array.isArray(readiness.blockers) ||
    !readiness.blockers.every((blocker) => typeof blocker === "string") ||
    !Array.isArray(manifest.enabledCapabilities) ||
    !manifest.enabledCapabilities.every((capability) => typeof capability === "string") ||
    !Array.isArray(manifest.components)
  ) {
    return null;
  }

  return {
    version: manifest.version,
    siteId,
    snapshotId: manifest.snapshotId,
    readiness: {
      status: readiness.status,
      blockers: readiness.blockers,
    },
    enabledCapabilities: manifest.enabledCapabilities,
    components: manifest.components,
  };
}

async function loadRuntimeManifest(supabase: ReturnType<typeof createClient>, siteId: string) {
  const [siteResult, runtimeResult] = await Promise.all([
    supabase.from("sites").select("id,business_id,status").eq("id", siteId).maybeSingle(),
    supabase.from("site_runtime_configs").select("site_id,public_runtime_enabled,settings").eq("site_id", siteId).maybeSingle(),
  ]);
  if (siteResult.error || runtimeResult.error) return null;
  if (!siteResult.data || !runtimeResult.data?.public_runtime_enabled) return null;
  if (!['preview', 'published'].includes(siteResult.data.status)) return null;

  const manifest = parseManifest(runtimeResult.data.settings?.generatedSiteRuntimeManifest, siteId);
  return manifest && typeof siteResult.data.business_id === "string"
    ? { businessId: siteResult.data.business_id, manifest }
    : null;
}

function publicManifest(manifest: PersistedRuntimeManifest) {
  return {
    version: manifest.version,
    siteId: manifest.siteId,
    snapshotId: manifest.snapshotId,
    readiness: manifest.readiness,
    components: manifest.components.flatMap((component) => {
      if (
        typeof component.instanceId !== "string" ||
        typeof component.componentSlug !== "string" ||
        typeof component.pageLess !== "boolean"
      ) return [];
      const reads = Array.isArray(component.catalogSurfaces)
        ? component.catalogSurfaces.filter((surface): surface is string => typeof surface === "string")
        : [];
      const intents = Array.isArray(component.slots)
        ? component.slots.flatMap((slot) => {
            const runtimeSlot = asRecord(slot) as RuntimeSlot | null;
            return typeof runtimeSlot?.intent === "string" && runtimeSlot.status === "ready"
              ? [{ slot: typeof runtimeSlot.slot === "string" ? runtimeSlot.slot : null, intent: runtimeSlot.intent }]
              : [];
          })
        : [];
      return [{
        instanceId: component.instanceId,
        componentSlug: component.componentSlug,
        pageLess: component.pageLess,
        reads,
        intents,
      }];
    }),
  };
}

function buildReadPayload(body: Record<string, unknown>, siteId: string): Record<string, unknown> | null {
  const read = asRecord(body.read);
  if (!read || (read.type !== "profile" && read.type !== "catalog")) return null;
  if (read.type === "profile") return { type: "profile", siteId };

  const pagePath = typeof read.pagePath === "string" && read.pagePath.startsWith("/")
    ? read.pagePath.slice(0, 500)
    : "/";
  return {
    type: "catalog",
    siteId,
    pagePath,
    sectionId: typeof read.sectionId === "string" ? read.sectionId.slice(0, 200) : null,
    sectionType: typeof read.sectionType === "string" ? read.sectionType.slice(0, 100) : null,
    occurrenceIndex: typeof read.occurrenceIndex === "number" && read.occurrenceIndex >= 0
      ? Math.floor(read.occurrenceIndex)
      : 0,
  };
}

function parseBookingAction(body: Record<string, unknown>): BookingActionPayload | null {
  const action = asRecord(body.action);
  const payload = asRecord(action?.payload);
  if (
    !action ||
    action.intent !== "booking.create" ||
    typeof action.componentId !== "string" ||
    action.componentId.length === 0 ||
    action.componentId.length > 200 ||
    typeof action.slot !== "string" ||
    action.slot.length === 0 ||
    action.slot.length > 120 ||
    !payload ||
    !isUuid(payload.serviceId) ||
    !isUuid(payload.slotId) ||
    typeof payload.customerName !== "string" ||
    payload.customerName.trim().length < 2 ||
    payload.customerName.trim().length > 120 ||
    typeof payload.customerEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.customerEmail.trim()) ||
    payload.customerEmail.trim().length > 255
  ) return null;

  const customerPhone = typeof payload.customerPhone === "string"
    ? payload.customerPhone.trim().slice(0, 40) || null
    : null;
  const notes = typeof payload.notes === "string"
    ? payload.notes.trim().slice(0, 2_000) || null
    : null;
  return {
    componentId: action.componentId,
    slot: action.slot,
    serviceId: payload.serviceId,
    slotId: payload.slotId,
    customerName: payload.customerName.trim(),
    customerEmail: payload.customerEmail.trim().toLowerCase(),
    customerPhone,
    notes,
  };
}

function isBookingActionAuthorized(manifest: PersistedRuntimeManifest, action: BookingActionPayload): boolean {
  if (!manifest.enabledCapabilities.includes("booking")) return false;
  return manifest.components.some((component) => {
    if (component.instanceId !== action.componentId || component.writeIntent !== "booking.create") return false;
    return Array.isArray(component.slots) && component.slots.some((candidate) => {
      const slot = asRecord(candidate) as RuntimeSlot | null;
      return slot?.slot === action.slot && slot.intent === "booking.create" && slot.status === "ready";
    });
  });
}

async function bookingCapabilityIsEnabled(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("site_capabilities")
    .select("capability_id")
    .eq("site_id", siteId)
    .eq("capability_id", "booking")
    .eq("status", "enabled")
    .maybeSingle();
  return !error && Boolean(data);
}

async function createAtomicBooking(
  businessId: string,
  siteId: string,
  action: BookingActionPayload,
): Promise<{ id: string; startsAt: string; endsAt: string; serviceName: string }> {
  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!databaseUrl) throw new RuntimeActionError(503, "Runtime booking service is unavailable");
  const pg = new PgClient(databaseUrl);
  await pg.connect();
  try {
    await pg.queryArray("BEGIN");
    const slotResult = await pg.queryObject<{
      id: string;
      business_id: string;
      service_id: string | null;
      starts_at: string;
      ends_at: string;
      is_booked: boolean;
    }>(
      `SELECT id, business_id, service_id, starts_at, ends_at, is_booked
       FROM public.availability_slots
       WHERE id = $1 AND business_id = $2
       FOR UPDATE`,
      [action.slotId, businessId],
    );
    const slot = slotResult.rows[0];
    if (!slot || slot.is_booked) throw new RuntimeActionError(409, "Selected time slot is not available");
    if (slot.service_id && slot.service_id !== action.serviceId) {
      throw new RuntimeActionError(400, "Selected time slot is not available for this service");
    }

    const serviceResult = await pg.queryObject<{ id: string; name: string; duration_minutes: number }>(
      `SELECT id, name, duration_minutes
       FROM public.services
       WHERE id = $1 AND business_id = $2 AND is_active = true`,
      [action.serviceId, businessId],
    );
    const service = serviceResult.rows[0];
    if (!service) throw new RuntimeActionError(400, "Selected service is not available");

    const claimedSlot = await pg.queryObject<{ id: string }>(
      `UPDATE public.availability_slots
       SET is_booked = true
       WHERE id = $1 AND business_id = $2 AND is_booked = false
       RETURNING id`,
      [action.slotId, businessId],
    );
    if (!claimedSlot.rows[0]) throw new RuntimeActionError(409, "Selected time slot is not available");

    const startsAt = new Date(slot.starts_at).toISOString();
    const endsAt = new Date(slot.ends_at).toISOString();
    const booking = await pg.queryObject<{ id: string }>(
      `INSERT INTO public.bookings
        (business_id, service_id, service_name, customer_name, customer_email, customer_phone,
         booking_date, booking_time, starts_at, ends_at, duration_minutes, status, notes, metadata)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7::date, $8::time, $9::timestamptz, $10::timestamptz, $11, 'confirmed', $12, $13::jsonb)
       RETURNING id`,
      [
        businessId,
        service.id,
        service.name,
        action.customerName,
        action.customerEmail,
        action.customerPhone,
        startsAt.slice(0, 10),
        startsAt.slice(11, 19),
        startsAt,
        endsAt,
        service.duration_minutes,
        action.notes,
        JSON.stringify({ siteId, slotId: slot.id, runtime: "site-runtime@1.0" }),
      ],
    );
    await pg.queryArray("COMMIT");
    return { id: booking.rows[0].id, startsAt, endsAt, serviceName: service.name };
  } catch (error) {
    try { await pg.queryArray("ROLLBACK"); } catch { /* connection already closed */ }
    throw error;
  } finally {
    try { await pg.end(); } catch { /* no-op */ }
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req, publicCorsHeaders);
  if (preflight) return preflight;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, publicCorsHeaders);

  const limiter = checkRateLimit("site-runtime", getClientIp(req), RATE_LIMIT_CONFIG);
  const rateHeaders = rateLimitHeaders(limiter, RATE_LIMIT_CONFIG);
  if (!limiter.allowed) {
    return secureJsonResponse({ success: false, error: "Too many runtime requests. Please try again later." }, 429, publicCorsHeaders, rateHeaders);
  }

  const { data: body, error: bodyError } = await safeParseBody<Record<string, unknown>>(req, 16_384);
  if (bodyError || !body || !isUuid(body.siteId)) {
    return errorResponse("Invalid site runtime request", 400, publicCorsHeaders);
  }
  if (body.operation !== "bootstrap" && body.operation !== "read" && body.operation !== "action") {
    return errorResponse("Unsupported site runtime operation", 400, publicCorsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) {
    console.error("[site-runtime] missing Supabase server credentials");
    return errorResponse("Runtime temporarily unavailable", 503, publicCorsHeaders);
  }
  const supabase = createClient(supabaseUrl, secretKey);
  const context = await loadRuntimeManifest(supabase, body.siteId);
  if (!context) return errorResponse("Site runtime is unavailable", 404, publicCorsHeaders);
  if (body.runtimeVersion !== context.manifest.version) {
    return errorResponse("Site runtime version is unavailable", 409, publicCorsHeaders);
  }

  if (body.operation === "bootstrap") {
    return secureJsonResponse({ success: true, runtime: publicManifest(context.manifest) }, 200, publicCorsHeaders, rateHeaders);
  }
  if (body.operation === "action") {
    const bookingAction = parseBookingAction(body);
    if (!bookingAction) return errorResponse("This runtime action is not configured for the site", 409, publicCorsHeaders);
    if (!isBookingActionAuthorized(context.manifest, bookingAction)) {
      return errorResponse("This runtime action is not configured for the site", 409, publicCorsHeaders);
    }
    if (!(await bookingCapabilityIsEnabled(supabase, body.siteId))) {
      return errorResponse("This runtime action is not configured for the site", 409, publicCorsHeaders);
    }
    try {
      const booking = await createAtomicBooking(context.businessId, body.siteId, bookingAction);
      return secureJsonResponse({ success: true, booking }, 201, publicCorsHeaders, rateHeaders);
    } catch (error) {
      if (error instanceof RuntimeActionError) {
        return errorResponse(error.message, error.status, publicCorsHeaders);
      }
      console.error("[site-runtime] booking action failed", error);
      return errorResponse("Runtime booking service is unavailable", 503, publicCorsHeaders);
    }
  }

  const readPayload = buildReadPayload(body, body.siteId);
  if (!readPayload) return errorResponse("Invalid site runtime read request", 400, publicCorsHeaders);
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/site-runtime-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readPayload),
    });
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { ...publicCorsHeaders, ...rateHeaders, "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("[site-runtime] read adapter failed", error);
    return errorResponse("Runtime temporarily unavailable", 503, publicCorsHeaders);
  }
});