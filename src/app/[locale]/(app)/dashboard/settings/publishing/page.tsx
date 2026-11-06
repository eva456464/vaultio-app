import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { PublishingSettings } from "@/components/settings/publishing-settings";
import { db } from "@/db";
import { apiKeys, integrations } from "@/db/schema";
import { getAppContext, getBrand } from "@/server/context";
import { decryptJson } from "@/server/crypto";
import { dudaFeedUrl } from "@/server/publishing/feeds";
import type { BlogConfig } from "@/server/hosted-blog";
import { vercelConfigured } from "@/server/whitelabel/domains";
import { wpcomConfigured } from "@/server/publishing/platforms/wordpress-com";
import { PLATFORM_NAMES } from "@/lib/platforms";

const WPCOM_RESULTS = ["connected", "declined", "expired", "failed", "notConfigured", "admin"] as const;

export default async function PublishingSettingsPage({ searchParams }: PageProps<"/[locale]/dashboard/settings/publishing">) {
  const query = await searchParams;
  const wpcomResult = WPCOM_RESULTS.find((value) => value === query.wpcom) ?? null;
  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, tSettings, connections, keys, brand, locale] = await Promise.all([
    getTranslations("settings.publishing"),
    getTranslations("settings"),
    db.select().from(integrations).where(eq(integrations.orgWebsiteId, site.id)),
    db.select({ source: apiKeys.source, prefix: apiKeys.keyPrefix, lastUsedAt: apiKeys.lastUsedAt }).from(apiKeys).where(and(eq(apiKeys.orgWebsiteId, site.id), isNull(apiKeys.revokedAt))),
    getBrand(),
    getLocale(),
  ]);
  const keyOf = (source: "api" | "framer" | "lovable" | "nextjs") => {
    const key = keys.find((entry) => entry.source === source);
    return key ? { prefix: key.prefix, lastUsedAt: key.lastUsedAt?.toISOString() ?? null } : null;
  };
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const describe = (type: "webhook" | "wordpress") => {
    const row = connections.find((connection) => connection.type === type);
    if (!row) return null;
    return { status: row.status, lastError: row.lastError, config: row.config as Record<string, string> };
  };

  // Only non-secret settings go to the browser.
  const platform = (type: "wordpress_com" | "ghost" | "webflow" | "shopify" | "wix" | "bigcommerce" | "gohighlevel") => {
    const row = connections.find((connection) => connection.type === type);
    return row ? { status: row.status, lastError: row.lastError, config: row.config as Record<string, unknown> } : null;
  };
  const blogRow = connections.find((connection) => connection.type === "hosted_blog");
  // The Duda feed address carries its key, so it's only shown to admins.
  const dudaRow = connections.find((connection) => connection.type === "duda" && connection.status === "connected");
  const dudaConfig = dudaRow?.config as { origin?: string } | undefined;
  const dudaToken = dudaRow?.credentialsEncrypted && context.member?.role === "admin" ? decryptJson<{ token: string }>(dudaRow.credentialsEncrypted).token : null;
  const duda = dudaRow ? { feedUrl: dudaToken ? dudaFeedUrl(dudaConfig?.origin ?? `${protocol}://${host}`, dudaToken) : null } : null;
  const blog = blogRow?.config as BlogConfig | undefined;
  const siteHost = new URL(site.url).hostname.replace(/^www\./, "");

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{t("title")}</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      {context.member?.role !== "admin" && <p className="mt-1 text-sm text-ink-secondary">{tSettings("adminOnly")}</p>}
      {site.detectedPlatform && PLATFORM_NAMES[site.detectedPlatform] && t.has(`detected.hints.${site.detectedPlatform}`) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3 text-sm">
          <span className="font-semibold text-ink">{t("detected.title", { platform: PLATFORM_NAMES[site.detectedPlatform]! })}</span>
          <span className="text-ink-secondary">{t(`detected.hints.${site.detectedPlatform}` as "detected.hints.wordpress")}</span>
          {site.detectedPlatform !== "nextjs" && <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">{t("detected.noDeveloper")}</span>}
        </div>
      )}
      {wpcomResult && (
        <p role="status" className={wpcomResult === "connected" ? "mt-4 rounded-xl bg-success-bg p-3 text-sm text-success" : "mt-4 rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]"}>
          {t(`wordpress_com.result.${wpcomResult}`)}
        </p>
      )}
      <PublishingSettings
        apiBaseUrl={`${protocol}://${host}/api/integrations`}
        canEdit={context.member?.role === "admin"}
        autoPublish={site.autoPublish}
        apiKey={keyOf("api")}
        pullKeys={{ framer: keyOf("framer"), lovable: keyOf("lovable"), nextjs: keyOf("nextjs") }}
        siteUrl={new URL(site.url).origin}
        nextPackage={process.env.NEXT_BLOG_PACKAGE || "vaultio-next-blog"}
        duda={duda}
        settingsUrl={`${protocol}://${host}/${locale}/dashboard/settings/publishing`}
        brandName={brand.name}
        framerPluginUrl={process.env.FRAMER_PLUGIN_URL || null}
        webhook={describe("webhook")}
        wordpress={describe("wordpress")}
        wpcomAvailable={wpcomConfigured()}
        siteLanguage={site.selectedLanguage}
        platforms={{ wordpress_com: platform("wordpress_com"), ghost: platform("ghost"), webflow: platform("webflow"), shopify: platform("shopify"), wix: platform("wix"), bigcommerce: platform("bigcommerce"), gohighlevel: platform("gohighlevel") }}
        hostedBlog={
          blog?.domain
            ? {
                domain: blog.domain,
                displayName: blog.displayName,
                verified: Boolean(blog.verified),
                records: blog.records ?? [],
                error: blog.error ?? null,
                logoUrl: blog.logoUrl ?? null,
                accentColor: blog.accentColor ?? null,
                fallbackLogoUrl: site.logoUrl,
                fallbackAccent: /^#[0-9a-f]{6}$/i.test(site.brandColor ?? "") ? site.brandColor! : "#111827",
              }
            : null
        }
        blogSuggestion={`blog.${siteHost}`}
        defaultBlogName={site.brandName ?? siteHost}
        onVercel={vercelConfigured()}
      />
    </>
  );
}
