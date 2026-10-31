/**
 * Traffic agents: copy Google Analytics and Search Console numbers into Vaultio's tables so the
 * Site traffic pages, Overview, reports and milestones read them without calling Google.
 *
 * - analyticsSync (daily): visitors per channel per day, plus each page-period's totals, channels and pages.
 * - aiTrafficReport (daily): visitors from AI assistants per day and landing page, plus period totals.
 * - rankingsCheck (every 3 days): Search Console clicks, impressions and position per day, page, search and country.
 *
 * The first run backfills history; later runs re-fetch the last few days, which Google may still revise.
 */
import { and, eq, gt, gte, inArray, max, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { ga4AiSourceDaily, ga4ChannelDaily, ga4RangeMetrics, gscDailyMetrics, gscDimensionMetrics, integrations, type Ga4Channel, type Ga4RangeKind } from "@/db/schema";
import { AI_SOURCE_PATTERN, aiModelOf } from "@/lib/ai-sources";
import { rangeStart, shiftDay, TRAFFIC_RANGES } from "@/lib/traffic";
import { queryGsc, runGa4Report, runGa4Reports, type Ga4ReportRequest, type Ga4Row, type GoogleProduct } from "../../google/client";
import { logActivity } from "../activity";
import type { JobContext } from "./types";

const GA4_EARLIEST = "2015-08-14"; // the earliest date the GA4 Data API accepts
const GSC_HISTORY_DAYS = 486; // Search Console keeps about 16 months
const REFETCH_DAYS = 3;
const CHUNK = 2000;
const DAILY_HISTORY_DAYS = 5 * 365;
const SEP = "\u0001"; // joins keys; never appears in paths or source names

/** Shows a sync failure on the Settings tile as well as in the job log. */
export async function recordSyncError<T>(siteId: number, product: GoogleProduct, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    await db
      .update(integrations)
      .set({ lastError: `Last sync failed: ${(error as Error).message}`, updatedAt: new Date() })
      .where(and(eq(integrations.orgWebsiteId, siteId), eq(integrations.type, product)));
    throw error;
  }
}

export async function connectedIntegration(siteId: number, product: GoogleProduct) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), eq(integrations.type, product), eq(integrations.status, "connected")));
  const propertyId = row?.config.propertyId as string | undefined;
  if (!row || !propertyId) throw new Error(`${product === "ga4" ? "Google Analytics" : "Search Console"} has no property selected`);
  return { row, propertyId };
}

const markSynced = (id: number) =>
  db
    .update(integrations)
    .set({ config: sql`${integrations.config} || ${JSON.stringify({ lastSyncedAt: new Date().toISOString() })}::jsonb`, lastError: null, updatedAt: new Date() })
    .where(eq(integrations.id, id));

async function insertChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let index = 0; index < rows.length; index += CHUNK) await insert(rows.slice(index, index + CHUNK));
}

// GA4 returns dates as YYYYMMDD.
const ga4Day = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

/** Vaultio's five channels from GA4's default channel group, with AI assistants pulled out of Referral. */
export function channelOf(group: string, source: string): Ga4Channel {
  if (aiModelOf(source)) return "LLM referrers";
  if (group === "Direct") return "Direct";
  if (group === "Organic Search") return "Organic search";
  if (/^Paid |^Display$|^Cross-network$/.test(group)) return "Paid";
  return "Other";
}

function ga4Earliest(config: Record<string, unknown>) {
  const created = typeof config.propertyCreatedAt === "string" ? config.propertyCreatedAt.slice(0, 10) : null;
  return created && created > GA4_EARLIEST ? created : GA4_EARLIEST;
}

/** Daily rows go back to the property's creation, at most five years. */
const dailyBackfillFrom = (runDate: string, earliest: string) => {
  const limit = shiftDay(runDate, -DAILY_HISTORY_DAYS);
  return limit > earliest ? limit : earliest;
};

async function syncStart(table: typeof ga4ChannelDaily | typeof ga4AiSourceDaily | typeof gscDailyMetrics, siteId: number, backfillFrom: string) {
  const [latest] = await db.select({ day: max(table.date) }).from(table).where(eq(table.orgWebsiteId, siteId));
  return latest?.day ? shiftDay(latest.day, -REFETCH_DAYS) : backfillFrom;
}

/** Replaces this site's snapshot rows of the given kinds with fresh ones. */
async function replaceSnapshots(siteId: number, kinds: Ga4RangeKind[], rows: (typeof ga4RangeMetrics.$inferInsert)[]) {
  await db.transaction(async (tx) => {
    await tx.delete(ga4RangeMetrics).where(and(eq(ga4RangeMetrics.orgWebsiteId, siteId), inArray(ga4RangeMetrics.kind, kinds)));
    await insertChunks(rows, (chunk) => tx.insert(ga4RangeMetrics).values(chunk));
  });
}

function sumBy<K extends string>(rows: Ga4Row[], keyOf: (row: Ga4Row) => K | null) {
  const totals = new Map<K, { users: number; sessions: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    const total = totals.get(key) ?? { users: 0, sessions: 0 };
    total.users += row.metrics[0] ?? 0;
    total.sessions += row.metrics[1] ?? 0;
    totals.set(key, total);
  }
  return totals;
}

// ------------------------------------------------------------------ analyticsSync

export const analyticsSync = (context: JobContext) => recordSyncError(context.site.id, "ga4", () => syncAnalytics(context));

async function syncAnalytics({ site, runDate }: JobContext) {
  const { row, propertyId } = await connectedIntegration(site.id, "ga4");
  const earliest = ga4Earliest(row.config);

  // Visitors per channel per day (charts).
  const start = await syncStart(ga4ChannelDaily, site.id, dailyBackfillFrom(runDate, earliest));
  const daily = await runGa4Report(row, propertyId, { dimensions: ["date", "sessionDefaultChannelGroup", "sessionSource"], metrics: ["activeUsers", "sessions"], startDate: start, endDate: runDate });
  const perDay = sumBy(daily, (r) => `${ga4Day(r.dimensions[0]!)}${SEP}${channelOf(r.dimensions[1]!, r.dimensions[2]!)}`);
  await db.transaction(async (tx) => {
    await tx.delete(ga4ChannelDaily).where(and(eq(ga4ChannelDaily.orgWebsiteId, site.id), gte(ga4ChannelDaily.date, start)));
    await insertChunks([...perDay], (chunk) =>
      tx.insert(ga4ChannelDaily).values(
        chunk.map(([key, total]) => {
          const [date, channel] = key.split(SEP) as [string, Ga4Channel];
          return { orgWebsiteId: site.id, date, channel, activeUsers: total.users, sessions: total.sessions };
        }),
      ),
    );
  });

  // Totals, channels and pages for every period the pages offer (unique users can't be summed from days).
  const snapshots: (typeof ga4RangeMetrics.$inferInsert)[] = [];
  let lastWeek = 0;
  for (const range of TRAFFIC_RANGES) {
    const period = { startDate: rangeStart(runDate, range, earliest), endDate: runDate };
    const [totals, channels, pages, pageSources] = await runGa4Reports(row, propertyId, [
      { ...period, dimensions: [], metrics: ["activeUsers", "sessions"] },
      { ...period, dimensions: ["sessionDefaultChannelGroup", "sessionSource"], metrics: ["activeUsers", "sessions"] },
      { ...period, dimensions: ["pagePath"], metrics: ["activeUsers", "sessions"], limit: 1000 },
      { ...period, dimensions: ["pagePath", "sessionDefaultChannelGroup", "sessionSource"], metrics: ["activeUsers"], limit: 20_000 },
    ] satisfies Ga4ReportRequest[]);
    const total = totals?.[0]?.metrics ?? [0, 0];
    if (range === "7d") lastWeek = total[0] ?? 0;
    snapshots.push({ orgWebsiteId: site.id, range, kind: "total", activeUsers: total[0] ?? 0, sessions: total[1] ?? 0 });
    for (const [channel, value] of sumBy(channels ?? [], (r) => channelOf(r.dimensions[0]!, r.dimensions[1]!))) {
      snapshots.push({ orgWebsiteId: site.id, range, kind: "channel", key: channel, activeUsers: value.users, sessions: value.sessions });
    }
    const topSource = new Map<string, { channel: string; users: number }>();
    for (const [key, value] of sumBy(pageSources ?? [], (r) => `${r.dimensions[0]}${SEP}${channelOf(r.dimensions[1]!, r.dimensions[2]!)}`)) {
      const [page, channel] = key.split(SEP) as [string, string];
      if ((topSource.get(page)?.users ?? -1) < value.users) topSource.set(page, { channel, users: value.users });
    }
    for (const page of pages ?? []) {
      const path = page.dimensions[0]!;
      snapshots.push({ orgWebsiteId: site.id, range, kind: "page", key: path, activeUsers: page.metrics[0] ?? 0, sessions: page.metrics[1] ?? 0, topSource: topSource.get(path)?.channel ?? null });
    }
  }
  await replaceSnapshots(site.id, ["total", "channel", "page"], snapshots);

  await markSynced(row.id);
  await logActivity(site.id, "analyticsSync", { day: runDate, count: lastWeek });
  return { days: perDay.size, lastWeek };
}

// ------------------------------------------------------------------ aiTrafficReport

const aiFilter = { fieldName: "sessionSource", regex: AI_SOURCE_PATTERN };

export const aiTrafficReport = (context: JobContext) => recordSyncError(context.site.id, "ga4", () => syncAiTraffic(context));

async function syncAiTraffic({ site, runDate }: JobContext) {
  const { row, propertyId } = await connectedIntegration(site.id, "ga4");
  const earliest = ga4Earliest(row.config);

  // AI visitors per day, assistant and landing page (charts, milestones, page lists).
  const start = await syncStart(ga4AiSourceDaily, site.id, dailyBackfillFrom(runDate, earliest));
  const daily = await runGa4Report(row, propertyId, { dimensions: ["date", "sessionSource", "landingPage"], metrics: ["activeUsers"], startDate: start, endDate: runDate, filter: aiFilter });
  const perDay = sumBy(daily, (r) => {
    const model = aiModelOf(r.dimensions[1]!);
    return model ? [ga4Day(r.dimensions[0]!), model, r.dimensions[2]].join(SEP) : null;
  });
  await db.transaction(async (tx) => {
    await tx.delete(ga4AiSourceDaily).where(and(eq(ga4AiSourceDaily.orgWebsiteId, site.id), gte(ga4AiSourceDaily.date, start)));
    await insertChunks([...perDay], (chunk) =>
      tx.insert(ga4AiSourceDaily).values(
        chunk.map(([key, total]) => {
          const [date, source, landingPage] = key.split(SEP) as [string, string, string];
          return { orgWebsiteId: site.id, date, source, landingPage, activeUsers: total.users };
        }),
      ),
    );
  });

  const snapshots: (typeof ga4RangeMetrics.$inferInsert)[] = [];
  let lastWeek = 0;
  for (const range of TRAFFIC_RANGES) {
    const period = { startDate: rangeStart(runDate, range, earliest), endDate: runDate, filter: aiFilter };
    const [totals, sources, pages] = await runGa4Reports(row, propertyId, [
      { ...period, dimensions: [], metrics: ["activeUsers", "sessions"] },
      { ...period, dimensions: ["sessionSource"], metrics: ["activeUsers", "sessions"] },
      { ...period, dimensions: ["landingPage", "sessionSource"], metrics: ["activeUsers", "sessions"], limit: 5000 },
    ] satisfies Ga4ReportRequest[]);
    const total = totals?.[0]?.metrics ?? [0, 0];
    if (range === "7d") lastWeek = total[0] ?? 0;
    snapshots.push({ orgWebsiteId: site.id, range, kind: "aiTotal", activeUsers: total[0] ?? 0, sessions: total[1] ?? 0 });
    for (const [model, value] of sumBy(sources ?? [], (r) => aiModelOf(r.dimensions[0]!))) {
      snapshots.push({ orgWebsiteId: site.id, range, kind: "aiSource", key: model, activeUsers: value.users, sessions: value.sessions });
    }
    for (const [key, value] of sumBy(pages ?? [], (r) => {
      const model = aiModelOf(r.dimensions[1]!);
      return model ? `${model}${SEP}${r.dimensions[0]}` : null;
    })) {
      const [model, page] = key.split(SEP) as [string, string];
      snapshots.push({ orgWebsiteId: site.id, range, kind: "aiPage", key: model, subKey: page, activeUsers: value.users, sessions: value.sessions });
    }
  }
  await replaceSnapshots(site.id, ["aiTotal", "aiSource", "aiPage"], snapshots);

  await markSynced(row.id);
  await logActivity(site.id, "aiTrafficReport", { day: runDate, count: lastWeek });
  return { rows: perDay.size, lastWeek };
}

// ------------------------------------------------------------------ rankingsCheck

const GSC_DIMENSIONS = ["page", "query", "country"] as const;

export const rankingsCheck = (context: JobContext) => recordSyncError(context.site.id, "gsc", () => syncSearchConsole(context));

async function syncSearchConsole({ site, runDate }: JobContext) {
  const { row, propertyId: siteUrl } = await connectedIntegration(site.id, "gsc");
  const start = await syncStart(gscDailyMetrics, site.id, shiftDay(runDate, -GSC_HISTORY_DAYS));
  const period = { startDate: start, endDate: runDate };

  const totals = await queryGsc(row, siteUrl, { ...period, dimensions: ["date"] });
  const byDimension = await Promise.all(GSC_DIMENSIONS.map((dimension) => queryGsc(row, siteUrl, { ...period, dimensions: ["date", dimension] })));

  await db.transaction(async (tx) => {
    await tx.delete(gscDailyMetrics).where(and(eq(gscDailyMetrics.orgWebsiteId, site.id), gte(gscDailyMetrics.date, start)));
    await tx.delete(gscDimensionMetrics).where(and(eq(gscDimensionMetrics.orgWebsiteId, site.id), gte(gscDimensionMetrics.periodStart, start)));
    await insertChunks(totals, (chunk) =>
      tx.insert(gscDailyMetrics).values(chunk.map((r) => ({ orgWebsiteId: site.id, date: r.keys[0]!, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))),
    );
    for (const [index, dimension] of GSC_DIMENSIONS.entries()) {
      await insertChunks(byDimension[index]!, (chunk) =>
        tx.insert(gscDimensionMetrics).values(
          chunk.map((r) => ({ orgWebsiteId: site.id, dimension, key: r.keys[1]!, periodStart: r.keys[0]!, periodEnd: r.keys[0]!, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
        ),
      );
    }
  });

  // Clicks in the last 7 days of stored data (Search Console runs 2–3 days behind).
  const [latest] = await db.select({ day: max(gscDailyMetrics.date) }).from(gscDailyMetrics).where(eq(gscDailyMetrics.orgWebsiteId, site.id));
  const [week] = latest?.day
    ? await db
        .select({ clicks: sum(gscDailyMetrics.clicks) })
        .from(gscDailyMetrics)
        .where(and(eq(gscDailyMetrics.orgWebsiteId, site.id), gt(gscDailyMetrics.date, shiftDay(latest.day, -7))))
    : [];
  const lastWeek = Number(week?.clicks ?? 0);
  await markSynced(row.id);
  await logActivity(site.id, "rankingsCheck", { day: runDate, count: lastWeek });
  return { days: totals.length, rows: byDimension.reduce((sum, rows) => sum + rows.length, 0), lastWeek };
}
