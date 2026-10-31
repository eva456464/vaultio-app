import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AnalyticsSettings, type DataSource } from "@/components/settings/analytics-settings";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { getAppContext } from "@/server/context";
import { googleConfigured, type GoogleProduct } from "@/server/google/client";

type GoogleConfig = { account?: { email?: string }; propertyName?: string; lastSyncedAt?: string | null };

export default async function AnalyticsSettingsPage({ searchParams }: PageProps<"/[locale]/dashboard/settings/analytics">) {
  const context = (await getAppContext())!;
  const site = context.site!;
  const query = await searchParams;
  const [t, tSettings, rows] = await Promise.all([
    getTranslations("settings.analytics"),
    getTranslations("settings"),
    db.select().from(integrations).where(eq(integrations.orgWebsiteId, site.id)),
  ]);
  const describe = (product: GoogleProduct): DataSource => {
    const row = rows.find((integration) => integration.type === product);
    if (!row || row.status === "disconnected") return { product, status: "off", email: null, propertyName: null, lastSyncedAt: null, lastError: null };
    const config = row.config as GoogleConfig;
    return {
      product,
      status: row.status,
      email: config.account?.email ?? null,
      propertyName: config.propertyName ?? null,
      lastSyncedAt: config.lastSyncedAt ?? null,
      lastError: row.lastError,
    };
  };
  const manage = query.manage === "ga4" || query.manage === "gsc" ? query.manage : null;
  const error = typeof query.error === "string" ? query.error : null;

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{t("title")}</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      {context.member?.role !== "admin" && <p className="mt-1 text-sm text-ink-secondary">{tSettings("adminOnly")}</p>}
      <AnalyticsSettings
        canEdit={context.member?.role === "admin"}
        configured={googleConfigured()}
        siteName={site.brandName ?? new URL(site.url).hostname}
        timeZone={site.timeZone}
        sources={[describe("ga4"), describe("gsc")]}
        openManage={manage}
        error={error}
      />
    </>
  );
}
