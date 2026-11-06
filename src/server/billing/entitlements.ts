/** What a website's plan and add-ons allow, and whether its agents may run. */
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { organizations, orgWebsites, subscriptions } from "@/db/schema";
import { addonOfLookupKey, LANGUAGE_ADDON, LIVE_STATUSES, PLAN_LIMITS, planOfLookupKey, UNBILLED_LIMITS, type AddonId, type Plan } from "@/lib/billing";
import { billingEnabled } from "./stripe";

export type Entitlements = {
  /** "off": billing isn't configured; "exempt": this workspace isn't billed; "billed": a paying (or not yet paying) site. */
  mode: "off" | "exempt" | "billed";
  /** Agents run (subscription active or trialing, not paused). */
  active: boolean;
  plan: Plan | null;
  prompts: number;
  socialKeywords: { reddit: number; quora: number };
  /** Reddit+ / Quora+ search every day instead of once a week. */
  dailySocial: { reddit: boolean; quora: boolean };
  addons: AddonId[];
  creditSubscriber: boolean;
  /** The plan is in its free trial (Scale's free languages stay locked until it ends). */
  trialing?: boolean;
  /**
   * Language sites: how this language is paid for. "locked": one of Scale's free languages, waiting
   * for the trial to end; "paused": was free with Scale and stopped when the plan changed.
   */
  language?: { primaryId: number; coverage: "included" | "addon" | "locked" | "paused" | "none" };
};

const base = (mode: "off" | "exempt", plan: Plan | null): Entitlements => {
  const limits = plan ? PLAN_LIMITS[plan] : UNBILLED_LIMITS;
  return {
    mode,
    active: true,
    plan,
    prompts: limits.prompts,
    socialKeywords: { reddit: limits.socialKeywords, quora: limits.socialKeywords },
    dailySocial: { reddit: false, quora: false },
    addons: [],
    creditSubscriber: false,
  };
};

/** Sites with a live backlink-credit subscription (they only receive links from DR 20+ sites). */
export async function creditSubscriberSiteIds() {
  if (!billingEnabled()) return new Set<number>();
  const rows = await db
    .select({ siteId: subscriptions.orgWebsiteId })
    .from(subscriptions)
    .where(and(eq(subscriptions.type, "backlink_credits"), inArray(subscriptions.status, [...LIVE_STATUSES] as ("active" | "trialing")[]), isNull(subscriptions.pausedAt)));
  return new Set(rows.flatMap((row) => (row.siteId ? [row.siteId] : [])));
}

/** Websites whose plan is still in its free trial (they receive no exchange links yet). */
export async function trialingSiteIds() {
  if (!billingEnabled()) return new Set<number>();
  const rows = await db
    .select({ siteId: subscriptions.orgWebsiteId })
    .from(subscriptions)
    .where(and(eq(subscriptions.type, "main"), eq(subscriptions.status, "trialing")));
  return new Set(rows.flatMap((row) => (row.siteId ? [row.siteId] : [])));
}

export async function siteEntitlements(siteId: number): Promise<Entitlements> {
  if (!billingEnabled()) return base("off", null);
  const [site] = await db
    .select({ exempt: organizations.billingExempt, primaryId: orgWebsites.primaryOrgWebsiteId })
    .from(orgWebsites)
    .innerJoin(organizations, eq(organizations.id, orgWebsites.organizationId))
    .where(eq(orgWebsites.id, siteId));
  if (site?.exempt) return base("exempt", "scale");
  if (site?.primaryId) return languageEntitlements(siteId, site.primaryId);

  const rows = await db.select().from(subscriptions).where(eq(subscriptions.orgWebsiteId, siteId)).orderBy(desc(subscriptions.createdAt));
  const live = (row: (typeof rows)[number]) => LIVE_STATUSES.has(row.status) && !row.pausedAt;
  const main = rows.find((row) => row.type === "main" && live(row)) ?? null;
  const plan = main ? (planOfLookupKey(main.priceLookupKey)?.plan ?? main.plan ?? "grow") : null;
  const addons = main ? rows.filter((row) => row.type !== "main" && live(row)).flatMap((row) => addonOfLookupKey(row.priceLookupKey) ?? []) : [];
  const limits = PLAN_LIMITS[plan ?? "grow"];
  const extra = (platform: "reddit" | "quora") => addons.reduce((sum, addon) => sum + (addon.socialKeywords?.platform === platform ? addon.socialKeywords.extra : 0), 0);
  return {
    mode: "billed",
    active: Boolean(main),
    plan,
    prompts: limits.prompts + addons.reduce((sum, addon) => sum + (addon.prompts ?? 0), 0),
    socialKeywords: { reddit: limits.socialKeywords + extra("reddit"), quora: limits.socialKeywords + extra("quora") },
    dailySocial: { reddit: extra("reddit") > 0, quora: extra("quora") > 0 },
    addons: addons.map((addon) => addon.id),
    creditSubscriber: addons.some((addon) => addon.id === "backlink_credits"),
    trialing: main?.status === "trialing",
  };
}

/**
 * A language site runs on its website's plan: Scale covers the first `extraLanguages` languages
 * (oldest first), others need their own language add-on. Limits follow the website's plan.
 */
async function languageEntitlements(siteId: number, primaryId: number): Promise<Entitlements> {
  const primary = await siteEntitlements(primaryId);
  const family = await db
    .select({ id: orgWebsites.id, pausedAt: orgWebsites.complimentaryPausedAt })
    .from(orgWebsites)
    .where(eq(orgWebsites.primaryOrgWebsiteId, primaryId))
    .orderBy(orgWebsites.createdAt, orgWebsites.id);
  const rank = family.findIndex((row) => row.id === siteId);
  const slot = primary.active && primary.plan !== null && rank >= 0 && rank < PLAN_LIMITS[primary.plan].extraLanguages;
  // Free languages unlock when the trial ends; until then they are paid like any other.
  const included = slot && !primary.trialing;
  const [own] = await db
    .select({ status: subscriptions.status, pausedAt: subscriptions.pausedAt })
    .from(subscriptions)
    .where(and(eq(subscriptions.orgWebsiteId, siteId), eq(subscriptions.type, LANGUAGE_ADDON.type)))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  const addon = Boolean(own && LIVE_STATUSES.has(own.status) && !own.pausedAt);
  const limits = PLAN_LIMITS[primary.plan ?? "grow"];
  return {
    mode: "billed",
    active: primary.active && (included || addon),
    plan: primary.plan,
    prompts: limits.prompts,
    socialKeywords: { reddit: limits.socialKeywords, quora: limits.socialKeywords },
    dailySocial: { reddit: false, quora: false },
    addons: [],
    creditSubscriber: false,
    language: { primaryId, coverage: included ? "included" : addon ? "addon" : slot ? "locked" : family[rank]?.pausedAt ? "paused" : "none" },
  };
}
