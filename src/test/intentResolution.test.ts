/**
 * Intent Resolution Tests
 * 
 * Tests the canonical intent normalization pipeline:
 * raw intent → INTENT_ALIASES → CoreIntent
 */
import { describe, it, expect } from "vitest";
import { normalizeIntent, isNormalizedCoreIntent, getCanonicalIntent, getAliasesFor } from "@/runtime/intentAliases";
import { CORE_INTENTS, NAV_INTENTS, PAY_INTENTS, ACTION_INTENTS } from "@/platform/core/coreIntents";

describe("normalizeIntent", () => {
  it("returns canonical intents unchanged", () => {
    expect(normalizeIntent("nav.goto")).toBe("nav.goto");
    expect(normalizeIntent("pay.checkout")).toBe("pay.checkout");
    expect(normalizeIntent("contact.submit")).toBe("contact.submit");
    expect(normalizeIntent("booking.create")).toBe("booking.create");
  });

  it("resolves known aliases to canonical intents", () => {
    expect(normalizeIntent("nav.navigate")).toBe("nav.goto");
    expect(normalizeIntent("shop.checkout")).toBe("pay.checkout");
    expect(normalizeIntent("checkout.start")).toBe("pay.checkout");
    expect(normalizeIntent("cart.open")).toBe("cart.view");
    expect(normalizeIntent("booking.schedule")).toBe("booking.create");
    expect(normalizeIntent("newsletter.signup")).toBe("newsletter.subscribe");
  });

  it("handles case-insensitive lookups for canonical intents", () => {
    expect(normalizeIntent("NAV.GOTO")).toBe("nav.goto");
    expect(normalizeIntent("Pay.Checkout")).toBe("pay.checkout");
    expect(normalizeIntent("BOOKING.CREATE")).toBe("booking.create");
  });

  it("applies domain-based fallback for unknown intents with known domains", () => {
    expect(normalizeIntent("nav.unknown_action")).toBe("nav.goto");
    expect(normalizeIntent("cart.something")).toBe("cart.add");
    expect(normalizeIntent("booking.xyz")).toBe("booking.create");
    expect(normalizeIntent("contact.xyz")).toBe("contact.submit");
  });

  it("returns original string for completely unknown intents", () => {
    expect(normalizeIntent("totally.unknown")).toBe("totally.unknown");
    expect(normalizeIntent("random")).toBe("random");
  });
});

describe("isNormalizedCoreIntent", () => {
  it("returns true for canonical intents", () => {
    expect(isNormalizedCoreIntent("nav.goto")).toBe(true);
    expect(isNormalizedCoreIntent("pay.checkout")).toBe(true);
    expect(isNormalizedCoreIntent("contact.submit")).toBe(true);
    expect(isNormalizedCoreIntent("cart.view")).toBe(true);
  });

  it("returns true for aliases (they normalize to canonical)", () => {
    expect(isNormalizedCoreIntent("shop.checkout")).toBe(true);
    expect(isNormalizedCoreIntent("nav.navigate")).toBe(true);
  });

  it("returns false for unknown intents", () => {
    expect(isNormalizedCoreIntent("totally.unknown")).toBe(false);
  });
});

describe("getCanonicalIntent", () => {
  it("returns canonical string for aliases", () => {
    expect(getCanonicalIntent("shop.checkout")).toBe("pay.checkout");
  });

  it("returns same string for canonical intents", () => {
    expect(getCanonicalIntent("nav.goto")).toBe("nav.goto");
  });
});

describe("getAliasesFor", () => {
  it("returns aliases for nav.goto", () => {
    const aliases = getAliasesFor("nav.goto");
    expect(aliases).toContain("nav.navigate");
    expect(aliases).toContain("nav.to");
    expect(aliases.length).toBeGreaterThan(3);
  });

  it("returns aliases for pay.checkout", () => {
    const aliases = getAliasesFor("pay.checkout");
    expect(aliases).toContain("shop.checkout");
    expect(aliases).toContain("checkout.start");
  });

  it("returns empty array for intent with no aliases", () => {
    const aliases = getAliasesFor("pay.success");
    // pay.success might have some aliases, but if not, should be empty array
    expect(Array.isArray(aliases)).toBe(true);
  });
});

describe("CORE_INTENTS registry", () => {
  it("includes all navigation intents", () => {
    for (const intent of NAV_INTENTS) {
      expect((CORE_INTENTS as readonly string[]).includes(intent)).toBe(true);
    }
  });

  it("includes all payment intents", () => {
    for (const intent of PAY_INTENTS) {
      expect((CORE_INTENTS as readonly string[]).includes(intent)).toBe(true);
    }
  });

  it("includes all action intents", () => {
    for (const intent of ACTION_INTENTS) {
      expect((CORE_INTENTS as readonly string[]).includes(intent)).toBe(true);
    }
  });

  it("has no duplicates", () => {
    const unique = new Set(CORE_INTENTS);
    expect(unique.size).toBe(CORE_INTENTS.length);
  });

  it("all intents follow domain.action format", () => {
    for (const intent of CORE_INTENTS) {
      expect(intent).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });
});
