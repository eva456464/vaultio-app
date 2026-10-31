"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { orgWebsites } from "@/db/schema";
import { locales } from "@/i18n/routing";
import { enqueueOnboarding } from "../agents/queue";
import { normalizeSiteUrl } from "../agents/web";
import { getAppContext, SELECTED_SITE_COOKIE } from "../context";

const schema = z.object({
  url: z.string().min(3),
  language: z.enum(locales),
  timeZone: z.string().optional(),
});

export type AddSiteState = { error?: "invalid_url" | "not_allowed" } | null;

/** Adds a client website and starts its onboarding agents right away. */
export async function addSite(_previous: AddSiteState, form: FormData): Promise<AddSiteState> {
  const context = await getAppContext();
  if (!context?.organization || context.member?.role !== "admin") return { error: "not_allowed" };

  const parsed = schema.safeParse({
    url: form.get("url"),
    language: form.get("language"),
    timeZone: form.get("timeZone") || undefined,
  });
  if (!parsed.success) return { error: "invalid_url" };

  let url: string;
  try {
    url = normalizeSiteUrl(parsed.data.url);
    if (!new URL(url).hostname.includes(".") && !new URL(url).hostname.startsWith("localhost")) throw new Error();
  } catch {
    return { error: "invalid_url" };
  }

  const [site] = await db
    .insert(orgWebsites)
    .values({
      organizationId: context.organization.id,
      url,
      selectedLanguage: parsed.data.language,
      timeZone: parsed.data.timeZone ?? "America/Los_Angeles",
      onboardingStatus: "in_progress",
    })
    .returning();

  await enqueueOnboarding(site!.id);
  (await cookies()).set(SELECTED_SITE_COOKIE, String(site!.id), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  const uiLocale = locales.find((locale) => locale === form.get("locale")) ?? "en";
  redirect(`/${uiLocale}/dashboard/overview`);
}
