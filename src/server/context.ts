import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import {
  memberWebsiteAccess,
  organizationMembers,
  organizations,
  orgWebsites,
  subscriptions,
  whitelabelConfigs,
} from "@/db/schema";
import { auth } from "./auth";

export const SELECTED_SITE_COOKIE = "org_website_id";

export type Brand = {
  name: string;
  accentColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  organizationId: number | null;
};

const DEFAULT_BRAND: Brand = {
  name: process.env.DEFAULT_BRAND_NAME ?? "Vaultio",
  accentColor: process.env.DEFAULT_BRAND_COLOR ?? "#E94545",
  secondaryColor: "#000000",
  logoUrl: "/brand/vaultio-mark.svg",
  faviconUrl: "/brand/vaultio-mark.svg",
  organizationId: null,
};

/** Branding for the current request, resolved from the white-label domain. */
export const getBrand = cache(async (): Promise<Brand> => {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (!host) return DEFAULT_BRAND;
  const [config] = await db
    .select()
    .from(whitelabelConfigs)
    .where(eq(whitelabelConfigs.domain, host))
    .limit(1);
  if (!config) return DEFAULT_BRAND;
  return {
    name: config.brandName,
    accentColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    logoUrl: config.logoUrl ?? DEFAULT_BRAND.logoUrl,
    faviconUrl: config.faviconUrl ?? config.logoUrl ?? DEFAULT_BRAND.faviconUrl,
    organizationId: config.organizationId,
  };
});

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SiteSummary = {
  id: number;
  url: string;
  brandName: string | null;
  selectedLanguage: string;
  logoUrl: string | null;
  onboardingStatus: string;
  createdAt: Date;
  subscriptionStatus: string | null;
};

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AppContext = {
  session: Session;
  user: Session["user"];
  organization: typeof organizations.$inferSelect | null;
  member: typeof organizationMembers.$inferSelect | null;
  sites: SiteSummary[];
  site: typeof orgWebsites.$inferSelect | null;
};

async function loadAppContext(): Promise<AppContext | null> {
  const session = await getSession();
  if (!session) return null;

  const [membership] = await db
    .select({ member: organizationMembers, organization: organizations })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, session.user.id))
    .orderBy(asc(organizationMembers.id))
    .limit(1);
  if (!membership) return { session, user: session.user, organization: null, member: null, sites: [], site: null };

  const { member, organization } = membership;

  let allowedIds: number[] | null = null;
  if (!member.allWebsites) {
    const rows = await db
      .select({ id: memberWebsiteAccess.orgWebsiteId })
      .from(memberWebsiteAccess)
      .where(eq(memberWebsiteAccess.memberId, member.id));
    allowedIds = rows.map((row) => row.id);
  }

  const siteRows = await db
    .select()
    .from(orgWebsites)
    .where(
      and(
        eq(orgWebsites.organizationId, organization.id),
        eq(orgWebsites.isHidden, false),
        allowedIds ? inArray(orgWebsites.id, allowedIds.length ? allowedIds : [-1]) : undefined,
      ),
    )
    .orderBy(asc(orgWebsites.createdAt));

  const mainSubs = siteRows.length
    ? await db
        .select({ siteId: subscriptions.orgWebsiteId, status: subscriptions.status })
        .from(subscriptions)
        .where(and(eq(subscriptions.type, "main"), inArray(subscriptions.orgWebsiteId, siteRows.map((s) => s.id))))
    : [];
  const statusBySite = new Map(mainSubs.map((sub) => [sub.siteId, sub.status]));

  const sites: SiteSummary[] = siteRows.map((row) => ({
    id: row.id,
    url: row.url,
    brandName: row.brandName,
    selectedLanguage: row.selectedLanguage,
    logoUrl: row.logoUrl,
    onboardingStatus: row.onboardingStatus,
    createdAt: row.createdAt,
    subscriptionStatus: statusBySite.get(row.id) ?? null,
  }));

  const selectedId = Number((await cookies()).get(SELECTED_SITE_COOKIE)?.value);
  const site = siteRows.find((row) => row.id === selectedId) ?? siteRows[0] ?? null;

  return { session, user: session.user, organization, member, sites, site };
}

/** Everything a dashboard page needs about the signed-in user, cached per request. */
export const getAppContext = cache(loadAppContext);
