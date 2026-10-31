import { billingEnabled, stripe } from "@/server/billing/stripe";
import { handleStripeEvent } from "@/server/billing/sync";

/** Stripe webhook: verifies the signature, then mirrors subscriptions and invoices. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!billingEnabled() || !secret) return new Response("Billing is not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error(`[billing] webhook ${event.type} failed:`, (error as Error).message);
    // A 500 makes Stripe retry later.
    return new Response("Webhook handler failed", { status: 500 });
  }
  return Response.json({ received: true });
}
