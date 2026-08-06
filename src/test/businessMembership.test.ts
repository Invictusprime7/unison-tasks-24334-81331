import { describe, expect, it } from 'vitest';
import { canEditBusiness, isAdminRole } from '@/services/businessMembership';

describe('business role semantics', () => {
  it('keeps business administration separate from editor access', () => {
    expect(isAdminRole('owner')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('editor')).toBe(false);
    expect(canEditBusiness('editor')).toBe(true);
    expect(canEditBusiness('viewer')).toBe(false);
    expect(canEditBusiness('member')).toBe(false);
  });
});