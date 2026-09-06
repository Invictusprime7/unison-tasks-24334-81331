import { Client as PgClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

export type CanonicalBookingInput = {
  businessId: string;
  siteId: string;
  serviceId: string;
  slotId: string;
  sessionId: string;
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  source: string;
};

export type CanonicalBookingResult = {
  booking: {
    id: string;
    startsAt: string;
    endsAt: string;
    serviceName: string;
    status: string;
  };
  duplicate: boolean;
};

export class CanonicalBookingError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function normalizeBookingError(error: unknown): CanonicalBookingError {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("BOOKING_INPUT_INVALID")) {
    return new CanonicalBookingError(400, "Invalid booking details");
  }
  if (message.includes("BOOKING_SLOT_SERVICE_MISMATCH")) {
    return new CanonicalBookingError(400, "Selected time slot is not available for this service");
  }
  if (message.includes("BOOKING_SERVICE_UNAVAILABLE")) {
    return new CanonicalBookingError(400, "Selected service is not available");
  }
  if (message.includes("BOOKING_SLOT_UNAVAILABLE")) {
    return new CanonicalBookingError(409, "Selected time slot is not available");
  }
  if (message.includes("BOOKING_SITE_UNAVAILABLE") || message.includes("BOOKING_CAPABILITY_UNAVAILABLE")) {
    return new CanonicalBookingError(409, "Booking runtime is unavailable");
  }
  return new CanonicalBookingError(503, "Runtime booking service is unavailable");
}

function splitCustomerName(customerName: string): { firstName: string; lastName: string | null } {
  const parts = customerName.trim().split(/\s+/);
  return { firstName: parts[0] || customerName, lastName: parts.length > 1 ? parts.slice(1).join(" ") : null };
}

/**
 * Best-effort CRM linkage: record the booking's customer as a business-scoped
 * contact and log a business-scoped activity. Runs after the booking already
 * committed, on the same connection, and never throws — a CRM write failure
 * must never turn an already-successful booking into an error response.
 * Only columns confirmed present on crm_contacts/crm_activities are used
 * (see supabase/migrations/20251205113651_..., 20260416000002_crm_business_scoping.sql,
 * 20260712043952_...sql, 20260723183703_...sql).
 */
async function linkBookingToCrm(
  pg: PgClient,
  input: CanonicalBookingInput,
  booking: { id: string; serviceName: string },
): Promise<void> {
  try {
    const { firstName, lastName } = splitCustomerName(input.customerName);
    const existing = await pg.queryObject<{ id: string }>(
      `SELECT id FROM public.crm_contacts WHERE business_id = $1::uuid AND lower(email) = lower($2::text) LIMIT 1`,
      [input.businessId, input.customerEmail],
    );
    let contactId = existing.rows[0]?.id;
    if (!contactId) {
      const inserted = await pg.queryObject<{ id: string }>(
        `INSERT INTO public.crm_contacts (business_id, email, first_name, last_name, phone, source, tags)
         VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, 'booking', ARRAY['booking']::text[])
         RETURNING id`,
        [input.businessId, input.customerEmail, firstName, lastName, input.customerPhone],
      );
      contactId = inserted.rows[0]?.id;
    }

    await pg.queryObject(
      `INSERT INTO public.crm_activities (business_id, activity_type, title, description, contact_id, completed_at)
       VALUES ($1::uuid, 'booking', $2::text, $3::text, $4::uuid, now())`,
      [
        input.businessId,
        `Booking: ${booking.serviceName}`,
        input.notes || `${input.customerName} booked ${booking.serviceName} (booking ${booking.id}).`,
        contactId ?? null,
      ],
    );
  } catch (error) {
    console.error("[canonicalBooking] CRM linkage failed (booking already committed)", error);
  }
}

export async function createCanonicalBooking(
  input: CanonicalBookingInput,
): Promise<CanonicalBookingResult> {
  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!databaseUrl) throw new CanonicalBookingError(503, "Runtime booking service is unavailable");

  const pg = new PgClient(databaseUrl);
  await pg.connect();
  try {
    const result = await pg.queryObject<{
      booking_id: string;
      starts_at: string;
      ends_at: string;
      service_name: string;
      status: string;
      duplicate: boolean;
    }>(
      `SELECT * FROM private.create_atomic_booking(
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::text, $6::text,
        $7::text, $8::text, $9::text, $10::text, $11::text
      )`,
      [
        input.businessId,
        input.siteId,
        input.serviceId,
        input.slotId,
        input.sessionId,
        input.idempotencyKey,
        input.customerName,
        input.customerEmail,
        input.customerPhone,
        input.notes,
        input.source,
      ],
    );
    const booking = result.rows[0];
    if (!booking) throw new Error("BOOKING_RESULT_MISSING");
    if (!booking.duplicate) {
      await linkBookingToCrm(pg, input, { id: booking.booking_id, serviceName: booking.service_name });
    }
    return {
      booking: {
        id: booking.booking_id,
        startsAt: new Date(booking.starts_at).toISOString(),
        endsAt: new Date(booking.ends_at).toISOString(),
        serviceName: booking.service_name,
        status: booking.status,
      },
      duplicate: booking.duplicate,
    };
  } catch (error) {
    throw normalizeBookingError(error);
  } finally {
    try { await pg.end(); } catch { /* no-op */ }
  }
}