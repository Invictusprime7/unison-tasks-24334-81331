/**
 * availabilityGeneration — pure slot-generation logic shared by the initial
 * booking seed and any future ongoing-generation caller (Business Center
 * "generate more availability" action, a scheduled job, etc.).
 *
 * Deliberately has no Supabase dependency so it can be unit-tested without a
 * database and reused from both browser (backendOpExecutor.ts) and edge
 * function contexts.
 */

export interface BusinessHoursWindow {
  /** 0 = Sunday .. 6 = Saturday, matching JS `Date#getDay()` and the
   * `business_hours.day_of_week` column added in
   * `20260813230000_add_staff_and_business_hours.sql`. */
  dayOfWeek: number;
  /** "HH:MM" or "HH:MM:SS", ignored when `isClosed` is true. */
  opensAt?: string | null;
  closesAt?: string | null;
  isClosed?: boolean;
}

export interface GenerateAvailabilitySlotsInput {
  businessId: string;
  serviceId: string;
  /** Slot length. Falls back to 60 for a non-positive or missing value. */
  durationMinutes: number;
  /** Local calendar day the generation window starts on (inclusive). */
  startDate: Date;
  /** How many calendar days ahead to generate, starting at `startDate`. */
  days: number;
  /**
   * The business's configured hours. When empty, every day defaults to the
   * legacy 9am-5pm fallback (preserves prior seedBooking() behavior for
   * businesses that haven't configured hours yet). When non-empty, a day
   * with no matching entry is treated as closed -- the business explicitly
   * owns its schedule once any day is configured.
   */
  hours: readonly BusinessHoursWindow[];
}

export interface GeneratedAvailabilitySlot {
  business_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  is_booked: false;
}

const DEFAULT_OPEN_HOUR = 9;
const DEFAULT_CLOSE_HOUR = 17;

function parseTime(value: string | null | undefined, fallbackHour: number): { hour: number; minute: number } {
  if (!value) return { hour: fallbackHour, minute: 0 };
  const [hourPart, minutePart] = value.split(":");
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);
  return {
    hour: Number.isFinite(hour) ? hour : fallbackHour,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

/** Generate non-overlapping, back-to-back availability slots from business hours. */
export function generateAvailabilitySlots(
  input: GenerateAvailabilitySlotsInput,
): GeneratedAvailabilitySlot[] {
  const durationMinutes = input.durationMinutes > 0 ? input.durationMinutes : 60;
  const days = Math.max(0, Math.floor(input.days));
  const hasConfiguredHours = input.hours.length > 0;
  const byDay = new Map<number, BusinessHoursWindow>();
  for (const window of input.hours) byDay.set(window.dayOfWeek, window);

  const slots: GeneratedAvailabilitySlot[] = [];
  for (let offset = 0; offset < days; offset++) {
    const day = new Date(
      input.startDate.getFullYear(),
      input.startDate.getMonth(),
      input.startDate.getDate() + offset,
    );
    const window = byDay.get(day.getDay());
    if (window?.isClosed) continue;
    // A business with any configured hours owns its full week: an
    // unconfigured day among configured ones is closed, not a silent 9-5.
    if (hasConfiguredHours && !window) continue;

    const open = parseTime(window?.opensAt, DEFAULT_OPEN_HOUR);
    const close = parseTime(window?.closesAt, DEFAULT_CLOSE_HOUR);
    let cursor = new Date(day.getFullYear(), day.getMonth(), day.getDate(), open.hour, open.minute, 0);
    const closesAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), close.hour, close.minute, 0);

    while (true) {
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
      if (slotEnd > closesAt) break;
      slots.push({
        business_id: input.businessId,
        service_id: input.serviceId,
        starts_at: cursor.toISOString(),
        ends_at: slotEnd.toISOString(),
        is_booked: false,
      });
      cursor = slotEnd;
    }
  }
  return slots;
}
