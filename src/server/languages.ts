/**
 * Language sites: a website written in more than one language has one org website per language.
 * The first one is the primary (it holds the plan); each language site points to it, starts as a
 * copy of its settings and gets its own onboarding (keywords, plan and articles in its language).
 * The product catalog is shared: it belongs to the primary.
 */
import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { orgWebsites, targetLocations } from "@/db/schema";
import { LANGUAGE_ADDON, PLAN_LIMITS } from "@/lib/billing";
import { contentLanguage, LOCATION_OF_COUNTRY } from "@/lib/languages";
import { enqueueOnboarding } from "./agents/queue";
import { siteEntitlements } from "./billing/entitlements";
import { billingEnabled, priceCatalog } from "./billing/stripe";

type Site = typeof orgWebsites.$inferSelect;

/** Most languages one website can have, so a mistake can't start dozens of onboardings. */
export const MAX_LANGUAGES = 12;

export const primaryIdOf = (site: { id: number; primaryOrgWebsiteId: number | null }) => site.primaryOrgWebsiteId ?? site.id;

/** The primary site and its language sites, oldest first. */
export async function languageFamily(primaryId: number) {
  return db
    .select()
    .from(orgWebsites)
    .where(or(eq(orgWebsites.id, primaryId), eq(orgWebsites.primaryOrgWebsiteId, primaryId)))
    .orderBy(asc(orgWebsites.createdAt), asc(orgWebsites.id));
}

export type LanguageEligibility = {
  /** "free": billing is off or the workspace isn't billed; "plan": Scale's included languages; "addon": a paid language add-on each. */
  mode: "free" | "plan" | "addon" | "blocked";
  reason?: "noPlan" | "needsScale";
  included: number;
  includedLeft: number;
  addonPrice: { amount: number; currency: string; interval: string } | null;
};

/** What adding languages to this website costs, given its plan and the languages it already has. */
export async function languageEligibility(primary: Site): Promise<LanguageEligibility> {
  const entitlements = await siteEntitlements(primary.id);
  const family = await languageFamily(primary.id);
  const used = family.length - 1;
  if (entitlements.mode !== "billed") return { mode: "free", included: 0, includedLeft: 0, addonPrice: null };
  const price = billingEnabled() ? ((await priceCatalog().catch(() => new Map())).get(LANGUAGE_ADDON.lookupKey) ?? null) : null;
  const addonPrice = price ? { amount: price.amount, currency: price.currency, interval: price.interval ?? "month" } : null;
  if (!entitlements.active) return { mode: "blocked", reason: "noPlan", included: 0, includedLeft: 0, addonPrice };
  const included = entitlements.plan ? PLAN_LIMITS[entitlements.plan].extraLanguages : 0;
  const includedLeft = Math.max(0, included - used);
  if (includedLeft > 0) return { mode: "plan", included, includedLeft, addonPrice };
  if (addonPrice) return { mode: "addon", included, includedLeft: 0, addonPrice };
  return { mode: "blocked", reason: "needsScale", included, includedLeft: 0, addonPrice };
}

// Settings that stay with the language they belong to; everything else starts as the primary's.
const NOT_COPIED = ["id", "url", "selectedLanguage", "primaryOrgWebsiteId", "onboardingStatus", "lastCompletedOnboardingStep", "onboardingCompletedAt", "seedTopics", "createdAt", "updatedAt", "isHidden"] as const;

/**
 * Creates language sites for a website (copies of its settings in another language) and starts
 * their onboarding. `market` "site" keeps the website's own country (e.g. Spanish for the US), "language"
 * targets the language's main country.
 */
export async function createLanguageSites(primary: Site, input: { languages: string[]; market: "site" | "language"; url?: string | null }) {
  const [country] = await db.select().from(targetLocations).where(and(eq(targetLocations.orgWebsiteId, primary.id), eq(targetLocations.kind, "country"))).limit(1);
  const created: Site[] = [];
  for (const code of input.languages) {
    const language = contentLanguage(code)!;
    const copy = Object.fromEntries(Object.entries(primary).filter(([key]) => !(NOT_COPIED as readonly string[]).includes(key))) as Partial<Site>;
    const [site] = await db
      .insert(orgWebsites)
      .values({
        ...copy,
        organizationId: primary.organizationId,
        url: input.url || primary.url,
        selectedLanguage: code,
        primaryOrgWebsiteId: primary.id,
        onboardingStatus: "in_progress",
        seedTopics: [],
      })
      .returning();
    const market =
      input.market === "site" && country
        ? { locationCode: country.locationCode, countryCode: country.countryCode, name: country.name }
        : { locationCode: LOCATION_OF_COUNTRY[language.country] ?? language.location, countryCode: language.country, name: regionName(language.country) };
    await db.insert(targetLocations).values({ orgWebsiteId: site!.id, kind: "country", ...market });
    await enqueueOnboarding(site!.id);
    created.push(site!);
  }
  return created;
}

export function regionName(alpha2: string | null) {
  if (!alpha2) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(alpha2) ?? alpha2;
  } catch {
    return alpha2;
  }
}
