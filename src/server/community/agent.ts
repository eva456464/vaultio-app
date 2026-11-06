/**
 * Reddit and Quora agents. For each monitored keyword (searched once a week) the agent finds threads
 * that rank on Google (DataForSEO, `site:reddit.com …`) or, without keyword data, through Claude's web
 * search. Claude keeps only threads where the business can genuinely help, and drafts a reply for the
 * best few. Replies are posted by a person ("Copy & open"); nothing is ever posted automatically.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import {
  communityKeywords,
  communityOpportunities,
  communityPosts,
  communitySettings,
  competitors,
  llmPrompts,
  targetLocations,
  type CommunityPlatform,
  type CommunitySource,
} from "@/db/schema";
import { cleanThreadTitle, DEFAULT_MAX_KEYWORDS, normalizeKeyword, SEARCH_EVERY_DAYS, threadOf, type ThreadRef } from "@/lib/community";
import { ai } from "@/server/ai/claude";
import { seoData } from "@/server/seo/dataforseo";
import { logActivity } from "../agents/activity";
import { availableRequirements } from "../agents/capabilities";
import { siteMarket } from "../agents/jobs/strategy";
import type { JobContext, Site } from "../agents/jobs/types";
import { siteEntitlements } from "../billing/entitlements";
import { redditApiConfigured, redditDetails, redditTrending } from "./reddit";

const PLATFORM_NAME: Record<CommunityPlatform, string> = { reddit: "Reddit", quora: "Quora" };
/** Threads Claude rates below this are not shown. */
const MIN_RELEVANCE = 60;
/** Replies drafted automatically per run; the rest are drafted on request ("Draft a reply"). */
const AUTO_DRAFTS = 3;
const MAX_CANDIDATES = 40;
/** Followed subreddits whose trending threads are checked on each search. */
const MAX_TRENDING_SUBREDDITS = 5;

type Settings = typeof communitySettings.$inferSelect;

type Candidate = ThreadRef & {
  title: string;
  snippet: string | null;
  /** Google position for the keyword, when found through Google. */
  position: number | null;
  keywordId: number | null;
  keyword: string | null;
  source: CommunitySource;
  body?: string | null;
  author?: string | null;
  upvotes?: number | null;
  numComments?: number | null;
  postedAt?: Date | null;
};

// ------------------------------------------------------------------ Settings and keywords

export async function ensureCommunitySettings(siteId: number, platform: CommunityPlatform): Promise<Settings> {
  await db.insert(communitySettings).values({ orgWebsiteId: siteId, platform, maxKeywords: DEFAULT_MAX_KEYWORDS }).onConflictDoNothing();
  const [settings] = await db
    .select()
    .from(communitySettings)
    .where(and(eq(communitySettings.orgWebsiteId, siteId), eq(communitySettings.platform, platform)));
  return settings!;
}

function businessBrief(site: Site, locations: string[]) {
  return [
    `Business: ${site.brandName ?? site.url} (${site.url})`,
    site.positioning || site.description ? `About: ${site.positioning ?? site.description}` : null,
    site.industry ? `Industry: ${site.industry}` : null,
    site.servicesOffered.length ? `Offers: ${site.servicesOffered.map((offer) => offer.name).join("; ")}` : site.mainServices.length ? `Offers: ${site.mainServices.join("; ")}` : null,
    site.targetAudience.length ? `Customers: ${site.targetAudience.join("; ")}` : null,
    locations.length ? `Serves: ${locations.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function siteLocations(siteId: number) {
  const rows = await db.select({ name: targetLocations.name }).from(targetLocations).where(eq(targetLocations.orgWebsiteId, siteId));
  return rows.map((row) => row.name);
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/**
 * Prepares keyword suggestions once per platform from the business profile: the first few become
 * monitored keywords (up to the limit), the rest are offered under "Add more".
 */
export async function suggestKeywords(site: Site, platform: CommunityPlatform) {
  const [locations, prompts, rivals] = await Promise.all([
    siteLocations(site.id),
    db.select({ prompt: llmPrompts.prompt }).from(llmPrompts).where(and(eq(llmPrompts.orgWebsiteId, site.id), eq(llmPrompts.isActive, true))).limit(15),
    db.select({ url: competitors.url }).from(competitors).where(eq(competitors.orgWebsiteId, site.id)).limit(8),
  ]);
  const { keywords } = await ai.generateObject({
    schema: z.object({ keywords: z.array(z.string()) }),
    system:
      "You choose search phrases for finding online discussions where a business could genuinely help. " +
      "Each phrase is 3–7 words, lower-case, the way people word a question or request for recommendations (for example \"best roofing contractor in denver\" or \"how to fix a leaking flat roof\"). " +
      "Cover different needs the business solves; no brand names; no duplicates.",
    prompt: [
      businessBrief(site, locations),
      site.seedTopics.length ? `Topics the business targets: ${site.seedTopics.join("; ")}` : null,
      prompts.length ? `Questions its customers ask AI assistants:\n${prompts.map((row) => `- ${row.prompt}`).join("\n")}` : null,
      `Suggest 15 phrases to search ${PLATFORM_NAME[platform]} with, best first.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    effort: "low",
    maxTokens: 2000,
  });

  const phrases = keywords.map(normalizeKeyword).filter((keyword) => keyword.length >= 3 && keyword.length <= 80);
  if (platform === "reddit") {
    // People ask Reddit for alternatives to named providers; these are offered, never switched on.
    for (const rival of rivals) {
      const host = hostOf(rival.url);
      if (host) phrases.push(`${host} alternatives`);
    }
  }
  return [...new Set(phrases)];
}

/** Keywords monitored on a platform under the site's plan (5, or 40 with Reddit+ / Quora+). */
export async function keywordLimit(siteId: number, platform: CommunityPlatform) {
  return (await siteEntitlements(siteId)).socialKeywords[platform];
}

async function prepareKeywords(site: Site, platform: CommunityPlatform, settings: Settings) {
  if (settings.keywordsSuggestedAt) return;
  const phrases = await suggestKeywords(site, platform);
  const [{ active }] = (await db
    .select({ active: sql<number>`count(*)::int` })
    .from(communityKeywords)
    .where(and(eq(communityKeywords.orgWebsiteId, site.id), eq(communityKeywords.platform, platform), eq(communityKeywords.isActive, true)))) as [{ active: number }];
  let room = Math.max(0, (await keywordLimit(site.id, platform)) - active);
  const rows = phrases.map((keyword) => {
    const isActive = room > 0 && !keyword.endsWith(" alternatives");
    if (isActive) room--;
    return { orgWebsiteId: site.id, platform, keyword, isActive };
  });
  if (rows.length) await db.insert(communityKeywords).values(rows).onConflictDoNothing();
  await db.update(communitySettings).set({ keywordsSuggestedAt: new Date(), updatedAt: new Date() }).where(eq(communitySettings.id, settings.id));
}

// ------------------------------------------------------------------ Finding threads

async function googleThreads(site: Site, platform: CommunityPlatform, keyword: { id: number; keyword: string }, subreddits: string[]): Promise<Candidate[]> {
  const scope =
    platform === "quora"
      ? "site:quora.com"
      : subreddits.length
        ? `(${subreddits.map((name) => `site:reddit.com/r/${name}`).join(" OR ")})`
        : "site:reddit.com";
  const results = await seoData.serp(`${keyword.keyword} ${scope}`, await siteMarket(site), 20);
  return results.flatMap((result) => {
    const ref = threadOf(platform, result.url, site.selectedLanguage);
    if (!ref) return [];
    return [{ ...ref, title: cleanThreadTitle(result.title), snippet: result.description ?? null, position: result.position, keywordId: keyword.id, keyword: keyword.keyword, source: "google" as const }];
  });
}

async function webThreads(site: Site, platform: CommunityPlatform, keyword: { id: number; keyword: string }, subreddits: string[]): Promise<Candidate[]> {
  const what = platform === "reddit" ? "Reddit threads" : "Quora questions";
  const result = await ai.research({
    system: `You find ${what} for a business that wants to help people. Search the web and report only threads you actually found.`,
    prompt: `Find up to 10 ${what} where people ask about or discuss "${keyword.keyword}". Prefer threads where someone asks for advice or recommendations. List each thread's title and URL.`,
    effort: "low",
    maxSearches: 3,
    allowedDomains: platform === "quora" ? ["quora.com"] : subreddits.length ? subreddits.map((name) => `reddit.com/r/${name}`) : ["reddit.com"],
  });
  return result.sources.flatMap((source) => {
    const ref = threadOf(platform, source.url, site.selectedLanguage);
    if (!ref) return [];
    return [{ ...ref, title: cleanThreadTitle(source.title), snippet: null, position: null, keywordId: keyword.id, keyword: keyword.keyword, source: "web" as const }];
  });
}

// ------------------------------------------------------------------ Scoring

/** 0–100 from votes and comments (log scale: ~100 votes and 50 comments ≈ 74). */
export function engagementScore(upvotes: number | null | undefined, comments: number | null | undefined) {
  if (upvotes == null && comments == null) return null;
  return Math.min(100, Math.round(20 * Math.log10(1 + Math.max(0, upvotes ?? 0)) + 20 * Math.log10(1 + Math.max(0, comments ?? 0))));
}

/** 100 for a thread posted today, falling to 0 after a year. */
export function recencyScore(postedAt: Date | null | undefined, now = new Date()) {
  if (!postedAt) return null;
  const days = (now.getTime() - postedAt.getTime()) / 86_400_000;
  return Math.max(0, Math.min(100, Math.round(100 - (days / 365) * 100)));
}

/** Relevance counts most; reach (votes, or Google position) and freshness count when known. */
export function opportunityScore(relevance: number, engagement: number | null, recency: number | null, position: number | null) {
  const reach = engagement ?? (position ? Math.max(0, 100 - (position - 1) * 5) : null);
  const parts: [number, number][] = [[relevance, 0.6]];
  if (reach !== null) parts.push([reach, 0.2]);
  if (recency !== null) parts.push([recency, 0.2]);
  const weight = parts.reduce((total, [, w]) => total + w, 0);
  return Math.round(parts.reduce((total, [value, w]) => total + value * w, 0) / weight);
}

async function rateThreads(site: Site, platform: CommunityPlatform, candidates: Candidate[], locations: string[]) {
  const { threads } = await ai.generateObject({
    schema: z.object({ threads: z.array(z.object({ index: z.number().int(), relevance: z.number().int(), reasoning: z.string() })) }),
    system:
      "You decide which online discussions a business can genuinely help in. Rate each thread's relevance from 0 to 100: " +
      "high when the person's question or need matches what the business offers or knows, in a market and language it serves; " +
      "low for job posts, promotions by other vendors, memes, rants with no question, or needs outside the business. " +
      "Give a one-sentence reason for each.",
    prompt: [
      businessBrief(site, locations),
      `${PLATFORM_NAME[platform]} threads:`,
      candidates
        .map((candidate, index) =>
          [
            `[${index}] ${candidate.subreddit ? `r/${candidate.subreddit} · ` : ""}${candidate.title}`,
            candidate.body ? `    Post: ${candidate.body.slice(0, 600).replace(/\s+/g, " ")}` : candidate.snippet ? `    Snippet: ${candidate.snippet}` : null,
            candidate.keyword ? `    Found for: "${candidate.keyword}"` : `    Trending in r/${candidate.subreddit}`,
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n"),
    ].join("\n\n"),
    effort: "low",
    maxTokens: 8000,
  });
  return new Map(threads.map((thread) => [thread.index, { relevance: Math.max(0, Math.min(100, thread.relevance)), reasoning: thread.reasoning }]));
}

// ------------------------------------------------------------------ Replies

export function replySystemPrompt(site: Site, platform: CommunityPlatform, instructions: string | null) {
  const brand = site.brandName ?? hostOf(site.url) ?? "the business";
  const rules = [
    "Answer the person's actual question first, with specific, practical help someone could act on today.",
    platform === "reddit"
      ? "Write like a knowledgeable community member: conversational, plain text, 50–150 words, no headings, no sales language."
      : "Write a clear, complete answer: 100–250 words, short paragraphs, a short list only if it helps.",
    `Mention ${brand} at most once, and only where it genuinely helps the reader. If you mention it, say openly that the writer works with ${brand} (for example "I work with ${brand}, so I'm biased, but…").`,
    "Never pretend to be an unaffiliated customer, and never invent personal stories, results, reviews, prices or guarantees.",
    "Don't include links.",
    "Don't name or criticise other businesses.",
    `Write in ${site.selectedLanguage === "en" ? "English" : `the language with code "${site.selectedLanguage}"`}.`,
    instructions ? `Style requested by the business (follow it unless it conflicts with the rules above):\n${instructions}` : null,
    "Return only the reply text.",
  ].filter(Boolean);
  return [`You draft ${PLATFORM_NAME[platform]} replies for ${brand} (${site.url}).`, `About the business: ${site.positioning ?? site.description ?? ""}`, `Rules:\n${rules.map((rule) => `- ${rule}`).join("\n")}`].join("\n\n");
}

/** Drafts (or redrafts) the suggested reply for one opportunity and stores it. */
export async function draftReply(site: Site, opportunityId: number) {
  const [row] = await db
    .select({ opportunity: communityOpportunities, post: communityPosts, keyword: communityKeywords.keyword })
    .from(communityOpportunities)
    .innerJoin(communityPosts, eq(communityPosts.id, communityOpportunities.postId))
    .leftJoin(communityKeywords, eq(communityKeywords.id, communityOpportunities.keywordId))
    .where(and(eq(communityOpportunities.id, opportunityId), eq(communityOpportunities.orgWebsiteId, site.id)));
  if (!row) throw new Error("Opportunity not found");
  const settings = await ensureCommunitySettings(site.id, row.opportunity.platform);
  const reply = await ai.generateText({
    system: replySystemPrompt(site, row.opportunity.platform, settings.replyInstructions),
    prompt: [
      row.post.subreddit ? `Subreddit: r/${row.post.subreddit}` : null,
      `${row.opportunity.platform === "reddit" ? "Post title" : "Question"}: ${row.post.title}`,
      row.post.body ? `Post: ${row.post.body.slice(0, 3000)}` : null,
      row.keyword ? `The business found this thread searching for "${row.keyword}".` : null,
      "Draft the reply.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    effort: "low",
    maxTokens: 2000,
  });
  const text = reply.trim();
  await db.update(communityOpportunities).set({ suggestedComment: text, updatedAt: new Date() }).where(eq(communityOpportunities.id, opportunityId));
  return text;
}

// ------------------------------------------------------------------ The agent

async function communitySearch(platform: CommunityPlatform, { site }: JobContext) {
  const settings = await ensureCommunitySettings(site.id, platform);
  await prepareKeywords(site, platform, settings);

  // Reddit+ / Quora+ search every day; otherwise each keyword once a week. Keywords beyond the
  // plan's limit (e.g. after an add-on ends) wait until some are switched off.
  const entitlements = await siteEntitlements(site.id);
  const everyDays = entitlements.dailySocial[platform] ? 1 : SEARCH_EVERY_DAYS;
  const dueBefore = new Date(Date.now() - (everyDays * 86_400_000 - 6 * 3_600_000));
  const keywords = (
    await db
      .select()
      .from(communityKeywords)
      .where(and(eq(communityKeywords.orgWebsiteId, site.id), eq(communityKeywords.platform, platform), eq(communityKeywords.isActive, true)))
      .orderBy(communityKeywords.createdAt, communityKeywords.id)
  )
    .slice(0, entitlements.socialKeywords[platform])
    .filter((keyword) => !keyword.lastCheckedAt || keyword.lastCheckedAt < dueBefore);
  if (!keywords.length) return { searched: 0, found: 0 };

  const useGoogle = (await availableRequirements(site.id)).has("keywordData");
  const subreddits = platform === "reddit" ? settings.subreddits : [];
  const found = new Map<string, Candidate>();
  for (const keyword of keywords) {
    const threads = useGoogle ? await googleThreads(site, platform, keyword, subreddits) : await webThreads(site, platform, keyword, subreddits);
    for (const thread of threads) {
      if (subreddits.length && !subreddits.some((name) => name.toLowerCase() === thread.subreddit?.toLowerCase())) continue;
      if (!found.has(thread.externalId)) found.set(thread.externalId, thread);
    }
    await db.update(communityKeywords).set({ lastCheckedAt: new Date(), updatedAt: new Date() }).where(eq(communityKeywords.id, keyword.id));
  }
  // Trending threads in the followed subreddits (needs the Reddit Data API); Claude's relevance
  // rating below keeps only the ones the business can help with.
  if (platform === "reddit" && subreddits.length && redditApiConfigured()) {
    for (const subreddit of subreddits.slice(0, MAX_TRENDING_SUBREDDITS)) {
      try {
        for (const thread of await redditTrending(subreddit)) {
          if (found.has(thread.id)) continue;
          found.set(thread.id, {
            platform: "reddit",
            externalId: thread.id,
            url: thread.url,
            subreddit: thread.subreddit,
            title: thread.title,
            snippet: null,
            position: null,
            keywordId: null,
            keyword: null,
            source: "trending",
            body: thread.body,
            author: thread.author,
            upvotes: thread.upvotes,
            numComments: thread.numComments,
            postedAt: thread.postedAt,
          });
        }
      } catch (error) {
        console.warn(`[community] trending r/${subreddit}:`, (error as Error).message);
      }
    }
  }

  // Skip threads this site has already seen (open, replied or marked not relevant).
  let candidates = [...found.values()];
  if (candidates.length) {
    const known = await db
      .select({ externalId: communityPosts.externalId })
      .from(communityOpportunities)
      .innerJoin(communityPosts, eq(communityPosts.id, communityOpportunities.postId))
      .where(and(eq(communityOpportunities.orgWebsiteId, site.id), eq(communityPosts.platform, platform), inArray(communityPosts.externalId, candidates.map((c) => c.externalId))));
    const seen = new Set(known.map((row) => row.externalId));
    candidates = candidates.filter((candidate) => !seen.has(candidate.externalId)).slice(0, MAX_CANDIDATES);
  }

  if (platform === "reddit" && redditApiConfigured() && candidates.length) {
    const details = await redditDetails(candidates.map((candidate) => candidate.externalId));
    candidates = candidates.flatMap((candidate) => {
      const detail = details.get(candidate.externalId);
      if (!detail) return [candidate];
      if (detail.closed) return [];
      return [{ ...candidate, title: detail.title || candidate.title, subreddit: detail.subreddit || candidate.subreddit, body: detail.body, author: detail.author, upvotes: detail.upvotes, numComments: detail.numComments, postedAt: detail.postedAt }];
    });
  }
  if (!candidates.length) return { searched: keywords.length, found: 0 };

  const locations = await siteLocations(site.id);
  const ratings = await rateThreads(site, platform, candidates, locations);
  const kept: { id: number; score: number }[] = [];
  for (const [index, candidate] of candidates.entries()) {
    const rating = ratings.get(index);
    if (!rating || rating.relevance < MIN_RELEVANCE) continue;
    const [post] = await db
      .insert(communityPosts)
      .values({
        platform,
        externalId: candidate.externalId,
        url: candidate.url,
        title: candidate.title,
        body: candidate.body ?? candidate.snippet,
        author: candidate.author ?? null,
        subreddit: candidate.subreddit,
        upvotes: candidate.upvotes ?? null,
        numComments: candidate.numComments ?? null,
        postedAt: candidate.postedAt ?? null,
      })
      .onConflictDoUpdate({
        target: [communityPosts.platform, communityPosts.externalId],
        set: {
          title: candidate.title,
          ...(candidate.upvotes != null ? { upvotes: candidate.upvotes, numComments: candidate.numComments, body: candidate.body, postedAt: candidate.postedAt } : {}),
          updatedAt: new Date(),
        },
      })
      .returning({ id: communityPosts.id });
    const engagement = engagementScore(candidate.upvotes, candidate.numComments);
    const recency = recencyScore(candidate.postedAt);
    const score = opportunityScore(rating.relevance, engagement, recency, candidate.position);
    const [opportunity] = await db
      .insert(communityOpportunities)
      .values({
        orgWebsiteId: site.id,
        platform,
        postId: post!.id,
        keywordId: candidate.keywordId,
        opportunityScore: score,
        relevanceScore: rating.relevance,
        engagementScore: engagement,
        recencyScore: recency,
        reasoning: rating.reasoning,
        source: candidate.source,
      })
      .onConflictDoNothing()
      .returning({ id: communityOpportunities.id });
    if (opportunity) kept.push({ id: opportunity.id, score });
  }

  let drafted = 0;
  for (const { id } of kept.sort((a, b) => b.score - a.score).slice(0, AUTO_DRAFTS)) {
    await draftReply(site, id);
    drafted++;
  }
  if (kept.length) await logActivity(site.id, platform === "reddit" ? "redditOpportunitiesFound" : "quoraOpportunitiesFound", { count: kept.length });
  return { searched: keywords.length, found: kept.length, drafted, source: useGoogle ? "google" : "web" };
}

export const redditSearch = (context: JobContext) => communitySearch("reddit", context);
export const quoraSearch = (context: JobContext) => communitySearch("quora", context);
