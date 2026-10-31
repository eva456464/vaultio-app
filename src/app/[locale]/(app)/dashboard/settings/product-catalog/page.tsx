import { getFormatter, getLocale } from "next-intl/server";
import { ProductCatalog, type CatalogView } from "@/components/settings/catalog/product-catalog";
import { SettingsTitle } from "@/components/settings/settings-title";
import { formatPrice } from "@/lib/catalog";
import type { CatalogConfig } from "@/server/catalog/catalog";
import { getAppContext } from "@/server/context";
import { getCatalog } from "@/server/queries/catalog";

export default async function ProductCatalogPage({ searchParams }: PageProps<"/[locale]/dashboard/settings/product-catalog">) {
  const context = (await getAppContext())!;
  const site = context.site!;
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const filters = { search: one(params.q), status: one(params.status), page: Number(one(params.page)) || 1 };
  const [data, format, locale] = await Promise.all([getCatalog(site.id, filters), getFormatter(), getLocale()]);
  // Dates are formatted here, in the site's time zone, so the browser shows the same text.
  const when = (iso: string | undefined) => (iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone: site.timeZone }) : null);
  const sync = (config: CatalogConfig) => ({ at: when(config.lastSyncAt), status: config.lastSyncStatus ?? null, error: config.lastSyncError ?? null, note: config.lastSyncNote ?? null });

  const view: CatalogView = {
    store: data.store ? { type: data.store.type, name: data.store.name, address: data.store.address, currency: data.store.config.currency ?? null, sync: sync(data.store.config) } : null,
    feed: data.feed ? { url: data.feed.url, format: data.feed.format, sync: sync(data.feed.config) } : null,
    total: data.total,
    bySource: data.bySource,
    matching: data.matching,
    page: data.page,
    pages: data.pages,
    filters: { q: filters.search, status: filters.status },
    products: data.products.map((product) => ({
      ...product,
      priceLabel: formatPrice(product.price, product.currency, locale),
      updatedLabel: format.dateTime(new Date(product.updatedAt), { dateStyle: "medium", timeZone: site.timeZone }),
    })),
  };
  const canEdit = context.member?.role === "admin";
  return (
    <>
      <SettingsTitle section="product-catalog" canEdit={canEdit} />
      <ProductCatalog view={view} canEdit={canEdit} />
    </>
  );
}
