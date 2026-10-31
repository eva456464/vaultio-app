/**
 * The product catalog: saving products from every source, the store and feed connections
 * (integrations "shopify_catalog", "woocommerce" and "product_feed") and syncing them.
 */
import { and, eq, inArray, isNotNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { integrations, orgWebsites, products, type ProductSource } from "@/db/schema";
import { decryptJson } from "../crypto";
import type { ShopifyCredentials } from "../publishing/platforms/shopify";
import { parseFeed, type ProductInput } from "./parse";
import { downloadFeed, shopifyProducts, wooProducts, type StoreProducts, type WooCredentials } from "./stores";

export const CATALOG_TYPES = ["shopify_catalog", "woocommerce", "product_feed"] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];
export type FeedFormat = "google_shopping" | "facebook";

export type SyncStatus = "syncing" | "success" | "notice" | "failed";
/** Non-secret settings and sync state kept in the integration's config. */
export type CatalogConfig = {
  shop?: string;
  storeName?: string;
  storeUrl?: string;
  siteUrl?: string;
  currency?: string | null;
  feedUrl?: string;
  format?: FeedFormat;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  lastSyncError?: string | null;
  lastSyncNote?: string | null;
};

export const sourceOf = (type: CatalogType, config: CatalogConfig): ProductSource =>
  type === "shopify_catalog" ? "shopify" : type === "woocommerce" ? "woocommerce" : (config.format ?? "google_shopping");

const SAME_FIELDS = ["name", "description", "url", "imageUrl", "price", "currency", "brand", "category", "status", "variants"] as const;

/**
 * Saves products of one source by their external id. A product's "include in articles" choice is
 * kept across syncs (and turned off when it loses its URL); only products whose details changed are
 * updated, so the catalog's change time reflects real changes. With `removeMissing`, products of
 * the source that are no longer there are deleted.
 */
export async function saveProducts(siteId: number, source: ProductSource, items: ProductInput[], options: { removeMissing: boolean }) {
  const existing = await db.select().from(products).where(and(eq(products.orgWebsiteId, siteId), eq(products.source, source), isNotNull(products.externalId)));
  const byId = new Map(existing.map((row) => [row.externalId!, row]));
  const now = new Date();
  const inserts: (typeof products.$inferInsert)[] = [];
  let updated = 0;
  await db.transaction(async (tx) => {
    for (const item of items) {
      const row = byId.get(item.externalId);
      if (!row) {
        inserts.push({ orgWebsiteId: siteId, source, ...item, includeInArticles: Boolean(item.url), syncedAt: now });
        continue;
      }
      const changed = SAME_FIELDS.some((field) => (row[field] ?? null) !== (item[field] ?? null));
      if (!changed) continue;
      updated++;
      await tx
        .update(products)
        .set({ ...item, includeInArticles: item.url ? row.includeInArticles : false, syncedAt: now, updatedAt: now })
        .where(eq(products.id, row.id));
    }
    for (let index = 0; index < inserts.length; index += 500) await tx.insert(products).values(inserts.slice(index, index + 500));
  });
  // Unchanged products are marked as seen in this sync without counting as a change.
  const seen = items.map((item) => item.externalId).filter((id) => byId.has(id));
  for (let index = 0; index < seen.length; index += 5000) {
    await db.update(products).set({ syncedAt: now }).where(and(eq(products.orgWebsiteId, siteId), eq(products.source, source), inArray(products.externalId, seen.slice(index, index + 5000))));
  }
  let removed = 0;
  if (options.removeMissing) {
    const keep = items.map((item) => item.externalId);
    const kept = new Set(keep);
    const gone = existing.filter((row) => !kept.has(row.externalId!)).length;
    if (gone) {
      await db
        .delete(products)
        .where(and(eq(products.orgWebsiteId, siteId), eq(products.source, source), keep.length ? notInArray(products.externalId, keep) : sql`true`));
      removed = gone;
    }
  }
  return { added: inserts.length, updated, removed };
}

export async function catalogConnections(siteId: number) {
  const rows = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, siteId), inArray(integrations.type, [...CATALOG_TYPES])));
  return rows.map((row) => ({ ...row, type: row.type as CatalogType, config: row.config as CatalogConfig }));
}

export async function setSyncState(integrationId: number, state: Partial<CatalogConfig>, status?: "connected" | "error") {
  await db
    .update(integrations)
    .set({ config: sql`${integrations.config} || ${JSON.stringify(state)}::jsonb`, ...(status ? { status, lastError: status === "error" ? (state.lastSyncError ?? null) : null } : {}), updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));
}

async function fetchSource(type: CatalogType, config: CatalogConfig, credentials: string | null): Promise<StoreProducts> {
  if (type === "shopify_catalog") return shopifyProducts(config.shop!, decryptJson<ShopifyCredentials>(credentials!), config.storeUrl!);
  if (type === "woocommerce") return wooProducts(config.siteUrl!, decryptJson<WooCredentials>(credentials!), config.currency ?? null);
  const feed = parseFeed(await downloadFeed(config.feedUrl!));
  if (!feed.products.length) throw new Error("The feed has no products with an id and a title");
  return feed;
}

/** Syncs every connected store and feed of a site; returns what changed per source. */
export async function syncCatalog(siteId: number) {
  const results: { type: CatalogType; source: ProductSource; count: number; added: number; updated: number; removed: number; error?: string }[] = [];
  for (const connection of await catalogConnections(siteId)) {
    if (connection.status === "disconnected") continue;
    const source = sourceOf(connection.type, connection.config);
    await setSyncState(connection.id, { lastSyncStatus: "syncing" });
    try {
      const fetched = await fetchSource(connection.type, connection.config, connection.credentialsEncrypted);
      const saved = await saveProducts(siteId, source, fetched.products, { removeMissing: true });
      const note = fetched.truncated ? "The store has more than 10,000 products; the first 10,000 were synced." : null;
      await setSyncState(connection.id, { lastSyncAt: new Date().toISOString(), lastSyncStatus: note ? "notice" : "success", lastSyncError: null, lastSyncNote: note }, "connected");
      results.push({ type: connection.type, source, count: fetched.products.length, ...saved });
    } catch (error) {
      const message = (error as Error).message;
      await setSyncState(connection.id, { lastSyncAt: new Date().toISOString(), lastSyncStatus: "failed", lastSyncError: message }, "error");
      results.push({ type: connection.type, source, count: 0, added: 0, updated: 0, removed: 0, error: message });
    }
  }
  return results;
}

/** The website whose catalog a site uses: language sites share their primary website's catalog. */
export const catalogOwnerId = (site: { id: number; primaryOrgWebsiteId: number | null }) => site.primaryOrgWebsiteId ?? site.id;

/** The catalog owner and its language sites (all of them feature its products). */
export async function catalogFamily(ownerId: number) {
  return db
    .select({ id: orgWebsites.id, timeZone: orgWebsites.timeZone })
    .from(orgWebsites)
    .where(or(eq(orgWebsites.id, ownerId), eq(orgWebsites.primaryOrgWebsiteId, ownerId)));
}

/** Products articles may feature: included, with a URL, and live in the store. */
export const featurable = (siteId: number) =>
  and(eq(products.orgWebsiteId, siteId), eq(products.includeInArticles, true), isNotNull(products.url), eq(products.status, "active"));
