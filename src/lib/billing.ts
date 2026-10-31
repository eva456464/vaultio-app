/**
 * Plans and add-ons. Prices live in Stripe and are found by lookup key, so they can be changed in
 * the Stripe dashboard (create a new price, move the lookup key) without a deploy; the limits each
 * plan or add-on grants live here. `scripts/stripe-setup.ts` creates the products and prices.
 */
import type { SubscriptionType } from "@/db/schema";

export const PLANS = ["grow", "scale"] as const;
export type Plan = (typeof PLANS)[number];
export const INTERVALS = ["month", "year"] as const;
export type Interval = (typeof INTERVALS)[number];

export const PLAN_LOOKUP_KEYS: Record<Plan, Record<Interval, string>> = {
  grow: { month: "vaultio_grow_monthly", year: "vaultio_grow_yearly" },
  scale: { month: "vaultio_scale_monthly", year: "vaultio_scale_yearly" },
};

export type PlanLimits = { prompts: number; socialKeywords: number; extraLanguages: number };
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  grow: { prompts: 10, socialKeywords: 5, extraLanguages: 0 },
  scale: { prompts: 50, socialKeywords: 5, extraLanguages: 3 },
};
/** Limits while billing isn't configured (development, or before launch). */
export const UNBILLED_LIMITS: PlanLimits = { prompts: 10, socialKeywords: 5, extraLanguages: 0 };

export const ADDON_IDS = ["prompts_30", "prompts_50", "reddit_plus", "quora_plus", "backlink_credits"] as const;
export type AddonId = (typeof ADDON_IDS)[number];

export type Addon = {
  id: AddonId;
  /** One subscription of this type per website; buying another option of the same type replaces it. */
  type: Exclude<SubscriptionType, "main">;
  lookupKey: string;
  prompts?: number;
  socialKeywords?: { platform: "reddit" | "quora"; extra: number };
};

export const ADDONS: Record<AddonId, Addon> = {
  prompts_30: { id: "prompts_30", type: "llm_visibility_prompts", lookupKey: "vaultio_prompts_30_monthly", prompts: 30 },
  prompts_50: { id: "prompts_50", type: "llm_visibility_prompts", lookupKey: "vaultio_prompts_50_monthly", prompts: 50 },
  reddit_plus: { id: "reddit_plus", type: "reddit", lookupKey: "vaultio_reddit_plus_monthly", socialKeywords: { platform: "reddit", extra: 35 } },
  quora_plus: { id: "quora_plus", type: "quora", lookupKey: "vaultio_quora_plus_monthly", socialKeywords: { platform: "quora", extra: 35 } },
  // Monthly backlink credits; the number of credits is the price's `credits` metadata in Stripe.
  backlink_credits: { id: "backlink_credits", type: "backlink_credits", lookupKey: "vaultio_backlink_credits_monthly" },
};

export const ALL_LOOKUP_KEYS = [...Object.values(PLAN_LOOKUP_KEYS).flatMap((keys) => Object.values(keys)), ...Object.values(ADDONS).map((addon) => addon.lookupKey)];

export function planOfLookupKey(key: string | null | undefined): { plan: Plan; interval: Interval } | null {
  for (const plan of PLANS) for (const interval of INTERVALS) if (PLAN_LOOKUP_KEYS[plan][interval] === key) return { plan, interval };
  return null;
}

export const addonOfLookupKey = (key: string | null | undefined) => Object.values(ADDONS).find((addon) => addon.lookupKey === key) ?? null;

/** Subscriptions that keep a website's agents running. */
export const LIVE_STATUSES = new Set(["active", "trialing"]);

/** Backlink credit subscribers only receive links from sites with at least this domain rating. */
export const CREDIT_SUBSCRIBER_MIN_RATING = 20;
