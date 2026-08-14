import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('staff and business_hours schema (Stage 2 scope: services, staff, locations, hours, availability)', () => {
  const migration = readdirSync(resolve(process.cwd(), 'supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .map((file) => readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8'))
    .find((source) => source.includes('CREATE TABLE IF NOT EXISTS public.business_hours'));

  it('adds a tenant-scoped business_hours table with RLS', () => {
    expect(migration).toBeTruthy();
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.business_hours');
    expect(migration).toContain('business_id uuid NOT NULL REFERENCES public.businesses(id)');
    expect(migration).toContain('ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('public.is_business_member(business_id)');
  });

  it('allows public read of business_hours (visitors must see stated hours before booking)', () => {
    expect(migration).toContain('CREATE POLICY "business_hours_select_public"');
    expect(migration).toContain('TO anon, authenticated');
  });

  it('adds a tenant-scoped staff table with RLS and no public policy', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.staff');
    expect(migration).toContain('ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "staff_member_access"');
    expect(migration).not.toContain('staff_select_public');
  });

  it('adds a nullable staff_id column to availability_slots (additive, no backfill required)', () => {
    expect(migration).toContain('ALTER TABLE public.availability_slots');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL');
  });

  it('does not modify any existing booking-critical table or function', () => {
    expect(migration).not.toContain('DROP TABLE');
    expect(migration).not.toContain('ALTER TABLE public.bookings');
    expect(migration).not.toContain('private.create_atomic_booking');
  });
});
