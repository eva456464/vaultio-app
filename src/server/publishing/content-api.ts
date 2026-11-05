import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
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

export const unauthorized = (request: Request) => NextResponse.json({ error: "Invalid or missing API key" }, { status: 401, headers: corsHeaders(request) });

/**
 * Browsers may only call the content API from the platforms that need it (the Framer plugin runs
 * in Framer's editor). CONTENT_API_CORS_ORIGINS replaces the list; "*." matches any subdomain.
 */
// Framer serves plugins from <pluginId>(-<version>).plugins.framercdn.com, and https://localhost:5173 in development.
const DEFAULT_CORS_ORIGINS = ["https://*.plugins.framercdn.com", "https://localhost:5173"];

function allowedOrigin(origin: string) {
  const patterns = process.env.CONTENT_API_CORS_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) ?? DEFAULT_CORS_ORIGINS;
  return patterns.some((pattern) => {
    if (pattern === origin) return true;
    const wildcard = pattern.match(/^(https?:\/\/)\*\.(.+)$/);
    return Boolean(wildcard && origin.startsWith(wildcard[1]!) && origin.endsWith(`.${wildcard[2]}`));
  });
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigin(origin)) return { vary: "Origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "X-API-Key, Authorization, Content-Type",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

/** The preflight answer for both content API routes. */
export const preflight = (request: Request) => new Response(null, { status: 204, headers: corsHeaders(request) });

/** `publishedOnly`: just the articles that went live (auto-publish or "Publish now"), for platforms that pull. */
export async function listArticles(site: typeof orgWebsites.$inferSelect, limit: number, offset: number, publishedOnly = false) {
  const rows = await db
    .select({ article: articles, keyword: seedKeywords.value, cluster: keywordClusters.keywords })
    .from(articles)
    .leftJoin(keywordClusters, eq(keywordClusters.id, articles.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(articles.orgWebsiteId, site.id), publishedOnly ? isNotNull(articles.publishedAt) : undefined))
    .orderBy(desc(articles.createdAt), desc(articles.id))
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
    updated_at: article.updatedAt.toISOString(),
    published: Boolean(article.publishedAt),
    published_at: article.publishedAt?.toISOString() ?? null,
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
