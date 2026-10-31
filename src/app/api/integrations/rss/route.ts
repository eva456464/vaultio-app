import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, integrations, orgWebsites } from "@/db/schema";
import { sha256 } from "@/server/crypto";
import { rssFeed } from "@/server/publishing/rss";

/**
 * GET /api/integrations/rss?key=…&limit=10 — a website's published articles with their full text,
 * for platforms that import an RSS feed (Duda). The key is the feed's own (Settings → Publishing → Duda).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = params.get("key") ?? "";
  if (!/^[a-f0-9]{40}$/.test(key)) return new Response("Invalid feed key", { status: 401 });
  const [row] = await db
    .select({ site: orgWebsites })
    .from(integrations)
    .innerJoin(orgWebsites, eq(orgWebsites.id, integrations.orgWebsiteId))
    .where(and(eq(integrations.type, "duda"), eq(integrations.status, "connected"), sql`${integrations.config}->>'tokenHash' = ${sha256(key)}`));
  if (!row) return new Response("Invalid feed key", { status: 401 });
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 10));
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.orgWebsiteId, row.site.id), isNotNull(articles.publishedUrl)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  const name = row.site.brandName ?? new URL(row.site.url).hostname;
  const xml = rssFeed(
    { title: name, link: row.site.url, description: row.site.description ?? name, language: row.site.selectedLanguage },
    rows.map((article) => ({
      title: article.title,
      link: article.publishedUrl!,
      publishedAt: article.publishedAt ?? article.createdAt,
      description: article.metaDescription,
      html: article.htmlContent,
      imageUrl: article.heroImageUrl,
      imageAlt: article.media.find((item) => item.identifier === "hero_image")?.altText ?? article.title,
    })),
  );
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "private, max-age=300" } });
}
