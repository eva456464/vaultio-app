/** Gathers everything a client report shows for one site and period. */
import { addDays, endOfMonth, formatISO, startOfMonth, subMonths } from "date-fns";
import { and, asc, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  backlinks,
  geoAuditIssues,
  geoAudits,
  gscDailyMetrics,
  gscDimensionMetrics,
  llmAnswers,
  milestones,
  orgWebsites,
  websiteMetricsHistory,
  type ReportBlock,
} from "@/db/schema";
import { siteDay } from "../agents/schedule";
import { backlinkValueUsd } from "../agents/jobs/milestones";

type Site = typeof orgWebsites.$inferSelect;

export const REPORT_PERIODS = ["previous_month", "this_month"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

const iso = (date: Date) => formatISO(date, { representation: "date" });

export function periodRange(site: Site, period: ReportPeriod) {
  const today = new Date(`${siteDay(new Date(), site.timeZone)}T12:00:00Z`);
  const anchor = period === "previous_month" ? subMonths(today, 1) : today;
  const start = iso(startOfMonth(anchor));
  const end = period === "previous_month" ? iso(endOfMonth(anchor)) : iso(today);
  return { start, end };
}

type Severity = "low" | "medium" | "high";
const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const pct = (current: number, previous: number) => (previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null);

export async function gatherReport(site: Site, period: ReportPeriod) {
  const { start, end } = periodRange(site, period);
  const startAt = new Date(`${start}T00:00:00Z`);
  const endAt = addDays(new Date(`${end}T00:00:00Z`), 1);
  const lengthDays = Math.round((endAt.getTime() - startAt.getTime()) / 86_400_000);
  const previousStart = iso(addDays(startAt, -lengthDays));

  // Google Search Console
  const daily = await db
    .select({ date: gscDailyMetrics.date, clicks: gscDailyMetrics.clicks, impressions: gscDailyMetrics.impressions, position: gscDailyMetrics.position })
    .from(gscDailyMetrics)
    .where(and(eq(gscDailyMetrics.orgWebsiteId, site.id), gte(gscDailyMetrics.date, previousStart), lte(gscDailyMetrics.date, end)))
    .orderBy(asc(gscDailyMetrics.date));
  const inPeriod = daily.filter((row) => row.date >= start);
  const before = daily.filter((row) => row.date < start);
  const totals = (rows: typeof daily) => {
    const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    const positioned = rows.filter((row) => row.position !== null);
    const position = positioned.length ? positioned.reduce((sum, row) => sum + (row.position ?? 0), 0) / positioned.length : null;
    return { clicks, impressions, position };
  };
  const search = totals(inPeriod);
  const searchBefore = totals(before);
  const dimension = async (kind: "country" | "page" | "query") =>
    db
      .select({ key: gscDimensionMetrics.key, clicks: sql<number>`sum(${gscDimensionMetrics.clicks})::int`, impressions: sql<number>`sum(${gscDimensionMetrics.impressions})::int`, position: sql<number>`avg(${gscDimensionMetrics.position})` })
      .from(gscDimensionMetrics)
      .where(and(eq(gscDimensionMetrics.orgWebsiteId, site.id), eq(gscDimensionMetrics.dimension, kind), gte(gscDimensionMetrics.periodEnd, start), lte(gscDimensionMetrics.periodStart, end)))
      .groupBy(gscDimensionMetrics.key)
      .orderBy(desc(sql`sum(${gscDimensionMetrics.clicks})`))
      .limit(8);
  const [countries, pages, keywords] = await Promise.all([dimension("country"), dimension("page"), dimension("query")]);

  // Backlinks and authority
  const links = await db
    .select({ domain: backlinks.sourceDomain, dr: backlinks.linkPower, since: backlinks.becameOnlineAt })
    .from(backlinks)
    .where(and(eq(backlinks.targetOrgWebsiteId, site.id), eq(backlinks.isBacklinkPresent, true)));
  const newLinks = links.filter((link) => link.since && link.since >= startAt && link.since < endAt);
  const [rating] = await db
    .select({ value: websiteMetricsHistory.domainRating })
    .from(websiteMetricsHistory)
    .where(and(eq(websiteMetricsHistory.orgWebsiteId, site.id), lte(websiteMetricsHistory.date, end)))
    .orderBy(desc(websiteMetricsHistory.date))
    .limit(1);

  // Articles published in the period
  const published = await db
    .select({ title: articles.title, url: articles.publishedUrl, publishedAt: articles.publishedAt, words: articles.wordCount })
    .from(articles)
    .where(and(eq(articles.orgWebsiteId, site.id), isNotNull(articles.publishedAt), gte(articles.publishedAt, startAt), lte(articles.publishedAt, endAt)))
    .orderBy(asc(articles.publishedAt));

  // Latest site health audit by the end of the period
  const [audit] = await db
    .select()
    .from(geoAudits)
    .where(and(eq(geoAudits.orgWebsiteId, site.id), eq(geoAudits.status, "completed"), lte(geoAudits.completedAt, endAt)))
    .orderBy(desc(geoAudits.completedAt))
    .limit(1);
  const auditIssues = audit
    ? await db
        .select({ type: geoAuditIssues.issueType, severity: geoAuditIssues.severity, pageId: geoAuditIssues.pageId })
        .from(geoAuditIssues)
        .where(eq(geoAuditIssues.geoAuditId, audit.id))
    : [];
  // One row per issue type with the number of pages it affects (0 = a site-wide issue).
  const issueTypes = new Map<string, { type: string; severity: Severity; pages: number }>();
  for (const issue of auditIssues) {
    const entry = issueTypes.get(issue.type) ?? { type: issue.type, severity: issue.severity, pages: 0 };
    if (issue.pageId) entry.pages += 1;
    if (SEVERITY_RANK[issue.severity] < SEVERITY_RANK[entry.severity]) entry.severity = issue.severity;
    issueTypes.set(issue.type, entry);
  }
  const topIssues = [...issueTypes.values()]
    .filter((issue) => issue.severity !== "low")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.pages - a.pages)
    .slice(0, 5);

  // AI visibility: answers from the latest check in the period
  const answers = await db
    .select({ mentioned: llmAnswers.orgWebsiteMentioned, provider: llmAnswers.llmProvider, checkedAt: llmAnswers.checkedAt, brands: llmAnswers.brands })
    .from(llmAnswers)
    .where(and(eq(llmAnswers.orgWebsiteId, site.id), lte(llmAnswers.checkedAt, endAt)))
    .orderBy(desc(llmAnswers.checkedAt));
  const latestRun = answers[0]?.checkedAt.getTime();
  const lastCheck = answers.filter((answer) => answer.checkedAt.getTime() === latestRun);

  // Achievements so far
  const reached = await db
    .select({ category: milestones.category, threshold: milestones.threshold, value: milestones.value, achievedAt: milestones.achievedAt })
    .from(milestones)
    .where(and(eq(milestones.orgWebsiteId, site.id), lte(milestones.achievedAt, endAt)))
    .orderBy(desc(milestones.threshold));
  const bestPerCategory = [...new Map(reached.map((row) => [row.category, row])).values()];

  const data = {
    site: { url: site.url, brandName: site.brandName, logoUrl: site.logoUrl },
    period: { kind: period, start, end },
    search: {
      clicks: search.clicks,
      impressions: search.impressions,
      position: search.position,
      clicksChange: pct(search.clicks, searchBefore.clicks),
      impressionsChange: pct(search.impressions, searchBefore.impressions),
      positionChange: search.position !== null && searchBefore.position !== null ? Math.round((searchBefore.position - search.position) * 10) / 10 : null,
      daily: inPeriod.map((row) => ({ date: row.date, clicks: row.clicks, impressions: row.impressions })),
    },
    countries,
    pages,
    keywords,
    authority: {
      domainRating: rating?.value ?? site.domainRating,
      totalLinks: links.length,
      newLinks: newLinks.map((link) => ({ domain: link.domain, dr: link.dr })),
      valueSaved: links.reduce((sum, link) => sum + backlinkValueUsd(link.dr), 0),
    },
    articles: published,
    siteHealth: audit
      ? {
          score: audit.overallScore ?? 0,
          pages: audit.pagesAudited,
          issues: auditIssues.length,
          high: auditIssues.filter((issue) => issue.severity === "high").length,
          top: topIssues,
        }
      : null,
    aiVisibility: lastCheck.length
      ? {
          answers: lastCheck.length,
          mentions: lastCheck.filter((answer) => answer.mentioned).length,
          assistants: [...new Set(lastCheck.map((answer) => answer.provider))],
          checkedAt: lastCheck[0]!.checkedAt.toISOString(),
        }
      : null,
    achievements: bestPerCategory,
  };

  const availability: Record<ReportBlock, boolean> = {
    achievements: bestPerCategory.length > 0,
    summary: inPeriod.length > 0,
    kpis: inPeriod.length > 0,
    clicksChart: inPeriod.length > 0,
    countries: countries.length > 0,
    pages: pages.length > 0,
    keywords: keywords.length > 0,
    backlinks: links.length > 0 || data.authority.domainRating !== null,
    articles: published.length > 0,
    siteHealth: Boolean(audit),
    community: false,
    aiVisibility: lastCheck.length > 0,
  };
  return { data, availability };
}

export type ReportData = Awaited<ReturnType<typeof gatherReport>>["data"];
