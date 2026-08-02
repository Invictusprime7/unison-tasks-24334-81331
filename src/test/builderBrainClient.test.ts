import { describe, expect, it } from 'vitest';
import { getShortRateLimitRetryMs, isRateLimitError, isTransportError } from '@/services/builderBrainClient';

describe('builder brain rate-limit retry', () => {
  it('uses a short default delay when Lane B does not provide Retry-After', () => {
    expect(getShortRateLimitRetryMs(null)).toBe(750);
  });

  it('honors a short Retry-After value and refuses long delays', () => {
    expect(getShortRateLimitRetryMs('1')).toBe(1_000);
    expect(getShortRateLimitRetryMs('3')).toBeNull();
  });

  it('parses a short Retry-After HTTP date', () => {
    const now = Date.parse('2026-07-20T00:00:00.000Z');
    expect(getShortRateLimitRetryMs('Mon, 20 Jul 2026 00:00:02 GMT', now)).toBe(2_000);
  });

  it('keeps provider-chain rate limits distinct from retryable transport failures', () => {
    const rateLimit = Object.assign(new Error('Rate limit exceeded'), { context: { status: 429 } });
    expect(isRateLimitError(rateLimit)).toBe(true);
    expect(isTransportError(rateLimit)).toBe(false);
  });
});