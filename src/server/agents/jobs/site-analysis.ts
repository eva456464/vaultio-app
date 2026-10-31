/** Crawler agents that need no third-party API: brand analysis, sitemap sync, site health audit. */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { geoAuditIssues, geoAuditPages, geoAudits, geoAuditSelectedPages, orgWebsites, sitePages } from "@/db/schema";
import { logActivity } from "../activity";
import { categoryOf, MAX_AUDIT_PAGES } from "@/lib/site-health";
import { discoverSitemaps, fetchText, parsePage, readSitemapUrls, type PageFacts } from "../web";
import type { JobContext } from "./types";

// ------------------------------------------------------------ Brand profile

export async function analyzeWebsite({ site }: JobContext) {
  const page = await fetchText(site.url);
  if (page.status >= 400) throw new Error(`Homepage returned HTTP ${page.status}`);
  const facts = parsePage(page.html, page.url);

  const titleBrand = facts.title?.split(/\s[|\-–—·:]\s/)[0]?.trim() || null;
  const logoUrl = site.logoUrl ?? (await firstReachableImage([facts.iconUrl, facts.ogImage]));
  await db
    .update(orgWebsites)
    .set({
      brandName: site.brandName ?? facts.siteName ?? titleBrand,
      description: site.description ?? facts.metaDescription,
      logoUrl,
      screenshotUrl: facts.ogImage,
      detectedPlatform: facts.platform,
      brandColor: site.brandColor ?? (facts.themeColor && /^#[0-9a-f]{3,8}$/i.test(facts.themeColor) ? facts.themeColor : null),
      updatedAt: new Date(),
    })
    .where(eq(orgWebsites.id, site.id));

  await logActivity(site.id, "websiteAnalyzed");
  return { platform: facts.platform, title: facts.title };
}

/** The first candidate URL that actually serves an image, so broken icons are never saved. */
async function firstReachableImage(candidates: (string | null)[]) {
  for (const url of candidates) {
    if (!url) continue;
    try {
      const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
      await response.body?.cancel();
      if (response.ok && (response.headers.get("content-type") ?? "").startsWith("image/")) return url;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

// ------------------------------------------------------------- Sitemap sync

export async function sitemapSync({ site, runDate }: JobContext) {
  const origin = new URL(site.url).origin;
  const { urls } = await readSitemapUrls(await discoverSitemaps(origin));
  const sameSite = [...urls].filter(([url]) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "") === new URL(origin).hostname.replace(/^www\./, "");
    } catch {
      return false;
    }
  });

  for (let i = 0; i < sameSite.length; i += 500) {
    const batch = sameSite.slice(i, i + 500).map(([url, lastmod]) => ({
      orgWebsiteId: site.id,
      url,
      lastModifiedAt: lastmod && !Number.isNaN(Date.parse(lastmod)) ? new Date(lastmod) : null,
    }));
    await db
      .insert(sitePages)
      .values(batch)
      .onConflictDoUpdate({
        target: [sitePages.orgWebsiteId, sitePages.url],
        set: { lastModifiedAt: sitePages.lastModifiedAt, updatedAt: new Date() },
      });
  }

  await logActivity(site.id, "sitemapSync", { day: runDate, count: sameSite.length });
  return { pages: sameSite.length };
}

// -------------------------------------------------------- Site health audit

type Issue = { issueType: string; severity: "low" | "medium" | "high"; description: string; action: string };

const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

function pageIssues(facts: PageFacts, status: number, ms: number, isHome: boolean): Issue[] {
  const issues: Issue[] = [];
  const add = (issueType: string, severity: Issue["severity"], description: string, action: string) =>
    issues.push({ issueType, severity, description, action });

  if (status >= 400) {
    add("http_error", "high", `The page returns HTTP ${status}.`, "Fix the page or redirect it to a working URL.");
    return issues;
  }
  if (!facts.title) add("missing_title", "high", "The page has no title tag.", "Add a unique, descriptive title of 30–60 characters.");
  else if (facts.title.length > 65) add("long_title", "low", `The title is ${facts.title.length} characters and may be cut off in results.`, "Shorten the title to about 60 characters.");
  else if (facts.title.length < 15) add("short_title", "low", "The title is very short.", "Describe the page's topic in 30–60 characters.");
  if (!facts.metaDescription) add("missing_meta_description", "medium", "The page has no meta description.", "Add a 120–160 character summary of the page.");
  else if (facts.metaDescription.length > 170) add("long_meta_description", "low", "The meta description is longer than 160 characters.", "Trim the meta description to about 155 characters.");
  if (facts.h1s.length === 0) add("missing_h1", "medium", "The page has no H1 heading.", "Add one H1 that states the page's main topic.");
  else if (facts.h1s.length > 1) add("multiple_h1", "low", `The page has ${facts.h1s.length} H1 headings.`, "Keep a single H1 and use H2/H3 for sections.");
  if (facts.imagesMissingAlt > 0) add("images_missing_alt", facts.imagesMissingAlt > 3 ? "medium" : "low", `${facts.imagesMissingAlt} of ${facts.imagesTotal} images have no alt text.`, "Describe each meaningful image in its alt attribute.");
  if (facts.jsonLdTypes.length === 0) add("missing_structured_data", "medium", "No JSON-LD structured data was found.", "Add schema.org markup (Organization, Article, FAQ...) so search engines and AI understand the page.");
  if (facts.jsonLdTypes.includes("invalid")) add("invalid_structured_data", "medium", "A JSON-LD block could not be parsed.", "Fix the JSON syntax of the structured data.");
  if (!facts.canonical) add("missing_canonical", "low", "The page has no canonical URL.", "Add a rel=canonical link pointing to the preferred URL.");
  if (facts.robotsMeta && /noindex/i.test(facts.robotsMeta)) add("noindex", "high", "The page tells search engines not to index it.", "Remove noindex if this page should appear in search.");
  if (!facts.hasViewport) add("missing_viewport", "medium", "The page has no mobile viewport tag.", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.");
  if (!isHome && facts.wordCount < 300) add("thin_content", "medium", `The page has only about ${facts.wordCount} words.`, "Expand the content so it fully answers the visitor's question.");
  if (!facts.lang) add("missing_lang", "low", "The page does not declare its language.", "Add a lang attribute to the <html> tag.");
  if (!facts.hasOpenGraph) add("missing_open_graph", "low", "The page has no Open Graph tags.", "Add og:title, og:description and og:image for link previews.");
  if (ms > 3000) add("slow_response", "medium", `The server took ${(ms / 1000).toFixed(1)}s to respond.`, "Improve hosting or caching so pages respond in under a second.");
  return issues;
}

const PENALTY = { high: 20, medium: 8, low: 3 } as const;
const score = (issues: { severity: Issue["severity"] }[]) =>
  Math.max(0, 100 - issues.reduce((sum, issue) => sum + PENALTY[issue.severity], 0));

export async function siteHealthAudit({ site }: JobContext) {
  const origin = new URL(site.url).origin;
  const [audit] = await db
    .insert(geoAudits)
    .values({ orgWebsiteId: site.id, status: "running", startedAt: new Date(), shareToken: randomBytes(16).toString("hex") })
    .returning();

  try {
    // Crawler files
    const siteIssues: Issue[] = [];
    if (new URL(site.url).protocol !== "https:") {
      siteIssues.push({ issueType: "not_https", severity: "high", description: "The site is not served over HTTPS.", action: "Install an SSL certificate and redirect all http:// URLs to https://." });
    }
    const robots = await fetchText(`${origin}/robots.txt`).catch(() => null);
    const robotsOk = Boolean(robots && robots.status < 400);
    if (!robotsOk) siteIssues.push({ issueType: "missing_robots_txt", severity: "medium", description: "robots.txt was not found.", action: "Add a robots.txt that allows crawling and lists your sitemap." });
    const blockedBots = robotsOk
      ? AI_CRAWLERS.filter((bot) => new RegExp(`user-agent:\\s*${bot}[\\s\\S]*?disallow:\\s*/\\s*(\\n|$)`, "i").test(robots!.html))
      : [];
    if (blockedBots.length) siteIssues.push({ issueType: "ai_crawlers_blocked", severity: "high", description: `robots.txt blocks AI crawlers: ${blockedBots.join(", ")}.`, action: "Allow AI crawlers so ChatGPT, Claude and Perplexity can read and cite your site." });

    const sitemapUrls = await readSitemapUrls(await discoverSitemaps(origin), 200);
    const sitemapOk = sitemapUrls.urls.size > 0;
    if (!sitemapOk) siteIssues.push({ issueType: "missing_sitemap", severity: "high", description: "No XML sitemap was found.", action: "Publish a sitemap.xml and reference it in robots.txt." });

    const llms = await fetchText(`${origin}/llms.txt`).catch(() => null);
    const llmsOk = Boolean(llms && llms.status < 400 && !/<html/i.test(llms.html.slice(0, 200)));
    if (!llmsOk) siteIssues.push({ issueType: "missing_llms_txt", severity: "low", description: "No llms.txt file was found.", action: "Add an llms.txt that summarises your site for AI assistants." });

    // Pages: the user's selection, else the homepage plus pages from the sitemap.
    const selected = await db.select({ url: geoAuditSelectedPages.url }).from(geoAuditSelectedPages).where(eq(geoAuditSelectedPages.orgWebsiteId, site.id));
    const candidates = selected.length
      ? [`${origin}/`, ...selected.map((row) => row.url)]
      : [`${origin}/`, ...[...sitemapUrls.urls.keys()].filter((url) => url.replace(/\/$/, "") !== origin)];
    const pagesToAudit = [...new Set(candidates)].slice(0, MAX_AUDIT_PAGES);

    let issueCount = siteIssues.length;
    const pageScores: number[] = [];
    const pageTechnicalScores: number[] = [];
    const pageAiScores: number[] = [];
    const speeds: number[] = [];
    for (const url of pagesToAudit) {
      let issues: Issue[];
      let ms = 0;
      try {
        const page = await fetchText(url);
        ms = page.ms;
        issues = pageIssues(parsePage(page.html, page.url), page.status, page.ms, url.replace(/\/$/, "") === origin);
      } catch (error) {
        issues = [{ issueType: "unreachable", severity: "high", description: `The page could not be loaded (${(error as Error).message}).`, action: "Make sure the page is online and reachable." }];
      }
      pageScores.push(score(issues));
      pageTechnicalScores.push(score(issues.filter((issue) => categoryOf(issue.issueType) === "technical")));
      pageAiScores.push(score(issues.filter((issue) => categoryOf(issue.issueType) === "ai")));
      if (ms) speeds.push(ms);
      const [pageRow] = await db.insert(geoAuditPages).values({ geoAuditId: audit!.id, url, geoScore: score(issues) }).returning();
      if (issues.length) {
        await db.insert(geoAuditIssues).values(issues.map((issue) => ({ ...issue, geoAuditId: audit!.id, pageId: pageRow!.id })));
      }
      issueCount += issues.length;
    }
    if (siteIssues.length) {
      await db.insert(geoAuditIssues).values(siteIssues.map((issue) => ({ ...issue, geoAuditId: audit!.id })));
    }

    const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);
    const averageGeoScore = average(pageScores);
    // Each area combines whole-site problems with the average page result for that area.
    const siteAi = siteIssues.filter((issue) => issue.issueType === "ai_crawlers_blocked" || issue.issueType === "missing_llms_txt");
    const siteTechnical = siteIssues.filter((issue) => !siteAi.includes(issue));
    const llmOptimizationScore = Math.round((score(siteAi) * average(pageAiScores)) / 100);
    const technicalSeoScore = Math.round((score(siteTechnical) * average(pageTechnicalScores)) / 100);
    // Response time mapped to a 0–100 speed score (under 0.5s is 100, 5s or more is 0).
    const averagePageSpeed = speeds.length ? Math.max(0, Math.min(100, Math.round(100 - ((average(speeds) - 500) / 4500) * 100))) : null;

    await db
      .update(geoAudits)
      .set({
        status: "completed",
        completedAt: new Date(),
        pagesAudited: pagesToAudit.length,
        averageGeoScore,
        averagePageSpeed,
        llmOptimizationScore,
        technicalSeoScore,
        overallScore: Math.round(averageGeoScore * 0.4 + technicalSeoScore * 0.3 + llmOptimizationScore * 0.3),
        robotsTxt: { status: robotsOk ? "ok" : "missing" },
        sitemap: { status: sitemapOk ? "ok" : "missing" },
        llmsTxt: { status: llmsOk ? "ok" : "missing" },
        updatedAt: new Date(),
      })
      .where(eq(geoAudits.id, audit!.id));

    await logActivity(site.id, "siteHealthAudit", { count: issueCount, total: pagesToAudit.length });
    return { auditId: audit!.id, issues: issueCount, pages: pagesToAudit.length };
  } catch (error) {
    await db.update(geoAudits).set({ status: "failed", updatedAt: new Date() }).where(eq(geoAudits.id, audit!.id));
    throw error;
  }
}
