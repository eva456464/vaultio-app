/**
 * BigCommerce (store blog, REST API v2 https://developer.bigcommerce.com/docs/rest-content/blog):
 * a store-level API account with Content: Modify. Posts are sent as HTML; with the store's WebDAV
 * login the cover image is copied to the store and used as the post's thumbnail.
 */
import { createHash, randomBytes } from "node:crypto";
import { loadMedia, mediaIdFromUrl } from "../../media";
import { call, describeError, type Delivered, type PostInput, type PublishMode } from "./common";

export type BigCommerceConfig = { storeHash: string; storeUrl: string; storeName: string; author: string; mode: PublishMode };
export type BigCommerceCredentials = { accessToken: string; webdav?: { url: string; username: string; password: string } };

/** Development only: BIGCOMMERCE_API_BASE points every store at a local mock. */
const API = () => process.env.BIGCOMMERCE_API_BASE?.replace(/\/$/, "") ?? "https://api.bigcommerce.com";
const api = (hash: string) => `${API()}/stores/${hash}/v2`;
const headers = (token: string) => ({ "x-auth-token": token.trim(), accept: "application/json", "content-type": "application/json" });

/** "store-mh5fua96uw.mybigcommerce.com", a full admin URL or just the hash → "mh5fua96uw". */
export function normalizeStoreHash(input: string) {
  const value = input.trim().toLowerCase();
  const hash = value.match(/store-([a-z0-9]+)\.mybigcommerce\.com/)?.[1] ?? value.match(/stores\/([a-z0-9]+)/)?.[1] ?? value;
  return /^[a-z0-9]{6,20}$/.test(hash) ? hash : null;
}

type BigCommerceError = { title?: string; message?: string }[] | { title?: string; message?: string };
const errorOf = (body: BigCommerceError | null, status: number) => {
  const first = Array.isArray(body) ? body[0] : body;
  return first?.message || first?.title || `BigCommerce returned HTTP ${status}`;
};

export async function verifyBigCommerce(storeHash: string, accessToken: string): Promise<{ ok: true; storeName: string; storeUrl: string } | { ok: false; error: string }> {
  try {
    const posts = await call<BigCommerceError>(`${api(storeHash)}/blog/posts?limit=1`, { headers: headers(accessToken) });
    if (posts.status === 401) return { ok: false, error: "BigCommerce rejected the access token" };
    if (posts.status === 403) return { ok: false, error: "The API account needs Content set to Modify" };
    if (posts.status === 404) return { ok: false, error: "No BigCommerce store has this store hash" };
    if (posts.status >= 400) return { ok: false, error: errorOf(posts.body, posts.status) };
    // The store's name and address need Information & Settings access; without it the default address is used.
    const store = await call<{ name?: string; secure_url?: string; domain?: string }>(`${api(storeHash)}/store`, { headers: headers(accessToken) }).catch(() => null);
    const storeUrl = store?.body?.secure_url || (store?.body?.domain ? `https://${store.body.domain}` : `https://store-${storeHash}.mybigcommerce.com`);
    return { ok: true, storeName: store?.body?.name ?? storeHash, storeUrl: storeUrl.replace(/\/$/, "") };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

// ---------------------------------------------------------------------------------------------
// WebDAV (digest authentication, as BigCommerce's WebDAV requires)

const md5 = (value: string) => createHash("md5").update(value).digest("hex");

function digestHeader(challenge: string, method: string, uri: string, username: string, password: string) {
  const field = (name: string) => challenge.match(new RegExp(`${name}="?([^",]+)"?`, "i"))?.[1];
  const realm = field("realm") ?? "";
  const nonce = field("nonce") ?? "";
  const qop = field("qop")?.split(",").map((value) => value.trim()).includes("auth") ? "auth" : undefined;
  const opaque = field("opaque");
  const cnonce = randomBytes(8).toString("hex");
  const nc = "00000001";
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`) : md5(`${ha1}:${nonce}:${ha2}`);
  return [
    `Digest username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
    "algorithm=MD5",
    ...(qop ? [`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`] : []),
    ...(opaque ? [`opaque="${opaque}"`] : []),
  ].join(", ");
}

const CHECK_FILE = "/content/vaultio-connection-check.txt";

/** One WebDAV request, answering the server's digest challenge (or falling back to basic auth). */
async function webdavRequest(webdav: NonNullable<BigCommerceCredentials["webdav"]>, method: "PUT" | "DELETE", path: string, data?: Buffer, mimeType?: string) {
  const url = `${webdav.url.replace(/\/$/, "")}${path}`;
  const uri = new URL(url).pathname;
  const send = (authorization?: string) =>
    fetch(url, {
      method,
      headers: { ...(mimeType ? { "content-type": mimeType } : {}), ...(authorization ? { authorization } : {}) },
      body: data ? new Uint8Array(data) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
  let response = await send();
  if (response.status === 401) {
    const challenge = response.headers.get("www-authenticate") ?? "";
    response = challenge.toLowerCase().startsWith("digest")
      ? await send(digestHeader(challenge, method, uri, webdav.username, webdav.password))
      : await send(`Basic ${Buffer.from(`${webdav.username}:${webdav.password}`).toString("base64")}`);
  }
  if (!response.ok) throw new Error(response.status === 401 ? "BigCommerce rejected the WebDAV username or password" : `WebDAV ${method === "PUT" ? "upload" : "request"} failed (HTTP ${response.status})`);
}

const webdavPut = (webdav: NonNullable<BigCommerceCredentials["webdav"]>, path: string, data: Buffer, mimeType: string) => webdavRequest(webdav, "PUT", path, data, mimeType);

/** Copies the cover to the store (product_images/uploaded_images) and returns its thumbnail path. */
async function uploadCover(webdav: NonNullable<BigCommerceCredentials["webdav"]>, post: PostInput) {
  const id = post.heroUrl ? mediaIdFromUrl(post.heroUrl) : null;
  const media = id ? await loadMedia(id) : null;
  if (!media) return null;
  const path = `/product_images/uploaded_images/vaultio-${post.slug.slice(0, 80)}.webp`;
  await webdavPut(webdav, path, media.data, media.mimeType);
  return path;
}

// ---------------------------------------------------------------------------------------------

type BigCommercePost = { id?: number; url?: string };

export async function deliverBigCommerce(
  config: BigCommerceConfig,
  credentials: BigCommerceCredentials,
  post: PostInput,
  previous?: { postId: number; thumbnailPath?: string | null },
): Promise<Delivered<{ postId: number; thumbnailPath: string | null }>> {
  try {
    let thumbnailPath = previous?.thumbnailPath ?? null;
    if (credentials.webdav && post.heroUrl) {
      // A failed image copy doesn't stop the post: it goes out without a thumbnail.
      thumbnailPath = await uploadCover(credentials.webdav, post).catch(() => thumbnailPath);
    }
    // Without a thumbnail, the cover goes at the top of the post body.
    const cover = !thumbnailPath && post.heroUrl ? `<p><img src="${post.heroUrl}" alt="${post.heroAlt.replace(/"/g, "&quot;")}" /></p>\n` : "";
    const fields = {
      title: post.title,
      body: `${cover}${post.html}`,
      meta_description: post.excerpt,
      is_published: config.mode !== "draft",
      author: config.author || undefined,
      ...(thumbnailPath ? { thumbnail_path: thumbnailPath } : {}),
    };
    const send = (method: "POST" | "PUT", path: string, body: object) =>
      call<BigCommercePost & BigCommerceError>(`${api(config.storeHash)}${path}`, { method, headers: headers(credentials.accessToken), body: JSON.stringify(body) });

    // An update keeps the post's address.
    let result = previous?.postId ? await send("PUT", `/blog/posts/${previous.postId}`, fields) : null;
    let url: string | null = null;
    if (!result || result.status === 404) {
      // A new post gets /blog/<slug>/, or "-2", "-3"… when another post already has that address.
      for (let attempt = 0; attempt < 5; attempt++) {
        url = `/blog/${post.slug}${attempt ? `-${attempt + 1}` : ""}/`;
        result = await send("POST", "/blog/posts", { ...fields, url });
        if (result.status !== 409) break;
      }
    }
    if (!result || result.status >= 400 || !result.body?.id) return { ok: false, error: result ? errorOf(result.body, result.status) : "BigCommerce didn't answer" };
    const path = result.body.url ?? url;
    return { ok: true, url: path ? `${config.storeUrl}${path}` : null, delivery: { postId: result.body.id, thumbnailPath } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/** Checks a WebDAV login by uploading a tiny file (BigCommerce has no read-only check). */
export async function verifyWebdav(webdav: NonNullable<BigCommerceCredentials["webdav"]>) {
  try {
    await webdavPut(webdav, CHECK_FILE, Buffer.from("ok"), "text/plain");
    await webdavRequest(webdav, "DELETE", CHECK_FILE).catch(() => undefined);
    return null;
  } catch (error) {
    return describeError(error);
  }
}
