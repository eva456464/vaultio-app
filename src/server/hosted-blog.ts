/** Blogs Vaultio hosts for clients on their own subdomain (blog.example.com). */
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, integrations, orgWebsites } from "@/db/schema";
import type { HostedBlogConfig } from "./publishing/publish";

export type BlogConfig = HostedBlogConfig & { records?: { type: string; name: string; value: string }[]; error?: string | null; checkedAt?: string | null };

export const BLOG_PAGE_SIZE = 12;

/** The site whose hosted blog answers on this host, if any. */
export async function blogForHost(host: string) {
  const [row] = await db
    .select({ site: orgWebsites, config: integrations.config })
    .from(integrations)
    .innerJoin(orgWebsites, eq(orgWebsites.id, integrations.orgWebsiteId))
    .where(and(eq(integrations.type, "hosted_blog"), sql`${integrations.config}->>'domain' = ${host.toLowerCase()}`))
    .limit(1);
  return row ? { site: row.site, config: row.config as BlogConfig } : null;
}

const published = (siteId: number) => and(eq(articles.orgWebsiteId, siteId), isNotNull(articles.publishedAt));

export async function blogArticles(siteId: number, page: number) {
  const [[total], rows] = await Promise.all([
    db.select({ value: count() }).from(articles).where(published(siteId)),
    db
      .select({ id: articles.id, title: articles.title, slug: articles.slug, metaDescription: articles.metaDescription, heroImageUrl: articles.heroImageUrl, media: articles.media, publishedAt: articles.publishedAt })
      .from(articles)
      .where(published(siteId))
      .orderBy(desc(articles.publishedAt))
      .limit(BLOG_PAGE_SIZE)
      .offset((page - 1) * BLOG_PAGE_SIZE),
  ]);
  return { total: total!.value, pages: Math.max(1, Math.ceil(total!.value / BLOG_PAGE_SIZE)), rows };
}

export async function blogArticle(siteId: number, slug: string) {
  const [article] = await db.select().from(articles).where(and(published(siteId), eq(articles.slug, slug))).limit(1);
  return article ?? null;
}

export async function allBlogArticles(siteId: number) {
  return db
    .select({ title: articles.title, slug: articles.slug, metaDescription: articles.metaDescription, publishedAt: articles.publishedAt, updatedAt: articles.updatedAt })
    .from(articles)
    .where(published(siteId))
    .orderBy(desc(articles.publishedAt));
}
