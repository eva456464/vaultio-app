"use server";

import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type Stripe from "stripe";
import { db } from "@/db";
import { articles, backlinks, llmAnswers, organizations, subscriptions, userSettings } from "@/db/schema";
import { ADDON_IDS, ADDONS, INTERVALS, LANGUAGE_ADDON, LIVE_STATUSES, PLAN_LOOKUP_KEYS, PLANS, type AddonId, type Interval, type Plan } from "@/lib/billing";
import { rerunAgentJob } from "../agents/queue";
import { siteDay } from "../agents/schedule";
import { billingEnabled, priceCatalog, stripe } from "../billing/stripe";
import { processInvoice, syncSubscription } from "../billing/sync";
import { getAppContext } from "../context";
import { requestOrigin } from "../invites";

type Result = { ok: true } | { error: string };
type Redirect = { ok: true; url: string } | { ok: true; changed: true } | { error: string };

const refresh = () => revalidatePath("/[locale]", "layout");
const TRIAL_DAYS = () => Number(process.env.BILLING_TRIAL_DAYS ?? 3);

async function requireBillingAdmin() {
  const context = await getAppContext();
  if (!context?.organization || !context.site) throw new Error("No website selected");
  if (context.member?.role !== "admin") throw new Error("Only workspace admins can manage billing");
  if (!billingEnabled()) throw new Error("Billing is not configured");
  if (context.organization.billingExempt) throw new Error("This workspace isn't billed");
  return { ...context, organization: context.organization, site: context.site };
}

async function customerOf(context: Awaited<ReturnType<typeof requireBillingAdmin>>) {
  if (context.organization.stripeCustomerId) return context.organization.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: context.user.email,
    name: context.organization.name,
    metadata: { organizationId: String(context.organization.id) },
  });
  await db.update(organizations).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(organizations.id, context.organization.id));
  return customer.id;
}

async function liveSubscription(siteId: number, type: string) {
  const rows = await db.select().from(subscriptions).where(and(eq(subscriptions.orgWebsiteId, siteId), eq(subscriptions.type, type as "main"))).orderBy(desc(subscriptions.createdAt));
  return rows.find((row) => LIVE_STATUSES.has(row.status) || row.status === "past_due" || row.status === "paused") ?? null;
}

const describe = (error: unknown) => {
  const message = (error as Stripe.errors.StripeError)?.message ?? String(error);
  console.error("[billing]", message);
  return { error: "Stripe couldn't complete this. Please try again or contact support." };
};

/** Replaces the price of a live subscription (plan change, or another option of the same add-on). */
async function swapPrice(stripeSubscriptionId: string, priceId: string, upgrade: boolean, metadata: Record<string, string>) {
  const current = await stripe().subscriptions.retrieve(stripeSubscriptionId);
  const item = current.items.data[0];
  if (!item) throw new Error("Subscription has no items");
  const updated = await stripe().subscriptions.update(stripeSubscriptionId, {
    items: [{ id: item.id, price: priceId }],
    // Upgrades are charged right away (and only applied once paid); downgrades are credited on the next invoice.
    proration_behavior: upgrade ? "always_invoice" : "create_prorations",
    ...(upgrade ? { payment_behavior: "pending_if_incomplete" as const } : {}),
    metadata: { ...current.metadata, ...metadata },
  });
  await syncSubscription(updated);
}

/**
 * Starts Stripe Checkout for a plan (with a free trial the first time) or an add-on. Choosing
 * another option of an add-on the site already has changes that subscription instead.
 */
export async function startCheckout(choice: { plan: Plan; interval: Interval } | { addon: AddonId }, options: { returnTo?: "onboarding" } = {}): Promise<Redirect> {
  const context = await requireBillingAdmin();
  const site = context.site;
  const isPlan = "plan" in choice;
  if (isPlan && (!PLANS.includes(choice.plan) || !INTERVALS.includes(choice.interval))) return { error: "Unknown plan" };
  if (!isPlan && !ADDON_IDS.includes(choice.addon)) return { error: "Unknown add-on" };
  const lookupKey = isPlan ? PLAN_LOOKUP_KEYS[choice.plan][choice.interval] : ADDONS[choice.addon].lookupKey;
  const type = isPlan ? "main" : ADDONS[choice.addon].type;
  try {
    const price = (await priceCatalog()).get(lookupKey);
    if (!price) return { error: "This option isn't available yet." };
    const main = await liveSubscription(site.id, "main");
    if (isPlan && main) return { error: "This website already has a plan. Change it from the subscription card." };
    if (!isPlan && !main) return { error: "Choose a plan for this website first." };

    if (!isPlan) {
      const existing = await liveSubscription(site.id, type);
      if (existing?.priceLookupKey === lookupKey) return { error: "This add-on is already active." };
      if (existing?.stripeSubscriptionId) {
        await swapPrice(existing.stripeSubscriptionId, price.id, price.amount >= (existing.unitAmount ?? 0), { addonId: choice.addon });
        refresh();
        return { ok: true, changed: true };
      }
    }

    const hadPlan = isPlan && (await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.orgWebsiteId, site.id), eq(subscriptions.type, "main"))).limit(1)).length > 0;
    const metadata = { organizationId: String(context.organization.id), orgWebsiteId: String(site.id), orgWebsiteUrl: site.url, subscriptionType: type, ...(isPlan ? { plan: choice.plan } : { addonId: choice.addon }) };
    const locale = await getLocale();
    const base = `${await requestOrigin()}/${locale}/dashboard/settings/billing`;
    // From the onboarding wizard's plan step, Stripe sends the owner to a route that confirms and starts the agents.
    const onboarding = options.returnTo === "onboarding";
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: await customerOf(context),
      client_reference_id: String(site.id),
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata, ...(isPlan && !hadPlan && TRIAL_DAYS() > 0 ? { trial_period_days: TRIAL_DAYS() } : {}) },
      success_url: onboarding ? `${await requestOrigin()}/api/billing/onboarding-return?locale=${locale}&checkout={CHECKOUT_SESSION_ID}` : `${base}?checkout={CHECKOUT_SESSION_ID}`,
      cancel_url: onboarding ? `${await requestOrigin()}/${locale}/onboarding/plan` : base,
    });
    if (!session.url) return { error: "Stripe didn't return a checkout page." };
    return { ok: true, url: session.url };
  } catch (error) {
    return describe(error);
  }
}

/** Called when Stripe sends the admin back from Checkout, so the page is right even before the webhook arrives. */
/**
 * Checkout for the language add-on of the selected language site (when its website's plan doesn't
 * include it). The website's plan must be active; there's no trial on languages.
 */
export async function startLanguageCheckout(): Promise<Redirect> {
  const context = await requireBillingAdmin();
  const site = context.site;
  if (!site.primaryOrgWebsiteId) return { error: "This is the website's main language." };
  try {
    const price = (await priceCatalog()).get(LANGUAGE_ADDON.lookupKey);
    if (!price) return { error: "This option isn't available yet." };
    if (!(await liveSubscription(site.primaryOrgWebsiteId, "main"))) return { error: "Choose a plan for this website's main language first." };
    if (await liveSubscription(site.id, LANGUAGE_ADDON.type)) return { error: "This language is already paid for." };
    const metadata = { organizationId: String(context.organization.id), orgWebsiteId: String(site.id), orgWebsiteUrl: site.url, subscriptionType: LANGUAGE_ADDON.type, language: site.selectedLanguage };
    const base = `${await requestOrigin()}/${await getLocale()}/dashboard/settings/billing`;
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: await customerOf(context),
      client_reference_id: String(site.id),
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
      success_url: `${base}?checkout={CHECKOUT_SESSION_ID}`,
      cancel_url: base,
    });
    if (!session.url) return { error: "Stripe didn't return a checkout page." };
    return { ok: true, url: session.url };
  } catch (error) {
    return describe(error);
  }
}

export async function confirmCheckout(sessionId: string): Promise<Result> {
  const context = await requireBillingAdmin();
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription.latest_invoice"] });
    if (session.metadata?.organizationId !== String(context.organization.id)) return { error: "This checkout belongs to another workspace." };
    const subscription = typeof session.subscription === "object" ? session.subscription : null;
    if (subscription) {
      const row = await syncSubscription(subscription);
      if (typeof subscription.latest_invoice === "object" && subscription.latest_invoice) await processInvoice(subscription.latest_invoice);
      // More tracked prompts: write the extra questions now.
      if (row?.type === "llm_visibility_prompts" && row.orgWebsiteId) await rerunAgentJob(row.orgWebsiteId, "generatePrompts", siteDay(new Date(), context.site.timeZone)).catch(() => undefined);
    }
    refresh();
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}

/** Opens Stripe's customer portal (payment methods, invoices, cancellations) for the workspace. */
export async function openBillingPortal(): Promise<Redirect> {
  const context = await requireBillingAdmin();
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: await customerOf(context),
      return_url: `${await requestOrigin()}/${await getLocale()}/dashboard/settings/billing`,
    });
    return { ok: true, url: session.url };
  } catch (error) {
    return describe(error);
  }
}

/** Moves the website to another plan or billing interval. */
export async function changePlan(plan: Plan, interval: Interval): Promise<Result> {
  const context = await requireBillingAdmin();
  if (!PLANS.includes(plan) || !INTERVALS.includes(interval)) return { error: "Unknown plan" };
  const main = await liveSubscription(context.site.id, "main");
  if (!main?.stripeSubscriptionId) return { error: "This website has no plan yet." };
  try {
    const catalog = await priceCatalog();
    const price = catalog.get(PLAN_LOOKUP_KEYS[plan][interval]);
    if (!price) return { error: "This option isn't available yet." };
    if (price.id === main.stripePriceId) return { error: "This is already the current plan." };
    const yearly = (amount: number, every: Interval | null) => (every === "year" ? amount : amount * 12);
    const upgrade = yearly(price.amount, price.interval) >= yearly(main.unitAmount ?? 0, main.interval);
    await swapPrice(main.stripeSubscriptionId, price.id, upgrade, { plan });
    refresh();
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}

async function ownSubscription(context: Awaited<ReturnType<typeof requireBillingAdmin>>, id: number) {
  const [row] = await db.select().from(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.organizationId, context.organization.id)));
  if (!row?.stripeSubscriptionId) throw new Error("Subscription not found");
  return row as typeof row & { stripeSubscriptionId: string };
}

/** Pauses (or resumes) billing; agents stop while it is paused. */
export async function setBillingPaused(id: number, paused: boolean): Promise<Result> {
  const context = await requireBillingAdmin();
  const row = await ownSubscription(context, id);
  try {
    await syncSubscription(await stripe().subscriptions.update(row.stripeSubscriptionId, { pause_collection: paused ? { behavior: "void" } : "" }));
    refresh();
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}

/** Cancels at the end of the paid period (or undoes that). */
export async function setCancelAtPeriodEnd(id: number, cancel: boolean): Promise<Result> {
  const context = await requireBillingAdmin();
  const row = await ownSubscription(context, id);
  try {
    await syncSubscription(await stripe().subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: cancel }));
    refresh();
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}

/** "Email me my invoices" for the signed-in user. */
export async function setInvoiceEmails(enabled: boolean): Promise<Result> {
  const context = await getAppContext();
  if (!context) return { error: "Sign in first" };
  await db
    .insert(userSettings)
    .values({ userId: context.user.id, isInvoiceEmailEnabled: enabled })
    .onConflictDoUpdate({ target: userSettings.userId, set: { isInvoiceEmailEnabled: enabled, updatedAt: new Date() } });
  return { ok: true };
}

/** What the website has built so far, for "Here's what you've built" before cancelling (real counts only). */
export async function cancellationRecap(id: number) {
  const context = await requireBillingAdmin();
  const row = await ownSubscription(context, id);
  const siteId = row.orgWebsiteId ?? context.site.id;
  const [[written], [published], [links], [mentions]] = await Promise.all([
    db.select({ value: count() }).from(articles).where(eq(articles.orgWebsiteId, siteId)),
    db.select({ value: count() }).from(articles).where(and(eq(articles.orgWebsiteId, siteId), isNotNull(articles.publishedUrl))),
    db.select({ value: count() }).from(backlinks).where(and(eq(backlinks.targetOrgWebsiteId, siteId), eq(backlinks.isBacklinkPresent, true))),
    db.select({ value: count() }).from(llmAnswers).where(and(eq(llmAnswers.orgWebsiteId, siteId), eq(llmAnswers.orgWebsiteMentioned, true))),
  ]);
  const subscription = await stripe().subscriptions.retrieve(row.stripeSubscriptionId).catch(() => null);
  return {
    articles: written?.value ?? 0,
    published: published?.value ?? 0,
    backlinks: links?.value ?? 0,
    aiMentions: mentions?.value ?? 0,
    // A one-time discount, only when the owner set one up in Stripe and it wasn't used yet.
    offer: Boolean(process.env.RETENTION_COUPON_ID) && subscription?.metadata?.retentionOffer !== "used" && row.status !== "trialing",
    trial: row.status === "trialing",
  };
}

const CANCEL_REASONS = ["too_expensive", "missing_features", "switched_service", "unused", "customer_service", "too_complex", "low_quality", "other"] as const;

/** Cancels at the end of the period (a trial ends without charge), with the reason Stripe keeps. */
export async function cancelWithFeedback(id: number, reason: string, comment: string): Promise<Result> {
  const context = await requireBillingAdmin();
  const row = await ownSubscription(context, id);
  const feedback = (CANCEL_REASONS as readonly string[]).includes(reason) ? (reason as (typeof CANCEL_REASONS)[number]) : "other";
  try {
    await syncSubscription(
      await stripe().subscriptions.update(row.stripeSubscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: { feedback, comment: comment.trim().slice(0, 500) || undefined },
      }),
    );
    refresh();
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}

/** Takes the retention discount instead of cancelling (once per subscription). */
export async function acceptRetentionOffer(id: number): Promise<Result> {
  const context = await requireBillingAdmin();
  const row = await ownSubscription(context, id);
  const coupon = process.env.RETENTION_COUPON_ID;
  if (!coupon) return { error: "No offer is available" };
  try {
    const current = await stripe().subscriptions.retrieve(row.stripeSubscriptionId);
    if (current.metadata?.retentionOffer === "used") return { error: "This offer was already used" };
    await syncSubscription(
      await stripe().subscriptions.update(row.stripeSubscriptionId, { discounts: [{ coupon }], cancel_at_period_end: false, metadata: { ...current.metadata, retentionOffer: "used" } }),
    );
    refresh();
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}

/** "End trial now": billing starts today; a card that fails returns the invoice to pay. */
export async function endTrialNow(id: number): Promise<{ ok: true } | { error: string; invoiceUrl?: string }> {
  const context = await requireBillingAdmin();
  const row = await ownSubscription(context, id);
  if (row.status !== "trialing") return { error: "This plan isn't on a free trial" };
  try {
    const updated = await stripe().subscriptions.update(row.stripeSubscriptionId, { trial_end: "now", expand: ["latest_invoice"] });
    await syncSubscription(updated);
    const invoice = typeof updated.latest_invoice === "object" ? updated.latest_invoice : null;
    if (invoice) await processInvoice(invoice);
    refresh();
    if (updated.status !== "active") return { error: "payment", invoiceUrl: invoice?.hosted_invoice_url ?? undefined };
    return { ok: true };
  } catch (error) {
    return describe(error);
  }
}
