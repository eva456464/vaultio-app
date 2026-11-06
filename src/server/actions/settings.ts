"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ARTICLE_LENGTHS, ENGLISH_TYPES, SELECTABLE_ARTICLE_TYPES } from "@/lib/writing";
import { db } from "@/db";
import { competitors, orgWebsites, user } from "@/db/schema";
import { BODY_STYLES, COVER_STYLES, INFOGRAPHIC_STYLES } from "@/lib/visuals";
import { getAppContext } from "../context";

type Result = { ok: true } | { error: string };

async function requireAdminSite() {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can change settings");
  return context.site;
}

const refresh = () => revalidatePath("/[locale]/dashboard", "layout");

function fail(error: z.ZodError): Result {
  return { error: error.issues[0]?.message ?? "Please check the form" };
}

const offerSchema = z.object({
  kind: z.enum(["product_line", "service"]),
  name: z.string().trim().min(1).max(120),
  amount: z.string().trim().max(20).optional(),
  priceType: z.enum(["from", "fixed"]).optional(),
  currency: z.string().trim().max(5).optional(),
  period: z.string().trim().max(20).optional(),
});

const businessSchema = z.object({
  brandName: z.string().trim().min(1, "Enter the business name").max(120),
  description: z.string().trim().max(2000),
  industry: z.string().trim().max(60),
  businessType: z.string().trim().max(60),
  positioning: z.string().trim().max(500, "Keep the positioning under 500 characters"),
  targetAudience: z.array(z.string().trim().min(1).max(120)).max(20),
  servicesOffered: z.array(offerSchema).max(20),
  blogUrl: z.string().trim().max(300),
});

/** "Blog path URL": the blog's home page on the website; articles are expected under it. */
function blogPathOf(siteUrl: string, value: string): string | null {
  if (!value) return "/blog";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const sameSite = url.hostname.replace(/^www\./, "") === new URL(siteUrl).hostname.replace(/^www\./, "");
    if (!sameSite) return null;
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

export async function updateBusiness(input: z.input<typeof businessSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { blogUrl, ...profile } = parsed.data;
  const blogPath = blogPathOf(site.url, blogUrl);
  if (!blogPath) return { error: `Enter the blog's address on ${new URL(site.url).hostname}, e.g. ${new URL(site.url).origin}/blog` };
  await db
    .update(orgWebsites)
    .set({ ...profile, blogPath, servicesOfferedUpdatedAt: new Date(), profileConfirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}

const brandingSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex color like #E94545"),
  brandSecondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex color like #000000"),
  exampleArticleUrl: z.union([z.literal(""), z.url("Enter a full URL starting with https://")]),
});

export async function updateBranding(input: z.input<typeof brandingSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  await db
    .update(orgWebsites)
    .set({ ...parsed.data, exampleArticleUrl: parsed.data.exampleArticleUrl || null, updatedAt: new Date() })
    .where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}

export async function addCompetitor(rawUrl: string): Promise<Result> {
  const site = await requireAdminSite();
  let url: string;
  try {
    const parsed = new URL(/^https?:\/\//.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`);
    if (!parsed.hostname.includes(".")) throw new Error();
    url = `https://${parsed.hostname.replace(/^www\./, "")}`;
  } catch {
    return { error: "Enter a website like competitor.com" };
  }
  const existing = await db.select({ id: competitors.id }).from(competitors).where(and(eq(competitors.orgWebsiteId, site.id), eq(competitors.url, url)));
  if (!existing.length) await db.insert(competitors).values({ orgWebsiteId: site.id, url });
  refresh();
  return { ok: true };
}

export async function removeCompetitor(id: number) {
  const site = await requireAdminSite();
  await db.delete(competitors).where(and(eq(competitors.id, id), eq(competitors.orgWebsiteId, site.id)));
  refresh();
}

const writingSchema = z.object({
  englishType: z.enum(ENGLISH_TYPES),
  articleLength: z.enum(ARTICLE_LENGTHS),
  allowedArticleTypes: z.array(z.enum(SELECTABLE_ARTICLE_TYPES)).min(1, "Allow at least one article type"),
  includeRecommendedReads: z.boolean(),
  includeCitation: z.boolean(),
  useWwwInLinks: z.boolean(),
  useTrailingSlashInLinks: z.boolean(),
  includeTldr: z.boolean(),
  summaryStyle: z.enum(["tldr", "key_takeaways"]),
  includeToc: z.boolean(),
  includeSourcesSection: z.boolean(),
  includeInternalLinks: z.boolean(),
  includePerspective: z.boolean(),
  mentionCompetitorsIfRelevant: z.boolean(),
  includeJsonLd: z.boolean(),
  includeFaqJsonLd: z.boolean(),
  authorName: z.string().trim().max(80),
  articleDisclaimer: z.string().trim().max(500),
});

export async function updateWriting(input: z.input<typeof writingSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = writingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { authorName, articleDisclaimer, allowedArticleTypes, ...rest } = parsed.data;
  await db
    .update(orgWebsites)
    .set({
      ...rest,
      // All four allowed = automatic (the planner picks by search intent).
      allowedArticleTypes: allowedArticleTypes.length === SELECTABLE_ARTICLE_TYPES.length ? [] : allowedArticleTypes,
      authorName: authorName || null,
      articleDisclaimer: articleDisclaimer || null,
      updatedAt: new Date(),
    })
    .where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}

export async function updateSchedule(weekdays: number[]): Promise<Result> {
  const site = await requireAdminSite();
  const days = [...new Set(weekdays)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort();
  if (!days.length) return { error: "Pick at least one day" };
  await db
    .update(orgWebsites)
    .set({ articleScheduleWeekdays: days.length === 7 ? [] : days, updatedAt: new Date() })
    .where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}

export async function updateSitemapUrl(rawUrl: string): Promise<Result> {
  const site = await requireAdminSite();
  const value = rawUrl.trim();
  if (value) {
    try {
      new URL(value);
    } catch {
      return { error: "Enter the full sitemap URL, e.g. https://example.com/sitemap.xml" };
    }
  }
  await db.update(orgWebsites).set({ sitemapUrl: value || null, updatedAt: new Date() }).where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}

export async function updateProfileName(name: string): Promise<Result> {
  const context = await getAppContext();
  if (!context) throw new Error("Not signed in");
  const value = name.trim();
  if (!value || value.length > 80) return { error: "Enter your name" };
  await db.update(user).set({ name: value, updatedAt: new Date() }).where(eq(user.id, context.user.id));
  refresh();
  return { ok: true };
}

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => /^https?:\/\/[^\s]+\.[^\s]+/.test(value), "Use a full link starting with https://");

const visualsSchema = z
  .object({
    heroImageStyle: z.enum(COVER_STYLES),
    bodyImageStyle: z.enum(BODY_STYLES),
    infographicStyle: z.enum(INFOGRAPHIC_STYLES),
    includeInfographic: z.boolean(),
    imageMood: z.string().trim().max(600, "Keep the image description under 600 characters"),
    links: z.object({ enabled: z.boolean(), items: z.array(z.object({ label: z.string().trim().min(1, "Add the button text").max(40), url: httpUrl })).max(5) }),
    map: z.object({ enabled: z.boolean(), address: z.string().trim().max(200), mapsUrl: z.union([httpUrl, z.literal("")]) }),
    contact: z.object({
      enabled: z.boolean(),
      phone: z.string().trim().max(40),
      whatsapp: z.string().trim().max(40),
      email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
    }),
    promo: z.object({ enabled: z.boolean() }),
    youtube: z.object({ enabled: z.boolean(), channel: z.string().trim().max(100) }),
  })
  .refine((value) => !value.map.enabled || value.map.address, { message: "Add the business address to show the map card" })
  .refine((value) => !value.contact.enabled || value.contact.phone || value.contact.whatsapp || value.contact.email, {
    message: "Add a phone, WhatsApp or email to show the contact card",
  });

export async function updateVisuals(input: z.input<typeof visualsSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = visualsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const { imageMood, links, map, contact, promo, youtube, ...styles } = parsed.data;
  await db
    .update(orgWebsites)
    .set({
      ...styles,
      imageMood: imageMood || null,
      ctaSettings: {
        ...site.ctaSettings,
        links,
        map: { ...site.ctaSettings?.map, enabled: map.enabled, address: map.address || undefined, mapsUrl: map.mapsUrl || undefined },
        contact: { enabled: contact.enabled, phone: contact.phone || undefined, whatsapp: contact.whatsapp || undefined, email: contact.email || undefined },
        promo,
      },
      includeYoutube: youtube.enabled,
      youtubeChannel: youtube.channel || null,
      updatedAt: new Date(),
    })
    .where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}

const improvementsSchema = z
  .object({ enabled: z.boolean(), weekdays: z.array(z.number().int().min(0).max(6)).max(2, "Pick up to 2 days a week"), autoPublish: z.boolean() })
  .refine((value) => !value.enabled || value.weekdays.length > 0, { message: "Pick at least one improvement day" });

export async function updateImprovements(input: z.input<typeof improvementsSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = improvementsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  await db
    .update(orgWebsites)
    .set({
      improvementsEnabled: parsed.data.enabled,
      improvementWeekdays: [...new Set(parsed.data.weekdays)].sort(),
      improvementsAutoPublish: parsed.data.autoPublish,
      updatedAt: new Date(),
    })
    .where(eq(orgWebsites.id, site.id));
  refresh();
  return { ok: true };
}
