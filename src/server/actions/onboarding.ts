"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { articles, competitors, organizations, orgWebsites, targetLocations } from "@/db/schema";
import { COVER_STYLES } from "@/lib/visuals";
import { CONTENT_LANGUAGE_CODES, LOCATION_OF_COUNTRY } from "@/lib/languages";
import { normalizeSiteUrl } from "../agents/web";
import { locationName } from "../seo/dataforseo";
import { getAppContext, SELECTED_SITE_COOKIE } from "../context";
import { beginOnboarding, describeBusiness, detectBrand, detectMarket, suggestCompetitors, UnreachableSiteError, WIZARD_STEPS, type WizardStep } from "../onboarding/wizard";

type Result = { ok: true } | { error: string };

/** The website being set up: the selected one, still in the wizard, and an admin doing it. */
async function wizardSite() {
  const context = await getAppContext();
  if (!context?.site || !context.organization || context.member?.role !== "admin") throw new Error("Only workspace admins can add websites");
  if (context.site.onboardingStatus !== "not_started") throw new Error("This website is already set up");
  return { site: context.site, organization: context.organization };
}

async function completeStep(siteId: number, step: WizardStep, values: Partial<typeof orgWebsites.$inferInsert> = {}) {
  await db.update(orgWebsites).set({ ...values, lastCompletedOnboardingStep: `wizard:${step}`, updatedAt: new Date() }).where(eq(orgWebsites.id, siteId));
}

const go = async (path: string) => redirect(`/${await getLocale()}${path}`);

// ------------------------------------------------------------------ Step 2: market and language

export async function wizardDetectMarket() {
  const { site } = await wizardSite();
  return detectMarket(site);
}

export async function wizardSaveMarket(input: { language: string; country: string }): Promise<Result> {
  const { site } = await wizardSite();
  const language = z.enum(CONTENT_LANGUAGE_CODES).safeParse(input.language);
  if (!language.success) return { error: "language" };
  const global = input.country === "global";
  const locationCode = global ? null : LOCATION_OF_COUNTRY[input.country.toUpperCase()];
  if (!global && !locationCode) return { error: "country" };
  await db.delete(targetLocations).where(and(eq(targetLocations.orgWebsiteId, site.id), eq(targetLocations.kind, "country")));
  if (locationCode) {
    await db.insert(targetLocations).values({ orgWebsiteId: site.id, locationCode, name: locationName(locationCode) ?? input.country, countryCode: input.country.toUpperCase(), kind: "country" });
  }
  await completeStep(site.id, "market", { selectedLanguage: language.data, onboardingAnswers: { ...site.onboardingAnswers, market: global ? "global" : "country" } });
  return { ok: true };
}

// ---------------------------------------------------------------- Step 3: business

export async function wizardDescribeBusiness(): Promise<
  { ok: true; brandName: string | null; description: string; targetAudience: string[]; generated: boolean } | { error: "unreachable" | "failed" }
> {
  const { site } = await wizardSite();
  // Coming back to this step shows what was saved instead of writing it again.
  if (site.onboardingAnswers.business) return { ok: true, brandName: site.brandName, description: site.description ?? "", targetAudience: site.targetAudience, generated: true };
  try {
    return { ok: true, ...(await describeBusiness(site)) };
  } catch (error) {
    if (error instanceof UnreachableSiteError) return { error: "unreachable" };
    console.error("[onboarding] business description failed:", (error as Error).message);
    return { error: "failed" };
  }
}

const businessSchema = z.object({
  brandName: z.string().trim().max(120),
  description: z.string().trim().min(20, "description").max(2000),
  targetAudience: z.array(z.string().trim().min(1).max(100)).min(2, "audiences").max(20),
});

export async function wizardSaveBusiness(input: z.input<typeof businessSchema>): Promise<Result> {
  const { site } = await wizardSite();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  await completeStep(site.id, "business", {
    brandName: parsed.data.brandName || site.brandName,
    description: parsed.data.description,
    targetAudience: [...new Set(parsed.data.targetAudience)],
    onboardingAnswers: { ...site.onboardingAnswers, business: true },
  });
  return { ok: true };
}

// --------------------------------------------------------------- Step 4: competitors

export async function wizardSuggestCompetitors(): Promise<{ ok: true; available: boolean; domains: string[] } | { error: "failed" }> {
  const { site } = await wizardSite();
  const saved = await db.select({ url: competitors.url }).from(competitors).where(eq(competitors.orgWebsiteId, site.id));
  if (saved.length) return { ok: true, available: true, domains: saved.map((row) => new URL(row.url).hostname) };
  try {
    return { ok: true, ...(await suggestCompetitors(site)) };
  } catch (error) {
    console.error("[onboarding] competitor suggestions failed:", (error as Error).message);
    return { error: "failed" };
  }
}

const MAX_WIZARD_COMPETITORS = 10;

/** Saves the chosen competitors; skipping leaves the choice to the competitor agent. */
export async function wizardSaveCompetitors(domains: string[] | null): Promise<Result> {
  const { site } = await wizardSite();
  if (domains === null) {
    await completeStep(site.id, "competitors");
    return { ok: true };
  }
  const own = new URL(site.url).hostname.replace(/^www\./, "");
  const clean: string[] = [];
  for (const entry of domains) {
    try {
      const host = new URL(normalizeSiteUrl(entry)).hostname.replace(/^www\./, "").toLowerCase();
      if (host.includes(".") && host !== own && !clean.includes(host)) clean.push(host);
    } catch {
      return { error: "invalid" };
    }
  }
  if (clean.length > MAX_WIZARD_COMPETITORS) return { error: "max" };
  await db.delete(competitors).where(eq(competitors.orgWebsiteId, site.id));
  if (clean.length) await db.insert(competitors).values(clean.map((host) => ({ orgWebsiteId: site.id, url: `https://${host}` })));
  await completeStep(site.id, "competitors", { onboardingAnswers: { ...site.onboardingAnswers, competitors: clean.length > 0 } });
  return { ok: true };
}

// --------------------------------------------------------------------- Step 5: brand

export async function wizardDetectBrand() {
  const { site } = await wizardSite();
  try {
    return { ok: true as const, ...(await detectBrand(site)), heroImageStyle: site.heroImageStyle };
  } catch (error) {
    console.error("[onboarding] brand detection failed:", (error as Error).message);
    return { ok: true as const, primary: site.brandColor, secondary: site.brandSecondaryColor, brandDescription: site.brandDescription ?? "", heroImageStyle: site.heroImageStyle };
  }
}

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const brandSchema = z.object({
  brandColor: hex,
  brandSecondaryColor: z.union([hex, z.literal("")]),
  brandDescription: z.string().trim().max(1000),
  voiceExampleUrl: z.union([z.string().trim().url(), z.literal("")]),
  heroImageStyle: z.enum(COVER_STYLES),
});

export async function wizardSaveBrand(input: z.input<typeof brandSchema>): Promise<Result> {
  const { site } = await wizardSite();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.path[0] === "voiceExampleUrl" ? "voiceUrl" : "failed" };
  const { voiceExampleUrl, brandSecondaryColor, brandDescription, ...rest } = parsed.data;
  await completeStep(site.id, "brand", {
    ...rest,
    brandColor: rest.brandColor.toUpperCase(),
    brandSecondaryColor: brandSecondaryColor ? brandSecondaryColor.toUpperCase() : null,
    brandDescription: brandDescription || null,
    // The image prompts read the look of the brand from here (Settings → Visuals).
    imageMood: site.imageMood ?? (brandDescription || null),
    // Settings → Branding shows the same field.
    exampleArticleUrl: voiceExampleUrl || site.exampleArticleUrl,
    onboardingAnswers: { ...site.onboardingAnswers, brand: true },
  });
  return { ok: true };
}

// ------------------------------------------------------- Steps 6–8: Search Console, survey, plan

export async function wizardSkip(step: "search-console" | "plan"): Promise<Result> {
  const { site } = await wizardSite();
  await completeStep(site.id, step);
  return { ok: true };
}

const SURVEY_CHANNELS = ["google", "chatgpt", "friend", "linkedin", "youtube", "reddit", "x", "facebook", "newsletter", "podcast", "other"] as const;

export async function wizardSaveSurvey(input: { channel: string; detail: string }): Promise<Result> {
  const { site, organization } = await wizardSite();
  const channel = z.enum(SURVEY_CHANNELS).safeParse(input.channel);
  if (!channel.success) return { error: "channel" };
  if (channel.data === "other" && !input.detail.trim()) return { error: "specify" };
  await db
    .update(organizations)
    .set({ acquisitionChannel: channel.data, acquisitionDetail: input.detail.trim().slice(0, 200) || null, updatedAt: new Date() })
    .where(eq(organizations.id, organization.id));
  await completeStep(site.id, "survey");
  return { ok: true };
}

/** Ends the wizard: the onboarding agents start and the dashboard opens. */
export async function finishOnboarding(): Promise<Result> {
  const { site } = await wizardSite();
  await beginOnboarding(site.id);
  return go("/dashboard/overview");
}

/** "Restart onboarding" (e.g. the address was mistyped): the unfinished website is removed. */
export async function restartOnboarding(): Promise<Result> {
  const { site } = await wizardSite();
  const [written] = await db.select({ count: sql<number>`count(*)::int` }).from(articles).where(eq(articles.orgWebsiteId, site.id));
  if (!written?.count) await db.delete(orgWebsites).where(and(eq(orgWebsites.id, site.id), eq(orgWebsites.onboardingStatus, "not_started")));
  const [other] = await db
    .select({ id: orgWebsites.id })
    .from(orgWebsites)
    .where(and(eq(orgWebsites.organizationId, site.organizationId), ne(orgWebsites.id, site.id)))
    .limit(1);
  const jar = await cookies();
  if (other) jar.set(SELECTED_SITE_COOKIE, String(other.id), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  else jar.delete(SELECTED_SITE_COOKIE);
  return go("/onboarding/website?restart=1");
}

export async function wizardGoTo(step: WizardStep) {
  if (!WIZARD_STEPS.includes(step)) throw new Error("Unknown step");
  return go(`/onboarding/${step}`);
}
