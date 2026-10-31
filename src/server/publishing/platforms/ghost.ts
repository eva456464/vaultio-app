/**
 * Ghost (Admin API, https://ghost.org/docs/admin-api/): a staff token signed with the custom
 * integration's Admin API key, posts sent as HTML (?source=html).
 */
import { createHmac } from "node:crypto";
import { call, describeError, type Delivered, type PostInput, type PublishMode } from "./common";

export type GhostConfig = { siteUrl: string; mode: PublishMode; siteTitle?: string };
export type GhostCredentials = { adminKey: string };

const b64url = (value: Buffer | string) => Buffer.from(value).toString("base64url");

/** Short-lived admin token: HS256 JWT with the key id as `kid` and the hex secret as the signing key. */
export function ghostToken(adminKey: string) {
  const [id, secret] = adminKey.split(":");
  if (!id || !secret || !/^[0-9a-f]+$/i.test(secret)) throw new Error("The Admin API key should look like 6489…:a1b2…");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const payload = b64url(JSON.stringify({ iat: now, exp: now + 5 * 60, aud: "/admin/" }));
  const signature = createHmac("sha256", Buffer.from(secret, "hex")).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

const api = (siteUrl: string) => `${siteUrl.replace(/\/$/, "")}/ghost/api/admin`;
const headers = (adminKey: string) => ({ authorization: `Ghost ${ghostToken(adminKey)}`, "accept-version": "v5.0", "content-type": "application/json" });

type GhostError = { errors?: { message?: string; context?: string }[] };
type GhostPost = { id: string; url?: string; updated_at?: string };

const errorOf = (body: GhostError | null, status: number) => body?.errors?.[0]?.context || body?.errors?.[0]?.message || `Ghost returned HTTP ${status}`;

export async function verifyGhost(siteUrl: string, adminKey: string): Promise<{ ok: true; siteTitle: string } | { ok: false; error: string }> {
  try {
    const site = await call<{ site?: { title?: string } } & GhostError>(`${api(siteUrl)}/site/`, { headers: headers(adminKey) });
    if (site.status === 404) return { ok: false, error: "No Ghost site answered at this address. Use the API URL shown in your Ghost integration." };
    // The posts list needs a valid key, so it confirms publishing will work.
    const posts = await call<GhostError>(`${api(siteUrl)}/posts/?limit=1&fields=id`, { headers: headers(adminKey) });
    if (posts.status === 401 || posts.status === 403) return { ok: false, error: "Ghost rejected the Admin API key" };
    if (posts.status >= 400) return { ok: false, error: errorOf(posts.body, posts.status) };
    return { ok: true, siteTitle: site.body?.site?.title ?? siteUrl };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

export async function deliverGhost(config: GhostConfig, credentials: GhostCredentials, post: PostInput, previous?: { postId: string }): Promise<Delivered<{ postId: string }>> {
  try {
    const fields = {
      title: post.title,
      slug: post.slug,
      html: post.html,
      status: config.mode === "draft" ? "draft" : "published",
      custom_excerpt: post.excerpt || null,
      meta_description: post.excerpt || null,
      feature_image: post.heroUrl,
      feature_image_alt: post.heroUrl ? post.heroAlt.slice(0, 190) : null,
      // Ghost writes its own Article schema; the FAQ schema is added alongside it.
      codeinjection_head: post.faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(post.faqJsonLd).replace(/</g, "\\u003c")}</script>` : null,
    };
    let result;
    if (previous?.postId) {
      // Updates must carry the post's current updated_at (Ghost's collision check).
      const current = await call<{ posts?: GhostPost[] } & GhostError>(`${api(config.siteUrl)}/posts/${previous.postId}/?fields=id,updated_at`, { headers: headers(credentials.adminKey) });
      const updatedAt = current.body?.posts?.[0]?.updated_at;
      result = updatedAt
        ? await call<{ posts?: GhostPost[] } & GhostError>(`${api(config.siteUrl)}/posts/${previous.postId}/?source=html`, { method: "PUT", headers: headers(credentials.adminKey), body: JSON.stringify({ posts: [{ ...fields, updated_at: updatedAt }] }) })
        : null;
    }
    result ??= await call<{ posts?: GhostPost[] } & GhostError>(`${api(config.siteUrl)}/posts/?source=html`, { method: "POST", headers: headers(credentials.adminKey), body: JSON.stringify({ posts: [fields] }) });
    const saved = result.body?.posts?.[0];
    if (result.status >= 400 || !saved?.id) return { ok: false, error: errorOf(result.body, result.status) };
    return { ok: true, url: config.mode === "draft" ? null : (saved.url ?? null), delivery: { postId: saved.id } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
