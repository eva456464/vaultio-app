"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { competitors, orgWebsites, user } from "@/db/schema";
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
});

export async function updateBusiness(input: z.input<typeof businessSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  await db
    .update(orgWebsites)
    .set({ ...parsed.data, servicesOfferedUpdatedAt: new Date(), profileConfirmedAt: new Date(), updatedAt: new Date() })
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
  rules: z.array(z.string().trim().min(1).max(300)).max(40),
  englishType: z.enum(["american", "british"]),
  articleLengthTarget: z.number().int().min(800).max(5000),
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
  const { rules, authorName, articleDisclaimer, ...rest } = parsed.data;
  await db
    .update(orgWebsites)
    .set({
      ...rest,
      articleInstructions: rules.length ? rules.join("\n") : null,
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
