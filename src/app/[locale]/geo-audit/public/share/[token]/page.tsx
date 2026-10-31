import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SiteHealthReportView } from "@/components/site-health/site-health-report";
import { displayDomain } from "@/lib/utils";
import { getBrand } from "@/server/context";
import { getSharedSiteHealth } from "@/server/queries/site-health";

/** Public, read-only site health report reached through a share link. */
export default async function SharedSiteHealthPage({ params }: PageProps<"/[locale]/geo-audit/public/share/[token]">) {
  const { token } = await params;
  const [shared, brand, t] = await Promise.all([getSharedSiteHealth(token), getBrand(), getTranslations("siteHealth")]);
  if (!shared) notFound();

  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 md:px-12">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.025em] text-ink">{shared.site.brandName ?? displayDomain(shared.site.url)}</h1>
        <p className="mb-8 mt-1 text-[15px] text-ink-secondary">{displayDomain(shared.site.url)} · {t("subtitle")}</p>
        <SiteHealthReportView report={shared.report} siteUrl={shared.site.url} />
        <p className="mt-10 text-center text-xs text-ink-subtle">{t("publicFooter", { brand: brand.name })}</p>
      </div>
    </main>
  );
}
