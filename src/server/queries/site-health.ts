import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { geoAuditIssues, geoAuditPages, geoAudits, geoAuditSelectedPages, orgWebsites, sitePages } from "@/db/schema";
import { AGENT_SCHEDULE, isDueOn, siteDay } from "../agents/schedule";

export type AuditIssue = { id: number; issueType: string; severity: "low" | "medium" | "high"; description: string; action: string | null; pageUrl: string | null };

export type SiteHealthReport = NonNullable<Awaited<ReturnType<typeof loadReport>>>;

async function loadReport(auditId: number) {
  const [audit] = await db.select().from(geoAudits).where(eq(geoAudits.id, auditId));
  if (!audit) return null;
  const pages = await db.select().from(geoAuditPages).where(eq(geoAuditPages.geoAuditId, audit.id)).orderBy(asc(geoAuditPages.id));
  const pageUrl = new Map(pages.map((page) => [page.id, page.url]));
  const issues: AuditIssue[] = (
    await db.select().from(geoAuditIssues).where(eq(geoAuditIssues.geoAuditId, audit.id)).orderBy(asc(geoAuditIssues.id))
  ).map((issue) => ({
    id: issue.id,
    issueType: issue.issueType,
    severity: issue.severity,
    description: issue.description,
    action: issue.action,
    pageUrl: issue.pageId ? (pageUrl.get(issue.pageId) ?? null) : null,
  }));
  return {
    audit: {
      overallScore: audit.overallScore ?? 0,
      averagePageSpeed: audit.averagePageSpeed,
      llmOptimizationScore: audit.llmOptimizationScore ?? 0,
      technicalSeoScore: audit.technicalSeoScore ?? 0,
      robotsTxt: audit.robotsTxt?.status ?? "missing",
      sitemap: audit.sitemap?.status ?? "missing",
      llmsTxt: audit.llmsTxt?.status ?? "missing",
      pagesAudited: audit.pagesAudited,
      completedAt: (audit.completedAt ?? audit.updatedAt).toISOString(),
      shareToken: audit.shareToken,
    },
    pages: pages.map((page) => ({ url: page.url, geoScore: page.geoScore ?? 0, issues: issues.filter((issue) => issue.pageUrl === page.url).length })),
    issues,
  };
}

async function latestCompletedAuditId(siteId: number) {
  const [row] = await db
    .select({ id: geoAudits.id })
    .from(geoAudits)
    .where(and(eq(geoAudits.orgWebsiteId, siteId), eq(geoAudits.status, "completed")))
    .orderBy(desc(geoAudits.completedAt))
    .limit(1);
  return row?.id ?? null;
}

export async function getSiteHealth(site: { id: number; timeZone: string; createdAt: Date }) {
  const auditId = await latestCompletedAuditId(site.id);
  const report = auditId ? await loadReport(auditId) : null;

  // When the weekly audit runs next, from the shared agent schedule.
  const cadence = AGENT_SCHEDULE.find((agent) => agent.job === "siteHealthAudit")!.cadence;
  const today = siteDay(new Date(), site.timeZone);
  const anchor = siteDay(site.createdAt, site.timeZone);
  let nextDay = today;
  for (let offset = 1; offset <= 31; offset++) {
    const candidate = new Date(`${today}T12:00:00Z`);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const iso = candidate.toISOString().slice(0, 10);
    if (isDueOn(cadence, iso, anchor)) {
      nextDay = iso;
      break;
    }
  }
  return { report, nextCheckDay: nextDay };
}

/** Public share page: the latest audit of the site that owns the token. */
export async function getSharedSiteHealth(token: string) {
  const [audit] = await db
    .select({ siteId: geoAudits.orgWebsiteId })
    .from(geoAudits)
    .where(eq(geoAudits.shareToken, token))
    .limit(1);
  if (!audit) return null;
  const [site] = await db.select({ url: orgWebsites.url, brandName: orgWebsites.brandName }).from(orgWebsites).where(eq(orgWebsites.id, audit.siteId));
  const latestId = await latestCompletedAuditId(audit.siteId);
  const report = latestId ? await loadReport(latestId) : null;
  return report && site ? { site, report } : null;
}

export async function getSelectablePages(siteId: number) {
  const [pages, selected] = await Promise.all([
    db.select({ url: sitePages.url, title: sitePages.metaTitle }).from(sitePages).where(eq(sitePages.orgWebsiteId, siteId)).orderBy(asc(sitePages.url)).limit(500),
    db.select({ url: geoAuditSelectedPages.url }).from(geoAuditSelectedPages).where(eq(geoAuditSelectedPages.orgWebsiteId, siteId)),
  ]);
  return { pages, selected: selected.map((row) => row.url) };
}
