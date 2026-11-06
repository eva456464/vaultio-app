/** Delivers finished articles to the client's site through its publishing integrations. */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, articles, contentPlanItems, integrations, orgWebsites, type ArticleDeliveries } from "@/db/schema";
import { logActivity } from "../agents/activity";
import { decryptJson } from "../crypto";
import { loadMedia, mediaIdFromUrl } from "../media";
import { postInput } from "./platforms/common";
import { deliverBigCommerce, type BigCommerceConfig, type BigCommerceCredentials } from "./platforms/bigcommerce";
import { deliverGhl, type GhlConfig, type GhlCredentials } from "./platforms/gohighlevel";
import { deliverGhost, type GhostConfig, type GhostCredentials } from "./platforms/ghost";
import { deliverWpcom, type WpcomConfig, type WpcomCredentials } from "./platforms/wordpress-com";
import { deliverShopify, type ShopifyConfig, type ShopifyCredentials } from "./platforms/shopify";
import { deliverWebflow, type WebflowConfig, type WebflowCredentials } from "./platforms/webflow";
import { deliverWix, type WixConfig, type WixCredentials } from "./platforms/wix";

export type HostedBlogConfig = { domain: string; displayName: string; verified?: boolean; logoUrl?: string | null; createdAt?: string };
export const hostedBlogUrl = (config: HostedBlogConfig, slug: string) => `https://${config.domain}/${slug}`;

type Article = typeof articles.$inferSelect;
type Site = typeof orgWebsites.$inferSelect;

export const PUBLISHING_TYPES = ["webhook", "wordpress", "wordpress_com", "ghost", "webflow", "shopify", "wix", "bigcommerce", "gohighlevel", "duda", "hosted_blog"] as const;
/** Platforms that fetch articles themselves (RSS feed, the content API): an article counts as published once it exists. */
export const PULL_TYPES = ["duda"] as const;
export type PublishingType = (typeof PUBLISHING_TYPES)[number];

export type WebhookCredentials = { token: string };
export type WordpressCredentials = { username: string; appPassword: string };

export type DeliveryResult = { ok: true; url: string | null } | { ok: false; error: string };
type WordpressDelivery = NonNullable<ArticleDeliveries["wordpress"]>;

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
    heroImageAlt: article.media.find((item) => item.identifier === "hero_image")?.altText ?? null,
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

export const wordpressAuth = (credentials: WordpressCredentials) => `Basic ${Buffer.from(`${credentials.username}:${credentials.appPassword.replace(/\s+/g, "")}`).toString("base64")}`;

/** Uploads one of our images to the WordPress media library (once per image). */
async function uploadToWordpress(api: string, credentials: WordpressCredentials, mediaId: string, name: string, altText: string, uploads: WordpressDelivery["uploads"]) {
  if (uploads[mediaId]) return uploads[mediaId];
  const media = await loadMedia(mediaId);
  if (!media) return null;
  const response = await fetch(`${api}/media?${new URLSearchParams({ alt_text: altText, title: name })}`, {
    method: "POST",
    headers: { authorization: wordpressAuth(credentials), "content-type": media.mimeType, "content-disposition": `attachment; filename="${name}.webp"` },
    body: new Uint8Array(media.data),
    signal: AbortSignal.timeout(120_000),
  });
  const body = (await response.json().catch(() => null)) as { id?: number; source_url?: string } | null;
  if (!response.ok || !body?.id || !body.source_url) return null;
  uploads[mediaId] = { id: body.id, url: body.source_url };
  return uploads[mediaId];
}

/**
 * Creates the post (or updates the one created before). Images are copied into the site's media
 * library first: the cover becomes the featured image and body images point at the copies.
 */
export async function deliverWordpress(
  siteUrl: string,
  credentials: WordpressCredentials,
  article: Article,
  categoryId?: number,
  status: "publish" | "draft" = "publish",
): Promise<DeliveryResult & { delivery?: WordpressDelivery }> {
  const api = `${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
  const previous = article.deliveries.wordpress;
  const uploads: WordpressDelivery["uploads"] = { ...(previous?.uploads ?? {}) };
  try {
    let content = article.htmlContent ?? "";
    let featuredMediaId: number | undefined;
    const heroId = article.heroImageUrl ? mediaIdFromUrl(article.heroImageUrl) : null;
    if (heroId) {
      const hero = article.media.find((item) => item.identifier === "hero_image");
      featuredMediaId = (await uploadToWordpress(api, credentials, heroId, article.slug, hero?.altText ?? article.title, uploads))?.id;
    }
    for (const item of article.media.filter((entry) => entry.identifier !== "hero_image")) {
      const id = mediaIdFromUrl(item.url);
      const copy = id ? await uploadToWordpress(api, credentials, id, `${article.slug}-${item.identifier ?? id}`, item.altText ?? "", uploads) : null;
      if (copy) content = content.split(item.url).join(copy.url);
    }

    const response = await fetch(previous?.postId ? `${api}/posts/${previous.postId}` : `${api}/posts`, {
      method: "POST",
      headers: { authorization: wordpressAuth(credentials), "content-type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        slug: article.slug,
        content,
        excerpt: article.metaDescription ?? "",
        status,
        ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
        ...(categoryId ? { categories: [categoryId] } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await response.json().catch(() => null)) as { id?: number; link?: string; message?: string } | null;
    if (!response.ok) return { ok: false, error: body?.message ?? `WordPress returned HTTP ${response.status}` };
    return { ok: true, url: body?.link ?? null, delivery: { postId: body?.id ?? previous?.postId ?? 0, featuredMediaId, uploads } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Publishes one article through every connected integration. Sites that pull
 * articles through the content API count as published as soon as the article exists.
 * With `update`, an already published article is sent again (same WordPress post, same webhook id).
 */
export async function publishArticle(siteId: number, articleId: number, options: { update?: boolean } = {}) {
  return sendArticle(siteId, articleId, options);
}

/**
 * Takes a published article down: posts it was sent to become drafts on their platforms, and the
 * hosted blog, API, Framer, Lovable and Duda stop showing it. It can be published again later.
 */
export async function unpublishArticle(siteId: number, articleId: number) {
  return sendArticle(siteId, articleId, { update: true, asDraft: true });
}

async function sendArticle(siteId: number, articleId: number, options: { update?: boolean; asDraft?: boolean }) {
  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  const [article] = await db.select().from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, siteId)));
  if (!site || !article) throw new Error("Article not found");
  const updating = Boolean(article.publishedUrl && options.update);
  if (article.publishedUrl && !updating) return { published: true, url: article.publishedUrl, errors: [] as string[] };

  const connections = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), inArray(integrations.type, [...PUBLISHING_TYPES]), inArray(integrations.status, ["connected", "pending", "error"])));
  const [apiKey] = await db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.orgWebsiteId, siteId), isNull(apiKeys.revokedAt))).limit(1);

  let url: string | null = null;
  let delivered = false;
  let live = false;
  const errors: string[] = [];
  const remember = async (deliveries: Partial<ArticleDeliveries>) => {
    article.deliveries = { ...article.deliveries, ...deliveries };
    await db.update(articles).set({ deliveries: article.deliveries }).where(eq(articles.id, article.id));
  };
  for (const connection of connections) {
    if (!connection.credentialsEncrypted && connection.type !== "hosted_blog") continue;
    // Unpublishing turns earlier posts into drafts; platforms it never reached are left alone.
    if (options.asDraft && !article.deliveries[connection.type as keyof ArticleDeliveries]) continue;
    const config: Record<string, unknown> = { ...(connection.config as Record<string, unknown>), ...(options.asDraft ? { mode: "draft" } : {}) };
    const secret = <T,>() => decryptJson<T>(connection.credentialsEncrypted!);
    const post = postInput(article);
    let result: DeliveryResult;
    // Platforms set to "save as draft" don't make the article live.
    let draft = false;
    switch (connection.type) {
      case "webhook":
        result = await deliverWebhook(config.url as string, secret<WebhookCredentials>(), webhookPayload(article, site));
        break;
      case "wordpress": {
        const wordpress = await deliverWordpress(config.siteUrl as string, secret<WordpressCredentials>(), article, config.categoryId as number | undefined, options.asDraft ? "draft" : "publish");
        if (wordpress.ok && wordpress.delivery) await remember({ wordpress: wordpress.delivery });
        result = wordpress;
        break;
      }
      case "wordpress_com": {
        const wpcom = await deliverWpcom(config as WpcomConfig, secret<WpcomCredentials>(), article, article.deliveries.wordpress_com);
        if (wpcom.ok) await remember({ wordpress_com: wpcom.delivery });
        draft = (config as WpcomConfig).mode === "draft";
        result = wpcom;
        break;
      }
      case "ghost": {
        const ghost = await deliverGhost(config as GhostConfig, secret<GhostCredentials>(), post, article.deliveries.ghost);
        if (ghost.ok) await remember({ ghost: ghost.delivery });
        draft = (config as GhostConfig).mode === "draft";
        result = ghost;
        break;
      }
      case "webflow": {
        const webflow = await deliverWebflow(config as WebflowConfig, secret<WebflowCredentials>(), post, article.deliveries.webflow);
        if (webflow.ok) await remember({ webflow: webflow.delivery });
        draft = (config as WebflowConfig).mode === "draft";
        result = webflow;
        break;
      }
      case "shopify": {
        const shopify = await deliverShopify(config as ShopifyConfig, secret<ShopifyCredentials>(), post, article.deliveries.shopify);
        if (shopify.ok) await remember({ shopify: shopify.delivery });
        draft = (config as ShopifyConfig).mode === "draft";
        result = shopify;
        break;
      }
      case "wix": {
        const wix = await deliverWix(config as WixConfig, secret<WixCredentials>(), post, article.deliveries.wix);
        if (wix.ok) await remember({ wix: wix.delivery });
        draft = (config as WixConfig).mode === "draft";
        result = wix;
        break;
      }
      case "bigcommerce": {
        const bigcommerce = await deliverBigCommerce(config as BigCommerceConfig, secret<BigCommerceCredentials>(), post, article.deliveries.bigcommerce);
        if (bigcommerce.ok) await remember({ bigcommerce: bigcommerce.delivery });
        draft = (config as BigCommerceConfig).mode === "draft";
        result = bigcommerce;
        break;
      }
      case "gohighlevel": {
        const ghl = await deliverGhl(config as GhlConfig, secret<GhlCredentials>(), post, article.deliveries.gohighlevel);
        if (ghl.ok) await remember({ gohighlevel: ghl.delivery });
        draft = (config as GhlConfig).mode === "draft";
        result = ghl;
        break;
      }
      case "duda":
        // Duda reads the RSS feed on its own schedule.
        continue;
      case "hosted_blog":
        // Vaultio serves the blog itself: the article is live there as soon as it exists.
        result = { ok: true, url: hostedBlogUrl(config as HostedBlogConfig, article.slug) };
        break;
      default:
        continue;
    }
    await db
      .update(integrations)
      .set(result.ok ? { status: "connected", lastError: null, connectedAt: connection.connectedAt ?? new Date(), updatedAt: new Date() } : { status: "error", lastError: result.error, updatedAt: new Date() })
      .where(eq(integrations.id, connection.id));
    if (result.ok) {
      delivered = true;
      if (!draft) live = true;
      url ??= result.url;
    } else errors.push(`${connection.type}: ${result.error}`);
  }

  if (options.asDraft) {
    await db.update(articles).set({ publishedUrl: null, publishedAt: null, publishedAsDraft: false, updatedAt: new Date() }).where(eq(articles.id, article.id));
    await db.update(contentPlanItems).set({ generationStatus: "generated", updatedAt: new Date() }).where(eq(contentPlanItems.articleId, article.id));
    await logActivity(siteId, "articleUnpublished", { title: article.title, articleId: article.id });
    return { published: false, url: null, errors };
  }

  const pulled = Boolean(apiKey) || connections.some((connection) => (PULL_TYPES as readonly string[]).includes(connection.type) && connection.status === "connected");
  if (!delivered && !pulled) return { published: false, url: null, errors };
  if (updating) return { published: true, url: article.publishedUrl, errors };

  const publishedUrl = url ?? articleUrl(site, article.slug);
  const draftOnly = !live && !pulled;
  await db.update(articles).set({ publishedUrl, publishedAt: new Date(), publishedAsDraft: draftOnly, updatedAt: new Date() }).where(eq(articles.id, article.id));
  await db.update(contentPlanItems).set({ generationStatus: "published", updatedAt: new Date() }).where(eq(contentPlanItems.articleId, article.id));
  // Only drafts were saved (and nothing pulls articles through the API): say so instead of "published".
  await logActivity(siteId, draftOnly ? "articleSentAsDraft" : "articlePublished", { title: article.title, articleId: article.id, publishedUrl });
  return { published: true, draft: draftOnly, url: publishedUrl, errors };
}
