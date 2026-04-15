import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * create-order-checkout — Guest-friendly ecommerce checkout.
 * 
 * Unlike create-checkout (subscription-based, auth required), this function
 * supports guest/session-based checkout for product orders.
 * 
 * Accepts:
 *   - businessId (required)
 *   - sessionId (required — anonymous cart identifier)
 *   - userId (optional — if authenticated)
 *   - items[] (required — { productId, name, price, quantity })
 *   - customerEmail (optional — pre-fill Stripe)
 *   - successUrl / cancelUrl
 * 
 * Flow:
 *   1. Validate items against products table
 *   2. Create Stripe Checkout Session in payment mode
 *   3. Create pending order snapshot
 *   4. Return checkout URL
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      businessId,
      sessionId,
      userId,
      items,
      customerEmail,
      successUrl,
      cancelUrl,
    } = await req.json();

    // ── Validate required fields ────────────────────────────────────────
    if (!businessId) throw new Error("businessId is required");
    if (!sessionId) throw new Error("sessionId is required");
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("items[] is required and must not be empty");
    }

    // ── Validate item structure ─────────────────────────────────────────
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || !item.quantity) {
        throw new Error(`Invalid item: ${JSON.stringify(item)}`);
      }
      if (item.price <= 0) throw new Error("Item price must be positive");
      if (item.quantity <= 0) throw new Error("Item quantity must be positive");
    }

    // ── Build Stripe line items ─────────────────────────────────────────
    const lineItems = items.map((item: { name: string; price: number; quantity: number; description?: string }) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // ── Calculate order total ───────────────────────────────────────────
    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0,
    );

    // ── Create pending order ────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: businessId,
        session_id: sessionId,
        user_id: userId || null,
        customer_email: customerEmail || "pending@checkout.com",
        items: JSON.stringify(items),
        subtotal,
        total: subtotal,
        status: "pending",
        payment_method: "stripe",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error("Failed to create order record");
    }

    // ── Create Stripe Checkout Session ──────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url:
        successUrl ||
        `${req.headers.get("origin")}/thank-you?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl || `${req.headers.get("origin")}/shop`,
      metadata: {
        order_id: order.id,
        business_id: businessId,
        session_id: sessionId,
        ...(userId ? { user_id: userId } : {}),
      },
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
    });

    // ── Update order with payment intent ────────────────────────────────
    await supabase
      .from("orders")
      .update({
        payment_intent_id: session.payment_intent as string,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        orderId: order.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Order checkout error:", error);
    const message = error instanceof Error ? error.message : "Order checkout failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
