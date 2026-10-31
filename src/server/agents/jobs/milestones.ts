/** Achievement engine: turns the site's latest numbers into milestone badges. */
import { and, count, desc, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  backlinks,
  ga4AiSourceDaily,
  gscDailyMetrics,
  llmAnswers,
  milestones,
  websiteMetricsHistory,
  type MilestoneCategory,
  type MilestoneProof,
} from "@/db/schema";
import type { JobContext } from "./types";

const LADDERS: Partial<Record<MilestoneCategory, number[]>> = {
  backlinks: [1, 5, 10, 20, 50, 100, 200, 500],
  backlinks_value: [250, 1000, 2500, 5000, 10_000, 25_000, 50_000],
  total_clicks: [1, 10, 50, 100, 500, 1000, 5000, 10_000],
  total_impressions: [100, 1000, 5000, 10_000, 50_000, 100_000, 500_000],
  ai_referral_first: [1, 10, 20, 50, 100, 500],
  ai_visitors_chatgpt: [1, 10, 20, 50, 100, 500],
  ai_visitors_perplexity: [1, 5, 10, 20, 50],
  ai_visitors_gemini: [1, 5, 10, 20, 50],
  ai_mentions: [1, 5, 10, 25, 50, 100],
  ai_mention_chatgpt: [1],
  ai_mention_claude: [1],
  dr_badge: [10, 20, 30, 40, 50, 60, 70, 80],
};

/** Market price of a link by the giver's domain rating (marketplace averages). */
export function backlinkValueUsd(domainRating: number | null) {
  if (!domainRating || domainRating < 20) return 100;
  if (domainRating < 50) return 250;
  if (domainRating < 70) return 500;
  return 1000;
}

const AI_SOURCE_CATEGORY: Record<string, MilestoneCategory> = {
  chatgpt: "ai_visitors_chatgpt",
  perplexity: "ai_visitors_perplexity",
  gemini: "ai_visitors_gemini",
};

export async function computeMilestones({ site }: JobContext) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const values = new Map<MilestoneCategory, { value: number; gain?: number; proof?: MilestoneProof }>();

  // Backlinks and their value
  const live = await db
    .select({ url: backlinks.url, sourceDomain: backlinks.sourceDomain, dr: backlinks.linkPower, since: backlinks.becameOnlineAt })
    .from(backlinks)
    .where(and(eq(backlinks.targetOrgWebsiteId, site.id), eq(backlinks.isBacklinkPresent, true)));
  if (live.length) {
    const items = live.map((link) => ({
      url: `https://${link.sourceDomain}`,
      domainRating: link.dr ?? 0,
      date: (link.since ?? new Date()).toISOString().slice(0, 10),
      value: backlinkValueUsd(link.dr),
    }));
    const recent = live.filter((link) => link.since && link.since >= weekAgo);
    values.set("backlinks", { value: live.length, gain: recent.length, proof: { kind: "backlinks", items } });
    values.set("backlinks_value", {
      value: items.reduce((total, item) => total + item.value, 0),
      gain: recent.reduce((total, link) => total + backlinkValueUsd(link.dr), 0),
      proof: { kind: "backlinks", items },
    });
  }

  // Google Search Console totals
  const [gsc] = await db
    .select({ clicks: sum(gscDailyMetrics.clicks), impressions: sum(gscDailyMetrics.impressions) })
    .from(gscDailyMetrics)
    .where(eq(gscDailyMetrics.orgWebsiteId, site.id));
  if (Number(gsc?.clicks)) values.set("total_clicks", { value: Number(gsc!.clicks), proof: { kind: "search_traffic", metric: "clicks" } });
  if (Number(gsc?.impressions)) values.set("total_impressions", { value: Number(gsc!.impressions), proof: { kind: "search_traffic", metric: "impressions" } });

  // AI referral visitors (GA4)
  const aiSources = await db
    .select({ source: ga4AiSourceDaily.source, users: sum(ga4AiSourceDaily.activeUsers) })
    .from(ga4AiSourceDaily)
    .where(eq(ga4AiSourceDaily.orgWebsiteId, site.id))
    .groupBy(ga4AiSourceDaily.source);
  const aiTotal = aiSources.reduce((total, row) => total + Number(row.users), 0);
  if (aiTotal) values.set("ai_referral_first", { value: aiTotal, proof: { kind: "ai_visits", total: aiTotal } });
  for (const row of aiSources) {
    const category = AI_SOURCE_CATEGORY[row.source.toLowerCase()];
    if (category) values.set(category, { value: Number(row.users), proof: { kind: "ai_visits", provider: row.source, total: Number(row.users) } });
  }

  // AI mentions
  const mentions = await db
    .select({ provider: llmAnswers.llmProvider, total: count() })
    .from(llmAnswers)
    .where(and(eq(llmAnswers.orgWebsiteId, site.id), eq(llmAnswers.orgWebsiteMentioned, true)))
    .groupBy(llmAnswers.llmProvider);
  const mentionTotal = mentions.reduce((total, row) => total + row.total, 0);
  if (mentionTotal) values.set("ai_mentions", { value: mentionTotal });
  if (mentions.some((row) => row.provider === "openai")) values.set("ai_mention_chatgpt", { value: 1 });
  if (mentions.some((row) => row.provider === "anthropic")) values.set("ai_mention_claude", { value: 1 });

  // Domain rating
  const [dr] = await db
    .select({ rating: websiteMetricsHistory.domainRating, date: websiteMetricsHistory.date })
    .from(websiteMetricsHistory)
    .where(eq(websiteMetricsHistory.orgWebsiteId, site.id))
    .orderBy(desc(websiteMetricsHistory.date))
    .limit(1);
  const rating = dr?.rating ?? site.domainRating;
  if (rating) values.set("dr_badge", { value: rating, proof: { kind: "domain_rating", rating, reachedOn: dr?.date ?? new Date().toISOString().slice(0, 10) } });

  // Record every newly reached threshold and refresh the latest value on existing ones.
  let unlocked = 0;
  for (const [category, { value, gain, proof }] of values) {
    const ladder = LADDERS[category] ?? [];
    const reached = ladder.filter((threshold) => value >= threshold);
    for (const threshold of reached) {
      const nextThreshold = ladder.find((step) => step > value) ?? null;
      const inserted = await db
        .insert(milestones)
        .values({
          orgWebsiteId: site.id,
          category,
          threshold,
          value,
          gainLast7Days: gain ?? 0,
          nextThreshold,
          achievedAt: new Date(),
          proof: proof ?? null,
        })
        .onConflictDoUpdate({
          target: [milestones.orgWebsiteId, milestones.category, milestones.threshold],
          set: { value, gainLast7Days: gain ?? 0, nextThreshold, proof: proof ?? null, updatedAt: new Date() },
        })
        .returning({ created: sql<boolean>`(xmax = 0)` });
      if (inserted[0]?.created) unlocked++;
    }
  }

  // Older thresholds that a newer one superseded are marked seen so the celebration shows the latest.
  await db.execute(sql`
    update ${milestones} m set seen_at = now()
    where m.org_website_id = ${site.id} and m.seen_at is null
      and exists (select 1 from ${milestones} n where n.org_website_id = m.org_website_id
                  and n.category = m.category and n.threshold > m.threshold)`);

  return { categories: values.size, unlocked };
}
