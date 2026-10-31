/** Read model for the Socials pages (Reddit, Quora) and Settings → Reddit / Quora. */
import { addDays, formatISO } from "date-fns";
import { and, asc, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { agentJobRuns, communityKeywords, communityOpportunities, communityPosts, communitySettings, type CommunityPlatform } from "@/db/schema";
import { COMMUNITY_JOBS, OPPORTUNITIES_PER_PAGE, SEARCH_EVERY_DAYS } from "@/lib/community";
import { availableRequirements } from "../agents/capabilities";
import { siteEntitlements } from "../billing/entitlements";
import { siteDay } from "../agents/schedule";
import type { Site } from "../agents/jobs/types";

export type CommunityView = "open" | "replied";
/** "soon": a keyword hasn't been searched yet; otherwise the day the next keyword is due. */
export type NextSearch = { kind: "soon" } | { kind: "day"; day: string } | null;

async function activeKeywords(siteId: number, platform: CommunityPlatform) {
  return db
    .select()
    .from(communityKeywords)
    .where(and(eq(communityKeywords.orgWebsiteId, siteId), eq(communityKeywords.platform, platform), eq(communityKeywords.isActive, true)))
    .orderBy(asc(communityKeywords.createdAt), asc(communityKeywords.id));
}

function nextSearchOf(keywords: { lastCheckedAt: Date | null }[], timeZone: string): NextSearch {
  if (!keywords.length) return null;
  if (keywords.some((keyword) => !keyword.lastCheckedAt)) return { kind: "soon" };
  const next = Math.min(...keywords.map((keyword) => keyword.lastCheckedAt!.getTime() + SEARCH_EVERY_DAYS * 86_400_000));
  return { kind: "day", day: siteDay(new Date(next), timeZone) };
}

export async function getCommunitySettings(site: Site, platform: CommunityPlatform) {
  const [[settings], keywords, available, entitlements] = await Promise.all([
    db.select().from(communitySettings).where(and(eq(communitySettings.orgWebsiteId, site.id), eq(communitySettings.platform, platform))),
    db
      .select()
      .from(communityKeywords)
      .where(and(eq(communityKeywords.orgWebsiteId, site.id), eq(communityKeywords.platform, platform)))
      .orderBy(asc(communityKeywords.createdAt), asc(communityKeywords.id)),
    availableRequirements(site.id),
    siteEntitlements(site.id),
  ]);
  const active = keywords.filter((keyword) => keyword.isActive);
  return {
    platform,
    maxKeywords: entitlements.socialKeywords[platform],
    /** Offer Reddit+ / Quora+ when billing is on and the site doesn't have it yet. */
    upgradeAvailable: entitlements.mode === "billed" && entitlements.active && !entitlements.dailySocial[platform],
    active: active.map((keyword) => ({ id: keyword.id, keyword: keyword.keyword })),
    suggestions: keywords.filter((keyword) => !keyword.isActive).map((keyword) => ({ id: keyword.id, keyword: keyword.keyword })),
    subreddits: settings?.subreddits ?? [],
    replyInstructions: settings?.replyInstructions ?? "",
    suggestionsReady: Boolean(settings?.keywordsSuggestedAt),
    llmAvailable: available.has("llm"),
    nextSearch: nextSearchOf(active, site.timeZone),
  };
}

export async function getCommunityPage(site: Site, platform: CommunityPlatform, view: CommunityView, page: number) {
  const base = and(eq(communityOpportunities.orgWebsiteId, site.id), eq(communityOpportunities.platform, platform), isNull(communityOpportunities.discardedAt));
  const where = and(base, view === "open" ? isNull(communityOpportunities.markedAsRepliedAt) : isNotNull(communityOpportunities.markedAsRepliedAt));
  const [[openCount], [repliedCount], keywords, available, [lastRun]] = await Promise.all([
    db.select({ value: count() }).from(communityOpportunities).where(and(base, isNull(communityOpportunities.markedAsRepliedAt))),
    db.select({ value: count() }).from(communityOpportunities).where(and(base, isNotNull(communityOpportunities.markedAsRepliedAt))),
    activeKeywords(site.id, platform),
    availableRequirements(site.id),
    db
      .select({ status: agentJobRuns.status, detail: agentJobRuns.detail, finishedAt: agentJobRuns.finishedAt })
      .from(agentJobRuns)
      .where(and(eq(agentJobRuns.orgWebsiteId, site.id), eq(agentJobRuns.job, COMMUNITY_JOBS[platform])))
      .orderBy(desc(agentJobRuns.createdAt))
      .limit(1),
  ]);
  const total = view === "open" ? openCount!.value : repliedCount!.value;
  const pages = Math.max(1, Math.ceil(total / OPPORTUNITIES_PER_PAGE));
  const current = Math.min(Math.max(1, page), pages);

  const rows = await db
    .select({ opportunity: communityOpportunities, post: communityPosts, keyword: communityKeywords.keyword })
    .from(communityOpportunities)
    .innerJoin(communityPosts, eq(communityPosts.id, communityOpportunities.postId))
    .leftJoin(communityKeywords, eq(communityKeywords.id, communityOpportunities.keywordId))
    .where(where)
    .orderBy(
      ...(view === "open"
        ? [desc(communityOpportunities.opportunityScore), desc(communityOpportunities.createdAt)]
        : [desc(communityOpportunities.markedAsRepliedAt)]),
      desc(communityOpportunities.id),
    )
    .limit(OPPORTUNITIES_PER_PAGE)
    .offset((current - 1) * OPPORTUNITIES_PER_PAGE);

  return {
    platform,
    view,
    counts: { open: openCount!.value, replied: repliedCount!.value },
    total,
    page: current,
    pages,
    from: total ? (current - 1) * OPPORTUNITIES_PER_PAGE + 1 : 0,
    to: Math.min(total, current * OPPORTUNITIES_PER_PAGE),
    keywordCount: keywords.length,
    nextSearch: nextSearchOf(keywords, site.timeZone),
    llmAvailable: available.has("llm"),
    lastRun: lastRun ? { status: lastRun.status, detail: lastRun.detail } : null,
    items: rows.map(({ opportunity, post, keyword }) => ({
      id: opportunity.id,
      title: post.title,
      url: post.url,
      subreddit: post.subreddit,
      upvotes: post.upvotes,
      numComments: post.numComments,
      postedAt: post.postedAt?.toISOString() ?? null,
      keyword,
      reply: opportunity.suggestedComment,
      reasoning: opportunity.reasoning,
      repliedAt: opportunity.markedAsRepliedAt?.toISOString() ?? null,
    })),
  };
}

/** Days in the next `days` days on which monitored keywords are due to be searched, per platform. */
export async function communitySearchDays(site: Site, today: string, days: number) {
  const result: { day: string; job: (typeof COMMUNITY_JOBS)[CommunityPlatform] }[] = [];
  const last = formatISO(addDays(new Date(`${today}T12:00:00Z`), days), { representation: "date" });
  const tomorrow = formatISO(addDays(new Date(`${today}T12:00:00Z`), 1), { representation: "date" });
  for (const platform of ["reddit", "quora"] as const) {
    const keywords = await activeKeywords(site.id, platform);
    const due = new Set<string>();
    for (const keyword of keywords) {
      let day = keyword.lastCheckedAt ? siteDay(new Date(keyword.lastCheckedAt.getTime() + SEARCH_EVERY_DAYS * 86_400_000), site.timeZone) : tomorrow;
      if (day < tomorrow) day = tomorrow;
      while (day <= last) {
        due.add(day);
        day = formatISO(addDays(new Date(`${day}T12:00:00Z`), SEARCH_EVERY_DAYS), { representation: "date" });
      }
    }
    for (const day of due) result.push({ day, job: COMMUNITY_JOBS[platform] });
  }
  return result;
}
