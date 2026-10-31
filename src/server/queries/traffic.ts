/** Read models for the Site traffic pages (GA4 and Search Console data stored by the traffic agents). */
import { and, asc, count, countDistinct, desc, eq, gte, ilike, inArray, isNotNull, lte, max, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  ga4AiSourceDaily,
  ga4RangeMetrics,
  GA4_CHANNELS,
  gscDailyMetrics,
  gscDimensionMetrics,
  integrations,
  keywordClusters,
  type Ga4Channel,
  type orgWebsites,
} from "@/db/schema";
import { AI_SERIES, aiSeriesOf, type AiSeries } from "@/lib/ai-sources";
import { RANGE_DAYS, rangeStart, shiftDay, type SearchRange, type TrafficRange } from "@/lib/traffic";
import { siteDay } from "../agents/schedule";
import { getTrafficSources } from "./overview";

type Site = typeof orgWebsites.$inferSelect;
export const PAGE_SIZE = 10;
export type ListParams = { page: number; q: string; mine: boolean };
export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };

/** Reads one list's search, page and "articles only" values from the page's search params. */
export function listParams(query: Record<string, string | string[] | undefined>, names: { q: string; page: string; mine: string }): ListParams {
  const value = (name: string) => (typeof query[name] === "string" ? (query[name] as string) : "");
  const page = Number.parseInt(value(names.page), 10);
  return { page: Number.isFinite(page) && page > 0 ? page : 1, q: value(names.q).trim().slice(0, 100), mine: value(names.mine) === "1" };
}

const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);
const paged = <T>(rows: T[], total: number, page: number): Paged<T> => ({ rows, total, page, pageSize: PAGE_SIZE });

/** Path of a URL or path, without a trailing slash (except the homepage). */
export function pathOf(urlOrPath: string) {
  let path = urlOrPath;
  try {
    path = new URL(urlOrPath, "https://placeholder.invalid").pathname;
  } catch {
    // keep as given
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export async function getGoogleConnections(siteId: number) {
  const rows = await db
    .select({ type: integrations.type, status: integrations.status, config: integrations.config })
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), inArray(integrations.type, ["ga4", "gsc"])));
  const describe = (type: "ga4" | "gsc") => {
    const row = rows.find((r) => r.type === type);
    return row ? { connected: row.status === "connected", lastSyncedAt: (row.config.lastSyncedAt as string | null | undefined) ?? null } : null;
  };
  return { ga4: describe("ga4"), gsc: describe("gsc") };
}

/** Published URLs of the articles Vaultio wrote for this site. */
async function articleUrls(siteId: number) {
  const rows = await db.select({ url: articles.publishedUrl }).from(articles).where(and(eq(articles.orgWebsiteId, siteId), isNotNull(articles.publishedUrl)));
  return rows.map((row) => row.url!);
}

/** Keywords the articles Vaultio wrote were targeting (lowercase). */
async function articleKeywords(siteId: number) {
  const rows = await db
    .select({ keywords: keywordClusters.keywords })
    .from(articles)
    .innerJoin(keywordClusters, eq(keywordClusters.id, articles.keywordClusterId))
    .where(eq(articles.orgWebsiteId, siteId));
  return new Set(rows.flatMap((row) => row.keywords.map((k) => k.keyword.trim().toLowerCase())));
}

// ------------------------------------------------------------------ All traffic (GA4)

export type ChannelRow = { channel: Ga4Channel; activeUsers: number; percentage: number };
export type PageRow = { path: string; activeUsers: number; share: number; topSource: string | null; isArticle: boolean };

export async function getAllTraffic(site: Site, range: TrafficRange, list: ListParams) {
  const [snapshot, urls, chart] = await Promise.all([
    db
      .select()
      .from(ga4RangeMetrics)
      .where(and(eq(ga4RangeMetrics.orgWebsiteId, site.id), eq(ga4RangeMetrics.range, range), inArray(ga4RangeMetrics.kind, ["total", "channel"]))),
    articleUrls(site.id),
    getTrafficSources(site, range),
  ]);
  const total = snapshot.find((row) => row.kind === "total");
  const channels = snapshot.filter((row) => row.kind === "channel");
  const channelSum = channels.reduce((sum, row) => sum + row.activeUsers, 0);
  const breakdown: ChannelRow[] = GA4_CHANNELS.map((channel) => {
    const users = channels.find((row) => row.key === channel)?.activeUsers ?? 0;
    return { channel, activeUsers: users, percentage: Math.round(share(users, channelSum) * 10) / 10 };
  }).sort((a, b) => b.activeUsers - a.activeUsers);

  // Top pages, filtered in SQL.
  const articlePaths = new Set(urls.map(pathOf));
  const articleVariants = [...articlePaths].flatMap((path) => (path === "/" ? [path] : [path, `${path}/`]));
  const filters = and(
    eq(ga4RangeMetrics.orgWebsiteId, site.id),
    eq(ga4RangeMetrics.range, range),
    eq(ga4RangeMetrics.kind, "page"),
    list.q ? ilike(ga4RangeMetrics.key, `%${escapeLike(list.q)}%`) : undefined,
    list.mine ? inArray(ga4RangeMetrics.key, articleVariants.length ? articleVariants : [""]) : undefined,
  );
  const [[{ total: pageCount } = { total: 0 }], pageRows] = await Promise.all([
    db.select({ total: count() }).from(ga4RangeMetrics).where(filters),
    db
      .select()
      .from(ga4RangeMetrics)
      .where(filters)
      .orderBy(desc(ga4RangeMetrics.activeUsers), asc(ga4RangeMetrics.key))
      .limit(PAGE_SIZE)
      .offset((list.page - 1) * PAGE_SIZE),
  ]);
  const totalUsers = total?.activeUsers ?? 0;

  return {
    hasData: Boolean(total),
    kpis: {
      activeUsers: totalUsers,
      sessions: total?.sessions ?? 0,
      topChannel: breakdown[0]?.activeUsers ? breakdown[0].channel : null,
      aiUsers: channels.find((row) => row.key === "LLM referrers")?.activeUsers ?? 0,
    },
    series: chart.series,
    breakdown,
    pages: paged<PageRow>(
      pageRows.map((row) => ({ path: row.key, activeUsers: row.activeUsers, share: share(row.activeUsers, totalUsers), topSource: row.topSource, isArticle: articlePaths.has(pathOf(row.key)) })),
      pageCount,
      list.page,
    ),
  };
}

// ------------------------------------------------------------------ AI search traffic (GA4)

export type AiPoint = { date: string } & Record<AiSeries, number>;
export type AiModelRow = { model: string; series: AiSeries; activeUsers: number; share: number };
export type AiPageRow = { path: string; activeUsers: number; share: number; topModel: string; isArticle: boolean };

function emptyPoint(date: string): AiPoint {
  return { date, ...(Object.fromEntries(AI_SERIES.map((series) => [series.key, 0])) as Record<AiSeries, number>) };
}

export async function getAiTraffic(site: Site, range: TrafficRange, list: ListParams & { group: "pages" | "models" }) {
  const today = siteDay(new Date(), site.timeZone);
  const start = rangeStart(today, range, "");
  const [snapshot, daily, urls] = await Promise.all([
    db
      .select()
      .from(ga4RangeMetrics)
      .where(and(eq(ga4RangeMetrics.orgWebsiteId, site.id), eq(ga4RangeMetrics.range, range), inArray(ga4RangeMetrics.kind, ["aiTotal", "aiSource", "aiPage"]))),
    db
      .select({ date: ga4AiSourceDaily.date, source: ga4AiSourceDaily.source, users: sum(ga4AiSourceDaily.activeUsers) })
      .from(ga4AiSourceDaily)
      .where(and(eq(ga4AiSourceDaily.orgWebsiteId, site.id), start ? gte(ga4AiSourceDaily.date, start) : undefined))
      .groupBy(ga4AiSourceDaily.date, ga4AiSourceDaily.source),
    articleUrls(site.id),
  ]);
  const total = snapshot.find((row) => row.kind === "aiTotal");
  const totalUsers = total?.activeUsers ?? 0;
  const models: AiModelRow[] = snapshot
    .filter((row) => row.kind === "aiSource" && row.activeUsers > 0)
    .sort((a, b) => b.activeUsers - a.activeUsers)
    .map((row) => ({ model: row.key, series: aiSeriesOf(row.key), activeUsers: row.activeUsers, share: share(row.activeUsers, totalUsers) }));

  // One point per day, zero-filled, so sparse AI visits read as spikes rather than slopes.
  const points = new Map<string, AiPoint>();
  for (const row of daily) {
    const point = points.get(row.date) ?? emptyPoint(row.date);
    point[aiSeriesOf(row.source)] += Number(row.users);
    points.set(row.date, point);
  }
  const first = start || [...points.keys()].sort()[0];
  const series: AiPoint[] = [];
  if (first) for (let day = first; day <= today; day = shiftDay(day, 1)) series.push(points.get(day) ?? emptyPoint(day));

  // Landing pages, either per page (with its top assistant) or per assistant.
  const articlePaths = new Set(urls.map(pathOf));
  const pageModels = snapshot.filter((row) => row.kind === "aiPage");
  const byPage = new Map<string, { users: number; top: { model: string; users: number } }>();
  for (const row of pageModels) {
    const entry = byPage.get(row.subKey) ?? { users: 0, top: { model: row.key, users: -1 } };
    entry.users += row.activeUsers;
    if (row.activeUsers > entry.top.users) entry.top = { model: row.key, users: row.activeUsers };
    byPage.set(row.subKey, entry);
  }
  const matches = (path: string) => (!list.q || path.toLowerCase().includes(list.q.toLowerCase())) && (!list.mine || articlePaths.has(pathOf(path)));
  const pageRows: AiPageRow[] = [...byPage]
    .filter(([path]) => matches(path))
    .map(([path, entry]) => ({ path, activeUsers: entry.users, share: share(entry.users, totalUsers), topModel: entry.top.model, isArticle: articlePaths.has(pathOf(path)) }))
    .sort((a, b) => b.activeUsers - a.activeUsers || a.path.localeCompare(b.path));
  const modelPages = models.map((model) => ({
    ...model,
    pages: pageModels
      .filter((row) => row.key === model.model && matches(row.subKey))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10)
      .map((row) => ({ path: row.subKey, activeUsers: row.activeUsers, share: share(row.activeUsers, model.activeUsers), isArticle: articlePaths.has(pathOf(row.subKey)) })),
  }));

  return {
    hasData: Boolean(total),
    kpis: { activeUsers: totalUsers, sessions: total?.sessions ?? 0, topModel: models[0]?.model ?? null, modelCount: models.length },
    series,
    models,
    pages: paged(pageRows.slice((list.page - 1) * PAGE_SIZE, list.page * PAGE_SIZE), pageRows.length, list.page),
    modelPages,
  };
}

// ------------------------------------------------------------------ Google traffic (Search Console)

export type SearchPoint = { date: string; clicks: number; impressions: number; position: number | null };
export type SearchPageRow = { url: string; path: string; clicks: number; impressions: number; clickShare: number; ctr: number; position: number; isArticle: boolean };
export type SearchQueryRow = { query: string; clicks: number; impressions: number; position: number; isArticle: boolean };

const weightedPosition = (table: typeof gscDailyMetrics | typeof gscDimensionMetrics) =>
  sql<number>`sum(${table.position} * ${table.impressions}) / nullif(sum(${table.impressions}), 0)`;

async function searchTotals(siteId: number, start: string, end: string) {
  const [row] = await db
    .select({ clicks: sum(gscDailyMetrics.clicks), impressions: sum(gscDailyMetrics.impressions), position: weightedPosition(gscDailyMetrics), days: count() })
    .from(gscDailyMetrics)
    .where(and(eq(gscDailyMetrics.orgWebsiteId, siteId), gte(gscDailyMetrics.date, start), lte(gscDailyMetrics.date, end)));
  return { clicks: Number(row?.clicks ?? 0), impressions: Number(row?.impressions ?? 0), position: row?.position === null || row?.position === undefined ? null : Number(row.position), days: row?.days ?? 0 };
}

export async function getGoogleTraffic(site: Site, range: SearchRange, lists: { pages: ListParams; keywords: ListParams }) {
  // Search Console runs 2–3 days behind, so periods end on the latest day it has.
  const [latest] = await db.select({ day: max(gscDailyMetrics.date) }).from(gscDailyMetrics).where(eq(gscDailyMetrics.orgWebsiteId, site.id));
  if (!latest?.day) return null;
  const end = latest.day;
  const [{ day: first } = { day: end }] = await db
    .select({ day: sql<string>`min(${gscDailyMetrics.date})` })
    .from(gscDailyMetrics)
    .where(eq(gscDailyMetrics.orgWebsiteId, site.id));
  const start = rangeStart(end, range, first ?? end);
  const days = RANGE_DAYS[range];

  const [totals, previous, daily, countries, urls, keywords] = await Promise.all([
    searchTotals(site.id, start, end),
    days === null ? null : searchTotals(site.id, shiftDay(start, -days), shiftDay(start, -1)),
    db
      .select({ date: gscDailyMetrics.date, clicks: gscDailyMetrics.clicks, impressions: gscDailyMetrics.impressions, position: gscDailyMetrics.position })
      .from(gscDailyMetrics)
      .where(and(eq(gscDailyMetrics.orgWebsiteId, site.id), gte(gscDailyMetrics.date, start), lte(gscDailyMetrics.date, end)))
      .orderBy(asc(gscDailyMetrics.date)),
    db
      .select({ country: gscDimensionMetrics.key, clicks: sum(gscDimensionMetrics.clicks) })
      .from(gscDimensionMetrics)
      .where(and(eq(gscDimensionMetrics.orgWebsiteId, site.id), eq(gscDimensionMetrics.dimension, "country"), gte(gscDimensionMetrics.periodStart, start), lte(gscDimensionMetrics.periodStart, end)))
      .groupBy(gscDimensionMetrics.key)
      .orderBy(desc(sum(gscDimensionMetrics.clicks)))
      .limit(8),
    articleUrls(site.id),
    articleKeywords(site.id),
  ]);

  const byDay = new Map(daily.map((row) => [row.date, row]));
  const series: SearchPoint[] = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) {
    const row = byDay.get(day);
    series.push({ date: day, clicks: row?.clicks ?? 0, impressions: row?.impressions ?? 0, position: row?.position ?? null });
  }

  // Pages and searches: aggregated per key over the period, filtered and paged in SQL.
  const dimensionRows = (dimension: "page" | "query", list: ListParams, only: string[] | null) => {
    const filters = and(
      eq(gscDimensionMetrics.orgWebsiteId, site.id),
      eq(gscDimensionMetrics.dimension, dimension),
      gte(gscDimensionMetrics.periodStart, start),
      lte(gscDimensionMetrics.periodStart, end),
      list.q ? ilike(gscDimensionMetrics.key, `%${escapeLike(list.q)}%`) : undefined,
      only ? inArray(sql`lower(${gscDimensionMetrics.key})`, (only.length ? only : [""]).map((value) => value.toLowerCase())) : undefined,
    );
    return Promise.all([
      db.select({ total: countDistinct(gscDimensionMetrics.key) }).from(gscDimensionMetrics).where(filters),
      db
        .select({ key: gscDimensionMetrics.key, clicks: sum(gscDimensionMetrics.clicks), impressions: sum(gscDimensionMetrics.impressions), position: weightedPosition(gscDimensionMetrics) })
        .from(gscDimensionMetrics)
        .where(filters)
        .groupBy(gscDimensionMetrics.key)
        .orderBy(desc(sum(gscDimensionMetrics.clicks)), desc(sum(gscDimensionMetrics.impressions)), asc(gscDimensionMetrics.key))
        .limit(PAGE_SIZE)
        .offset((list.page - 1) * PAGE_SIZE),
    ]);
  };
  const articlePaths = new Set(urls.map(pathOf));
  const pageVariants = urls.flatMap((url) => {
    const bare = url.replace(/\/+$/, "");
    return [bare, `${bare}/`, bare.replace(/^http:/, "https:"), bare.replace(/^https:/, "http:"), `${bare.replace(/^http:/, "https:")}/`];
  });
  const [[[pageCount], pageRows], [[keywordCount], keywordRows]] = await Promise.all([
    dimensionRows("page", lists.pages, lists.pages.mine ? pageVariants : null),
    dimensionRows("query", lists.keywords, lists.keywords.mine ? [...keywords] : null),
  ]);

  return {
    range: { start, end },
    kpis: {
      clicks: totals.clicks,
      impressions: totals.impressions,
      position: totals.position,
      clicksChange: previous?.days ? totals.clicks - previous.clicks : null,
      impressionsChange: previous?.days ? totals.impressions - previous.impressions : null,
    },
    series,
    countries: countries.map((row) => ({ country: row.country, clicks: Number(row.clicks), share: share(Number(row.clicks), totals.clicks) })),
    pages: paged<SearchPageRow>(
      pageRows.map((row) => {
        const clicks = Number(row.clicks);
        const impressions = Number(row.impressions);
        return { url: row.key, path: pathOf(row.key), clicks, impressions, clickShare: share(clicks, totals.clicks), ctr: share(clicks, impressions), position: Number(row.position ?? 0), isArticle: articlePaths.has(pathOf(row.key)) };
      }),
      pageCount?.total ?? 0,
      lists.pages.page,
    ),
    keywords: paged<SearchQueryRow>(
      keywordRows.map((row) => ({ query: row.key, clicks: Number(row.clicks), impressions: Number(row.impressions), position: Number(row.position ?? 0), isArticle: keywords.has(row.key.toLowerCase()) })),
      keywordCount?.total ?? 0,
      lists.keywords.page,
    ),
  };
}
