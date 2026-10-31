import { HeartPulse } from "lucide-react";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { SiteHealthActions } from "@/components/site-health/site-health-actions";
import { SiteHealthReportView } from "@/components/site-health/site-health-report";
import { getAppContext } from "@/server/context";
import { getSelectablePages, getSiteHealth } from "@/server/queries/site-health";

export default async function SiteHealthPage() {
  const site = (await getAppContext())!.site!;
  const [{ report, nextCheckDay }, selectable, t, locale, requestHeaders] = await Promise.all([
    getSiteHealth(site),
    getSelectablePages(site.id),
    getTranslations("siteHealth"),
    getLocale(),
    headers(),
  ]);
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const shareUrl = report?.audit.shareToken && host ? `${protocol}://${host}/${locale}/geo-audit/public/share/${report.audit.shareToken}` : null;

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<SiteHealthActions pages={selectable.pages} selected={selectable.selected} shareUrl={shareUrl} />}
      />
      <PageBody>
        {report ? (
          <SiteHealthReportView report={report} nextCheck={nextCheckDay} siteUrl={site.url} />
        ) : (
          <section className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-ink-subtle">
              <HeartPulse className="size-6" strokeWidth={1.5} />
            </span>
            <p className="mt-4 font-heading text-lg font-semibold text-ink">{t("empty.title")}</p>
            <p className="mt-1 max-w-md text-sm text-ink-secondary">{t("empty.body")}</p>
          </section>
        )}
      </PageBody>
    </>
  );
}
