/**
 * The weekly site health audit (homepage + up to 20 pages) and "Validate fix" for one issue.
 * Scores: each page starts at 100 and loses points per issue; the health score weighs page speed 20%,
 * LLM optimization 40% and technical SEO 40%.
 */
import { randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { geoAuditIssues, geoAuditPages, geoAudits, geoAuditSelectedPages, orgWebsites, type SpeedMetrics } from "@/db/schema";
import { categoryOf, MAX_AUDIT_PAGES } from "@/lib/site-health";
import { logActivity } from "../agents/activity";
import type { Site } from "../agents/jobs/types";
import { discoverSitemaps, fetchText, parsePage, readSitemapUrls, type PageFacts } from "../agents/web";
import { crawlerIssues, duplicateIssues, pageIssues, resourceIssues, scoreOf, slowPageIssue, type Issue } from "./checks";
import { pageSpeed } from "./pagespeed";
import { createProber } from "./probe";

/** PageSpeed runs take 10–30 seconds each: the homepage and the next few pages get one. */
const SPEED_PAGES = 5;

async function crawlerFiles(origin: string, https: boolean) {
  const robots = await fetchText(`${origin}/robots.txt`).catch(() => null);
  const robotsText = robots && robots.status < 400 && !/<html/i.test(robots.html.slice(0, 200)) ? robots.html : null;
  const sitemaps = await discoverSitemaps(origin);
  const sitemapUrls = await readSitemapUrls(sitemaps, 200);
  const llms = await fetchText(`${origin}/llms.txt`).catch(() => null);
  const llmsTxt = Boolean(llms && llms.status < 400 && !/<html/i.test(llms.html.slice(0, 200)));
  return {
    issues: crawlerIssues({ https, robots: robotsText, sitemapsFound: sitemaps.length, sitemapUrls: sitemapUrls.urls.size, llmsTxt }),
    robotsOk: robotsText !== null,
    sitemapOk: sitemapUrls.urls.size > 0,
    llmsTxt,
    sitemapUrls: sitemapUrls.urls,
  };
}

type PageResult = { url: string; facts: PageFacts | null; issues: Issue[]; ms: number; speed: SpeedMetrics | null };

async function auditPage(url: string, isHome: boolean, prober: ReturnType<typeof createProber>): Promise<PageResult> {
  try {
    const page = await fetchText(url);
    if (page.status >= 400) return { url, facts: null, issues: pageIssues(parsePage("", url), page.status, page.ms, isHome, url), ms: page.ms, speed: null };
    const facts = parsePage(page.html, page.url);
    const imageSources = facts.images.map((image) => image.src).filter((src): src is string => Boolean(src && /^https?:/.test(src)));
    const probes = await prober([...facts.links.slice(0, 40), ...imageSources.slice(0, 25)], 65);
    return { url, facts, issues: [...pageIssues(facts, page.status, page.ms, isHome, url), ...resourceIssues(facts, probes)], ms: page.ms, speed: null };
  } catch (error) {
    return { url, facts: null, issues: [{ issueType: "unreachable", severity: "high", description: `The page could not be loaded (${(error as Error).message}).`, action: "Make sure the page is online and reachable." }], ms: 0, speed: null };
  }
}

export async function siteHealthAudit({ site }: { site: Site }) {
  const origin = new URL(site.url).origin;
  const [audit] = await db.insert(geoAudits).values({ orgWebsiteId: site.id, status: "running", startedAt: new Date(), shareToken: randomBytes(16).toString("hex") }).returning();

  try {
    const files = await crawlerFiles(origin, new URL(site.url).protocol === "https:");
    const siteIssues = files.issues;

    // Pages: the user's selection, else the homepage plus pages from the sitemap.
    const selected = await db.select({ url: geoAuditSelectedPages.url }).from(geoAuditSelectedPages).where(eq(geoAuditSelectedPages.orgWebsiteId, site.id));
    const candidates = selected.length ? [`${origin}/`, ...selected.map((row) => row.url)] : [`${origin}/`, ...[...files.sitemapUrls.keys()].filter((url) => url.replace(/\/$/, "") !== origin)];
    const pagesToAudit = [...new Set(candidates)].slice(0, MAX_AUDIT_PAGES);

    const prober = createProber();
    const results: PageResult[] = [];
    for (const url of pagesToAudit) results.push(await auditPage(url, url.replace(/\/$/, "") === origin, prober));

    // Real page speed for the first pages (two at a time).
    const speedTargets = results.filter((result) => result.facts).slice(0, SPEED_PAGES);
    for (let index = 0; index < speedTargets.length; index += 2) {
      await Promise.all(
        speedTargets.slice(index, index + 2).map(async (result) => {
          result.speed = await pageSpeed(result.url);
          const slow = result.speed ? slowPageIssue(result.speed.performance, result.speed.lcpMs) : null;
          if (slow) result.issues.push(slow);
        }),
      );
    }

    const duplicates = duplicateIssues(results.filter((result) => result.facts).map((result) => ({ url: result.url, title: result.facts!.title, metaDescription: result.facts!.metaDescription })));
    for (const result of results) result.issues.push(...(duplicates.get(result.url) ?? []));

    let issueCount = siteIssues.length;
    for (const result of results) {
      const [pageRow] = await db
        .insert(geoAuditPages)
        .values({
          geoAuditId: audit!.id,
          url: result.url,
          geoScore: scoreOf(result.issues),
          pageSpeed: result.speed?.performance ?? null,
          speedMetrics: result.speed,
          title: result.facts?.title ?? null,
          metaDescription: result.facts?.metaDescription ?? null,
        })
        .returning();
      if (result.issues.length) await db.insert(geoAuditIssues).values(result.issues.map((issue) => ({ ...issue, geoAuditId: audit!.id, pageId: pageRow!.id })));
      issueCount += result.issues.length;
    }
    if (siteIssues.length) await db.insert(geoAuditIssues).values(siteIssues.map((issue) => ({ ...issue, geoAuditId: audit!.id })));

    await db
      .update(geoAudits)
      .set({
        status: "completed",
        completedAt: new Date(),
        pagesAudited: pagesToAudit.length,
        ...scores(siteIssues, results.map((result) => ({ issues: result.issues, ms: result.ms, speed: result.speed?.performance ?? null }))),
        robotsTxt: { status: files.robotsOk ? "ok" : "missing" },
        sitemap: { status: files.sitemapOk ? "ok" : "missing" },
        llmsTxt: { status: files.llmsTxt ? "ok" : "missing" },
        updatedAt: new Date(),
      })
      .where(eq(geoAudits.id, audit!.id));

    await logActivity(site.id, "siteHealthAudit", { count: issueCount, total: pagesToAudit.length });
    return { auditId: audit!.id, issues: issueCount, pages: pagesToAudit.length, speedChecked: speedTargets.filter((result) => result.speed).length };
  } catch (error) {
    await db.update(geoAudits).set({ status: "failed", updatedAt: new Date() }).where(eq(geoAudits.id, audit!.id));
    throw error;
  }
}

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);
const AI_SITE_ISSUES = new Set(["ai_crawlers_blocked", "missing_llms_txt"]);

/** The audit's scores from its open (not fixed) issues. */
function scores(siteIssues: { issueType: string; severity: Issue["severity"] }[], pages: { issues: { issueType: string; severity: Issue["severity"] }[]; ms: number; speed: number | null }[]) {
  const siteAi = siteIssues.filter((issue) => AI_SITE_ISSUES.has(issue.issueType));
  const siteTechnical = siteIssues.filter((issue) => !AI_SITE_ISSUES.has(issue.issueType));
  // Each area combines whole-site problems with the average page result for that area.
  const llmOptimizationScore = Math.round((scoreOf(siteAi) * average(pages.map((page) => scoreOf(page.issues.filter((issue) => categoryOf(issue.issueType) === "ai"))))) / 100);
  const technicalSeoScore = Math.round((scoreOf(siteTechnical) * average(pages.map((page) => scoreOf(page.issues.filter((issue) => categoryOf(issue.issueType) === "technical"))))) / 100);
  // PageSpeed Insights when it ran; otherwise response time mapped to 0–100 (under 0.5s is 100, 5s or more is 0).
  const measured = pages.map((page) => page.speed).filter((value): value is number => value !== null);
  const times = pages.map((page) => page.ms).filter(Boolean);
  const averagePageSpeed = measured.length ? average(measured) : times.length ? Math.max(0, Math.min(100, Math.round(100 - ((average(times) - 500) / 4500) * 100))) : null;
  return {
    averageGeoScore: average(pages.map((page) => scoreOf(page.issues))),
    averagePageSpeed,
    llmOptimizationScore,
    technicalSeoScore,
    overallScore: averagePageSpeed === null ? Math.round(llmOptimizationScore * 0.5 + technicalSeoScore * 0.5) : Math.round(averagePageSpeed * 0.2 + llmOptimizationScore * 0.4 + technicalSeoScore * 0.4),
  };
}

/**
 * "Validate fix": checks the one issue again on the live site. When it's gone the issue is marked
 * fixed and the page's and the audit's scores are recalculated without it.
 */
export async function validateIssue(siteId: number, issueId: number): Promise<{ fixed: boolean; description?: string }> {
  const [row] = await db
    .select({ issue: geoAuditIssues, audit: geoAudits })
    .from(geoAuditIssues)
    .innerJoin(geoAudits, eq(geoAudits.id, geoAuditIssues.geoAuditId))
    .where(and(eq(geoAuditIssues.id, issueId), eq(geoAudits.orgWebsiteId, siteId)));
  if (!row) throw new Error("Issue not found");
  if (row.issue.fixedAt) return { fixed: true };
  const { issue, audit } = row;
  const [page] = issue.pageId ? await db.select().from(geoAuditPages).where(eq(geoAuditPages.id, issue.pageId)) : [];

  let still: Issue | undefined;
  if (!page) {
    const [owner] = await db.select({ url: orgWebsites.url }).from(orgWebsites).where(eq(orgWebsites.id, siteId));
    const origin = new URL(owner!.url).origin;
    still = (await crawlerFiles(origin, new URL(owner!.url).protocol === "https:")).issues.find((candidate) => candidate.issueType === issue.issueType);
  } else if (issue.issueType === "slow_page") {
    const speed = await pageSpeed(page.url);
    if (!speed) return { fixed: false };
    still = slowPageIssue(speed.performance, speed.lcpMs) ?? undefined;
    await db.update(geoAuditPages).set({ pageSpeed: speed.performance, speedMetrics: speed, updatedAt: new Date() }).where(eq(geoAuditPages.id, page.id));
  } else {
    const origin = new URL(page.url).origin;
    const result = await auditPage(page.url, page.url.replace(/\/$/, "") === origin, createProber({ maxRequests: 80 }));
    if (issue.issueType === "duplicate_title" || issue.issueType === "duplicate_meta_description") {
      const others = await db.select().from(geoAuditPages).where(and(eq(geoAuditPages.geoAuditId, audit.id), ne(geoAuditPages.id, page.id)));
      const fresh = { url: page.url, title: result.facts?.title ?? null, metaDescription: result.facts?.metaDescription ?? null };
      still = duplicateIssues([fresh, ...others.map((other) => ({ url: other.url, title: other.title, metaDescription: other.metaDescription }))]).get(page.url)?.find((candidate) => candidate.issueType === issue.issueType);
      await db.update(geoAuditPages).set({ title: fresh.title, metaDescription: fresh.metaDescription, updatedAt: new Date() }).where(eq(geoAuditPages.id, page.id));
    } else {
      still = result.issues.find((candidate) => candidate.issueType === issue.issueType);
    }
  }

  if (still) {
    await db.update(geoAuditIssues).set({ description: still.description, severity: still.severity, updatedAt: new Date() }).where(eq(geoAuditIssues.id, issue.id));
    return { fixed: false, description: still.description };
  }
  await db.update(geoAuditIssues).set({ fixedAt: new Date(), updatedAt: new Date() }).where(eq(geoAuditIssues.id, issue.id));
  // The crawler-file chips follow their issues.
  const file = { missing_llms_txt: "llmsTxt", missing_robots_txt: "robotsTxt", missing_sitemap: "sitemap", sitemap_unreadable: "sitemap" }[issue.issueType];
  if (file) await db.update(geoAudits).set({ [file]: { status: "ok" } }).where(eq(geoAudits.id, audit.id));
  await rescore(audit.id);
  return { fixed: true };
}

/** Page and audit scores again, counting only issues that aren't fixed. */
async function rescore(auditId: number) {
  const [pages, issues] = await Promise.all([
    db.select().from(geoAuditPages).where(eq(geoAuditPages.geoAuditId, auditId)),
    db.select().from(geoAuditIssues).where(eq(geoAuditIssues.geoAuditId, auditId)),
  ]);
  const open = issues.filter((issue) => !issue.fixedAt);
  for (const page of pages) {
    const geoScore = scoreOf(open.filter((issue) => issue.pageId === page.id));
    if (geoScore !== page.geoScore) await db.update(geoAuditPages).set({ geoScore }).where(eq(geoAuditPages.id, page.id));
  }
  const [audit] = await db.select().from(geoAudits).where(eq(geoAudits.id, auditId));
  const measured = pages.some((page) => page.pageSpeed !== null);
  const next = scores(
    open.filter((issue) => !issue.pageId),
    pages.map((page) => ({ issues: open.filter((issue) => issue.pageId === page.id), ms: 0, speed: page.pageSpeed })),
  );
  await db
    .update(geoAudits)
    .set({ ...next, averagePageSpeed: measured ? next.averagePageSpeed : audit!.averagePageSpeed, overallScore: measured || audit!.averagePageSpeed === null ? next.overallScore : Math.round(audit!.averagePageSpeed * 0.2 + next.llmOptimizationScore * 0.4 + next.technicalSeoScore * 0.4), updatedAt: new Date() })
    .where(eq(geoAudits.id, auditId));
}
