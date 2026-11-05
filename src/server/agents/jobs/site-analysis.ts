/** Crawler agents that need no third-party API: brand analysis, sitemap sync, site health audit. */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orgWebsites, sitePages } from "@/db/schema";
import { logActivity } from "../activity";
import { discoverSitemaps, fetchText, parsePage, readSitemapUrls } from "../web";
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
  const { urls } = await readSitemapUrls(site.sitemapUrl ? [site.sitemapUrl] : await discoverSitemaps(origin));
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

export { siteHealthAudit } from "../../site-health/audit";
