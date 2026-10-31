/** Strategy agents: brand profile, competitors, keywords, AI prompts, content plan, topic research. */
import { addDays, formatISO, getDay } from "date-fns";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import {
  competitors as competitorsTable,
  contentPlanItems,
  keywordClusters,
  llmPrompts,
  orgWebsites,
  seedKeywords,
  sitePages,
  targetLocations,
  websiteMetricsHistory,
  type ArticleType,
} from "@/db/schema";
import { ai } from "@/server/ai/claude";
import { COUNTRY_NAMES, DEFAULT_LOCATION, seoData, type KeywordIdea, type Market } from "@/server/seo/dataforseo";
import { logActivity } from "../activity";
import { fetchText, parsePage } from "../web";
import type { JobContext, Site } from "./types";

// ------------------------------------------------------------------ Helpers

export const siteDomain = (site: Site) => new URL(site.url).hostname.replace(/^www\./, "");

export async function siteMarket(site: Site): Promise<Market> {
  const [country] = await db
    .select({ code: targetLocations.locationCode })
    .from(targetLocations)
    .where(and(eq(targetLocations.orgWebsiteId, site.id), eq(targetLocations.kind, "country")))
    .limit(1);
  return { locationCode: country?.code ?? DEFAULT_LOCATION[site.selectedLanguage] ?? 2840, languageCode: site.selectedLanguage };
}

const KEY_PAGE_HINTS = /about|service|pricing|price|product|solution|who-we-are|what-we-do|feature|team/i;

/** Readable text from the homepage and a few key pages, for the brand profile. */
async function collectSiteText(site: Site, maxChars = 24_000) {
  const home = await fetchText(site.url);
  const facts = parsePage(home.html, home.url);
  const keyPages = facts.internalLinks.filter((url) => KEY_PAGE_HINTS.test(new URL(url).pathname)).slice(0, 5);
  const chunks: string[] = [];
  for (const [url, html] of [[home.url, home.html] as const, ...(await Promise.all(keyPages.map(async (url) => [url, (await fetchText(url).catch(() => null))?.html ?? ""] as const)))]) {
    const text = html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) chunks.push(`### ${url}\n${text.slice(0, 6000)}`);
  }
  return chunks.join("\n\n").slice(0, maxChars);
}

function nextDays(fromDay: string, count: number, weekdays: number[], taken: Set<string>) {
  const days: string[] = [];
  let cursor = new Date(`${fromDay}T12:00:00Z`);
  while (days.length < count) {
    const iso = formatISO(cursor, { representation: "date" });
    if ((weekdays.length === 0 || weekdays.includes(getDay(cursor))) && !taken.has(iso)) days.push(iso);
    cursor = addDays(cursor, 1);
  }
  return days;
}

const PLATFORM_DOMAINS = new Set([
  "wikipedia.org", "youtube.com", "facebook.com", "instagram.com", "linkedin.com", "reddit.com", "quora.com",
  "amazon.com", "yelp.com", "pinterest.com", "x.com", "twitter.com", "tiktok.com", "medium.com", "forbes.com",
  "google.com", "apple.com", "indeed.com", "glassdoor.com", "angi.com", "homeadvisor.com", "thumbtack.com",
  "nerdwallet.com", "investopedia.com", "hubspot.com", "bbb.org", "nextdoor.com", "mapquest.com",
]);
const isPlatform = (domain: string) => PLATFORM_DOMAINS.has(domain) || [...PLATFORM_DOMAINS].some((p) => domain.endsWith(`.${p}`));

// ---------------------------------------------------------- Brand profile

const VOICE_KEYS = [
  "pacing_and_flow",
  "tone_and_emotion",
  "figurative_language",
  "perspective_and_voice",
  "word_choice_and_vocabulary",
  "sentence_structure_and_complexity",
  "formatting_and_structural_elements",
  "level_of_formality_and_personalization",
] as const;

const ProfileSchema = z.object({
  brandName: z.string(),
  industry: z.string(),
  businessType: z.string(),
  positioning: z.string(),
  description: z.string(),
  targetAudience: z.array(z.string()),
  servicesOffered: z.array(
    z.object({
      kind: z.enum(["product_line", "service"]),
      name: z.string(),
      amount: z.string().nullable(),
      priceType: z.enum(["from", "fixed"]).nullable(),
      currency: z.string().nullable(),
      period: z.string().nullable(),
      sourceUrl: z.string().nullable(),
    }),
  ),
  brandVoice: z.object(Object.fromEntries(VOICE_KEYS.map((key) => [key, z.string()])) as Record<(typeof VOICE_KEYS)[number], z.ZodString>),
  seedTopics: z.array(z.string()),
  primaryCountryCode: z.string(),
});

const COUNTRY_TO_LOCATION: Record<string, number> = { US: 2840, GB: 2826, CA: 2124, AU: 2036, FR: 2250, DE: 2276, ES: 2724, IT: 2380, NL: 2528, PT: 2620 };

export async function buildBrandProfile({ site }: JobContext) {
  const siteText = await collectSiteText(site);
  const profile = await ai.generateObject({
    schema: ProfileSchema,
    effort: "medium",
    system:
      "You analyze small-business and SaaS websites to build the brand profile an SEO content team writes from. " +
      "Use only what the website says or clearly implies; never invent prices, offers or claims. " +
      "industry: one or two lowercase words (e.g. marketing, roofing, dental). businessType: a short label such as 'B2B Services', 'Local Services', 'E-commerce', 'SaaS'. " +
      "positioning: at most 500 characters on what makes the business different. targetAudience: 5 to 20 short audience segments. " +
      "servicesOffered: up to 20 offers with prices only when the site states them (amount as a plain number string). " +
      "brandVoice: one or two sentences per dimension describing how the site writes. " +
      "seedTopics: 10 to 20 search phrases potential customers type into Google before they would buy, in the site's language, not containing the brand name. " +
      "primaryCountryCode: ISO 3166-1 alpha-2 country the business mainly serves.",
    prompt: `Website: ${site.url}\nContent language: ${site.selectedLanguage}\n\nPages:\n${siteText}`,
  });

  await db
    .update(orgWebsites)
    .set({
      brandName: site.brandName ?? profile.brandName,
      industry: profile.industry,
      businessType: profile.businessType,
      positioning: profile.positioning.slice(0, 500),
      description: profile.description,
      targetAudience: profile.targetAudience.slice(0, 20),
      servicesOffered: profile.servicesOffered.slice(0, 20).map((offer) => ({
        kind: offer.kind,
        name: offer.name,
        amount: offer.amount ?? undefined,
        priceType: offer.priceType ?? undefined,
        currency: offer.currency ?? undefined,
        period: offer.period ?? undefined,
        sourceUrl: offer.sourceUrl ?? undefined,
      })),
      servicesOfferedUpdatedAt: new Date(),
      brandVoice: profile.brandVoice,
      seedTopics: profile.seedTopics.slice(0, 20),
      updatedAt: new Date(),
    })
    .where(eq(orgWebsites.id, site.id));

  const locationCode = COUNTRY_TO_LOCATION[profile.primaryCountryCode.toUpperCase()];
  const hasCountry = await db
    .select({ id: targetLocations.id })
    .from(targetLocations)
    .where(and(eq(targetLocations.orgWebsiteId, site.id), eq(targetLocations.kind, "country")));
  if (locationCode && hasCountry.length === 0) {
    await db.insert(targetLocations).values({
      orgWebsiteId: site.id,
      locationCode,
      name: COUNTRY_NAMES[locationCode] ?? profile.primaryCountryCode,
      countryCode: profile.primaryCountryCode.toUpperCase(),
      kind: "country",
    });
  }
  return { seedTopics: profile.seedTopics.length, offers: profile.servicesOffered.length };
}

// ------------------------------------------------------------- Competitors

export async function findCompetitors({ site }: JobContext) {
  const market = await siteMarket(site);
  const domain = siteDomain(site);
  const found = new Map<string, { organicTraffic: number | null; score: number }>();

  for (const competitor of await seoData.competitors(domain, market)) {
    if (!isPlatform(competitor.domain)) found.set(competitor.domain, { organicTraffic: competitor.organicTraffic, score: competitor.intersections });
  }
  // New sites rank for little; fall back to who ranks for the site's seed topics.
  if (found.size < 5) {
    for (const topic of site.seedTopics.slice(0, 3)) {
      for (const result of await seoData.serp(topic, market)) {
        if (result.domain === domain || isPlatform(result.domain)) continue;
        const entry = found.get(result.domain) ?? { organicTraffic: null, score: 0 };
        entry.score += 11 - Math.min(result.position, 10);
        found.set(result.domain, entry);
      }
    }
  }

  const top = [...found.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, 10);
  const existing = new Set(
    (await db.select({ url: competitorsTable.url }).from(competitorsTable).where(eq(competitorsTable.orgWebsiteId, site.id))).map((row) => row.url),
  );
  const fresh = top.filter(([d]) => !existing.has(`https://${d}`));
  if (fresh.length) {
    await db.insert(competitorsTable).values(
      fresh.map(([d, info]) => ({ orgWebsiteId: site.id, url: `https://${d}`, organicTraffic: info.organicTraffic ? Math.round(info.organicTraffic) : null })),
    );
  }
  await logActivity(site.id, "competitorsFound", { count: top.length });
  return { competitors: top.length };
}

// ---------------------------------------------------------- Keyword research

const STOPWORDS = new Set(["a", "an", "the", "for", "to", "of", "in", "on", "and", "or", "with", "near", "me", "my", "your", "is", "are", "how", "what", "best", "vs", "de", "la", "le", "les", "el", "der", "die", "das"]);

/** Groups close variants ("roof repair cost", "cost of roof repairs") into one topic. */
function clusterKey(keyword: string) {
  return keyword
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token))
    .map((token) => (token.length > 4 ? token.replace(/(ies|es|s)$/, "") : token))
    .sort()
    .join(" ");
}

const ARTICLE_TYPE_BY_PATTERN: [RegExp, ArticleType][] = [
  [/^how (to|do|can)|\bsteps?\b|\bguide\b/i, "guide_how_to"],
  [/\bvs\.?\b|\bversus\b|\bcompare|\bcomparison\b|\balternatives?\b/i, "comparison"],
  [/^(best|top)\b|\bideas\b|\bexamples\b|\btips\b|\bways\b/i, "listicle_educational"],
];
const articleTypeFor = (keyword: string): ArticleType =>
  ARTICLE_TYPE_BY_PATTERN.find(([pattern]) => pattern.test(keyword))?.[1] ?? "guide_explainer";

async function existingClusterKeys(siteId: number) {
  const rows = await db
    .select({ keyword: seedKeywords.value })
    .from(keywordClusters)
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(eq(keywordClusters.orgWebsiteId, siteId));
  return new Set(rows.map((row) => clusterKey(row.keyword)));
}

/** Stores grouped keyword ideas as topic clusters, skipping topics the site already has. */
async function insertClusters(site: Site, market: Market, groups: Map<string, KeywordIdea[]>, source: string) {
  const known = await existingClusterKeys(site.id);
  let created = 0;
  for (const [key, variants] of groups) {
    if (known.has(key)) continue;
    const head = [...variants].sort((a, b) => b.searchVolume - a.searchVolume)[0]!;
    const total = variants.reduce((sum, v) => sum + v.searchVolume, 0);
    const [seed] = await db
      .insert(seedKeywords)
      .values({
        value: head.keyword,
        languageCode: market.languageCode,
        avgSearchVolume: head.searchVolume,
        keywordDifficulty: head.difficulty,
        averageCpc: head.cpc,
        averageIntent: head.intent,
        articleType: articleTypeFor(head.keyword),
      })
      .returning();
    await db.insert(keywordClusters).values({
      orgWebsiteId: site.id,
      seedKeywordId: seed!.id,
      keywords: variants.map((v) => ({ keyword: v.keyword, searchVolume: v.searchVolume })),
      totalSearchVolume: total,
      averageIntent: head.intent,
      creationSource: source,
      locationName: COUNTRY_NAMES[market.locationCode] ?? null,
      // Favour informational topics with real demand that a young site can win.
      score: (total / ((head.difficulty ?? 30) + 10)) * (head.intent === "informational" ? 1.5 : 1),
    });
    created++;
  }
  return created;
}

export async function keywordResearch({ site }: JobContext) {
  const market = await siteMarket(site);
  const seeds = site.seedTopics.length
    ? site.seedTopics
    : [site.industry, ...site.mainServices, ...site.servicesOffered.map((offer) => offer.name)].filter((value): value is string => Boolean(value));
  if (!seeds.length) throw new Error("No seed topics yet; the brand profile step must run first");

  const ideas = await seoData.keywordIdeas(seeds, market);
  const ranked = await seoData.rankedKeywords(siteDomain(site), market).catch(() => []);
  const alreadyRanking = new Set(ranked.filter((row) => row.position <= 20).map((row) => clusterKey(row.keyword)));

  const usable = ideas.filter((idea) => idea.searchVolume >= 10 && (idea.difficulty ?? 0) <= 70 && !/\bnear me\b/i.test(idea.keyword));
  const groups = new Map<string, KeywordIdea[]>();
  for (const idea of usable) {
    const key = clusterKey(idea.keyword);
    if (!key || alreadyRanking.has(key)) continue;
    groups.set(key, [...(groups.get(key) ?? []), idea]);
  }

  const created = await insertClusters(site, market, groups, "keyword_research");

  await logActivity(site.id, "keywordResearch", { count: usable.length });
  return { ideas: ideas.length, usable: usable.length, clusters: created };
}

// --------------------------------------------------------------- AI prompts

const PromptsSchema = z.object({
  prompts: z.array(z.object({ prompt: z.string(), intent: z.enum(["awareness", "research", "comparison", "learning", "buying", "other"]) })),
});

export const PROMPT_ALLOWANCE = 10;

export async function generatePrompts({ site }: JobContext) {
  const existing = await db.select({ id: llmPrompts.id }).from(llmPrompts).where(eq(llmPrompts.orgWebsiteId, site.id));
  const needed = PROMPT_ALLOWANCE - existing.length;
  if (needed <= 0) return { created: 0 };
  const result = await ai.generateObject({
    schema: PromptsSchema,
    effort: "low",
    system:
      "You write the questions real customers ask AI assistants (ChatGPT, Claude, Gemini) when looking for a business like this one. " +
      "Write them the way a person types into a chat, in the site's language, without naming the brand. Mix intents: " +
      "awareness (understanding the problem), research, comparison (options/providers), learning (how-to) and buying (ready to hire or purchase). " +
      "Include the location when the business is local.",
    prompt: `Business: ${site.brandName ?? site.url}\nWhat they do: ${site.positioning ?? site.description ?? ""}\nAudience: ${site.targetAudience.join(", ")}\nLanguage: ${site.selectedLanguage}\nWrite ${needed} questions.`,
  });
  const prompts = result.prompts.slice(0, needed);
  if (prompts.length) await db.insert(llmPrompts).values(prompts.map((p) => ({ orgWebsiteId: site.id, prompt: p.prompt, intent: p.intent })));
  await logActivity(site.id, "promptsGenerated", { count: prompts.length });
  return { created: prompts.length };
}

// ------------------------------------------------------------- Content plan

const PlanSchema = z.object({
  topics: z.array(
    z.object({
      clusterId: z.number(),
      title: z.string(),
      articleType: z.enum(["guide_explainer", "guide_how_to", "listicle_educational", "listicle_comparison", "comparison", "case_study", "opinion"]),
      whyThisTopic: z.array(z.string()),
    }),
  ),
});

/** Chooses `count` topics from unused keyword clusters and schedules them from `startDay`. */
export async function planTopics(site: Site, count: number, startDay: string) {
  const candidates = await db
    .select({ id: keywordClusters.id, keyword: seedKeywords.value, volume: keywordClusters.totalSearchVolume, difficulty: seedKeywords.keywordDifficulty, intent: keywordClusters.averageIntent, type: seedKeywords.articleType })
    .from(keywordClusters)
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(keywordClusters.orgWebsiteId, site.id), eq(keywordClusters.isUsed, false)))
    .orderBy(desc(keywordClusters.score))
    .limit(150);
  if (!candidates.length) return 0;

  const pages = await db.select({ url: sitePages.url, title: sitePages.metaTitle }).from(sitePages).where(eq(sitePages.orgWebsiteId, site.id)).limit(300);
  const plan = await ai.generateObject({
    schema: PlanSchema,
    effort: "medium",
    system:
      "You are the content strategist for a business blog. Pick article topics that bring the business qualified search and AI-assistant traffic. " +
      "Choose only from the candidate clusters (use their ids). Prefer topics close to what the business sells and its audience's real questions; " +
      "skip off-topic, competitor-branded or duplicate topics and anything the site already covers (existing pages are listed). " +
      "Order topics so that easier, high-relevance ones come first. For each: a compelling, specific title (no clickbait, include the keyword naturally), " +
      "the article type that matches search intent, and exactly three short bullet points explaining why this topic fits this business.",
    prompt: [
      `Business: ${site.brandName ?? site.url} — ${site.positioning ?? site.description ?? ""}`,
      `Audience: ${site.targetAudience.join(", ")}`,
      `Offers: ${site.servicesOffered.map((offer) => offer.name).join(", ")}`,
      `Language: ${site.selectedLanguage}`,
      `Pick ${count} topics.`,
      "",
      "Candidate clusters (id | keyword | monthly searches | difficulty | intent):",
      ...candidates.map((c) => `${c.id} | ${c.keyword} | ${c.volume ?? 0} | ${c.difficulty ?? "?"} | ${c.intent ?? "?"}`),
      "",
      "Existing pages:",
      ...pages.map((p) => `${p.url}${p.title ? ` — ${p.title}` : ""}`),
    ].join("\n"),
  });

  const valid = new Set(candidates.map((c) => c.id));
  const topics = plan.topics.filter((topic, index, all) => valid.has(topic.clusterId) && all.findIndex((t) => t.clusterId === topic.clusterId) === index).slice(0, count);
  const taken = new Set(
    (await db.select({ day: contentPlanItems.scheduledFor }).from(contentPlanItems).where(and(eq(contentPlanItems.orgWebsiteId, site.id), gte(contentPlanItems.scheduledFor, startDay)))).map((row) => row.day),
  );
  const days = nextDays(startDay, topics.length, site.articleScheduleWeekdays, taken);

  await db.transaction(async (tx) => {
    for (const [index, topic] of topics.entries()) {
      await tx.insert(contentPlanItems).values({
        orgWebsiteId: site.id,
        scheduledFor: days[index]!,
        keywordClusterId: topic.clusterId,
        plannedTitle: topic.title,
        articleType: topic.articleType,
        whyThisTopic: topic.whyThisTopic.slice(0, 3),
        generationStatus: "queued",
      });
    }
    if (topics.length) await tx.update(keywordClusters).set({ isUsed: true }).where(inArray(keywordClusters.id, topics.map((t) => t.clusterId)));
  });
  return topics.length;
}

export const PLAN_HORIZON_DAYS = 30;

export async function planFirstMonth({ site, runDate }: JobContext) {
  const tomorrow = formatISO(addDays(new Date(`${runDate}T12:00:00Z`), 1), { representation: "date" });
  const slots = nextDays(tomorrow, 400, site.articleScheduleWeekdays, new Set()).filter((day) => day < formatISO(addDays(new Date(`${runDate}T12:00:00Z`), PLAN_HORIZON_DAYS + 1), { representation: "date" })).length;
  const planned = await planTopics(site, slots, tomorrow);
  // Fail (and retry later) rather than finish with an empty calendar.
  if (planned === 0) throw new Error("No keyword topics are available to plan yet");
  await logActivity(site.id, "firstMonthPlanned", { count: planned });
  return { planned };
}

// ------------------------------------------------------------ Topic research

/** True when an existing page already targets the keyword (most of its words appear in the URL or title). */
function pageCovers(keyword: string, page: { url: string; title: string | null }) {
  const tokens = clusterKey(keyword).split(" ").filter(Boolean);
  if (!tokens.length) return false;
  const haystack = clusterKey(`${decodeURIComponent(new URL(page.url).pathname).replace(/[-_/]/g, " ")} ${page.title ?? ""}`);
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits / tokens.length >= 0.8 && tokens.length >= 2;
}

/**
 * Daily: researches tomorrow's topic, swaps it if the site already covers it
 * (cannibalization), and keeps about a month of topics planned ahead.
 */
export async function topicResearch({ site, runDate }: JobContext) {
  const tomorrow = formatISO(addDays(new Date(`${runDate}T12:00:00Z`), 1), { representation: "date" });
  const market = await siteMarket(site);
  const [item] = await db
    .select({ plan: contentPlanItems, keyword: seedKeywords.value })
    .from(contentPlanItems)
    .leftJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(contentPlanItems.orgWebsiteId, site.id), eq(contentPlanItems.scheduledFor, tomorrow), isNull(contentPlanItems.articleId)))
    .limit(1);

  let researched: string | null = null;
  if (item?.keyword) {
    let keyword = item.keyword;
    const pages = await db.select({ url: sitePages.url, title: sitePages.metaTitle }).from(sitePages).where(eq(sitePages.orgWebsiteId, site.id));
    const covered = pages.find((page) => pageCovers(keyword, page));
    let replacedKeyword: string | undefined;
    if (covered) {
      const [replacement] = await db
        .select({ id: keywordClusters.id, keyword: seedKeywords.value, type: seedKeywords.articleType })
        .from(keywordClusters)
        .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
        .where(and(eq(keywordClusters.orgWebsiteId, site.id), eq(keywordClusters.isUsed, false)))
        .orderBy(desc(keywordClusters.score))
        .limit(1);
      if (replacement) {
        replacedKeyword = keyword;
        keyword = replacement.keyword;
        await db
          .update(contentPlanItems)
          .set({ keywordClusterId: replacement.id, plannedTitle: null, articleType: replacement.type, whyThisTopic: [], updatedAt: new Date() })
          .where(eq(contentPlanItems.id, item.plan.id));
        await db.update(keywordClusters).set({ isUsed: true }).where(eq(keywordClusters.id, replacement.id));
      }
    }
    await logActivity(site.id, "cannibalizationCheck", { day: runDate, count: 1 });

    const serp = process.env.DATAFORSEO_LOGIN ? await seoData.serp(keyword, market).catch(() => []) : [];
    await db
      .update(contentPlanItems)
      .set({
        research: { serp: serp.map(({ url, title, position }) => ({ url, title, position })), cannibalizationCheckedAt: new Date().toISOString(), replacedKeyword },
        generationStatus: "researching",
        updatedAt: new Date(),
      })
      .where(eq(contentPlanItems.id, item.plan.id));
    await logActivity(site.id, "topicResearched", { title: keyword });
    researched = keyword;
  }

  // Keep the calendar filled about a month ahead.
  const horizon = formatISO(addDays(new Date(`${runDate}T12:00:00Z`), PLAN_HORIZON_DAYS), { representation: "date" });
  const [{ queued }] = await db
    .select({ queued: sql<number>`count(*)::int` })
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.orgWebsiteId, site.id), gte(contentPlanItems.scheduledFor, tomorrow), lte(contentPlanItems.scheduledFor, horizon)));
  const slots = nextDays(tomorrow, 400, site.articleScheduleWeekdays, new Set()).filter((day) => day <= horizon).length;
  let added = 0;
  if (queued < slots - 3) {
    const [last] = await db
      .select({ day: contentPlanItems.scheduledFor })
      .from(contentPlanItems)
      .where(eq(contentPlanItems.orgWebsiteId, site.id))
      .orderBy(desc(contentPlanItems.scheduledFor))
      .limit(1);
    const start = last && last.day >= tomorrow ? formatISO(addDays(new Date(`${last.day}T12:00:00Z`), 1), { representation: "date" }) : tomorrow;
    added = await planTopics(site, slots - queued, start);
    if (added) await logActivity(site.id, "topicsPlanned", { day: runDate, count: added });
  }
  return { researched, added };
}

// ------------------------------------------------- Competitor gaps and authority

/** Weekly: finds topics competitors rank for that the site has not covered yet. */
export async function competitorGapScan({ site }: JobContext) {
  const market = await siteMarket(site);
  const rivals = await db.select({ url: competitorsTable.url }).from(competitorsTable).where(eq(competitorsTable.orgWebsiteId, site.id)).limit(5);
  const own = new Set((await seoData.rankedKeywords(siteDomain(site), market).catch(() => [])).map((row) => clusterKey(row.keyword)));
  const groups = new Map<string, KeywordIdea[]>();
  for (const rival of rivals) {
    const ranked = await seoData.rankedKeywords(new URL(rival.url).hostname.replace(/^www\./, ""), market, 300).catch(() => []);
    for (const row of ranked) {
      if (row.position > 10 || row.searchVolume < 20 || /\bnear me\b/i.test(row.keyword)) continue;
      const key = clusterKey(row.keyword);
      if (!key || own.has(key)) continue;
      groups.set(key, [...(groups.get(key) ?? []), { keyword: row.keyword, searchVolume: row.searchVolume, cpc: null, difficulty: null, intent: null }]);
    }
  }
  const created = await insertClusters(site, market, groups, "competitor_gap");
  await logActivity(site.id, "competitorGapScan", { count: rivals.length });
  return { competitors: rivals.length, newTopics: created };
}

/** Monthly: records the site's domain authority. */
export async function domainRatingCheck({ site, runDate }: JobContext) {
  const rating = await seoData.domainRating(siteDomain(site));
  if (rating === null) return { rating: null };
  await db.insert(websiteMetricsHistory).values({ orgWebsiteId: site.id, date: runDate, domainRating: rating });
  await db.update(orgWebsites).set({ domainRating: rating, updatedAt: new Date() }).where(eq(orgWebsites.id, site.id));
  await logActivity(site.id, "domainRatingCheck", { domainRating: rating });
  return { rating };
}

export const _test = { clusterKey, pageCovers, articleTypeFor, nextDays };
