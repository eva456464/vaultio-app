/**
 * Shopify (GraphQL Admin API, https://shopify.dev/docs/api/admin-graphql): blog articles.
 * Connects with the Client ID and secret of an app made in the Shopify Dev Dashboard (exchanged
 * for a short-lived token with the client-credentials grant), or with an Admin API access token
 * ("shpat_…") from an older custom app. The app needs read_content and write_content.
 */
import { call, describeError, type Delivered, type PostInput, type PublishMode } from "./common";

export type ShopifyConfig = { shop: string; blogId: string; blogTitle: string; blogHandle: string; storeUrl: string; author: string; mode: PublishMode };
export type ShopifyCredentials = { clientId?: string; clientSecret?: string; accessToken?: string };

const API_VERSION = () => process.env.SHOPIFY_API_VERSION ?? "2026-10";
/** Development only: SHOPIFY_API_BASE points every store at a local mock. */
const origin = (shop: string) => process.env.SHOPIFY_API_BASE?.replace(/\/$/, "") ?? `https://${shop}`;

/** "my-store", "my-store.myshopify.com" or "https://admin.shopify.com/store/my-store" → "my-store.myshopify.com". */
export function normalizeShop(input: string) {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const admin = value.match(/^admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/);
  const name = admin?.[1] ?? value.replace(/\.myshopify\.com.*$/, "").replace(/\/.*$/, "");
  return /^[a-z0-9][a-z0-9-]{0,60}$/.test(name) ? `${name}.myshopify.com` : null;
}

const tokens = new Map<string, { value: string; expiresAt: number }>();

async function accessToken(shop: string, credentials: ShopifyCredentials) {
  if (credentials.accessToken) return credentials.accessToken;
  const key = `${shop}:${credentials.clientId}`;
  const cached = tokens.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
  const result = await call<{ access_token?: string; expires_in?: number; error?: string; error_description?: string }>(`${origin(shop)}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: credentials.clientId ?? "", client_secret: credentials.clientSecret ?? "" }),
  });
  if (!result.body?.access_token) throw new Error(result.status === 404 ? "No Shopify store answered at this address" : (result.body?.error_description ?? "Shopify rejected the Client ID or secret"));
  tokens.set(key, { value: result.body.access_token, expiresAt: Date.now() + (result.body.expires_in ?? 3600) * 1000 });
  return result.body.access_token;
}

type GraphQLResult<T> = { data?: T; errors?: { message: string }[] };

/** A GraphQL Admin API call; `scopes` names what the app needs when Shopify refuses access. */
export async function shopifyGraphql<T>(shop: string, credentials: ShopifyCredentials, query: string, variables: Record<string, unknown> = {}, scopes = "read_content and write_content") {
  const token = await accessToken(shop, credentials);
  const result = await call<GraphQLResult<T>>(`${origin(shop)}/admin/api/${API_VERSION()}/graphql.json`, {
    method: "POST",
    headers: { "x-shopify-access-token": token, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (result.status === 401) throw new Error("Shopify rejected the credentials");
  if (result.status === 403) throw new Error(`The app needs the ${scopes} scopes`);
  const denied = result.body?.errors?.find((error) => /access denied|required access/i.test(error.message));
  if (denied) throw new Error(`The app needs the ${scopes} scopes`);
  if (result.status >= 400 || !result.body?.data) throw new Error(result.body?.errors?.[0]?.message ?? `Shopify returned HTTP ${result.status}`);
  return result.body.data;
}

const graphql = <T,>(shop: string, credentials: ShopifyCredentials, query: string, variables: Record<string, unknown> = {}) => shopifyGraphql<T>(shop, credentials, query, variables);

export type ShopifyChoice = { shopName: string; storeUrl: string; blogs: { id: string; title: string; handle: string }[] };

export async function inspectShopify(shop: string, credentials: ShopifyCredentials): Promise<{ ok: true; choice: ShopifyChoice } | { ok: false; error: string }> {
  try {
    const data = await graphql<{ shop: { name: string; primaryDomain: { url: string } }; blogs: { nodes: { id: string; title: string; handle: string }[] } }>(
      shop,
      credentials,
      `query { shop { name primaryDomain { url } } blogs(first: 50) { nodes { id title handle } } }`,
    );
    if (!data.blogs.nodes.length) return { ok: false, error: "This store has no blog yet. Create one in Shopify under Content → Blog posts → Manage blogs." };
    return { ok: true, choice: { shopName: data.shop.name, storeUrl: data.shop.primaryDomain.url.replace(/\/$/, ""), blogs: data.blogs.nodes } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

type ArticlePayload = { article: { id: string; handle: string } | null; userErrors: { field?: string[]; message: string }[] };

export async function deliverShopify(config: ShopifyConfig, credentials: ShopifyCredentials, post: PostInput, previous?: { articleId: string }): Promise<Delivered<{ articleId: string }>> {
  try {
    const article = {
      title: post.title,
      handle: post.slug,
      body: post.html,
      summary: post.excerpt ? `<p>${post.excerpt.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : null,
      isPublished: config.mode === "publish",
      author: { name: config.author },
      ...(post.heroUrl ? { image: { url: post.heroUrl, altText: post.heroAlt } } : {}),
    };
    const fields = `article { id handle } userErrors { field message }`;
    const data = previous?.articleId
      ? (await graphql<{ articleUpdate: ArticlePayload }>(config.shop, credentials, `mutation ($id: ID!, $article: ArticleUpdateInput!) { articleUpdate(id: $id, article: $article) { ${fields} } }`, { id: previous.articleId, article })).articleUpdate
      : (await graphql<{ articleCreate: ArticlePayload }>(config.shop, credentials, `mutation ($article: ArticleCreateInput!) { articleCreate(article: $article) { ${fields} } }`, { article: { ...article, blogId: config.blogId } })).articleCreate;
    if (data.userErrors.length || !data.article) return { ok: false, error: data.userErrors.map((error) => error.message).join("; ") || "Shopify didn't save the article" };
    return { ok: true, url: config.mode === "publish" ? `${config.storeUrl}/blogs/${config.blogHandle}/${data.article.handle}` : null, delivery: { articleId: data.article.id } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
