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