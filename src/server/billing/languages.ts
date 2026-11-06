/**
 * Scale's free languages follow the plan: they unlock when the trial ends (paid language add-ons
 * of those languages then end, without refund), and pause when the website leaves Scale (offered as
 * "Keep this language" until paid for or Scale is back).
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orgWebsites, subscriptions } from "@/db/schema";
import { LANGUAGE_ADDON, LIVE_STATUSES, PLAN_LIMITS } from "@/lib/billing";
import { stripe } from "./stripe";

/** The language sites that take Scale's free slots (oldest first). */
async function freeSlotSites(primaryId: number) {
  const family = await db.select({ id: orgWebsites.id }).from(orgWebsites).where(eq(orgWebsites.primaryOrgWebsiteId, primaryId)).orderBy(asc(orgWebsites.createdAt), asc(orgWebsites.id));
  return family.slice(0, PLAN_LIMITS.scale.extraLanguages).map((row) => row.id);
}

async function liveLanguageAddons(siteIds: number[]) {
  if (!siteIds.length) return [];
  const rows = await db
    .select({ siteId: subscriptions.orgWebsiteId, stripeId: subscriptions.stripeSubscriptionId, status: subscriptions.status, pausedAt: subscriptions.pausedAt })
    .from(subscriptions)
    .where(and(eq(subscriptions.type, LANGUAGE_ADDON.type), inArray(subscriptions.orgWebsiteId, siteIds)));
  return rows.filter((row) => LIVE_STATUSES.has(row.status) && !row.pausedAt);
}

/** The trial ended on Scale: the oldest languages become free and their paid add-ons end now. */
export async function unlockFreeLanguages(primaryId: number) {
  const sites = await freeSlotSites(primaryId);
  for (const addon of await liveLanguageAddons(sites)) {
    if (!addon.stripeId) continue;
    try {
      await stripe().subscriptions.cancel(addon.stripeId, { prorate: false, invoice_now: false });
    } catch (error) {
      console.error(`[billing] couldn't end the language add-on ${addon.stripeId}:`, (error as Error).message);
    }
  }
  if (sites.length) await db.update(orgWebsites).set({ complimentaryPausedAt: null }).where(inArray(orgWebsites.id, sites));
}

/** The website left Scale: its free languages that aren't paid for separately are paused. */
export async function pauseFreeLanguages(primaryId: number) {
  const sites = await freeSlotSites(primaryId);
  const paid = new Set((await liveLanguageAddons(sites)).map((row) => row.siteId));
  const paused = sites.filter((id) => !paid.has(id));
  if (paused.length) await db.update(orgWebsites).set({ complimentaryPausedAt: new Date() }).where(inArray(orgWebsites.id, paused));
}

/** Back on Scale (or the language was paid for): nothing is paused any more. */
export async function clearPausedLanguages(siteIds: number[]) {
  if (siteIds.length) await db.update(orgWebsites).set({ complimentaryPausedAt: null }).where(inArray(orgWebsites.id, siteIds));
}

export async function familyIds(primaryId: number) {
  return (await db.select({ id: orgWebsites.id }).from(orgWebsites).where(eq(orgWebsites.primaryOrgWebsiteId, primaryId))).map((row) => row.id);
}
