"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { db } from "@/db";
import { contentPlanItems, integrations, orgWebsites, products } from "@/db/schema";
import { rerunAgentJob } from "../agents/queue";
import { siteDay } from "../agents/schedule";
import { CATALOG_TYPES, catalogConnections, catalogFamily, catalogOwnerId, saveProducts, setSyncState, type CatalogConfig, type CatalogType, type FeedFormat } from "../catalog/catalog";
import { MAX_PRODUCTS_PER_ARTICLE } from "../catalog/matching";
import { parseFeed, parsePrice } from "../catalog/parse";
import { downloadFeed, inspectShopifyCatalog, inspectWooCommerce, normalizeStoreUrl, type WooCredentials } from "../catalog/stores";
import { getAppContext } from "../context";
import { searchFeaturable } from "../queries/catalog";
import { decryptJson, encryptJson } from "../crypto";
import { normalizeShop, type ShopifyCredentials } from "../publishing/platforms/shopify";

/** The website whose catalog is being changed: language sites share their primary website's. */
async function requireAdminSite() {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can change the product catalog");
  if (!context.site.primaryOrgWebsiteId) return context.site;
  const [owner] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, context.site.primaryOrgWebsiteId));
  return owner ?? context.site;
}

const refresh = () => {
  revalidatePath("/[locale]/dashboard/settings/product-catalog", "page");
  revalidatePath("/[locale]/dashboard/content-plan", "page");
};

/** Products changed: the matching agent proposes products for upcoming articles again, in every language. */
async function rematch(site: { id: number; timeZone: string }) {
  for (const member of await catalogFamily(site.id)) {
    await rerunAgentJob(member.id, "productMatching", siteDay(new Date(), member.timeZone)).catch(() => null);
  }
}

async function startSync(site: { id: number; timeZone: string }) {
  for (const connection of await catalogConnections(site.id)) await setSyncState(connection.id, { lastSyncStatus: "syncing" });
  await rerunAgentJob(site.id, "catalogSync", siteDay(new Date(), site.timeZone));
}

const isLocal = (url: URL) => ["localhost", "127.0.0.1"].includes(url.hostname) || url.hostname.endsWith(".test");
const httpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && isLocal(url));
  } catch {
    return false;
  }
};

async function saveConnection(siteId: number, type: CatalogType, config: CatalogConfig, credentials: unknown | null) {
  const values = { status: "connected" as const, config: { ...config, lastSyncStatus: "syncing" }, ...(credentials ? { credentialsEncrypted: encryptJson(credentials) } : {}), lastError: null, connectedAt: new Date(), updatedAt: new Date() };
  await db
    .insert(integrations)
    .values({ orgWebsiteId: siteId, type, ...values })
    .onConflictDoUpdate({ target: [integrations.orgWebsiteId, integrations.type], set: values });
}

/** One store platform per website (a feed and manual products work alongside either). */
async function otherStore(siteId: number, type: "shopify_catalog" | "woocommerce") {
  const other = type === "shopify_catalog" ? "woocommerce" : "shopify_catalog";
  const [row] = await db.select({ id: integrations.id }).from(integrations).where(and(eq(integrations.orgWebsiteId, siteId), eq(integrations.type, other)));
  return Boolean(row);
}

const shopifySchema = z.object({ store: z.string().trim().min(1, "Enter your store name"), clientId: z.string().trim(), clientSecret: z.string().trim() });

/** Connects Shopify for products (read-only); empty credentials keep the saved ones. Starts the first sync. */
export async function connectShopifyCatalog(input: z.infer<typeof shopifySchema>) {
  const site = await requireAdminSite();
  const parsed = shopifySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const shop = normalizeShop(parsed.data.store);
  if (!shop) return { error: "Enter the store name from your .myshopify.com address, e.g. my-store" };
  if (await otherStore(site.id, "shopify_catalog")) return { error: "WooCommerce is connected for products. Disconnect it first: one store platform per website." };
  const [saved] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "shopify_catalog")));
  const keep = !parsed.data.clientId && !parsed.data.clientSecret && saved?.credentialsEncrypted && (saved.config as CatalogConfig).shop === shop;
  if (!keep && (!parsed.data.clientId || !parsed.data.clientSecret)) return { error: "Paste the Client ID and Client secret from your app's Settings" };
  const credentials: ShopifyCredentials = keep ? decryptJson<ShopifyCredentials>(saved!.credentialsEncrypted!) : { clientId: parsed.data.clientId, clientSecret: parsed.data.clientSecret };
  try {
    const store = await inspectShopifyCatalog(shop, credentials);
    await saveConnection(site.id, "shopify_catalog", { shop, storeName: store.storeName, storeUrl: store.storeUrl, currency: store.currency }, keep ? null : credentials);
  } catch (error) {
    return { error: (error as Error).message };
  }
  await startSync(site);
  refresh();
  return { ok: true as const };
}

const wooSchema = z.object({ siteUrl: z.string().trim().min(1, "Enter your store URL"), consumerKey: z.string().trim(), consumerSecret: z.string().trim() });

/** Connects WooCommerce for products with a Read key; empty key and secret keep the saved ones. */
export async function connectWooCommerce(input: z.infer<typeof wooSchema>) {
  const site = await requireAdminSite();
  const parsed = wooSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const siteUrl = normalizeStoreUrl(parsed.data.siteUrl);
  if (!siteUrl || !httpsUrl(siteUrl)) return { error: "Enter your store's https:// address" };
  if (await otherStore(site.id, "woocommerce")) return { error: "Shopify is connected for products. Disconnect it first: one store platform per website." };
  const [saved] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "woocommerce")));
  const keep = !parsed.data.consumerKey && !parsed.data.consumerSecret && saved?.credentialsEncrypted && (saved.config as CatalogConfig).siteUrl === siteUrl;
  if (!keep && (!/^ck_/.test(parsed.data.consumerKey) || !/^cs_/.test(parsed.data.consumerSecret))) return { error: "Paste the consumer key (ck_…) and consumer secret (cs_…). A new store URL needs its own key and secret." };
  const credentials: WooCredentials = keep ? decryptJson<WooCredentials>(saved!.credentialsEncrypted!) : { consumerKey: parsed.data.consumerKey, consumerSecret: parsed.data.consumerSecret };
  try {
    const store = await inspectWooCommerce(siteUrl, credentials);
    await saveConnection(site.id, "woocommerce", { siteUrl, storeName: store.storeName, currency: store.currency }, keep ? null : credentials);
  } catch (error) {
    return { error: (error as Error).message };
  }
  await startSync(site);
  refresh();
  return { ok: true as const };
}

/** Disconnects the store or feed and removes its products (manual products stay). */
export async function disconnectCatalogSource(type: CatalogType) {
  const site = await requireAdminSite();
  if (!CATALOG_TYPES.includes(type)) throw new Error("Unknown catalog source");
  const sources = type === "shopify_catalog" ? (["shopify"] as const) : type === "woocommerce" ? (["woocommerce"] as const) : (["google_shopping", "facebook"] as const);
  await db.delete(products).where(and(eq(products.orgWebsiteId, site.id), inArray(products.source, [...sources])));
  await db.delete(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, type)));
  await rematch(site);
  refresh();
  return { ok: true as const };
}

export async function syncCatalogNow() {
  const site = await requireAdminSite();
  const connections = await catalogConnections(site.id);
  if (!connections.length) return { error: "Connect a store or feed first" };
  if (connections.some((connection) => connection.config.lastSyncStatus === "syncing" && connection.updatedAt > new Date(Date.now() - 10 * 60_000))) return { error: "A catalog sync is already running." };
  await startSync(site);
  refresh();
  return { ok: true as const };
}

const feedSchema = z.object({ url: z.string().trim().refine(httpsUrl, "Please enter a valid feed URL starting with https://"), format: z.enum(["google_shopping", "facebook"]) });

/** Imports products from a Google Shopping or Facebook feed and keeps them in sync (replaces a saved feed). */
export async function importFeed(input: { url: string; format: FeedFormat }) {
  const site = await requireAdminSite();
  const parsed = feedSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  let feed: ReturnType<typeof parseFeed>;
  try {
    feed = parseFeed(await downloadFeed(parsed.data.url));
  } catch (error) {
    return { error: (error as Error).message };
  }
  if (!feed.products.length) return { error: "The feed has no products with an id and a title" };
  const other = parsed.data.format === "google_shopping" ? "facebook" : "google_shopping";
  await db.delete(products).where(and(eq(products.orgWebsiteId, site.id), eq(products.source, other)));
  const saved = await saveProducts(site.id, parsed.data.format, feed.products, { removeMissing: true });
  const note = feed.truncated ? "The feed has more than 10,000 products; the first 10,000 were imported." : null;
  const config: CatalogConfig = { feedUrl: parsed.data.url, format: parsed.data.format, lastSyncAt: new Date().toISOString(), lastSyncStatus: note ? "notice" : "success", lastSyncError: null, lastSyncNote: note };
  const values = { status: "connected" as const, config, lastError: null, connectedAt: new Date(), updatedAt: new Date() };
  await db.insert(integrations).values({ orgWebsiteId: site.id, type: "product_feed", ...values }).onConflictDoUpdate({ target: [integrations.orgWebsiteId, integrations.type], set: values });
  await rematch(site);
  refresh();
  return { ok: true as const, count: feed.products.length, ...saved, skipped: feed.skipped };
}

const CURRENCY = /^[A-Z]{3}$/;
const productSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, "Enter the product name").max(300),
  description: z.string().trim().max(2000).optional(),
  url: z.string().trim().refine((value) => !value || /^https?:\/\/\S+\.\S+$/.test(value), "Enter the product's full URL, starting with https://").optional(),
  price: z.string().trim().max(30).optional(),
  currency: z.string().trim().toUpperCase().refine((value) => !value || CURRENCY.test(value), "Pick a currency").optional(),
  imageUrl: z.string().trim().max(500).optional(),
  includeInArticles: z.boolean(),
});

/** Adds or edits a manual product (synced products are edited in their store). */
export async function saveManualProduct(input: z.infer<typeof productSchema>) {
  const site = await requireAdminSite();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const data = parsed.data;
  const url = data.url || null;
  if (data.includeInArticles && !url) return { error: "Add a product URL before including this product in articles" };
  const price = data.price ? parsePrice(data.price, data.currency || null) : { price: null, currency: data.currency || null };
  if (data.price && price.price === null) return { error: "Enter the price as a number, e.g. 29.99" };
  const values = {
    name: data.name,
    description: data.description || null,
    url,
    price: price.price,
    currency: price.price ? (data.currency || price.currency || null) : null,
    imageUrl: data.imageUrl && /^(https?:\/\/|\/media\/)/.test(data.imageUrl) ? data.imageUrl : null,
    includeInArticles: data.includeInArticles,
    updatedAt: new Date(),
  };
  if (data.id) {
    const updated = await db
      .update(products)
      .set(values)
      .where(and(eq(products.id, data.id), eq(products.orgWebsiteId, site.id), eq(products.source, "manual")))
      .returning({ id: products.id });
    if (!updated.length) return { error: "Only products added by hand can be edited here" };
  } else await db.insert(products).values({ orgWebsiteId: site.id, source: "manual", status: "active", ...values });
  await rematch(site);
  refresh();
  return { ok: true as const };
}

export async function deleteManualProduct(id: number) {
  const site = await requireAdminSite();
  await db.delete(products).where(and(eq(products.id, id), eq(products.orgWebsiteId, site.id), eq(products.source, "manual")));
  await rematch(site);
  refresh();
  return { ok: true as const };
}

/** Turns "Include in articles" on or off for any product (it needs a product URL to be on). */
export async function setProductIncluded(id: number, include: boolean) {
  const site = await requireAdminSite();
  const [product] = await db.select({ url: products.url }).from(products).where(and(eq(products.id, id), eq(products.orgWebsiteId, site.id)));
  if (!product) return { error: "Product not found" };
  if (include && !product.url) return { error: "Add a product URL before including this product in articles" };
  await db.update(products).set({ includeInArticles: include, updatedAt: new Date() }).where(eq(products.id, id));
  await rematch(site);
  refresh();
  return { ok: true as const };
}

/**
 * The products an upcoming article features: a list chosen by hand (empty for none), or null to
 * go back to the agent's proposal.
 */
export async function setTopicProducts(planItemId: number, productIds: number[] | null) {
  const context = await getAppContext();
  if (!context?.site) throw new Error("No website selected");
  const site = context.site;
  if (productIds && productIds.length > MAX_PRODUCTS_PER_ARTICLE) return { error: `You can feature up to ${MAX_PRODUCTS_PER_ARTICLE} products per article` };
  if (productIds?.length) {
    const usable = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.orgWebsiteId, catalogOwnerId(site)), inArray(products.id, productIds), eq(products.includeInArticles, true)));
    if (usable.length !== new Set(productIds).size) return { error: "Some of these products can't be featured (they need a product URL and Include in articles on)" };
  }
  const [item] = await db.select({ articleId: contentPlanItems.articleId }).from(contentPlanItems).where(and(eq(contentPlanItems.id, planItemId), eq(contentPlanItems.orgWebsiteId, site.id)));
  if (!item) return { error: "Topic not found" };
  if (item.articleId) return { error: "This article is already written" };
  await db
    .update(contentPlanItems)
    .set(productIds === null ? { productsCustomized: false, selectedProductIds: [], updatedAt: new Date() } : { productsCustomized: true, selectedProductIds: [...new Set(productIds)], updatedAt: new Date() })
    .where(eq(contentPlanItems.id, planItemId));
  // Back to the agent's choice: match this topic again if its proposal is out of date.
  if (productIds === null) await rematch(site);
  revalidatePath("/[locale]/dashboard/content-plan", "page");
  return { ok: true as const };
}

/** Products an article can feature, for the picker. */
export async function searchCatalogProducts(query: string, ids: number[] = []) {
  const context = await getAppContext();
  if (!context?.site) return [];
  return searchFeaturable(catalogOwnerId(context.site), query.slice(0, 100), ids.slice(0, MAX_PRODUCTS_PER_ARTICLE * 2));
}
