/**
 * WordPress.com (sites hosted on WordPress.com): connected with OAuth2, no plugin or password, and
 * posted through the WordPress.com REST API v1.1. The app is registered at
 * developer.wordpress.com/apps (WPCOM_CLIENT_ID, WPCOM_CLIENT_SECRET) with the redirect URL
 * <app address>/api/integrations/wordpress-com/callback. Self-hosted WordPress uses the plugin instead.
 */
import { loadMedia, mediaIdFromUrl } from "../../media";
import { call, describeError, type Article, type Delivered, type PublishMode } from "./common";

/** Development only: point at a local stand-in. */
const OAUTH = () => process.env.WPCOM_OAUTH_BASE?.replace(/\/$/, "") ?? "https://public-api.wordpress.com/oauth2";
const API = () => process.env.WPCOM_API_BASE?.replace(/\/$/, "") ?? "https://public-api.wordpress.com/rest/v1.1";

export const wpcomConfigured = () => Boolean(process.env.WPCOM_CLIENT_ID && process.env.WPCOM_CLIENT_SECRET);

export type WpcomConfig = { blogId: string; blogUrl: string; blogName: string; mode: PublishMode };
export type WpcomCredentials = { token: string };
export type WpcomDelivery = { postId: number; featuredId?: number; uploads: Record<string, { id: number; url: string }> };

/** The consent screen, where the owner picks the site to connect. */
export function wpcomAuthorizeUrl(redirectUri: string, state: string) {
  return `${OAUTH()}/authorize?${new URLSearchParams({ client_id: process.env.WPCOM_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", state })}`;
}

type TokenResponse = { access_token?: string; blog_id?: string | number; blog_url?: string; error?: string; error_description?: string };

export async function wpcomExchangeCode(code: string, redirectUri: string): Promise<{ ok: true; token: string; blogId: string; blogUrl: string } | { ok: false; error: string }> {
  try {
    const result = await call<TokenResponse>(`${OAUTH()}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.WPCOM_CLIENT_ID!, client_secret: process.env.WPCOM_CLIENT_SECRET!, redirect_uri: redirectUri, code, grant_type: "authorization_code" }),
    });
    const body = result.body;
    if (result.status >= 400 || !body?.access_token || !body.blog_id) return { ok: false, error: body?.error_description ?? body?.error ?? `WordPress.com returned HTTP ${result.status}` };
    return { ok: true, token: body.access_token, blogId: String(body.blog_id), blogUrl: body.blog_url ?? "" };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

export async function wpcomSite(token: string, blogId: string): Promise<{ name: string; url: string; lang: string | null } | null> {
  const result = await call<{ name?: string; URL?: string; lang?: string }>(`${API()}/sites/${encodeURIComponent(blogId)}`, { headers: auth(token) });
  if (result.status >= 400 || !result.body) return null;
  return { name: result.body.name ?? "", url: result.body.URL ?? "", lang: result.body.lang ?? null };
}

type ApiError = { error?: string; message?: string };
const errorOf = (body: ApiError | null, status: number) => {
  if (status === 401 || status === 403 || body?.error === "unauthorized" || body?.error === "authorization_required")
    return "WordPress.com no longer accepts the connection. Reconnect WordPress.com in Settings → Publishing.";
  return body?.message ?? body?.error ?? `WordPress.com returned HTTP ${status}`;
};

/** Copies one of our images into the site's media library (once per article). */
async function upload(config: WpcomConfig, token: string, mediaId: string, name: string, alt: string, uploads: WpcomDelivery["uploads"]) {
  if (uploads[mediaId]) return uploads[mediaId];
  const media = await loadMedia(mediaId);
  if (!media) return null;
  const form = new FormData();
  form.append("media[]", new Blob([new Uint8Array(media.data)], { type: media.mimeType }), `${name}.webp`);
  form.append("attrs[0][alt]", alt);
  form.append("attrs[0][title]", name);
  const result = await call<{ media?: { ID?: number; URL?: string }[] }>(`${API()}/sites/${encodeURIComponent(config.blogId)}/media/new`, { method: "POST", headers: auth(token), body: form }, 120_000);
  const item = result.body?.media?.[0];
  if (result.status >= 400 || !item?.ID || !item.URL) return null;
  uploads[mediaId] = { id: item.ID, url: item.URL };
  return uploads[mediaId];
}

type WpcomPost = { ID?: number; URL?: string; slug?: string } & ApiError;

/**
 * Creates the post, or updates it: the one sent before, or an existing post with the same slug
 * (never a duplicate). Images are uploaded to the site's media library first.
 */
export async function deliverWpcom(config: WpcomConfig, credentials: WpcomCredentials, article: Article, previous?: WpcomDelivery): Promise<Delivered<WpcomDelivery>> {
  const site = `${API()}/sites/${encodeURIComponent(config.blogId)}`;
  const uploads: WpcomDelivery["uploads"] = { ...(previous?.uploads ?? {}) };
  try {
    let content = article.htmlContent ?? "";
    let featuredId: number | undefined;
    const heroId = article.heroImageUrl ? mediaIdFromUrl(article.heroImageUrl) : null;
    if (heroId) {
      const hero = article.media.find((item) => item.identifier === "hero_image");
      featuredId = (await upload(config, credentials.token, heroId, article.slug, hero?.altText ?? article.title, uploads))?.id;
    }
    for (const item of article.media.filter((entry) => entry.identifier !== "hero_image")) {
      const id = mediaIdFromUrl(item.url);
      const copy = id ? await upload(config, credentials.token, id, `${article.slug}-${item.identifier ?? id}`, item.altText ?? "", uploads) : null;
      if (copy) content = content.split(item.url).join(copy.url);
    }

    let postId = previous?.postId;
    if (!postId) {
      const existing = await call<WpcomPost>(`${site}/posts/slug:${encodeURIComponent(article.slug)}?fields=ID`, { headers: auth(credentials.token) });
      if (existing.status < 400 && existing.body?.ID) postId = existing.body.ID;
    }
    const fields = new URLSearchParams({
      title: article.title,
      content,
      excerpt: article.metaDescription ?? "",
      slug: article.slug,
      status: config.mode === "draft" ? "draft" : "publish",
      ...(featuredId ? { featured_image: String(featuredId) } : {}),
    });
    const result = await call<WpcomPost>(postId ? `${site}/posts/${postId}` : `${site}/posts/new`, {
      method: "POST",
      headers: { ...auth(credentials.token), "content-type": "application/x-www-form-urlencoded" },
      body: fields,
    }, 120_000);
    if (result.status >= 400 || !result.body?.ID) return { ok: false, error: errorOf(result.body, result.status) };
    return { ok: true, url: result.body.URL ?? null, delivery: { postId: result.body.ID, featuredId, uploads } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
