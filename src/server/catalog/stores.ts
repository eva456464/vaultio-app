/**
 * Read-only product sync from the client's store: Shopify (GraphQL Admin API, an app with
 * read_products and read_inventory) and WooCommerce (REST API v3 with a Read key). Products only;
 * the store is never changed. Separate from blog publishing to Shopify or WordPress.
 */
import { shopifyGraphql, type ShopifyCredentials } from "../publishing/platforms/shopify";
import { MAX_PRODUCTS, parsePrice, type ProductInput } from "./parse";

export type StoreProducts = { products: ProductInput[]; truncated: boolean };

const SHOPIFY_SCOPES = "read_products and read_inventory";
const plain = (html: string | null | undefined, max = 1000) => {
  const text = (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------------------------
// Shopify

type ShopifyShop = { name: string; currencyCode: string; primaryDomain: { url: string } };
type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  vendor: string | null;
  productType: string | null;
  onlineStoreUrl: string | null;
  description: string | null;
  variantsCount: { count: number } | null;
  priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } } | null;
  featuredImage: { url: string } | null;
};

const SHOP_QUERY = `query { shop { name currencyCode primaryDomain { url } } products(first: 1) { nodes { id } } }`;
const PRODUCTS_QUERY = `query Catalog($cursor: String) {
  products(first: 100, after: $cursor, sortKey: ID) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle status vendor productType onlineStoreUrl description(truncateAt: 1000)
      variantsCount { count }
      priceRangeV2 { minVariantPrice { amount currencyCode } }
      featuredImage { url }
    }
  }
}`;

/** Checks the app can read products; returns the store's name, address and currency. */
export async function inspectShopifyCatalog(shop: string, credentials: ShopifyCredentials) {
  const data = await shopifyGraphql<{ shop: ShopifyShop }>(shop, credentials, SHOP_QUERY, {}, SHOPIFY_SCOPES);
  return { storeName: data.shop.name, storeUrl: data.shop.primaryDomain.url.replace(/\/$/, ""), currency: data.shop.currencyCode };
}

export async function shopifyProducts(shop: string, credentials: ShopifyCredentials, storeUrl: string): Promise<StoreProducts> {
  const products: ProductInput[] = [];
  let cursor: string | null = null;
  for (;;) {
    let page: { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ShopifyProduct[] } } | null = null;
    // Shopify throttles by query cost: wait and try again.
    for (let attempt = 0; !page; attempt++) {
      try {
        page = await shopifyGraphql(shop, credentials, PRODUCTS_QUERY, { cursor }, SHOPIFY_SCOPES);
      } catch (error) {
        if (!/throttl/i.test((error as Error).message) || attempt >= 5) throw error;
        await wait(2000 * (attempt + 1));
      }
    }
    for (const node of page.products.nodes) {
      if (node.status === "ARCHIVED") continue;
      const price = node.priceRangeV2?.minVariantPrice;
      const live = node.status === "ACTIVE";
      products.push({
        externalId: node.id,
        name: node.title,
        description: plain(node.description),
        url: node.onlineStoreUrl ?? (live ? `${storeUrl}/products/${node.handle}` : null),
        imageUrl: node.featuredImage?.url ?? null,
        price: price ? parsePrice(price.amount).price : null,
        currency: price?.currencyCode ?? null,
        brand: node.vendor || null,
        category: node.productType || null,
        status: live ? "active" : "draft",
        variants: node.variantsCount?.count ?? 1,
      });
    }
    if (products.length >= MAX_PRODUCTS) return { products: products.slice(0, MAX_PRODUCTS), truncated: true };
    if (!page.products.pageInfo.hasNextPage) return { products, truncated: false };
    cursor = page.products.pageInfo.endCursor;
  }
}

// ---------------------------------------------------------------------------------------------
// WooCommerce

export type WooCredentials = { consumerKey: string; consumerSecret: string };

/** "yourstore.com/" → "https://yourstore.com" (a WordPress in a folder keeps its path). */
export function normalizeStoreUrl(input: string) {
  const value = input.trim().replace(/\/+$/, "");
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") || url.hostname === "localhost" ? `${url.origin}${url.pathname.replace(/\/+$/, "")}` : null;
  } catch {
    return null;
  }
}

async function woo<T>(siteUrl: string, credentials: WooCredentials, path: string, query: Record<string, string> = {}) {
  const response = await fetch(`${siteUrl}/wp-json/wc/v3${path}?${new URLSearchParams(query)}`, {
    headers: { authorization: `Basic ${Buffer.from(`${credentials.consumerKey.trim()}:${credentials.consumerSecret.trim()}`).toString("base64")}`, accept: "application/json" },
    // A redirect to another host (www or not) would drop the key, so it is reported instead.
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  }).catch((error: Error) => {
    throw new Error(`Couldn't reach the store: ${error.message}. Check the address, and that a firewall or security plugin allows /wp-json/wc/v3/.`);
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    throw new Error(`The store redirects to ${location ?? "another address"}. Enter the store URL exactly as it loads in the browser (with or without www).`);
  }
  const body = (await response.json().catch(() => null)) as (T & { code?: string; message?: string }) | null;
  if (response.status === 401) throw new Error("WooCommerce rejected the consumer key or secret. If your store loads at www., include www in the store URL.");
  if (response.status === 403 || body?.code === "woocommerce_rest_cannot_view") throw new Error("That API key doesn't have Read access. Set its permissions to Read in WooCommerce → Settings → Advanced → REST API.");
  if (response.status === 404) throw new Error("WooCommerce's REST API wasn't found at this address. Check WooCommerce is active and that Settings → Permalinks isn't set to Plain.");
  if (!response.ok || body === null) throw new Error(`WooCommerce: ${body?.message ?? `HTTP ${response.status}`}`);
  return { body: body as T, headers: response.headers };
}

/** Checks the key can read products; returns the store's name and currency. */
export async function inspectWooCommerce(siteUrl: string, credentials: WooCredentials) {
  await woo<unknown[]>(siteUrl, credentials, "/products", { per_page: "1" });
  const currency = await woo<{ code?: string }>(siteUrl, credentials, "/data/currencies/current").then(
    (result) => result.body.code ?? null,
    () => null,
  );
  const storeName = await fetch(`${siteUrl}/wp-json/`, { signal: AbortSignal.timeout(15_000) })
    .then((response) => response.json() as Promise<{ name?: string }>)
    .then((index) => index.name || null)
    .catch(() => null);
  return { storeName: storeName ?? new URL(siteUrl).hostname, currency };
}

type WooProduct = {
  id: number;
  name: string;
  permalink: string;
  status: string;
  short_description: string;
  description: string;
  price: string;
  images: { src: string }[];
  categories: { name: string }[];
  brands?: { name: string }[];
  type: string;
  variations: number[];
};

export async function wooProducts(siteUrl: string, credentials: WooCredentials, currency: string | null): Promise<StoreProducts> {
  const products: ProductInput[] = [];
  for (let page = 1; ; page++) {
    const { body, headers } = await woo<WooProduct[]>(siteUrl, credentials, "/products", {
      per_page: "100",
      page: String(page),
      status: "any",
      orderby: "id",
      order: "asc",
      _fields: "id,name,permalink,status,short_description,description,price,images,categories,brands,type,variations",
    });
    for (const item of body) {
      if (item.status === "trash") continue;
      const live = item.status === "publish";
      products.push({
        externalId: String(item.id),
        name: plain(item.name, 300) ?? `#${item.id}`,
        description: plain(item.short_description) ?? plain(item.description),
        url: live && item.permalink ? item.permalink : null,
        imageUrl: item.images?.[0]?.src ?? null,
        price: item.price ? parsePrice(item.price).price : null,
        currency,
        brand: item.brands?.[0]?.name ?? null,
        category: item.categories?.[0]?.name ?? null,
        status: live ? "active" : "draft",
        variants: item.type === "variable" ? Math.max(1, item.variations?.length ?? 1) : 1,
      });
    }
    if (products.length >= MAX_PRODUCTS) return { products: products.slice(0, MAX_PRODUCTS), truncated: true };
    if (page >= Number(headers.get("x-wp-totalpages") ?? 1) || body.length < 100) return { products, truncated: false };
  }
}

// ---------------------------------------------------------------------------------------------
// Feeds

/** Downloads a product feed (up to 50 MB). */
export async function downloadFeed(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000), headers: { "user-agent": "Mozilla/5.0 (compatible; VaultioBot/1.0)" } }).catch((error: Error) => {
    throw new Error(`Couldn't download the feed: ${error.message}`);
  });
  if (!response.ok) throw new Error(`The feed URL returned HTTP ${response.status}`);
  const size = Number(response.headers.get("content-length") ?? 0);
  if (size > 50_000_000) throw new Error("The feed is larger than 50 MB");
  const text = await response.text();
  if (text.length > 50_000_000) throw new Error("The feed is larger than 50 MB");
  return text;
}
