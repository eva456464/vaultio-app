/** Delivers finished articles to the client's site through its publishing integrations. */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, articles, contentPlanItems, integrations, orgWebsites } from "@/db/schema";
import { logActivity } from "../agents/activity";
import { decryptJson } from "../crypto";

type Article = typeof articles.$inferSelect;
type Site = typeof orgWebsites.$inferSelect;

export const PUBLISHING_TYPES = ["webhook", "wordpress"] as const;
export type PublishingType = (typeof PUBLISHING_TYPES)[number];

export type WebhookCredentials = { token: string };
export type WordpressCredentials = { username: string; appPassword: string };

export type DeliveryResult = { ok: true; url: string | null } | { ok: false; error: string };

export function articleUrl(site: Site, slug: string) {
  return `${new URL(site.url).origin}${site.blogPath.replace(/\/$/, "")}/${slug}`;
}

/** Same payload shape as the reference platform's webhook, so existing receivers keep working. */
export function webhookPayload(article: Article, site: Site) {
  return {
    id: article.id,
    keywords: article.generationSettings && typeof article.generationSettings === "object" && "semanticKeywords" in article.generationSettings
      ? (article.generationSettings as { semanticKeywords: string[] }).semanticKeywords.join(", ")
      : "",
    title: article.title,
    metaDescription: article.metaDescription,
    slug: article.slug,
    languageCode: article.languageCode,
    content_html: article.htmlContent,
    content_markdown: article.content,
    jsonLd: article.jsonLd,
    faqJsonLd: article.faqJsonLd,
    heroImageUrl: article.heroImageUrl,
    heroImageAlt: null,
    featureImageEnabled: Boolean(article.heroImageUrl),
    createdAt: article.createdAt.toISOString(),
    lang: site.selectedLanguage,
  };
}

export async function deliverWebhook(url: string, credentials: WebhookCredentials, payload: unknown): Promise<DeliveryResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${credentials.token}`, "x-api-key": credentials.token, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await response.text();
    let body: { success?: boolean; link?: string; error?: string } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, error: `Non-JSON response from webhook (HTTP ${response.status})` };
    }
    if (!response.ok) return { ok: false, error: body?.error ?? `Webhook returned HTTP ${response.status}` };
    if (body?.success === false) return { ok: false, error: body.error ?? "Webhook reported a failure" };
    return { ok: true, url: typeof body?.link === "string" ? body.link : null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function deliverWordpress(siteUrl: string, credentials: WordpressCredentials, article: Article, categoryId?: number): Promise<DeliveryResult> {
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.appPassword.replace(/\s+/g, "")}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: article.title,
        slug: article.slug,
        content: article.htmlContent ?? "",
        excerpt: article.metaDescription ?? "",
        status: "publish",
        ...(categoryId ? { categories: [categoryId] } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await response.json().catch(() => null)) as { link?: string; message?: string } | null;
    if (!response.ok) return { ok: false, error: body?.message ?? `WordPress returned HTTP ${response.status}` };
    return { ok: true, url: body?.link ?? null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Publishes one article through every connected integration. Sites that pull
 * articles through the content API count as published as soon as the article exists.
 */
export async function publishArticle(siteId: number, articleId: number) {
  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  const [article] = await db.select().from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, siteId)));
  if (!site || !article) throw new Error("Article not found");
  if (article.publishedUrl) return { published: true, url: article.publishedUrl, errors: [] as string[] };

  const connections = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), inArray(integrations.type, [...PUBLISHING_TYPES]), inArray(integrations.status, ["connected", "pending", "error"])));
  const [apiKey] = await db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.orgWebsiteId, siteId), isNull(apiKeys.revokedAt))).limit(1);

  let url: string | null = null;
  let delivered = false;
  const errors: string[] = [];
  for (const connection of connections) {
    if (!connection.credentialsEncrypted) continue;
    const config = connection.config as { url?: string; siteUrl?: string; categoryId?: number };
    const result =
      connection.type === "webhook"
        ? await deliverWebhook(config.url!, decryptJson<WebhookCredentials>(connection.credentialsEncrypted), webhookPayload(article, site))
        : await deliverWordpress(config.siteUrl!, decryptJson<WordpressCredentials>(connection.credentialsEncrypted), article, config.categoryId);
    await db
      .update(integrations)
      .set(result.ok ? { status: "connected", lastError: null, connectedAt: connection.connectedAt ?? new Date(), updatedAt: new Date() } : { status: "error", lastError: result.error, updatedAt: new Date() })
      .where(eq(integrations.id, connection.id));
    if (result.ok) {
      delivered = true;
      url ??= result.url;
    } else errors.push(`${connection.type}: ${result.error}`);
  }

  if (!delivered && !apiKey) return { published: false, url: null, errors };

  const publishedUrl = url ?? articleUrl(site, article.slug);
  await db.update(articles).set({ publishedUrl, publishedAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, article.id));
  await db.update(contentPlanItems).set({ generationStatus: "published", updatedAt: new Date() }).where(eq(contentPlanItems.articleId, article.id));
  await logActivity(siteId, "articlePublished", { title: article.title, articleId: article.id, publishedUrl });
  return { published: true, url: publishedUrl, errors };
}
