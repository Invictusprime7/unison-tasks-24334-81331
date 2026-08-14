import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('canonicalBooking CRM linkage', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'supabase/functions/_shared/canonicalBooking.ts'),
    'utf8',
  );

  it('links a committed booking to a business-scoped CRM contact and activity', () => {
    expect(source).toContain('linkBookingToCrm');
    expect(source).toContain('FROM public.crm_contacts WHERE business_id = $1::uuid');
    expect(source).toContain('INSERT INTO public.crm_contacts');
    expect(source).toContain('INSERT INTO public.crm_activities');
    // Only columns confirmed present on crm_contacts (first_name/last_name, not a
    // single "name" column) are used -- do not repeat intent-exec's unverified pattern.
    expect(source).not.toMatch(/INSERT INTO public\.crm_contacts[\s\S]{0,300}?\bname\b(?!space)/);
  });

  it('never links a duplicate (idempotent-retry) booking to the CRM', () => {
    const callSite = source.slice(source.indexOf('if (!booking) throw new Error("BOOKING_RESULT_MISSING");'));
    expect(callSite).toContain('if (!booking.duplicate) {');
    expect(callSite.indexOf('if (!booking.duplicate) {')).toBeLessThan(callSite.indexOf('linkBookingToCrm('));
  });

  it('never lets a CRM linkage failure fail an already-committed booking', () => {
    const fn = source.slice(source.indexOf('async function linkBookingToCrm'));
    expect(fn).toContain('try {');
    expect(fn).toContain('} catch (error) {');
    expect(fn).toContain('console.error(');
    // The catch block must not re-throw.
    const catchBlock = fn.slice(fn.indexOf('} catch (error) {'), fn.indexOf('} catch (error) {') + 200);
    expect(catchBlock).not.toContain('throw');
  });
});
