import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, articles, keywordClusters, orgWebsites, seedKeywords } from "@/db/schema";
import { sha256 } from "../crypto";
import { articleUrl } from "./publish";

/** Resolves the site for a request's X-API-Key header. */
export async function siteFromApiKey(request: Request) {
  const raw = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) return null;
  const [row] = await db
    .select({ keyId: apiKeys.id, site: orgWebsites })
    .from(apiKeys)
    .innerJoin(orgWebsites, eq(orgWebsites.id, apiKeys.orgWebsiteId))
    .where(and(eq(apiKeys.keyHash, sha256(raw)), isNull(apiKeys.revokedAt)));
  if (!row) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.keyId));
  return row.site;
}

export const unauthorized = () => NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

export async function listArticles(site: typeof orgWebsites.$inferSelect, limit: number, offset: number) {
  const rows = await db
    .select({ article: articles, keyword: seedKeywords.value, cluster: keywordClusters.keywords })
    .from(articles)
    .leftJoin(keywordClusters, eq(keywordClusters.id, articles.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(eq(articles.orgWebsiteId, site.id))
    .orderBy(articles.createdAt)
    .limit(limit)
    .offset(offset);
  return rows.map(({ article, keyword, cluster }) => ({ article, keyword, keywords: (cluster ?? []).map((k) => k.keyword) }));
}

type Row = Awaited<ReturnType<typeof listArticles>>[number];

export function summary(site: typeof orgWebsites.$inferSelect, { article, keyword, keywords }: Row) {
  const text = (article.content ?? "").replace(/[#*_>`[\]()|-]/g, " ").replace(/\s+/g, " ").trim();
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    hero_image_url: article.heroImageUrl,
    languageCode: article.languageCode,
    meta_description: article.metaDescription,
    excerpt: text.slice(0, 220),
    orgWebsite: site.url,
    created_at: article.createdAt.toISOString(),
    published_url: article.publishedUrl ?? articleUrl(site, article.slug),
    seedKeyword: keyword,
    keywords,
  };
}

export function full(site: typeof orgWebsites.$inferSelect, row: Row) {
  return {
    ...summary(site, row),
    content_markdown: row.article.content,
    content_html: row.article.htmlContent,
    jsonLd: row.article.jsonLd,
    faqJsonLd: row.article.faqJsonLd,
  };
}
