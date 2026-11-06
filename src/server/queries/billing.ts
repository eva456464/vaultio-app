/** Read model for Settings → Billing. */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions, userSettings } from "@/db/schema";
import { ADDON_IDS, ADDONS, INTERVALS, LIVE_STATUSES, PLAN_LOOKUP_KEYS, PLANS, planOfLookupKey, type AddonId, type Interval, type Plan } from "@/lib/billing";
import { billingEnabled, priceCatalog, type CatalogPrice } from "../billing/stripe";
import { volumeDiscount } from "../billing/volume";
import type { AppContext } from "../context";

type Row = typeof subscriptions.$inferSelect;

const describe = (row: Row) => ({
  id: row.id,
  status: row.status,
  paused: Boolean(row.pausedAt) || row.status === "paused",
  cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
  trialEnd: row.status === "trialing" ? (row.trialEnd?.toISOString() ?? null) : null,
  amount: row.unitAmount,
  currency: row.currency,
  interval: row.interval,
});

export async function getBillingPage(context: AppContext) {
  const site = context.site!;
  const organization = context.organization!;
  const isAdmin = context.member?.role === "admin";
  const [settings] = await db.select({ on: userSettings.isInvoiceEmailEnabled }).from(userSettings).where(eq(userSettings.userId, context.user.id));
  const base = { isAdmin, invoiceEmails: settings?.on ?? true };
  if (!billingEnabled()) return { ...base, mode: "off" as const };
  if (organization.billingExempt) return { ...base, mode: "exempt" as const };

  let catalog: Map<string, CatalogPrice>;
  try {
    catalog = await priceCatalog();
  } catch (error) {
    console.error("[billing] price list failed:", (error as Error).message);
    return { ...base, mode: "unavailable" as const };
  }

  const [rows, siteInvoices] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.orgWebsiteId, site.id)).orderBy(desc(subscriptions.createdAt)),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.organizationId, organization.id), eq(invoices.orgWebsiteId, site.id)))
      .orderBy(desc(invoices.issuedAt))
      .limit(50),
  ]);
  const current = (type: string) => rows.find((row) => row.type === type && row.status !== "canceled" && row.status !== "incomplete") ?? null;
  const main = current("main");
  const mainPlan = main ? (planOfLookupKey(main.priceLookupKey) ?? (main.plan ? { plan: main.plan, interval: main.interval } : null)) : null;

  const prices: Record<Plan, Partial<Record<Interval, { amount: number; currency: string }>>> = { grow: {}, scale: {} };
  for (const plan of PLANS) for (const interval of INTERVALS) {
    const price = catalog.get(PLAN_LOOKUP_KEYS[plan][interval]);
    if (price) prices[plan][interval] = { amount: price.amount, currency: price.currency };
  }

  const addons = ADDON_IDS.flatMap((id: AddonId) => {
    const price = catalog.get(ADDONS[id].lookupKey);
    const subscription = rows.find((row) => row.priceLookupKey === ADDONS[id].lookupKey && row.status !== "canceled" && row.status !== "incomplete") ?? null;
    if (!price && !subscription) return [];
    return [{ id, type: ADDONS[id].type, amount: price?.amount ?? subscription?.unitAmount ?? 0, currency: price?.currency ?? "usd", credits: price?.credits ?? null, onSale: Boolean(price), subscription: subscription ? describe(subscription) : null }];
  });

  return {
    ...base,
    mode: "billed" as const,
    prices,
    trialDays: rows.some((row) => row.type === "main") ? 0 : Number(process.env.BILLING_TRIAL_DAYS ?? 3),
    // Shown on the plan cards while the website has no plan yet.
    volume: main ? null : await volumeDiscount(organization.id, site.id),
    main: main && mainPlan ? { ...describe(main), plan: mainPlan.plan, interval: mainPlan.interval, live: LIVE_STATUSES.has(main.status) && !main.pausedAt } : null,
    addons,
    invoices: siteInvoices.map((invoice) => ({
      id: invoice.id,
      reference: invoice.number ?? invoice.stripeInvoiceId ?? String(invoice.id),
      type: invoice.subscriptionType,
      issuedAt: invoice.issuedAt.toISOString(),
      amount: invoice.amountDue,
      currency: invoice.currency,
      status: invoice.status,
      url: invoice.invoicePdfUrl ?? invoice.hostedInvoiceUrl,
    })),
  };
}

export type BillingData = Awaited<ReturnType<typeof getBillingPage>>;
