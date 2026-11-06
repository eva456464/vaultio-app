/**
 * "We could not find the last few published articles on your site": checks that the latest
 * published articles answer at their address and appear in the site's sitemap (the backlink
 * exchange only credits links on pages search engines can find).
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { articles, orgWebsites, sitePages, type ArticleLiveCheck } from "@/db/schema";
import type { Site } from "../agents/jobs/types";
import { fetchText } from "../agents/web";

const LATEST = 5;
/** Same page whatever the www., scheme or trailing slash. */
const key = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url;
  }
};

export async function checkPublishedArticles(site: Site): Promise<ArticleLiveCheck | null> {
  const latest = await db
    .select({ url: articles.publishedUrl, title: articles.title })
    .from(articles)
    .where(and(eq(articles.orgWebsiteId, site.id), isNotNull(articles.publishedUrl), eq(articles.publishedAsDraft, false)))
    .orderBy(desc(articles.publishedAt))
    .limit(LATEST);
  if (!latest.length) return null;
  const inSitemap = new Set((await db.select({ url: sitePages.url }).from(sitePages).where(eq(sitePages.orgWebsiteId, site.id))).map((row) => key(row.url)));
  const notLive: string[] = [];
  const notInSitemap: string[] = [];
  for (const url of [...new Set(latest.map((article) => article.url!))]) {
    const page = await fetchText(url, 15_000).catch(() => null);
    if (!page || page.status >= 400) notLive.push(url);
    if (!inSitemap.has(key(page?.url ?? url)) && !inSitemap.has(key(url))) notInSitemap.push(url);
  }
  const result: ArticleLiveCheck = { checkedAt: new Date().toISOString(), total: new Set(latest.map((article) => article.url)).size, notLive, notInSitemap };
  await db.update(orgWebsites).set({ articleLiveCheck: result }).where(eq(orgWebsites.id, site.id));
  return result;
}
