"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { brandAssets, whitelabelConfigs } from "@/db/schema";
import { getAppContext } from "../context";
import { brandAssetIdFromPath } from "../whitelabel/assets";
import {
  checkHostingDomain,
  connectHostingDomain,
  createEmailDomain,
  deleteEmailDomain,
  disconnectHostingDomain,
  emailDomainsConfigured,
  normalizeDomain,
  platformHosts,
  verifyEmailDomain,
} from "../whitelabel/domains";

type Result = { ok: true } | { error: string };

const refresh = () => revalidatePath("/[locale]", "layout");

async function requireAdmin() {
  const context = await getAppContext();
  if (!context?.organization || context.member?.role !== "admin") throw new Error("Only workspace admins can change the white label");
  return { ...context, organization: context.organization };
}

async function configOf(organizationId: number, brandName: string) {
  await db.insert(whitelabelConfigs).values({ organizationId, brandName }).onConflictDoNothing({ target: whitelabelConfigs.organizationId });
  const [config] = await db.select().from(whitelabelConfigs).where(eq(whitelabelConfigs.organizationId, organizationId));
  return config!;
}

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex colour like #E94545");
const brandingSchema = z.object({
  brandName: z.string().trim().min(1, "Enter your agency name").max(60, "Keep the name under 60 characters"),
  primaryColor: hex,
  secondaryColor: hex,
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
});

/** Only this workspace's uploaded images can be used as its logo and favicon. */
async function ownAsset(organizationId: number, path: string | null, kind: "logo" | "favicon") {
  if (!path) return null;
  const id = brandAssetIdFromPath(path);
  if (!id) return undefined;
  const [asset] = await db.select({ id: brandAssets.id }).from(brandAssets).where(and(eq(brandAssets.id, id), eq(brandAssets.organizationId, organizationId), eq(brandAssets.kind, kind)));
  return asset ? path : undefined;
}

export async function saveBranding(input: z.input<typeof brandingSchema>): Promise<Result> {
  const context = await requireAdmin();
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const organizationId = context.organization.id;
  const [logoUrl, faviconUrl] = await Promise.all([ownAsset(organizationId, parsed.data.logoUrl, "logo"), ownAsset(organizationId, parsed.data.faviconUrl, "favicon")]);
  if (logoUrl === undefined || faviconUrl === undefined) return { error: "Upload the image again" };
  await configOf(organizationId, parsed.data.brandName);
  await db
    .update(whitelabelConfigs)
    .set({ brandName: parsed.data.brandName, primaryColor: parsed.data.primaryColor.toUpperCase(), secondaryColor: parsed.data.secondaryColor.toUpperCase(), logoUrl, faviconUrl, updatedAt: new Date() })
    .where(eq(whitelabelConfigs.organizationId, organizationId));
  refresh();
  return { ok: true };
}

/** Saves the hosting and email sending domains and starts their setup (DNS records to add). */
export async function saveDomains(input: { domain: string; sendingDomain: string }): Promise<Result> {
  const context = await requireAdmin();
  const organizationId = context.organization.id;
  const domain = input.domain.trim() ? normalizeDomain(input.domain) : null;
  const sendingDomain = input.sendingDomain.trim() ? normalizeDomain(input.sendingDomain) : null;
  if (input.domain.trim() && !domain) return { error: "Enter the hosting domain as a name like app.youragency.com" };
  if (input.sendingDomain.trim() && !sendingDomain) return { error: "Enter the sending domain as a name like mail.youragency.com" };
  if (domain && platformHosts().has(domain)) return { error: "That domain belongs to the platform. Use one of your own." };
  if (domain) {
    const [taken] = await db.select({ id: whitelabelConfigs.id }).from(whitelabelConfigs).where(and(eq(whitelabelConfigs.domain, domain), ne(whitelabelConfigs.organizationId, organizationId)));
    if (taken) return { error: "Another workspace already uses this hosting domain." };
  }
  if (sendingDomain && !emailDomainsConfigured()) return { error: "Emails from your own domain need the email provider to be set up first (RESEND_API_KEY)." };

  const config = await configOf(organizationId, context.organization.name);
  const updates: Partial<typeof whitelabelConfigs.$inferInsert> = { updatedAt: new Date() };

  if (domain !== config.domain) {
    if (config.domain) await disconnectHostingDomain(config.domain);
    Object.assign(updates, { domain, domainVerified: false, domainRecords: null, domainError: null, recommendedCname: null, domainCheckedAt: null });
    if (domain) {
      try {
        const check = await connectHostingDomain(domain);
        Object.assign(updates, { domainVerified: check.verified, domainRecords: check.records, domainError: check.error, recommendedCname: check.records.find((record) => record.type === "CNAME")?.value ?? null, domainCheckedAt: new Date() });
      } catch (error) {
        console.error("[white label] domain setup failed:", (error as Error).message);
        updates.domainError = "The domain couldn't be set up right now. Try again in a minute.";
      }
    }
  }

  if (sendingDomain !== config.sendingDomain) {
    if (config.emailDomainId) await deleteEmailDomain(config.emailDomainId);
    Object.assign(updates, { sendingDomain, emailDomainId: null, emailDomainStatus: null, emailDomainRecords: null, emailCheckedAt: null });
    if (sendingDomain) {
      try {
        const created = await createEmailDomain(sendingDomain);
        Object.assign(updates, { emailDomainId: created.id, emailDomainStatus: created.status, emailDomainRecords: created.records, emailCheckedAt: new Date() });
      } catch (error) {
        console.error("[white label] email domain setup failed:", (error as Error).message);
        updates.emailDomainStatus = "failed";
      }
    }
  }

  try {
    await db.update(whitelabelConfigs).set(updates).where(eq(whitelabelConfigs.organizationId, organizationId));
  } catch {
    return { error: "Another workspace already uses this hosting domain." };
  }
  refresh();
  return { ok: true };
}

/** Checks both domains again (DNS can take a while to update). */
export async function checkDomains(): Promise<Result> {
  const context = await requireAdmin();
  const [config] = await db.select().from(whitelabelConfigs).where(eq(whitelabelConfigs.organizationId, context.organization.id));
  if (!config) return { ok: true };
  const updates: Partial<typeof whitelabelConfigs.$inferInsert> = { updatedAt: new Date() };
  if (config.domain) {
    try {
      const check = await checkHostingDomain(config.domain);
      Object.assign(updates, { domainVerified: check.verified, domainRecords: check.records.length ? check.records : config.domainRecords, domainError: check.error, domainCheckedAt: new Date() });
    } catch (error) {
      console.error("[white label] domain check failed:", (error as Error).message);
    }
  }
  if (config.emailDomainId) {
    try {
      const state = await verifyEmailDomain(config.emailDomainId);
      Object.assign(updates, { emailDomainStatus: state.status, emailDomainRecords: state.records, emailCheckedAt: new Date() });
    } catch (error) {
      console.error("[white label] email domain check failed:", (error as Error).message);
    }
  }
  await db.update(whitelabelConfigs).set(updates).where(eq(whitelabelConfigs.id, config.id));
  refresh();
  return { ok: true };
}
