/** Read model for the white-label settings (Branding, Hosting, and Settings → White label). */
import { eq } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { whitelabelConfigs } from "@/db/schema";
import { DEFAULT_BRAND_COLOR } from "../brand";
import type { AppContext } from "../context";
import { emailDomainsConfigured, vercelConfigured } from "../whitelabel/domains";

export async function getWhiteLabel(context: AppContext) {
  const organization = context.organization!;
  const [[config], format, t] = await Promise.all([
    db.select().from(whitelabelConfigs).where(eq(whitelabelConfigs.organizationId, organization.id)),
    getFormatter(),
    getTranslations("settings.whiteLabel"),
  ]);
  const now = new Date();
  // Formatted here so the page shows the same text on the server and in the browser.
  const checked = (date: Date | null | undefined) => (date ? t("lastChecked", { time: format.relativeTime(date, now) }) : null);
  return {
    canEdit: context.member?.role === "admin",
    brand: {
      brandName: config?.brandName ?? organization.name,
      primaryColor: config?.primaryColor ?? DEFAULT_BRAND_COLOR,
      secondaryColor: config?.secondaryColor ?? "#000000",
      logoUrl: config?.logoUrl ?? null,
      faviconUrl: config?.faviconUrl ?? null,
    },
    hosting: {
      domain: config?.domain ?? "",
      verified: Boolean(config?.domainVerified),
      records: config?.domainRecords ?? [],
      error: config?.domainError ?? null,
      checkedLabel: checked(config?.domainCheckedAt),
      onVercel: vercelConfigured(),
    },
    email: {
      domain: config?.sendingDomain ?? "",
      status: config?.emailDomainStatus ?? null,
      records: config?.emailDomainRecords ?? [],
      checkedLabel: checked(config?.emailCheckedAt),
      available: emailDomainsConfigured(),
    },
  };
}

export type WhiteLabelData = Awaited<ReturnType<typeof getWhiteLabel>>;
