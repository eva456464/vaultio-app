"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod/v4";
import { db } from "@/db";
import { orgWebsites, targetLocations } from "@/db/schema";
import { CONTENT_LANGUAGE_CODES } from "@/lib/languages";
import { normalizeSiteUrl } from "../agents/web";
import { getAppContext, SELECTED_SITE_COOKIE } from "../context";
import { createLanguageSites, languageEligibility, languageFamily, MAX_LANGUAGES } from "../languages";

const schema = z.object({
  languages: z.array(z.enum(CONTENT_LANGUAGE_CODES)).min(1, "Choose at least one language"),
  market: z.enum(["site", "language"]),
  url: z.string().trim().max(300).optional(),
});

/**
 * Adds languages to the selected website: one language site each, set up like the website and
 * onboarded in its language. Opens the first new language afterwards. Languages the plan doesn't
 * include need the language add-on (from the new language's Billing page).
 */
export async function addLanguages(input: z.infer<typeof schema>) {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") return { error: "Only workspace admins can add languages" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const primaryId = context.site.primaryOrgWebsiteId ?? context.site.id;
  const [primary] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, primaryId));
  if (!primary) return { error: "Website not found" };

  const family = await languageFamily(primary.id);
  const taken = new Set(family.map((site) => site.selectedLanguage));
  const languages = [...new Set(parsed.data.languages)].filter((code) => !taken.has(code));
  if (!languages.length) return { error: "These languages are already set up for this website" };
  if (family.length + languages.length > MAX_LANGUAGES) return { error: `A website can have up to ${MAX_LANGUAGES} languages` };

  let url: string | null = null;
  if (parsed.data.url && parsed.data.url !== primary.url) {
    try {
      url = normalizeSiteUrl(parsed.data.url);
    } catch {
      return { error: "Enter the full address of this language's version, e.g. https://example.com/es" };
    }
  }

  const eligibility = await languageEligibility(primary);
  if (eligibility.mode === "blocked") {
    return { error: eligibility.reason === "noPlan" ? "Choose a plan for this website before adding languages." : "Extra languages are included in the Scale plan (3 per website). Upgrade to add languages." };
  }
  if (eligibility.mode === "plan" && languages.length > eligibility.includedLeft && !eligibility.addonPrice) {
    return { error: `Your plan includes ${eligibility.includedLeft} more ${eligibility.includedLeft === 1 ? "language" : "languages"} for this website.` };
  }

  const created = await createLanguageSites(primary, { languages, market: parsed.data.market, url });
  (await cookies()).set(SELECTED_SITE_COOKIE, String(created[0]!.id), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  revalidatePath("/[locale]", "layout");
  // Opens the first new language; languages beyond the plan's included ones go to Billing for their add-on.
  const needsAddon = eligibility.mode === "addon" || (eligibility.mode === "plan" && languages.length > eligibility.includedLeft);
  const locale = (await getLocale()) ?? "en";
  redirect(`/${locale}/dashboard/${needsAddon ? "settings/billing" : "overview"}`);
}

/** What adding a language to the selected website costs (for the Add language dialog). */
export async function languageOptions() {
  const context = await getAppContext();
  if (!context?.site) return null;
  const primaryId = context.site.primaryOrgWebsiteId ?? context.site.id;
  const [primary] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, primaryId));
  if (!primary) return null;
  const family = await languageFamily(primary.id);
  const [country] = await db.select({ name: targetLocations.name }).from(targetLocations).where(and(eq(targetLocations.orgWebsiteId, primary.id), eq(targetLocations.kind, "country"))).limit(1);
  return { url: primary.url, country: country?.name ?? null, existing: family.map((site) => site.selectedLanguage), eligibility: await languageEligibility(primary), canEdit: context.member?.role === "admin" };
}
