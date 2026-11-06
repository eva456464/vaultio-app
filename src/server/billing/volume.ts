/** The automatic multi-website discount (see VOLUME_TIERS): counted per workspace, applied as a Stripe coupon. */
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { orgWebsites, subscriptions } from "@/db/schema";
import { volumeDiscountPercent } from "@/lib/billing";
import { stripe } from "./stripe";

/** Websites (not language sites) of the workspace with a paid, running plan, other than `exceptSiteId`. */
export async function activeWebsites(organizationId: number, exceptSiteId?: number) {
  const rows = await db
    .selectDistinct({ siteId: subscriptions.orgWebsiteId })
    .from(subscriptions)
    .innerJoin(orgWebsites, eq(orgWebsites.id, subscriptions.orgWebsiteId))
    .where(and(eq(subscriptions.organizationId, organizationId), eq(subscriptions.type, "main"), eq(subscriptions.status, "active"), isNull(subscriptions.pausedAt), isNull(orgWebsites.primaryOrgWebsiteId)));
  return rows.filter((row) => row.siteId !== exceptSiteId).length;
}

export async function volumeDiscount(organizationId: number, siteId: number) {
  const count = await activeWebsites(organizationId, siteId);
  return { activeWebsites: count, percent: volumeDiscountPercent(count) };
}

/** The coupon for a discount level, created in Stripe the first time it's needed (lasts for the plan's life). */
export async function volumeCoupon(percent: number) {
  const id = `vaultio-volume-${percent}`;
  try {
    await stripe().coupons.retrieve(id);
  } catch (error) {
    if ((error as Stripe.errors.StripeError).statusCode !== 404) throw error;
    await stripe().coupons.create({ id, percent_off: percent, duration: "forever", name: `Volume discount ${percent}%` });
  }
  return id;
}
