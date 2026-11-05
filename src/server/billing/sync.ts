/**
 * Keeps the local `subscriptions` and `invoices` tables in step with Stripe. Called from the webhook
 * and right after checkout, so it must be safe to run more than once for the same object.
 */
import { and, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { backlinkCreditLedger, invoices, organizationMembers, organizations, orgWebsites, subscriptions, user, userSettings, type SubscriptionStatus, type SubscriptionType } from "@/db/schema";
import { addonOfLookupKey, planOfLookupKey } from "@/lib/billing";
import { logActivity } from "../agents/activity";
import { sendEmail } from "../email";
import { emailConfigured } from "../invites";
import { priceCatalog, stripe } from "./stripe";

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : (value?.id ?? null));

async function organizationOf(customerId: string | null, metadata: Record<string, string> | null | undefined) {
  if (metadata?.organizationId) return Number(metadata.organizationId);
  if (!customerId) return null;
  const [row] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.stripeCustomerId, customerId));
  return row?.id ?? null;
}

function statusOf(subscription: Stripe.Subscription): SubscriptionStatus {
  if (subscription.pause_collection) return "paused";
  switch (subscription.status) {
    case "incomplete_expired":
      return "canceled";
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "paused":
      return subscription.status as SubscriptionStatus;
    default:
      return "incomplete";
  }
}

export async function syncSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const price = item?.price;
  const lookupKey = price?.lookup_key ?? null;
  const plan = planOfLookupKey(lookupKey);
  const addon = addonOfLookupKey(lookupKey);
  const type = (subscription.metadata?.subscriptionType as SubscriptionType | undefined) ?? (plan ? "main" : addon?.type);
  const organizationId = await organizationOf(idOf(subscription.customer), subscription.metadata);
  if (!type || !organizationId) {
    console.warn(`[billing] subscription ${subscription.id} has no Vaultio type or workspace; ignored`);
    return null;
  }
  const siteId = Number(subscription.metadata?.orgWebsiteId) || null;
  const status = statusOf(subscription);
  const values = {
    organizationId,
    orgWebsiteId: siteId,
    type,
    plan: plan?.plan ?? null,
    interval: (price?.recurring?.interval === "year" ? "year" : "month") as "month" | "year",
    status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: price?.id ?? null,
    priceLookupKey: lookupKey,
    quantity: item?.quantity ?? 1,
    unitAmount: price?.unit_amount ?? null,
    currency: price?.currency ?? "usd",
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    pausedAt: subscription.pause_collection ? new Date() : null,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      // Keep the first pause time while billing stays paused.
      set: { ...values, pausedAt: subscription.pause_collection ? sql`coalesce(${subscriptions.pausedAt}, now())` : null },
    })
    .returning();
  return row!;
}

const INVOICE_STATUSES = new Set(["draft", "open", "paid", "void", "uncollectible"]);

/** Mirrors an invoice; returns whether it became paid with this call (for one-time side effects). */
export async function syncInvoice(invoice: Stripe.Invoice) {
  const details = invoice.parent?.subscription_details ?? null;
  const stripeSubscriptionId = idOf(details?.subscription as string | { id: string } | null | undefined);
  const [local] = stripeSubscriptionId ? await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)) : [];
  const metadata = details?.metadata ?? {};
  const organizationId = local?.organizationId ?? (await organizationOf(idOf(invoice.customer as string | { id: string } | null), metadata));
  if (!organizationId || !invoice.id) return { row: null, becamePaid: false };
  const status = (INVOICE_STATUSES.has(invoice.status ?? "") ? invoice.status : "draft") as "draft" | "open" | "paid" | "void" | "uncollectible";
  const values = {
    organizationId,
    orgWebsiteId: local?.orgWebsiteId ?? (Number(metadata.orgWebsiteId) || null),
    subscriptionType: local?.type ?? ((metadata.subscriptionType as SubscriptionType | undefined) ?? null),
    stripeInvoiceId: invoice.id,
    number: invoice.number,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    status,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    issuedAt: new Date((invoice.status_transitions?.finalized_at ?? invoice.created) * 1000),
    updatedAt: new Date(),
  };
  return db.transaction(async (tx) => {
    const [inserted] = await tx.insert(invoices).values(values).onConflictDoNothing({ target: invoices.stripeInvoiceId }).returning();
    if (inserted) return { row: inserted, becamePaid: status === "paid", subscription: local ?? null };
    const [before] = await tx.select().from(invoices).where(eq(invoices.stripeInvoiceId, invoice.id!)).for("update");
    const [row] = await tx.update(invoices).set(values).where(eq(invoices.stripeInvoiceId, invoice.id!)).returning();
    return { row: row!, becamePaid: status === "paid" && before?.status !== "paid", subscription: local ?? null };
  });
}

/** Adds the monthly credits of a paid backlink-credit invoice to the site's balance. */
async function grantCredits(siteId: number, lookupKey: string | null, quantity: number) {
  const credits = lookupKey ? ((await priceCatalog()).get(lookupKey)?.credits ?? 0) : 0;
  if (credits <= 0) return 0;
  await db.insert(backlinkCreditLedger).values({ orgWebsiteId: siteId, delta: credits * quantity, reason: "purchase" });
  return credits * quantity;
}

/** Emails the invoice link to admins who chose "Email me my invoices". */
async function emailInvoice(organizationId: number, row: typeof invoices.$inferSelect) {
  if (!emailConfigured() || !(row.hostedInvoiceUrl || row.invoicePdfUrl)) return;
  const recipients = await db
    .select({ email: user.email, wanted: userSettings.isInvoiceEmailEnabled })
    .from(organizationMembers)
    .innerJoin(user, eq(user.id, organizationMembers.userId))
    .leftJoin(userSettings, eq(userSettings.userId, organizationMembers.userId))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.role, "admin")));
  const [site] = row.orgWebsiteId ? await db.select({ url: orgWebsites.url }).from(orgWebsites).where(eq(orgWebsites.id, row.orgWebsiteId)) : [];
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency.toUpperCase() }).format(row.amountDue / 100);
  for (const { email, wanted } of recipients) {
    if (wanted === false) continue;
    await sendEmail({
      to: email,
      subject: `Invoice ${row.number ?? ""} paid · ${amount}`.trim(),
      html: `<p>Your invoice${site ? ` for ${site.url}` : ""} of <strong>${amount}</strong> was paid.</p><p><a href="${row.hostedInvoiceUrl ?? row.invoicePdfUrl}">View or download the invoice</a></p>`,
      from: process.env.EMAIL_FROM || undefined,
    }).catch((error) => console.error("[billing] invoice email failed:", (error as Error).message));
  }
}

/** Mirrors an invoice and, the first time it is seen paid, adds purchased credits and emails it. */
export async function processInvoice(invoice: Stripe.Invoice) {
  const result = await syncInvoice(invoice);
  if (!result.row || !result.becamePaid) return;
  const subscription = result.subscription;
  if (subscription?.type === "backlink_credits" && subscription.orgWebsiteId) {
    const added = await grantCredits(subscription.orgWebsiteId, subscription.priceLookupKey, subscription.quantity);
    if (added) await logActivity(subscription.orgWebsiteId, "backlinkCreditsAdded", { count: added });
  }
  if (result.row.amountDue > 0) await emailInvoice(result.row.organizationId, result.row);
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = idOf(session.subscription as string | { id: string } | null);
      if (subscriptionId) await syncSubscription(await stripe().subscriptions.retrieve(subscriptionId));
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.trial_will_end":
    // Plan changes made with "pending if incomplete": applied once paid, dropped if never paid.
    case "customer.subscription.pending_update_applied":
    case "customer.subscription.pending_update_expired":
      await syncSubscription(event.data.object);
      return;
    case "invoice.payment_action_required":
    case "invoice.finalization_failed":
    case "invoice.created":
    case "invoice.finalized":
    case "invoice.paid":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    case "invoice.voided":
    case "invoice.marked_uncollectible":
    case "invoice.updated":
      await processInvoice(event.data.object);
      return;
    default:
      return;
  }
}
