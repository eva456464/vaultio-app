/**
 * The onboarding wizard (add a website): checks the address, then suggests the market and language,
 * the business description and audiences, competitors and brand colours, which the owner confirms
 * step by step before the onboarding agents start.
 */
import { lookup } from "node:dns/promises";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { orgWebsites } from "@/db/schema";
import { CONTENT_LANGUAGES, contentLanguage, LOCATION_OF_COUNTRY } from "@/lib/languages";
import { ai } from "../ai/claude";
import { collectSiteText, discoverCompetitors } from "../agents/jobs/strategy";
import { enqueueOnboarding } from "../agents/queue";
import { fetchText, normalizeSiteUrl, parsePage } from "../agents/web";

type Site = typeof orgWebsites.$inferSelect;

/** The wizard's steps after the address, in order. */
export const WIZARD_STEPS = ["market", "business", "competitors", "brand", "search-console", "survey", "plan"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
/** The agency setup wizard, in order. */
export const AGENCY_STEPS = ["website", "brand", "dns", "team", "call"] as const;
export type AgencyStep = (typeof AGENCY_STEPS)[number];

/** Steps counted in "Step N of 5" (the address is step 1). */
export const NUMBERED_STEPS: WizardStep[] = ["market", "business", "competitors", "brand"];

// Profiles and listings rather than a business's own website.
const BLOCKED_HOSTS = [
  "facebook.com", "fb.com", "instagram.com", "linkedin.com", "x.com", "twitter.com", "tiktok.com", "youtube.com", "youtu.be", "pinterest.com",
  "google.com", "g.page", "goo.gl", "maps.app.goo.gl", "business.site", "yelp.com", "tripadvisor.com", "linktr.ee", "linkin.bio", "etsy.com",
  "amazon.com", "ebay.com", "threads.net", "wa.me", "t.me",
];
// Free site-builder addresses: the blog must publish to the business's real domain.
const BUILDER_SUFFIXES = [
  "webflow.io", "lovable.app", "framer.app", "framer.website", "framer.ai", "wixsite.com", "squarespace.com", "carrd.co", "vercel.app", "netlify.app",
  "github.io", "pages.dev", "bubbleapps.io", "softr.app", "durable.co", "godaddysites.com", "weebly.com", "webnode.page", "replit.app", "bolt.new",
];

export type UrlCheck = { url: string } | { error: "invalid" | "blocked" | "builder" | "unresolvable" };

const endsWith = (host: string, suffix: string) => host === suffix || host.endsWith(`.${suffix}`);

export async function checkWebsiteUrl(input: string, resolve: (host: string) => Promise<unknown> = lookup): Promise<UrlCheck> {
  let url: string;
  try {
    url = normalizeSiteUrl(input);
  } catch {
    return { error: "invalid" };
  }
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".") && host !== "localhost") return { error: "invalid" };
  if (BLOCKED_HOSTS.some((blocked) => endsWith(host, blocked))) return { error: "blocked" };
  if (BUILDER_SUFFIXES.some((suffix) => endsWith(host, suffix))) return { error: "builder" };
  try {
    await resolve(new URL(url).hostname);
  } catch {
    return { error: "unresolvable" };
  }
  return { url };
}

// Country-code domains that point to one market.
const TLD_COUNTRY: Record<string, string> = {
  uk: "GB", de: "DE", fr: "FR", nl: "NL", es: "ES", it: "IT", pt: "PT", pl: "PL", se: "SE", dk: "DK", no: "NO", fi: "FI", ie: "IE", be: "BE", ch: "CH",
  at: "AT", cz: "CZ", sk: "SK", hu: "HU", ro: "RO", gr: "GR", tr: "TR", ru: "RU", ua: "UA", jp: "JP", kr: "KR", cn: "CN", hk: "HK", tw: "TW", in: "IN",
  au: "AU", nz: "NZ", ca: "CA", mx: "MX", br: "BR", ar: "AR", cl: "CL", co: "CO", za: "ZA", ae: "AE", sa: "SA", il: "IL", eg: "EG", ph: "PH", id: "ID",
  my: "MY", sg: "SG", th: "TH", vn: "VN",
};

export type MarketGuess = { language: string; country: string | null };

/** Language from the page's lang / og:locale, market from the region in it or the domain's country code. */
export async function detectMarket(site: Pick<Site, "url" | "selectedLanguage">): Promise<MarketGuess> {
  const page = await fetchText(site.url, 10_000).catch(() => null);
  const html = page && page.status < 400 ? page.html : "";
  const lang = html.match(/<html[^>]*\slang=["']?([a-zA-Z-_]+)/i)?.[1] ?? html.match(/property=["']og:locale["'][^>]*content=["']([a-zA-Z_-]+)/i)?.[1] ?? "";
  const [base, region] = lang.replace("_", "-").split("-");
  const language = contentLanguage(base?.toLowerCase() ?? "") ? base!.toLowerCase() : site.selectedLanguage;
  const tld = new URL(site.url).hostname.split(".").pop()!.toLowerCase();
  const country = (region && region.length === 2 ? region.toUpperCase() : null) ?? TLD_COUNTRY[tld] ?? CONTENT_LANGUAGES.find((entry) => entry.code === language)?.country ?? null;
  return { language, country: country && LOCATION_OF_COUNTRY[country] ? country : null };
}

export class UnreachableSiteError extends Error {}

const BusinessSchema = z.object({ brandName: z.string(), description: z.string(), targetAudience: z.array(z.string()) });

/** Business description and audiences written from the website (Claude), or the site's own meta description. */
export async function describeBusiness(site: Site) {
  const home = await fetchText(site.url, 15_000).catch(() => null);
  if (!home || home.status >= 400) throw new UnreachableSiteError(site.url);
  const facts = parsePage(home.html, home.url);
  if (!process.env.ANTHROPIC_API_KEY) {
    return { brandName: facts.siteName ?? site.brandName, description: facts.metaDescription ?? "", targetAudience: [] as string[], generated: false };
  }
  const text = await collectSiteText(site, 16_000);
  const result = await ai.generateObject({
    schema: BusinessSchema,
    effort: "low",
    maxTokens: 3000,
    system:
      "You describe a business from its website for an SEO content team. description: 2 to 4 plain sentences on what the business offers, to whom and where, " +
      "using only what the site says. targetAudience: 4 to 8 short audience segments (a few words each) who would search for this business. " +
      `brandName: the business's name. Write in ${site.selectedLanguage}.`,
    prompt: `Website: ${site.url}\n\n${text}`,
  });
  return {
    brandName: result.brandName.trim() || facts.siteName || site.brandName,
    description: result.description.trim().slice(0, 2000),
    targetAudience: [...new Set(result.targetAudience.map((entry) => entry.trim()).filter(Boolean))].slice(0, 10),
    generated: true,
  };
}

/** Up to 10 competitor domains from keyword data (DataForSEO); none without it. */
export async function suggestCompetitors(site: Site) {
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) return { available: false, domains: [] as string[] };
  const found = await discoverCompetitors(site, 10);
  return { available: true, domains: found.map(([domain]) => domain) };
}

const hexOf = (value: string) => {
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  return null;
};

/** Greys, near-white and near-black aren't brand colours. */
function isNeutral(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const max = Math.max(r!, g!, b!);
  const min = Math.min(r!, g!, b!);
  return max - min < 30 || max < 40 || min > 225;
}

/** The colours a page uses most (theme colour first), from its markup and first stylesheets. */
export function brandColors(html: string, css: string[]) {
  const counts = new Map<string, number>();
  const theme = hexOf(html.match(/name=["']theme-color["'][^>]*content=["']([^"']+)/i)?.[1] ?? "");
  for (const source of [html, ...css]) {
    for (const match of source.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
      const hex = hexOf(match[0]);
      if (hex && !isNeutral(hex)) counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
  const colors = [...new Set([...(theme && !isNeutral(theme) ? [theme] : []), ...ranked])];
  return { primary: colors[0] ?? null, secondary: colors[1] ?? null };
}

const BrandSchema = z.object({ brandDescription: z.string() });

/** Brand colours from the site and a short description of its look (Claude) for the image prompts. */
export async function detectBrand(site: Site) {
  const home = await fetchText(site.url, 10_000).catch(() => null);
  const html = home && home.status < 400 ? home.html : "";
  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map((match) => match[0].match(/href=["']([^"']+)/i)?.[1])
    .filter((href): href is string => Boolean(href))
    .slice(0, 3);
  const css = await Promise.all(
    sheets.map(async (href) => {
      try {
        const sheet = await fetchText(new URL(href, home!.url).toString(), 8000);
        return sheet.status < 400 ? sheet.html.slice(0, 400_000) : "";
      } catch {
        return "";
      }
    }),
  );
  const colors = brandColors(html, css);
  const primary = site.brandColor ?? colors.primary;
  const secondary = site.brandSecondaryColor ?? colors.secondary;
  let brandDescription = site.brandDescription;
  if (!brandDescription && process.env.ANTHROPIC_API_KEY && html) {
    const facts = parsePage(html, home!.url);
    const result = await ai.generateObject({
      schema: BrandSchema,
      effort: "low",
      maxTokens: 1500,
      system:
        "Describe in two or three sentences the visual feel of this brand (colours, mood, style) for an illustrator making images for its blog. " +
        "Base it on the colours and the way the website presents itself; don't invent a logo.",
      prompt: [`Brand: ${site.brandName ?? facts.siteName ?? site.url}`, `What it does: ${site.description ?? facts.metaDescription ?? ""}`, `Colours: ${[primary, secondary].filter(Boolean).join(", ") || "unknown"}`, `Page title: ${facts.title ?? ""}`].join("\n"),
    });
    brandDescription = result.brandDescription.trim().slice(0, 1000);
  }
  return { primary, secondary, brandDescription: brandDescription ?? "" };
}

/** Where a site in the wizard should continue (null once the wizard is done). */
export function nextWizardStep(site: Pick<Site, "onboardingStatus" | "lastCompletedOnboardingStep">, skip: Partial<Record<WizardStep, boolean>>): WizardStep | null {
  if (site.onboardingStatus !== "not_started") return null;
  const done = site.lastCompletedOnboardingStep?.startsWith("wizard:") ? (site.lastCompletedOnboardingStep.slice(7) as WizardStep) : null;
  const from = done ? WIZARD_STEPS.indexOf(done) + 1 : 0;
  return WIZARD_STEPS.slice(from).find((step) => !skip[step]) ?? null;
}

/** Ends the wizard for a website: the onboarding agents start (Overview shows their progress). */
export async function beginOnboarding(siteId: number) {
  const [started] = await db
    .update(orgWebsites)
    .set({ onboardingStatus: "in_progress", lastCompletedOnboardingStep: null, updatedAt: new Date() })
    .where(and(eq(orgWebsites.id, siteId), eq(orgWebsites.onboardingStatus, "not_started")))
    .returning({ id: orgWebsites.id });
  if (started) await enqueueOnboarding(siteId);
}
