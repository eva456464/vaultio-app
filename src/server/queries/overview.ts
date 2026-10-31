import "server-only";
import { addDays, formatISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import {
  agentActivities,
  agentJobRuns,
  articles,
  competitors,
  contentPlanItems,
  ga4ChannelDaily,
  GA4_CHANNELS,
  keywordClusters,
  milestones,
  seedKeywords,
  targetLocations,
  type ActivityType,
  type Ga4Channel,
} from "@/db/schema";
import { rangeStart, type TrafficRange } from "@/lib/traffic";
import { topCandidate } from "../agents/jobs/improvements";
import { availableRequirements } from "../agents/capabilities";
import { ONBOARDING_STEPS } from "../agents/queue";
import { JOB_REGISTRY } from "../agents/runner";
import { plannedActions, siteDay, type AgentJob } from "../agents/schedule";
import type { Site } from "../agents/jobs/types";
import { communitySearchDays } from "./community";

const isoDay = (date: Date) => formatISO(date, { representation: "date" });
const shiftDay = (day: string, days: number) => isoDay(addDays(new Date(`${day}T12:00:00Z`), days));

export type ActivityItem = {
  id: number;
  type: ActivityType;
  occurredAt: string;
  count: number | null;
  total: number | null;
  title: string | null;
  articleId: number | null;
  publishedUrl: string | null;
  sourceUrl: string | null;
  domainRating: number | null;
};

export type FeaturedArticle = {
  articleId: number | null;
  title: string;
  keyword: string | null;
  searchVolume: number | null;
  imageUrl: string | null;
  publishedUrl: string | null;
  status: "published" | "written" | "planned";
  whyThisTopic: string[];
  whyThisStructure: string[];
  characteristics: string[];
};

export type AgentDay = {
  day: string;
  today: string;
  firstDay: string;
  lastDay: string;
  items: ActivityItem[];
  featured: FeaturedArticle | null;
  setupInProgress: boolean;
  setupSteps: { job: string; status: string; detail: string | null }[];
  /** Onboarding agents that could not run yet (missing keys or integrations, or errors). */
  waiting: { job: string; status: string; detail: string | null }[];
};

export async function getAgentDay(site: Site, requestedDay: string | undefined): Promise<AgentDay> {
  const today = siteDay(new Date(), site.timeZone);
  const firstDay = siteDay(site.createdAt, site.timeZone);
  const lastDay = shiftDay(today, 14);
  let day = requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) ? requestedDay : today;
  if (day < firstDay) day = firstDay;
  if (day > lastDay) day = lastDay;

  const start = fromZonedTime(`${day}T00:00:00`, site.timeZone);
  const end = fromZonedTime(`${shiftDay(day, 1)}T00:00:00`, site.timeZone);

  const rows = await db
    .select()
    .from(agentActivities)
    .where(
      and(
        eq(agentActivities.orgWebsiteId, site.id),
        or(
          eq(agentActivities.day, day),
          and(isNull(agentActivities.day), gte(agentActivities.occurredAt, start), lt(agentActivities.occurredAt, end)),
        ),
      ),
    )
    .orderBy(asc(agentActivities.occurredAt));

  const items: ActivityItem[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    occurredAt: row.occurredAt.toISOString(),
    count: row.count,
    total: row.total,
    title: row.title,
    articleId: row.articleId,
    publishedUrl: row.publishedUrl,
    sourceUrl: row.sourceUrl,
    domainRating: row.domainRating,
  }));

  const featured = await getFeaturedArticle(site.id, day, items);
  const runs = await db
    .select({ job: agentJobRuns.job, status: agentJobRuns.status, detail: agentJobRuns.detail })
    .from(agentJobRuns)
    .where(and(eq(agentJobRuns.orgWebsiteId, site.id), inArray(agentJobRuns.job, [...ONBOARDING_STEPS])))
    .orderBy(asc(agentJobRuns.createdAt));
  // Latest run per onboarding step, in pipeline order.
  const latest = new Map(runs.map((run) => [run.job, run]));
  const setupSteps = ONBOARDING_STEPS.flatMap((step) => {
    const run = latest.get(step);
    return run ? [{ job: step, status: run.status, detail: run.detail }] : [];
  });
  const completedSteps = new Set(runs.filter((run) => run.status === "completed").map((run) => run.job));
  // Agents that exist but could not run yet; features still being built are left out.
  const waiting = setupSteps.filter(
    (step) =>
      !completedSteps.has(step.job) &&
      (step.status === "skipped" || step.status === "failed") &&
      Boolean(JOB_REGISTRY[step.job].handler),
  );

  return {
    day,
    today,
    firstDay,
    lastDay,
    items,
    featured,
    setupInProgress: site.onboardingStatus !== "completed",
    setupSteps: site.onboardingStatus === "completed" ? [] : setupSteps,
    waiting,
  };
}

async function getFeaturedArticle(siteId: number, day: string, items: ActivityItem[]): Promise<FeaturedArticle | null> {
  const published = items.find((item) => item.type === "articlePublished" || item.type === "articleWritten");

  const [planned] = await db
    .select({ plan: contentPlanItems, article: articles, keyword: seedKeywords })
    .from(contentPlanItems)
    .leftJoin(articles, eq(articles.id, contentPlanItems.articleId))
    .leftJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(contentPlanItems.orgWebsiteId, siteId), eq(contentPlanItems.scheduledFor, day)))
    .limit(1);

  let article = planned?.article ?? null;
  if (!article && published?.articleId) {
    [article] = await db.select().from(articles).where(eq(articles.id, published.articleId));
  }
  if (!article && !planned) return null;

  const rationale = article?.generationRationale ?? {};
  return {
    articleId: article?.id ?? null,
    title: article?.title ?? planned?.keyword?.value ?? "",
    keyword: planned?.keyword?.value ?? null,
    searchVolume: planned?.keyword?.avgSearchVolume ?? null,
    imageUrl: article?.heroImageUrl ?? null,
    publishedUrl: article?.publishedUrl ?? null,
    status: article?.publishedUrl ? "published" : article ? "written" : "planned",
    whyThisTopic: rationale.whyThisTopic ?? planned?.plan.whyThisTopic ?? [],
    whyThisStructure: rationale.whyThisStructure ?? [],
    characteristics: rationale.characteristics ?? [],
  };
}

export type PlannedDay = { day: string; actions: { job: AgentJob; title?: string }[] };

export async function getPlannedActions(site: Site, days = 14): Promise<PlannedDay[]> {
  const today = siteDay(new Date(), site.timeZone);
  const plan = await db
    .select({ day: contentPlanItems.scheduledFor, keyword: seedKeywords.value, title: articles.title })
    .from(contentPlanItems)
    .leftJoin(articles, eq(articles.id, contentPlanItems.articleId))
    .leftJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(
      and(
        eq(contentPlanItems.orgWebsiteId, site.id),
        gte(contentPlanItems.scheduledFor, shiftDay(today, 1)),
        lt(contentPlanItems.scheduledFor, shiftDay(today, days + 1)),
      ),
    );
  const articleDays = new Map(plan.map((row) => [row.day, row.title ?? row.keyword ?? ""]));
  const available = await availableRequirements(site.id);

  // An improvement is prepared the day before each improvement day, for the best candidate.
  const improvementDays = new Map<string, string>();
  if (site.improvementsEnabled && available.has("gsc") && available.has("llm")) {
    const candidate = await topCandidate(site.id);
    const [article] = candidate?.articleId ? await db.select({ title: articles.title }).from(articles).where(eq(articles.id, candidate.articleId)) : [];
    const weekdays = new Set(site.improvementWeekdays);
    for (let offset = 1; offset <= days && article; offset++) {
      const day = shiftDay(today, offset);
      if (weekdays.has(new Date(`${shiftDay(day, 1)}T12:00:00Z`).getUTCDay())) {
        improvementDays.set(day, article.title);
        break; // later ones depend on what the scan finds
      }
    }
  }
  const actions = plannedActions({
    now: new Date(),
    timeZone: site.timeZone,
    anchorDay: siteDay(site.createdAt, site.timeZone),
    available,
    days,
    articleDays,
    improvementDays,
  });
  // Reddit and Quora searches happen on the days monitored keywords are due.
  if (available.has("llm")) actions.push(...(await communitySearchDays(site, today, days)));
  actions.sort((a, b) => a.day.localeCompare(b.day));
  const byDay = new Map<string, PlannedDay>();
  for (const action of actions) {
    const entry = byDay.get(action.day) ?? { day: action.day, actions: [] };
    entry.actions.push({ job: action.job, title: action.title });
    byDay.set(action.day, entry);
  }
  return [...byDay.values()];
}

export type MilestoneCard = {
  id: number;
  category: string;
  threshold: number;
  value: number;
  gainLast7Days: number;
  nextThreshold: number | null;
  achievedAt: string;
  isNew: boolean;
  proof: unknown;
};

/** The highest threshold reached per category, plus the unseen ones to celebrate. */
export async function getMilestones(siteId: number) {
  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.orgWebsiteId, siteId))
    .orderBy(desc(milestones.threshold));
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latest.has(row.category)) latest.set(row.category, row);
  const recentCutoff = Date.now() - 7 * 86_400_000;
  const cards: MilestoneCard[] = [...latest.values()]
    .sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime())
    .map((row) => ({
      id: row.id,
      category: row.category,
      threshold: row.threshold,
      value: row.value,
      gainLast7Days: row.gainLast7Days ?? 0,
      nextThreshold: row.nextThreshold,
      achievedAt: row.achievedAt.toISOString(),
      isNew: row.achievedAt.getTime() > recentCutoff,
      proof: row.proof,
    }));
  const unseen = cards.filter((card) => rows.find((row) => row.id === card.id && row.seenAt === null));
  return { cards, unseen };
}

export async function markMilestonesSeen(siteId: number) {
  await db
    .update(milestones)
    .set({ seenAt: new Date() })
    .where(and(eq(milestones.orgWebsiteId, siteId), isNull(milestones.seenAt)));
}

export async function getBusinessProfile(site: Site) {
  const [competitorRows, locationRows] = await Promise.all([
    db.select({ url: competitors.url }).from(competitors).where(eq(competitors.orgWebsiteId, site.id)),
    db
      .select({ name: targetLocations.name, kind: targetLocations.kind })
      .from(targetLocations)
      .where(eq(targetLocations.orgWebsiteId, site.id)),
  ]);
  return {
    brandName: site.brandName,
    url: site.url,
    logoUrl: site.logoUrl,
    industry: site.industry,
    businessType: site.businessType,
    whatYouDo: site.positioning ?? site.description,
    offers: site.servicesOffered,
    audience: site.targetAudience,
    language: site.selectedLanguage,
    countries: locationRows.filter((row) => row.kind === "country").map((row) => row.name),
    brandColors: [site.brandColor, site.brandSecondaryColor].filter((color): color is string => Boolean(color)),
    competitors: competitorRows.map((row) => row.url),
    confirmed: Boolean(site.profileConfirmedAt),
  };
}



export async function getTrafficSources(site: Site, range: TrafficRange) {
  const today = siteDay(new Date(), site.timeZone);
  const start = rangeStart(today, range, "");
  const rows = await db
    .select({ date: ga4ChannelDaily.date, channel: ga4ChannelDaily.channel, users: ga4ChannelDaily.activeUsers })
    .from(ga4ChannelDaily)
    .where(
      and(
        eq(ga4ChannelDaily.orgWebsiteId, site.id),
        start ? gte(ga4ChannelDaily.date, start) : undefined,
        inArray(ga4ChannelDaily.channel, [...GA4_CHANNELS]),
      ),
    )
    .orderBy(asc(ga4ChannelDaily.date));

  const series = new Map<string, Record<Ga4Channel, number> & { date: string }>();
  const totals = Object.fromEntries(GA4_CHANNELS.map((channel) => [channel, 0])) as Record<Ga4Channel, number>;
  for (const row of rows) {
    const point = series.get(row.date) ?? { date: row.date, ...Object.fromEntries(GA4_CHANNELS.map((c) => [c, 0])) } as Record<Ga4Channel, number> & { date: string };
    point[row.channel] += row.users;
    totals[row.channel] += row.users;
    series.set(row.date, point);
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  const breakdown = GA4_CHANNELS.map((channel) => ({
    channel,
    activeUsers: totals[channel],
    percentage: sum ? Math.round((totals[channel] / sum) * 1000) / 10 : 0,
  })).sort((a, b) => b.activeUsers - a.activeUsers);

  return { series: [...series.values()], breakdown, hasData: rows.length > 0 };
}
