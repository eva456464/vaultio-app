/** What a website's plan and add-ons allow, and whether its agents may run. */
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { organizations, orgWebsites, subscriptions } from "@/db/schema";
import { addonOfLookupKey, LIVE_STATUSES, PLAN_LIMITS, planOfLookupKey, UNBILLED_LIMITS, type AddonId, type Plan } from "@/lib/billing";
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

export async function siteEntitlements(siteId: number): Promise<Entitlements> {
  if (!billingEnabled()) return base("off", null);
  const [site] = await db
    .select({ exempt: organizations.billingExempt })
    .from(orgWebsites)
    .innerJoin(organizations, eq(organizations.id, orgWebsites.organizationId))
    .where(eq(orgWebsites.id, siteId));
  if (site?.exempt) return base("exempt", "scale");

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
  };
}
