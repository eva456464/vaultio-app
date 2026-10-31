import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ReportBuilder } from "@/components/reporting/report-builder";
import { PageHeader } from "@/components/shell/app-shell";
import { db } from "@/db";
import { agencyReports } from "@/db/schema";
import { availableRequirements } from "@/server/agents/capabilities";
import { getAppContext } from "@/server/context";
import { gatherReport, REPORT_PERIODS } from "@/server/reports/data";
import { getReportSettings } from "@/server/reports/settings";

export default async function ReportingPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, settings, previous, current, sent, available] = await Promise.all([
    getTranslations("reporting"),
    getReportSettings(site.id),
    gatherReport(site, "previous_month"),
    gatherReport(site, "this_month"),
    db.select({ id: agencyReports.id, start: agencyReports.periodStart, end: agencyReports.periodEnd, sentTo: agencyReports.sentTo, sentAt: agencyReports.sentAt, token: agencyReports.shareToken }).from(agencyReports).where(eq(agencyReports.orgWebsiteId, site.id)).orderBy(desc(agencyReports.createdAt)).limit(12),
    availableRequirements(site.id),
  ]);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ReportBuilder
        canEdit={context.member?.role === "admin"}
        settings={settings}
        periods={REPORT_PERIODS.map((period) => ({ period, range: (period === "previous_month" ? previous : current).data.period, availability: (period === "previous_month" ? previous : current).availability }))}
        emailConfigured={available.has("email")}
        gscConnected={available.has("gsc")}
        history={sent.map((row) => ({ ...row, sentAt: row.sentAt?.toISOString() ?? null }))}
      />
    </>
  );
}
