"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { organizations, whitelabelConfigs } from "@/db/schema";
import { fetchText, normalizeSiteUrl, parsePage } from "../agents/web";
import { getAppContext } from "../context";
import { AGENCY_STEPS, brandColors, type AgencyStep } from "../onboarding/wizard";


async function requireAdmin() {
  const context = await getAppContext();
  if (!context?.organization || context.member?.role !== "admin") throw new Error("Only workspace admins can set up the agency");
  return { ...context, organization: context.organization };
}

const go = async (path: string) => redirect(`/${await getLocale()}${path}`);

export type { AgencyStep };

/** "Setting up for your clients?": the workspace becomes an agency and the agency setup starts. */
export async function startAgencySetup() {
  const { organization } = await requireAdmin();
  await db
    .update(organizations)
    .set({ isAgency: true, agencySetupStep: organization.agencySetupStep && organization.agencySetupStep !== "done" ? organization.agencySetupStep : "website", updatedAt: new Date() })
    .where(eq(organizations.id, organization.id));
  return go("/onboarding/agency/website");
}

export async function setAgencyStep(step: AgencyStep | "done") {
  const { organization } = await requireAdmin();
  if (step !== "done" && !AGENCY_STEPS.includes(step)) throw new Error("Unknown step");
  await db.update(organizations).set({ agencySetupStep: step, updatedAt: new Date() }).where(eq(organizations.id, organization.id));
  return go(step === "done" ? "/clients" : `/onboarding/agency/${step}`);
}

/**
 * Step 1: the agency's own website prefills its brand name and colours (it is never tracked or
 * written for). The name goes on the workspace and the white-label brand.
 */
export async function saveAgencyWebsite(input: string): Promise<{ ok: true } | { error: "invalid" }> {
  const { organization } = await requireAdmin();
  let url: string;
  try {
    url = normalizeSiteUrl(z.string().min(3).parse(input));
  } catch {
    return { error: "invalid" };
  }
  const page = await fetchText(url, 10_000).catch(() => null);
  const html = page && page.status < 400 ? page.html : "";
  const facts = html ? parsePage(html, page!.url) : null;
  const name = (facts?.siteName ?? facts?.title?.split(/\s[|\-–—·:]\s/)[0] ?? new URL(url).hostname.replace(/^www\./, "").split(".")[0] ?? organization.name).trim().slice(0, 60);
  const colors = brandColors(html, []);
  await db
    .insert(whitelabelConfigs)
    .values({ organizationId: organization.id, brandName: name, ...(colors.primary ? { primaryColor: colors.primary.toUpperCase() } : {}), ...(colors.secondary ? { secondaryColor: colors.secondary.toUpperCase() } : {}) })
    .onConflictDoNothing({ target: whitelabelConfigs.organizationId });
  await db.update(organizations).set({ agencySetupStep: "brand", updatedAt: new Date() }).where(eq(organizations.id, organization.id));
  return go("/onboarding/agency/brand");
}

/** Step 2: white label (clients log in on the agency's domain) or branded reports only. */
export async function setAgencyMode(mode: "whitelabel" | "reports") {
  const { organization } = await requireAdmin();
  await db.update(organizations).set({ agencyMode: z.enum(["whitelabel", "reports"]).parse(mode), updatedAt: new Date() }).where(eq(organizations.id, organization.id));
}
