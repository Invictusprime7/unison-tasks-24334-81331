import { serve } from "serve";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// Map Stripe price IDs to plan types
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get("STRIPE_PRO_PRICE_ID") || "price_pro_monthly"]: "pro",
  [Deno.env.get("STRIPE_BUSINESS_PRICE_ID") || "price_business_monthly"]: "business",
  [Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID") || "price_pro_yearly"]: "pro",
  [Deno.env.get("STRIPE_BUSINESS_YEARLY_PRICE_ID") || "price_business_yearly"]: "business",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: responseHeaders,
      status: 405,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      console.error("Stripe configuration missing");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        headers: responseHeaders,
        status: 503,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe signature" }), {
        headers: responseHeaders,
        status: 400,
      });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(supabase, stripe, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const status = error instanceof Stripe.errors.StripeSignatureVerificationError ? 400 : 500;
    const message = status === 400
      ? "Invalid webhook signature"
      : "Webhook processing failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: responseHeaders,
        status,
      }
    );
  }
});

async function handleCheckoutComplete(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.supabase_user_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("Missing user ID or subscription ID in checkout session");
    return;
  }

  // Get the subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = session.metadata?.plan || PRICE_TO_PLAN[priceId] || "pro";

  // Update user subscription in database
  const { error } = await supabase
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      plan: plan,
      status: "active",
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  console.log(`Successfully activated ${plan} subscription for user ${userId}`);
}

async function handleSubscriptionUpdate(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    // Try to find user by customer ID
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (!existingSub) {
      console.error("Could not find user for subscription:", subscription.id);
      return;
    }

    await updateSubscriptionInDb(supabase, existingSub.user_id as string, subscription);
  } else {
    await updateSubscriptionInDb(supabase, userId, subscription);
  }
}

async function updateSubscriptionInDb(
  supabase: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = PRICE_TO_PLAN[priceId] || subscription.metadata?.plan || "pro";

  // Map Stripe status to our status
  let status: string;
  switch (subscription.status) {
    case "active":
      status = "active";
      break;
    case "trialing":
      status = "trialing";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      status = "canceled";
      break;
    default:
      status = "active";
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      plan: plan,
      status: status,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  console.log(`Updated subscription for user ${userId} to ${plan} (${status})`);
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.supabase_user_id;

  // Find user by subscription ID if not in metadata
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    targetUserId = existingSub?.user_id;
  }

  if (!targetUserId) {
    console.error("Could not find user for deleted subscription:", subscription.id);
    return;
  }

  // Downgrade to free plan
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Error downgrading subscription:", error);
    throw error;
  }

  console.log(`Subscription deleted, user ${targetUserId} downgraded to free`);
}

async function handlePaymentSucceeded(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) return;

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", invoice.subscription)
    .single();

  if (!sub) return;

  // Reset AI generations on successful payment (new billing period)
  await supabase
    .from("user_subscriptions")
    .update({
      ai_generations_used: 0,
      ai_generations_reset_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sub.user_id);

  console.log(`Reset AI generations for user ${sub.user_id} on payment success`);
}

async function handlePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) return;

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", invoice.subscription)
    .single();

  if (!sub) return;

  await supabase
    .from("user_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sub.user_id);

  console.log(`Marked subscription as past_due for user ${sub.user_id}`);
}
