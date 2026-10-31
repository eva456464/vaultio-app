/**
 * Article improvements: find published articles with a clear opportunity in Search Console
 * (improvementScan, daily) and rewrite the best one on each improvement day (improveArticle).
 * Only articles Vaultio wrote are improved: we hold their text and can update them on any platform.
 */
import { and, eq, inArray, isNotNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { articleImprovements, articles, gscDailyMetrics, gscDimensionMetrics, type ImprovementEvidence, type Opportunity } from "@/db/schema";
import { shiftDay } from "@/lib/traffic";
import { generateImprovement } from "@/server/improvements/generate";
import { publishImprovement } from "@/server/improvements/publish";
import { pathOf } from "@/lib/paths";
import { logActivity } from "../activity";
import type { JobContext } from "./types";

const MIN_DAYS_IN_GOOGLE = 90;
const MIN_IMPRESSIONS_90 = 100;
const IMPROVED_COOLDOWN_DAYS = 180;
const REJECTED_COOLDOWN_DAYS = 28;
const THIN_WORDS = 800;
const STALE_DAYS = 365;

/** Typical click-through rate by Google position (rounded industry averages). */
export function expectedCtr(position: number) {
  const curve = [0.28, 0.15, 0.11, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03, 0.025];
  return position <= 1 ? curve[0]! : position >= 10 ? 0.02 : curve[Math.round(position) - 1]!;
}

/** The single clearest opportunity for a page, or null when it performs well or has none. */
export function detectOpportunity(evidence: ImprovementEvidence, today: string): Opportunity | null {
  const { clicks28, previousClicks28, impressions90, position, ctr, words, lastUpdated } = evidence;
  if (position !== null && position <= 3 && ctr >= expectedCtr(position) * 0.8 && clicks28 >= previousClicks28 * 0.8) return null;
  if (previousClicks28 >= 10 && clicks28 < previousClicks28 * 0.7) return "DECLINING";
  if (position !== null && position >= 8 && position <= 20 && impressions90 >= 300) return "ALMOST_PAGE_ONE";
  if (position !== null && position <= 10 && impressions90 >= 300 && ctr < expectedCtr(position) * 0.6) return "LOW_CTR";
  if (words > 0 && words < THIN_WORDS) return "THIN_CONTENT";
  if (lastUpdated <= shiftDay(today, -STALE_DAYS)) return "STALE_CONTENT";
  return null;
}

export async function improvementScan({ site, runDate }: JobContext) {
  if (!site.improvementsEnabled) return { scanned: false, reason: "Article improvements are off" };
  const [latest] = await db.select({ day: max(gscDailyMetrics.date) }).from(gscDailyMetrics).where(eq(gscDailyMetrics.orgWebsiteId, site.id));
  if (!latest?.day) return { scanned: false, reason: "No Search Console data yet" };
  const end = latest.day;
  const d90 = shiftDay(end, -89);
  const d28 = shiftDay(end, -27);
  const d56 = shiftDay(end, -55);

  const pages = await db
    .select({
      key: gscDimensionMetrics.key,
      firstSeen: sql<string>`min(${gscDimensionMetrics.periodStart})`,
      impressions90: sql<number>`coalesce(sum(${gscDimensionMetrics.impressions}) filter (where ${gscDimensionMetrics.periodStart} >= ${d90}), 0)::int`,
      clicks90: sql<number>`coalesce(sum(${gscDimensionMetrics.clicks}) filter (where ${gscDimensionMetrics.periodStart} >= ${d90}), 0)::int`,
      weighted90: sql<number>`coalesce(sum(${gscDimensionMetrics.position} * ${gscDimensionMetrics.impressions}) filter (where ${gscDimensionMetrics.periodStart} >= ${d90}), 0)`,
      clicks28: sql<number>`coalesce(sum(${gscDimensionMetrics.clicks}) filter (where ${gscDimensionMetrics.periodStart} >= ${d28}), 0)::int`,
      previousClicks28: sql<number>`coalesce(sum(${gscDimensionMetrics.clicks}) filter (where ${gscDimensionMetrics.periodStart} >= ${d56} and ${gscDimensionMetrics.periodStart} < ${d28}), 0)::int`,
    })
    .from(gscDimensionMetrics)
    .where(and(eq(gscDimensionMetrics.orgWebsiteId, site.id), eq(gscDimensionMetrics.dimension, "page")))
    .groupBy(gscDimensionMetrics.key);
  const byPath = new Map(pages.map((page) => [pathOf(page.key), page]));

  const published = await db
    .select({ id: articles.id, url: articles.publishedUrl, words: articles.wordCount, publishedAt: articles.publishedAt, updatedAt: articles.updatedAt })
    .from(articles)
    .where(and(eq(articles.orgWebsiteId, site.id), isNotNull(articles.publishedUrl)));
  const history = await db
    .select({ id: articleImprovements.id, articleId: articleImprovements.articleId, status: articleImprovements.status, decidedAt: articleImprovements.decidedAt, publishedAt: articleImprovements.publishedAt })
    .from(articleImprovements)
    .where(eq(articleImprovements.orgWebsiteId, site.id));

  // Articles that must not be suggested right now.
  const blocked = new Set<number>();
  const improvedSince = new Date(`${shiftDay(runDate, -IMPROVED_COOLDOWN_DAYS)}T00:00:00Z`);
  const rejectedSince = new Date(`${shiftDay(runDate, -REJECTED_COOLDOWN_DAYS)}T00:00:00Z`);
  for (const row of history) {
    if (!row.articleId) continue;
    const active = ["scheduled", "generating", "pending_review", "dismissed"].includes(row.status);
    const recentlyImproved = row.status === "published" && row.publishedAt && row.publishedAt >= improvedSince;
    const recentlyRejected = (row.status === "rejected" || row.status === "no_changes") && row.decidedAt && row.decidedAt >= rejectedSince;
    if (active || recentlyImproved || recentlyRejected) blocked.add(row.articleId);
  }

  const candidates: { articleId: number; pageUrl: string; opportunity: Opportunity; evidence: ImprovementEvidence }[] = [];
  for (const article of published) {
    const page = byPath.get(pathOf(article.url!));
    if (!page || blocked.has(article.id)) continue;
    if (page.firstSeen > shiftDay(end, -MIN_DAYS_IN_GOOGLE) || page.impressions90 < MIN_IMPRESSIONS_90) continue;
    const evidence: ImprovementEvidence = {
      clicks28: page.clicks28,
      previousClicks28: page.previousClicks28,
      impressions90: page.impressions90,
      clicks90: page.clicks90,
      position: page.impressions90 ? Math.round((Number(page.weighted90) / page.impressions90) * 10) / 10 : null,
      ctr: page.impressions90 ? page.clicks90 / page.impressions90 : 0,
      words: article.words ?? 0,
      lastUpdated: (article.updatedAt ?? article.publishedAt!).toISOString().slice(0, 10),
      firstSeen: page.firstSeen,
    };
    const opportunity = detectOpportunity(evidence, runDate);
    if (opportunity) candidates.push({ articleId: article.id, pageUrl: page.key, opportunity, evidence });
  }

  // Candidates are a live list: refreshed every scan, dropped when they stop qualifying.
  const existing = history.filter((row) => row.status === "candidate");
  const keep = new Set(candidates.map((c) => c.articleId));
  const stale = existing.filter((row) => !row.articleId || !keep.has(row.articleId)).map((row) => row.id);
  await db.transaction(async (tx) => {
    if (stale.length) await tx.delete(articleImprovements).where(inArray(articleImprovements.id, stale));
    for (const candidate of candidates) {
      const row = existing.find((other) => other.articleId === candidate.articleId);
      const values = { pageUrl: candidate.pageUrl, opportunity: candidate.opportunity, gscSnapshot: candidate.evidence, updatedAt: new Date() };
      if (row) await tx.update(articleImprovements).set(values).where(eq(articleImprovements.id, row.id));
      else await tx.insert(articleImprovements).values({ orgWebsiteId: site.id, articleId: candidate.articleId, status: "candidate", ...values });
    }
  });
  return { scanned: true, articles: published.length, candidates: candidates.length };
}

/** The candidate to improve next: the one with the most impressions goes first. */
export async function topCandidate(siteId: number) {
  const rows = await db
    .select()
    .from(articleImprovements)
    .where(and(eq(articleImprovements.orgWebsiteId, siteId), eq(articleImprovements.status, "candidate")));
  return rows.sort((a, b) => (b.gscSnapshot?.impressions90 ?? 0) - (a.gscSnapshot?.impressions90 ?? 0))[0] ?? null;
}

const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/**
 * Runs daily. Prepares the improvement for tomorrow when tomorrow is an improvement day (so it is
 * ready for review on the day), and with auto-approve publishes today's unless it was flagged.
 */
export async function improveArticle({ site, runDate }: JobContext) {
  if (!site.improvementsEnabled) return { skipped: "Article improvements are off" };
  const days = new Set(site.improvementWeekdays);
  const result: { published?: number; prepared?: number; changes?: number; flags?: number } = {};

  if (days.has(weekdayOf(runDate)) && site.improvementsAutoPublish) {
    const [ready] = await db
      .select()
      .from(articleImprovements)
      .where(and(eq(articleImprovements.orgWebsiteId, site.id), eq(articleImprovements.status, "pending_review"), eq(articleImprovements.scheduledFor, runDate)));
    if (ready && !ready.safetyFlags.length) {
      await publishImprovement(site.id, ready.id, { approveAll: true });
      result.published = ready.id;
    }
  }

  const tomorrow = shiftDay(runDate, 1);
  if (days.has(weekdayOf(tomorrow))) {
    const [already] = await db
      .select({ id: articleImprovements.id })
      .from(articleImprovements)
      .where(and(eq(articleImprovements.orgWebsiteId, site.id), eq(articleImprovements.scheduledFor, tomorrow)));
    const candidate = already ? null : await topCandidate(site.id);
    if (candidate) {
      await db.update(articleImprovements).set({ status: "scheduled", scheduledFor: tomorrow, updatedAt: new Date() }).where(eq(articleImprovements.id, candidate.id));
      const [article] = await db.select({ title: articles.title }).from(articles).where(eq(articles.id, candidate.articleId!));
      const outcome = await generateImprovement(site, candidate.id);
      if (outcome.changes) await logActivity(site.id, "articleImprovementPlanned", { title: article?.title, articleId: candidate.articleId ?? undefined });
      Object.assign(result, { prepared: candidate.id, ...outcome });
    }
  }
  return result;
}
