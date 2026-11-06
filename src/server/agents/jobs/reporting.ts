/** Monthly client report: renders last month's report, stores a snapshot and emails a link. */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencyReports, organizations, whitelabelConfigs } from "@/db/schema";
import { DEFAULT_BRAND_COLOR, DEFAULT_BRAND_NAME, safeColor } from "@/server/brand";
import { senderFor, sendEmail } from "@/server/email";
import { gatherReport } from "@/server/reports/data";
import { renderReport, reportTranslator } from "@/server/reports/render";
import { getReportSettings } from "@/server/reports/settings";
import { weeklyRecipients, weeklySummary, type WeeklySummary } from "@/server/reports/weekly";
import { logActivity } from "../activity";
import type { JobContext } from "./types";

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function monthlyReport({ site }: JobContext) {
  const settings = await getReportSettings(site.id);
  if (!settings.autoSend || !settings.recipientEmail) return { sent: false, reason: "Monthly email is off" };

  const [org] = await db
    .select({ name: organizations.name, brandName: whitelabelConfigs.brandName, color: whitelabelConfigs.primaryColor, logo: whitelabelConfigs.logoUrl, domain: whitelabelConfigs.domain, domainVerified: whitelabelConfigs.domainVerified })
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

  // Agencies' clients get the link on the agency's own domain once it is connected.
  const appUrl = org?.domain && org.domainVerified ? `https://${org.domain}` : (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
  const link = `${appUrl}/api/reports/shared/${shareToken}`;
  const siteName = site.brandName ?? new URL(site.url).hostname;
  const month = new Date(`${data.period.start}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const t = reportTranslator();
  await sendEmail({
    from: await senderFor(site.organizationId),
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

/**
 * Weekly progress email (Mondays): what happened on the website in the last seven days and the
 * topics planned next, to every member who sees the website and hasn't turned it off.
 */
export async function weeklyProgress({ site }: JobContext) {
  const recipients = await weeklyRecipients(site);
  if (!recipients.length) return { sent: 0, reason: "No recipients" };
  const summary = await weeklySummary(site);
  const [org] = await db
    .select({ brandName: whitelabelConfigs.brandName, color: whitelabelConfigs.primaryColor, domain: whitelabelConfigs.domain, domainVerified: whitelabelConfigs.domainVerified })
    .from(organizations)
    .leftJoin(whitelabelConfigs, eq(whitelabelConfigs.organizationId, organizations.id))
    .where(eq(organizations.id, site.organizationId));
  const brand = { name: org?.brandName ?? DEFAULT_BRAND_NAME, accentColor: safeColor(org?.color, DEFAULT_BRAND_COLOR) };
  const appUrl = org?.domain && org.domainVerified ? `https://${org.domain}` : (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
  const siteName = site.brandName ?? new URL(site.url).hostname;
  const t = reportTranslator();
  const html = renderWeeklyEmail({ summary, siteName, brand, dashboardUrl: `${appUrl}/en/dashboard/overview`, settingsUrl: `${appUrl}/en/dashboard/settings/account`, t });
  const from = await senderFor(site.organizationId);
  let sent = 0;
  for (const recipient of recipients) {
    try {
      await sendEmail({ from, to: recipient.email, subject: t("report.weekly.subject", { site: siteName }), html });
      sent += 1;
    } catch (error) {
      console.error(`[weekly email] ${recipient.email}:`, (error as Error).message);
    }
  }
  return { sent, articles: summary.published.length, backlinks: summary.newBacklinks.length };
}

function renderWeeklyEmail({ summary, siteName, brand, dashboardUrl, settingsUrl, t }: { summary: WeeklySummary; siteName: string; brand: { name: string; accentColor: string }; dashboardUrl: string; settingsUrl: string; t: ReturnType<typeof reportTranslator> }) {
  const row = (label: string, value: string) => `<tr><td style="padding:6px 0;color:#656c7a">${escape(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escape(value)}</td></tr>`;
  const list = (items: string[]) => `<ul style="margin:6px 0 0;padding-left:18px">${items.map((item) => `<li style="margin:3px 0">${item}</li>`).join("")}</ul>`;
  const sections: string[] = [];
  const stats: string[] = [row(t("report.weekly.published"), String(summary.published.length)), row(t("report.weekly.backlinks"), String(summary.newBacklinks.length))];
  if (summary.search) stats.push(row(t("report.weekly.clicks"), `${summary.search.clicks}${summary.search.previousClicks ? ` (${summary.search.clicks >= summary.search.previousClicks ? "+" : ""}${summary.search.clicks - summary.search.previousClicks})` : ""}`));
  if (summary.ai) stats.push(row(t("report.weekly.ai"), t("report.weekly.aiValue", { mentions: summary.ai.mentions, answers: summary.ai.answers })));
  if (summary.healthScore !== null) stats.push(row(t("report.weekly.health"), `${summary.healthScore}/100`));
  sections.push(`<table style="width:100%;border-collapse:collapse;font-size:14px">${stats.join("")}</table>`);
  if (summary.published.length) {
    sections.push(`<p style="margin:18px 0 0;font-weight:600">${escape(t("report.weekly.publishedTitle"))}</p>${list(summary.published.map((article) => (article.url ? `<a href="${escape(article.url)}" style="color:${brand.accentColor}">${escape(article.title)}</a>` : escape(article.title))))}`);
  }
  if (summary.newBacklinks.length) {
    sections.push(`<p style="margin:18px 0 0;font-weight:600">${escape(t("report.weekly.backlinksTitle"))}</p>${list(summary.newBacklinks.slice(0, 8).map((link) => escape(link.rating ? `${link.domain} (DR ${link.rating})` : link.domain)))}`);
  }
  if (summary.upcoming.length) {
    sections.push(`<p style="margin:18px 0 0;font-weight:600">${escape(t("report.weekly.upcomingTitle"))}</p>${list(summary.upcoming.map((item) => `${escape(new Date(`${item.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }))}: ${escape(item.title)}`))}`);
  }
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#15171c;line-height:1.6;max-width:560px">
    <p>${escape(t("report.weekly.greeting"))}</p>
    <p>${t.markup("report.weekly.intro", { b: (chunks) => `<strong>${chunks}</strong>`, site: escape(siteName) })}</p>
    ${sections.join("\n")}
    <p style="margin-top:22px"><a href="${dashboardUrl}" style="display:inline-block;background:${brand.accentColor};color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${escape(t("report.weekly.cta"))}</a></p>
    <p style="color:#656c7a;font-size:12px">${t.markup("report.weekly.footer", { link: (chunks) => `<a href="${settingsUrl}" style="color:#656c7a">${chunks}</a>`, brand: escape(brand.name) })}</p></div>`;
}
