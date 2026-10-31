/** Monthly client report: renders last month's report, stores a snapshot and emails a link. */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencyReports, organizations, whitelabelConfigs } from "@/db/schema";
import { DEFAULT_BRAND_COLOR, DEFAULT_BRAND_NAME, safeColor } from "@/server/brand";
import { sendEmail } from "@/server/email";
import { gatherReport } from "@/server/reports/data";
import { renderReport, reportTranslator } from "@/server/reports/render";
import { getReportSettings } from "@/server/reports/settings";
import { logActivity } from "../activity";
import type { JobContext } from "./types";

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function monthlyReport({ site }: JobContext) {
  const settings = await getReportSettings(site.id);
  if (!settings.autoSend || !settings.recipientEmail) return { sent: false, reason: "Monthly email is off" };

  const [org] = await db
    .select({ name: organizations.name, brandName: whitelabelConfigs.brandName, color: whitelabelConfigs.primaryColor, logo: whitelabelConfigs.logoUrl })
    .from(organizations)
    .leftJoin(whitelabelConfigs, eq(whitelabelConfigs.organizationId, organizations.id))
    .where(eq(organizations.id, site.organizationId));
  const brand = {
    name: org?.brandName ?? DEFAULT_BRAND_NAME,
    accentColor: safeColor(org?.color, DEFAULT_BRAND_COLOR),
    logoUrl: site.logoUrl ?? null,
  };

  const { data } = await gatherReport(site, "previous_month");
  const html = renderReport({ data, blocks: new Set(settings.blocks), kpiMetrics: settings.kpiMetrics, brand });
  const shareToken = randomBytes(18).toString("base64url");
  const [report] = await db
    .insert(agencyReports)
    .values({ orgWebsiteId: site.id, periodStart: data.period.start, periodEnd: data.period.end, html, shareToken })
    .returning();

  const appUrl = (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
  const link = `${appUrl}/api/reports/shared/${shareToken}`;
  const siteName = site.brandName ?? new URL(site.url).hostname;
  const month = new Date(`${data.period.start}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const t = reportTranslator();
  await sendEmail({
    to: settings.recipientEmail,
    subject: t("report.email.subject", { site: siteName, month }),
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#15171c;line-height:1.6">
      <p>${escape(t("report.email.greeting"))}</p>
      <p>${t.markup("report.email.body", { b: (chunks) => `<strong>${chunks}</strong>`, month: escape(month), site: escape(siteName) })}</p>
      <p><a href="${link}" style="display:inline-block;background:${brand.accentColor};color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${escape(t("report.email.cta"))}</a></p>
      <p style="color:#656c7a;font-size:13px">${escape(t("report.email.pdfHint"))}</p>
      <p style="color:#656c7a;font-size:13px">${escape(brand.name)}</p></div>`,
  });
  await db.update(agencyReports).set({ sentTo: settings.recipientEmail, sentAt: new Date(), updatedAt: new Date() }).where(eq(agencyReports.id, report!.id));
  await logActivity(site.id, "reportSent", { title: month });
  return { sent: true, reportId: report!.id };
}
