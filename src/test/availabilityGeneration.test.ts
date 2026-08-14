import { describe, expect, it } from 'vitest';
import { generateAvailabilitySlots } from '@/services/availabilityGeneration';

describe('generateAvailabilitySlots', () => {
  // Wednesday, chosen so day-of-week math is unambiguous across the suite.
  const monday = new Date(2026, 7, 17); // 2026-08-17 is a Monday

  it('falls back to a 9am-5pm default when no business hours are configured (preserves prior seedBooking behavior)', () => {
    const slots = generateAvailabilitySlots({
      businessId: 'biz-1',
      serviceId: 'svc-1',
      durationMinutes: 60,
      startDate: monday,
      days: 1,
      hours: [],
    });
    expect(slots).toHaveLength(8); // 9,10,11,12,13,14,15,16 -> ends at 17
    expect(slots[0].starts_at).toBe(new Date(2026, 7, 17, 9, 0, 0).toISOString());
    expect(slots[0].ends_at).toBe(new Date(2026, 7, 17, 10, 0, 0).toISOString());
    expect(slots[slots.length - 1].ends_at).toBe(new Date(2026, 7, 17, 17, 0, 0).toISOString());
    expect(slots.every((s) => s.business_id === 'biz-1' && s.service_id === 'svc-1' && s.is_booked === false)).toBe(true);
  });

  it('uses configured hours for a matching day', () => {
    const slots = generateAvailabilitySlots({
      businessId: 'biz-1',
      serviceId: 'svc-1',
      durationMinutes: 30,
      startDate: monday,
      days: 1,
      hours: [{ dayOfWeek: 1, opensAt: '10:00', closesAt: '11:00' }], // Monday = 1
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].starts_at).toBe(new Date(2026, 7, 17, 10, 0, 0).toISOString());
    expect(slots[1].ends_at).toBe(new Date(2026, 7, 17, 11, 0, 0).toISOString());
  });

  it('treats a day with no matching configured-hours entry as closed once any hours exist', () => {
    const slots = generateAvailabilitySlots({
      businessId: 'biz-1',
      serviceId: 'svc-1',
      durationMinutes: 60,
      startDate: monday, // Monday
      days: 1,
      hours: [{ dayOfWeek: 2, opensAt: '09:00', closesAt: '17:00' }], // only Tuesday configured
    });
    expect(slots).toHaveLength(0);
  });

  it('skips a day explicitly marked is_closed', () => {
    const slots = generateAvailabilitySlots({
      businessId: 'biz-1',
      serviceId: 'svc-1',
      durationMinutes: 60,
      startDate: monday,
      days: 1,
      hours: [{ dayOfWeek: 1, isClosed: true }],
    });
    expect(slots).toHaveLength(0);
  });

  it('never produces a slot that overruns closing time', () => {
    const slots = generateAvailabilitySlots({
      businessId: 'biz-1',
      serviceId: 'svc-1',
      durationMinutes: 45,
      startDate: monday,
      days: 1,
      hours: [{ dayOfWeek: 1, opensAt: '09:00', closesAt: '10:30' }],
    });
    // 9:00-9:45, 9:45-10:30 fits exactly; a third slot would end at 11:15 (overrun)
    expect(slots).toHaveLength(2);
    expect(slots[1].ends_at).toBe(new Date(2026, 7, 17, 10, 30, 0).toISOString());
  });

  it('generates across multiple days honoring per-day-of-week hours', () => {
    const slots = generateAvailabilitySlots({
      businessId: 'biz-1',
      serviceId: 'svc-1',
      durationMinutes: 60,
      startDate: monday,
      days: 7,
      hours: [
        { dayOfWeek: 1, opensAt: '09:00', closesAt: '10:00' }, // Monday: 1 slot
        { dayOfWeek: 6, isClosed: true }, // Saturday closed
        { dayOfWeek: 0, isClosed: true }, // Sunday closed
        { dayOfWeek: 2, opensAt: '09:00', closesAt: '11:00' },
        { dayOfWeek: 3, opensAt: '09:00', closesAt: '11:00' },
        { dayOfWeek: 4, opensAt: '09:00', closesAt: '11:00' },
        { dayOfWeek: 5, opensAt: '09:00', closesAt: '11:00' },
      ],
    });
    // Mon:1 + Tue-Fri: 2 each (8) + Sat/Sun:0 = 9
    expect(slots).toHaveLength(9);
  });
});
