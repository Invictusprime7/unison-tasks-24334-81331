import { supabase } from "@/integrations/supabase/client";

export type CheckoutBillingCycle = "monthly" | "yearly";

export interface CheckoutLineItemLike {
  productId?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionBody {
  plan?: string;
  priceId?: string;
  billingCycle?: CheckoutBillingCycle;
  successUrl: string;
  cancelUrl: string;
}

interface ResolveCheckoutBodyInput {
  items?: CheckoutLineItemLike[] | null;
  plan?: unknown;
  priceId?: unknown;
  billingCycle?: unknown;
  successUrl?: string;
  cancelUrl?: string;
  successPath?: string;
  cancelPath?: string;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveBillingCycle(value: unknown): CheckoutBillingCycle | undefined {
  return value === "yearly" ? "yearly" : "monthly";
}

export function getCheckoutUrls(input: {
  successUrl?: string;
  cancelUrl?: string;
  successPath?: string;
  cancelPath?: string;
} = {}): { successUrl: string; cancelUrl: string } {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const successPath = input.successPath || "/checkout/success?session_id={CHECKOUT_SESSION_ID}";
  const cancelPath = input.cancelPath || "/checkout/cancel";

  return {
    successUrl: input.successUrl || `${origin}${successPath}`,
    cancelUrl: input.cancelUrl || `${origin}${cancelPath}`,
  };
}

export function resolveCheckoutSessionBody(input: ResolveCheckoutBodyInput): CheckoutSessionBody | null {
  const urls = getCheckoutUrls({
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    successPath: input.successPath,
    cancelPath: input.cancelPath,
  });

  const explicitPriceId = asNonEmptyString(input.priceId);
  const explicitPlan = asNonEmptyString(input.plan);
  const firstItem = input.items?.[0];
  const derivedPriceId =
    asNonEmptyString(firstItem?.metadata?.priceId) ||
    (firstItem?.productId?.startsWith("price_") ? firstItem.productId : undefined);
  const derivedPlan = asNonEmptyString(firstItem?.metadata?.plan);

  const priceId = explicitPriceId || derivedPriceId;
  const plan = explicitPlan || derivedPlan;

  if (!priceId && !plan) {
    return null;
  }

  return {
    ...urls,
    billingCycle: resolveBillingCycle(input.billingCycle),
    ...(priceId ? { priceId } : {}),
    ...(plan ? { plan } : {}),
  };
}

export async function createCheckoutSession(body: CheckoutSessionBody): Promise<{ url: string; sessionId?: string }> {
  if (!supabase) {
    throw new Error("Checkout is not configured");
  }

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body,
  });

  if (error) {
    throw error;
  }

  if (!data?.url || typeof data.url !== "string") {
    throw new Error("No checkout URL returned");
  }

  return {
    url: data.url,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : undefined,
  };
}
