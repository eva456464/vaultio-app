import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PublishingSettings } from "@/components/settings/publishing-settings";
import { db } from "@/db";
import { apiKeys, integrations } from "@/db/schema";
import { getAppContext } from "@/server/context";

export default async function PublishingSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, tSettings, connections, [apiKey]] = await Promise.all([
    getTranslations("settings.publishing"),
    getTranslations("settings"),
    db.select().from(integrations).where(eq(integrations.orgWebsiteId, site.id)),
    db.select({ prefix: apiKeys.keyPrefix, lastUsedAt: apiKeys.lastUsedAt }).from(apiKeys).where(and(eq(apiKeys.orgWebsiteId, site.id), isNull(apiKeys.revokedAt))).limit(1),
  ]);
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const describe = (type: "webhook" | "wordpress") => {
    const row = connections.find((connection) => connection.type === type);
    if (!row) return null;
    return { status: row.status, lastError: row.lastError, config: row.config as Record<string, string> };
  };

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{t("title")}</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      {context.member?.role !== "admin" && <p className="mt-1 text-sm text-ink-secondary">{tSettings("adminOnly")}</p>}
      <PublishingSettings
        apiBaseUrl={`${protocol}://${host}/api/integrations`}
        canEdit={context.member?.role === "admin"}
        autoPublish={site.autoPublish}
        apiKey={apiKey ? { prefix: apiKey.prefix, lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null } : null}
        webhook={describe("webhook")}
        wordpress={describe("wordpress")}
      />
    </>
  );
}
