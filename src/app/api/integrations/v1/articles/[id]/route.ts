import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, keywordClusters, seedKeywords } from "@/db/schema";
import { corsHeaders, full, preflight, siteFromApiKey, unauthorized } from "@/server/publishing/content-api";

/** GET /api/integrations/v1/articles/:id — one article with full HTML and Markdown. */
export async function GET(request: Request, { params }: RouteContext<"/api/integrations/v1/articles/[id]">) {
  const site = await siteFromApiKey(request);
  if (!site) return unauthorized(request);
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return NextResponse.json({ error: "Article not found" }, { status: 404, headers: corsHeaders(request) });
  const [row] = await db
    .select({ article: articles, keyword: seedKeywords.value, cluster: keywordClusters.keywords })
    .from(articles)
    .leftJoin(keywordClusters, eq(keywordClusters.id, articles.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(articles.id, Number(id)), eq(articles.orgWebsiteId, site.id)));
  if (!row) return NextResponse.json({ error: "Article not found" }, { status: 404, headers: corsHeaders(request) });
  return NextResponse.json(full(site, { article: row.article, keyword: row.keyword, keywords: (row.cluster ?? []).map((k) => k.keyword) }), { headers: corsHeaders(request) });
}

export const OPTIONS = preflight;
