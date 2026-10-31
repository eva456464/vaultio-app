import "server-only";
import { addDays, endOfMonth, endOfWeek, formatISO, startOfMonth, startOfWeek } from "date-fns";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, contentPlanItems, keywordClusters, products, seedKeywords } from "@/db/schema";
import type { Site } from "../agents/jobs/types";
import { siteDay } from "../agents/schedule";
import { catalogOwnerId } from "../catalog/catalog";
import { effectiveProductIds } from "../catalog/matching";

const iso = (date: Date) => formatISO(date, { representation: "date" });

export type CalendarStatus = "published" | "ready" | "queued";

export type CalendarItem = {
  id: number;
  day: string;
  status: CalendarStatus;
  title: string;
  keyword: string | null;
  searchVolume: number | null;
  difficulty: number | null;
  articleType: string | null;
  articleId: number | null;
  instruction: string | null;
  supportUrl: string | null;
  isLocal: boolean;
  /** Products the article features: chosen by hand, proposed by the agent, or (once written) linked in it. */
  products: CalendarProduct[];
  productsCustomized: boolean;
  proposedProductIds: number[];
};
export type CalendarProduct = { id: number; name: string; imageUrl: string | null; url: string | null };

/** Calendar grid for a month (full weeks, Monday first) plus plan-wide counts. */
export async function getContentCalendar(site: Site, month: string | undefined) {
  const today = siteDay(new Date(), site.timeZone);
  const anchor = new Date(`${/^\d{4}-\d{2}$/.test(month ?? "") ? month : today.slice(0, 7)}-01T12:00:00Z`);
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });

  const rows = await db
    .select({
      plan: contentPlanItems,
      article: { id: articles.id, title: articles.title, publishedUrl: articles.publishedUrl, type: articles.articleType, featuredProducts: articles.featuredProducts },
      keyword: seedKeywords.value,
      volume: seedKeywords.avgSearchVolume,
      difficulty: seedKeywords.keywordDifficulty,
      keywordType: seedKeywords.articleType,
    })
    .from(contentPlanItems)
    .leftJoin(articles, eq(articles.id, contentPlanItems.articleId))
    .leftJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(
      and(
        eq(contentPlanItems.orgWebsiteId, site.id),
        gte(contentPlanItems.scheduledFor, iso(gridStart)),
        lte(contentPlanItems.scheduledFor, iso(gridEnd)),
      ),
    )
    .orderBy(asc(contentPlanItems.scheduledFor));

  const wanted = [...new Set(rows.flatMap((row) => (row.article?.id ? [] : effectiveProductIds(row.plan))))];
  const catalog = new Map(
    (wanted.length ? await db.select({ id: products.id, name: products.name, imageUrl: products.imageUrl, url: products.url }).from(products).where(and(eq(products.orgWebsiteId, catalogOwnerId(site)), inArray(products.id, wanted))) : []).map((product) => [product.id, product]),
  );
  const items: CalendarItem[] = rows.map((row) => ({
    id: row.plan.id,
    day: row.plan.scheduledFor,
    status: row.article?.publishedUrl ? "published" : row.article?.id ? "ready" : "queued",
    title: row.article?.title ?? row.plan.plannedTitle ?? row.keyword ?? "",
    keyword: row.keyword,
    searchVolume: row.volume,
    difficulty: row.difficulty,
    articleType: row.article?.type ?? row.plan.articleType ?? row.keywordType,
    articleId: row.article?.id ?? null,
    instruction: row.plan.userInstruction,
    supportUrl: row.plan.supportUrl,
    isLocal: row.plan.isLocalKeyword,
    products: row.article?.id
      ? row.article.featuredProducts.map((product) => ({ id: product.id, name: product.name, imageUrl: product.imageUrl, url: product.url }))
      : effectiveProductIds(row.plan).flatMap((id) => (catalog.has(id) ? [catalog.get(id)!] : [])),
    productsCustomized: row.plan.productsCustomized,
    proposedProductIds: row.plan.proposedProductIds,
  }));

  const [counts] = await db
    .select({
      published: sql<number>`count(*) filter (where ${articles.publishedUrl} is not null)::int`,
      ready: sql<number>`count(*) filter (where ${articles.id} is not null and ${articles.publishedUrl} is null)::int`,
      queued: sql<number>`count(*) filter (where ${contentPlanItems.articleId} is null)::int`,
    })
    .from(contentPlanItems)
    .leftJoin(articles, eq(articles.id, contentPlanItems.articleId))
    .where(eq(contentPlanItems.orgWebsiteId, site.id));

  const days: string[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) days.push(iso(cursor));

  return {
    month: iso(anchor).slice(0, 7),
    today,
    days,
    items,
    counts: counts ?? { published: 0, ready: 0, queued: 0 },
  };
}

export type AlternativeTopic = { clusterId: number; keyword: string; searchVolume: number | null; difficulty: number | null; articleType: string | null };

/** Unused keyword clusters offered by "Change topic". */
export async function getAlternativeTopics(siteId: number): Promise<AlternativeTopic[]> {
  return db
    .select({
      clusterId: keywordClusters.id,
      keyword: seedKeywords.value,
      searchVolume: keywordClusters.totalSearchVolume,
      difficulty: seedKeywords.keywordDifficulty,
      articleType: seedKeywords.articleType,
    })
    .from(keywordClusters)
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(keywordClusters.orgWebsiteId, siteId), eq(keywordClusters.isUsed, false)))
    .orderBy(desc(keywordClusters.score))
    .limit(250);
}

export async function getArticle(siteId: number, articleId: number) {
  const [row] = await db
    .select({ article: articles, keyword: seedKeywords.value, volume: seedKeywords.avgSearchVolume, difficulty: seedKeywords.keywordDifficulty })
    .from(articles)
    .leftJoin(keywordClusters, eq(keywordClusters.id, articles.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(articles.orgWebsiteId, siteId), eq(articles.id, articleId)));
  return row ?? null;
}

export async function countPendingArticles(siteId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.orgWebsiteId, siteId), isNull(contentPlanItems.articleId), isNotNull(contentPlanItems.keywordClusterId)));
  return row?.count ?? 0;
}
