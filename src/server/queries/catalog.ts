/** Read models for Settings → Product catalog and the article product picker. */
import "server-only";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, type ProductSource } from "@/db/schema";
import { catalogConnections, featurable, type CatalogConfig } from "../catalog/catalog";

export const PRODUCTS_PER_PAGE = 25;

export type CatalogProduct = {
  id: number;
  source: ProductSource;
  externalId: string | null;
  name: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  brand: string | null;
  category: string | null;
  status: "active" | "draft";
  variants: number;
  includeInArticles: boolean;
  updatedAt: string;
};

export type CatalogStore = { type: "shopify_catalog" | "woocommerce"; name: string; address: string; status: string; config: CatalogConfig };
export type CatalogFeed = { url: string; format: "google_shopping" | "facebook"; status: string; config: CatalogConfig };

export async function getCatalog(siteId: number, filters: { search?: string; status?: string; page?: number }) {
  const connections = await catalogConnections(siteId);
  const storeRow = connections.find((connection) => connection.type === "shopify_catalog" || connection.type === "woocommerce");
  const feedRow = connections.find((connection) => connection.type === "product_feed");
  const store: CatalogStore | null = storeRow
    ? {
        type: storeRow.type as CatalogStore["type"],
        name: storeRow.config.storeName ?? "",
        address: storeRow.type === "shopify_catalog" ? (storeRow.config.shop ?? "") : (storeRow.config.siteUrl ?? ""),
        status: storeRow.status,
        config: storeRow.config,
      }
    : null;
  const feed: CatalogFeed | null = feedRow ? { url: feedRow.config.feedUrl ?? "", format: feedRow.config.format ?? "google_shopping", status: feedRow.status, config: feedRow.config } : null;

  const bySource = Object.fromEntries(
    (await db.select({ source: products.source, total: count() }).from(products).where(eq(products.orgWebsiteId, siteId)).groupBy(products.source)).map((row) => [row.source, row.total]),
  ) as Partial<Record<ProductSource, number>>;
  const total = Object.values(bySource).reduce((sum, value) => sum + (value ?? 0), 0);

  const search = filters.search?.trim();
  const where = and(
    eq(products.orgWebsiteId, siteId),
    filters.status === "active" || filters.status === "draft" ? eq(products.status, filters.status) : undefined,
    search ? or(ilike(products.name, `%${search}%`), ilike(products.brand, `%${search}%`), ilike(products.category, `%${search}%`), ilike(products.externalId, `%${search}%`)) : undefined,
  );
  const [{ matching }] = await db.select({ matching: count() }).from(products).where(where);
  const pages = Math.max(1, Math.ceil(matching / PRODUCTS_PER_PAGE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pages);
  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(sql`${products.status} = 'draft'`, asc(products.name), asc(products.id))
    .limit(PRODUCTS_PER_PAGE)
    .offset((page - 1) * PRODUCTS_PER_PAGE);
  return {
    store,
    feed,
    total,
    bySource,
    matching,
    page,
    pages,
    products: rows.map((row): CatalogProduct => ({ ...row, updatedAt: (row.syncedAt ?? row.updatedAt).toISOString() })),
  };
}

export type PickerProduct = { id: number; name: string; imageUrl: string | null; price: string | null; currency: string | null; url: string };

/** Products an article can feature, for the picker (searched by name, brand or category). */
export async function searchFeaturable(siteId: number, query: string, ids: number[] = []): Promise<PickerProduct[]> {
  const text = query.trim();
  const rows = await db
    .select({ id: products.id, name: products.name, imageUrl: products.imageUrl, price: products.price, currency: products.currency, url: products.url })
    .from(products)
    .where(and(featurable(siteId), ids.length ? inArray(products.id, ids) : text ? or(ilike(products.name, `%${text}%`), ilike(products.brand, `%${text}%`), ilike(products.category, `%${text}%`)) : undefined))
    .orderBy(asc(products.name))
    .limit(ids.length ? ids.length : 30);
  return rows.map((row) => ({ ...row, url: row.url! }));
}

/** Whether the site has any product an article could feature. */
export async function hasFeaturableProducts(siteId: number) {
  const [row] = await db.select({ id: products.id }).from(products).where(featurable(siteId)).limit(1);
  return Boolean(row);
}
