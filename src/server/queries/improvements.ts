/** Read models for the Improvements tab and the improvement review page. */
import { and, desc, eq, gte, lt, ne, sum } from "drizzle-orm";
import { db } from "@/db";
import { articleImprovements, articles, gscDimensionMetrics, type orgWebsites } from "@/db/schema";
import { shiftDay } from "@/lib/traffic";
import { availableRequirements } from "../agents/capabilities";
import { siteDay } from "../agents/schedule";

type Site = typeof orgWebsites.$inferSelect;
const MEASURE_DAYS = 14;

// Waiting for the user first, then upcoming, then history.
const ORDER: Record<string, number> = { pending_review: 0, generating: 1, scheduled: 2, candidate: 3, failed: 4, published: 5, no_changes: 6, rejected: 7 };

export async function getImprovementsList(site: Site) {
  const [available, rows] = await Promise.all([
    availableRequirements(site.id),
    db
      .select({ improvement: articleImprovements, title: articles.title, url: articles.publishedUrl })
      .from(articleImprovements)
      .leftJoin(articles, eq(articles.id, articleImprovements.articleId))
      .where(and(eq(articleImprovements.orgWebsiteId, site.id), ne(articleImprovements.status, "dismissed")))
      .orderBy(desc(articleImprovements.updatedAt)),
  ]);
  const today = siteDay(new Date(), site.timeZone);
  const sorted = rows.sort((a, b) => (ORDER[a.improvement.status] ?? 9) - (ORDER[b.improvement.status] ?? 9) || (b.improvement.gscSnapshot?.impressions90 ?? 0) - (a.improvement.gscSnapshot?.impressions90 ?? 0));
  // The next improvement day, for queued candidates (the best one goes first).
  const days = new Set(site.improvementWeekdays);
  let nextDay: string | null = null;
  for (let offset = 1; offset <= 7 && days.size; offset++) {
    const day = shiftDay(today, offset);
    if (days.has(new Date(`${day}T12:00:00Z`).getUTCDay())) {
      nextDay = day;
      break;
    }
  }
  return { enabled: site.improvementsEnabled, gscConnected: available.has("gsc"), nextScan: shiftDay(today, 1), nextDay, rows: sorted };
}

async function pageTotals(siteId: number, pageUrl: string, from: string, to: string) {
  const [row] = await db
    .select({ clicks: sum(gscDimensionMetrics.clicks), impressions: sum(gscDimensionMetrics.impressions) })
    .from(gscDimensionMetrics)
    .where(and(eq(gscDimensionMetrics.orgWebsiteId, siteId), eq(gscDimensionMetrics.dimension, "page"), eq(gscDimensionMetrics.key, pageUrl), gte(gscDimensionMetrics.periodStart, from), lt(gscDimensionMetrics.periodStart, to)));
  return { clicks: Number(row?.clicks ?? 0), impressions: Number(row?.impressions ?? 0) };
}

/** Clicks and impressions in the 14 days after publishing compared with the 14 days before. */
export async function improvementImpact(siteId: number, pageUrl: string, publishedAt: Date | null, today: string) {
  if (!publishedAt) return null;
  const day = publishedAt.toISOString().slice(0, 10);
  if (shiftDay(day, MEASURE_DAYS) > today) return null;
  const [before, after] = await Promise.all([pageTotals(siteId, pageUrl, shiftDay(day, -MEASURE_DAYS), day), pageTotals(siteId, pageUrl, day, shiftDay(day, MEASURE_DAYS))]);
  return { days: MEASURE_DAYS, clicks: after.clicks - before.clicks, impressions: after.impressions - before.impressions };
}

export async function getImprovement(site: Site, id: number) {
  const [row] = await db
    .select({ improvement: articleImprovements, article: articles })
    .from(articleImprovements)
    .leftJoin(articles, eq(articles.id, articleImprovements.articleId))
    .where(and(eq(articleImprovements.id, id), eq(articleImprovements.orgWebsiteId, site.id)));
  if (!row) return null;
  const today = siteDay(new Date(), site.timeZone);
  return { ...row, impact: await improvementImpact(site.id, row.improvement.pageUrl, row.improvement.publishedAt, today) };
}
