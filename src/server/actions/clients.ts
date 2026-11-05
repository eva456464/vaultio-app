"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orgWebsites } from "@/db/schema";
import { locales } from "@/i18n/routing";
import { contentLanguage } from "@/lib/languages";
import { getAppContext, SELECTED_SITE_COOKIE } from "../context";
import { checkWebsiteUrl } from "../onboarding/wizard";

export type AddSiteState = { error?: "invalid_url" | "blocked" | "builder" | "unresolvable" | "exists" | "not_allowed" } | null;

/**
 * Step 1 of the onboarding wizard: checks the address and adds the website, then the wizard asks for
 * its market, business, competitors and brand before the onboarding agents start.
 */
export async function addSite(_previous: AddSiteState, form: FormData): Promise<AddSiteState> {
  const context = await getAppContext();
  if (!context?.organization || context.member?.role !== "admin") return { error: "not_allowed" };

  const check = await checkWebsiteUrl(String(form.get("url") ?? ""));
  if ("error" in check) return { error: check.error === "invalid" ? "invalid_url" : check.error };
  const host = new URL(check.url).hostname.replace(/^www\./, "");
  const existing = await db
    .select({ id: orgWebsites.id, url: orgWebsites.url, status: orgWebsites.onboardingStatus })
    .from(orgWebsites)
    .where(and(eq(orgWebsites.organizationId, context.organization.id), isNull(orgWebsites.primaryOrgWebsiteId)));
  const same = existing.find((site) => new URL(site.url).hostname.replace(/^www\./, "") === host);
  const jar = await cookies();
  const uiLocale = locales.find((locale) => locale === form.get("locale")) ?? "en";
  if (same && same.status !== "not_started") return { error: "exists" };

  // An unfinished wizard for the same address continues where it stopped.
  let siteId = same?.id;
  if (!siteId) {
    const [site] = await db
      .insert(orgWebsites)
      .values({
        organizationId: context.organization.id,
        url: check.url,
        selectedLanguage: contentLanguage(uiLocale) ? uiLocale : "en",
        timeZone: z.string().max(64).safeParse(form.get("timeZone")).data || "America/Los_Angeles",
        onboardingStatus: "not_started",
      })
      .returning();
    siteId = site!.id;
  }
  jar.set(SELECTED_SITE_COOKIE, String(siteId), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  redirect(`/${uiLocale}/onboarding/market`);
}
