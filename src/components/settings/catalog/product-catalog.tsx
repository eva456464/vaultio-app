"use client";

import { Eye, Link2, LoaderCircle, Package, Pencil, Plus, RefreshCw, Search, ShoppingBag, Store, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ProductSource } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { setProductIncluded, syncCatalogNow } from "@/server/actions/catalog";
import type { CatalogProduct } from "@/server/queries/catalog";
import { CatalogDialogs, type DialogState } from "./dialogs";
import { Badge, SourceCards } from "./sources";

type Sync = { at: string | null; status: "syncing" | "success" | "notice" | "failed" | null; error: string | null; note: string | null };
export type CatalogView = {
  store: { type: "shopify_catalog" | "woocommerce"; name: string; address: string; currency: string | null; sync: Sync } | null;
  feed: { url: string; format: "google_shopping" | "facebook"; sync: Sync } | null;
  total: number;
  bySource: Partial<Record<ProductSource, number>>;
  matching: number;
  page: number;
  pages: number;
  filters: { q: string; status: string };
  products: (CatalogProduct & { priceLabel: string | null; updatedLabel: string })[];
};

function SyncLine({ sync }: { sync: Sync }) {
  const t = useTranslations("settings.catalog");
  const style = sync.status === "failed" ? "bg-[#FBEAE6] text-[#9A3412]" : sync.status === "syncing" ? "bg-[#FDF3E2] text-[#8A6320]" : sync.status === "notice" ? "bg-[#FDF3E2] text-[#8A6320]" : "bg-success-bg text-success";
  return (
    <div className="text-sm">
      <p className="text-ink-secondary">
        {t("store.lastSync")}: <span className="text-ink">{sync.at ?? t("store.never")}</span>
        {sync.status && <span className={cn("ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", style)}>{sync.status === "syncing" && <LoaderCircle className="size-3 animate-spin" />}{t(`syncStatus.${sync.status}`)}</span>}
      </p>
      {sync.status === "failed" && sync.error && <p className="mt-2 rounded-xl bg-[#FBEAE6] p-3 text-[#9A3412]">{t("failedBanner", { error: sync.error })}</p>}
      {sync.status === "notice" && sync.note && <p className="mt-2 rounded-xl bg-[#FDF3E2] p-3 text-[#8A6320]">{t("noticeBanner", { note: sync.note })}</p>}
    </div>
  );
}

function IncludeSwitch({ product, canEdit }: { product: CatalogView["products"][number]; canEdit: boolean }) {
  const t = useTranslations("settings.catalog.table");
  const [checked, setChecked] = useState(product.includeInArticles);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start" title={!product.url ? t("includeNeedsUrl") : undefined}>
      <input
        type="checkbox"
        role="switch"
        aria-label={`${t("include")}: ${product.name}`}
        checked={checked}
        disabled={!canEdit || pending || (!product.url && !checked)}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          startTransition(async () => {
            const result = await setProductIncluded(product.id, next);
            if ("error" in result && result.error) {
              setChecked(!next);
              setError(result.error);
            } else setError(null);
          });
        }}
        className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[22px] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error && <span className="mt-1 text-xs text-[#9A3412]">{error}</span>}
    </span>
  );
}

export function ProductCatalog({ view, canEdit }: { view: CatalogView; canEdit: boolean }) {
  const t = useTranslations("settings.catalog");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, startSync] = useTransition();
  const empty = view.total === 0 && !view.store && !view.feed;
  const query = (changes: Record<string, string | number>) => {
    const params = new URLSearchParams({ ...(view.filters.q ? { q: view.filters.q } : {}), ...(view.filters.status ? { status: view.filters.status } : {}) });
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value === 1) params.delete(key);
      else params.set(key, String(value));
    }
    const text = params.toString();
    return `/dashboard/settings/product-catalog${text ? `?${text}` : ""}`;
  };
  const storePlatform = view.store?.type === "woocommerce" ? "woocommerce" : "shopify";

  return (
    <div className="space-y-5">
      <p className="-mt-4 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      {message && <p className="rounded-xl bg-success-bg p-3 text-sm text-success" role="status">{message}</p>}

      {empty ? (
        <section className="card grid overflow-hidden md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="p-6 md:p-8">
            <h2 className="font-sans text-[22px] font-semibold text-ink">{t("empty.title")}</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-secondary">{t("empty.body")}</p>
            <div className="mt-6">{canEdit && <SourceCards view={view} open={setDialog} />}</div>
          </div>
          <div className="hidden items-center justify-center border-l border-line bg-canvas md:flex" aria-hidden>
            <div className="relative h-44 w-48">
              <span className="absolute left-2 top-4 grid size-20 place-items-center rounded-2xl bg-white shadow-sm"><ShoppingBag className="size-8 text-ink-subtle" strokeWidth={1.5} /></span>
              <span className="absolute right-0 top-0 grid size-14 place-items-center rounded-2xl bg-white shadow-sm"><Link2 className="size-6 text-brand" strokeWidth={1.5} /></span>
              <span className="absolute bottom-0 right-6 grid size-24 place-items-center rounded-2xl bg-white shadow-sm"><Package className="size-9 text-ink-subtle" strokeWidth={1.5} /></span>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {view.store && (
              <section className="card p-5">
                <div className="flex items-start gap-3">
                  <Badge platform={storePlatform} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{view.store.name || t(`platforms.${storePlatform}`)}</p>
                    <p className="truncate text-xs text-ink-subtle">{t(`platforms.${storePlatform}`)} · {view.store.address}</p>
                  </div>
                </div>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div>
                    <dt className="inline text-ink-secondary">{t("store.products")}: </dt>
                    <dd className="inline text-ink">{view.bySource[storePlatform] ?? 0}</dd>
                  </div>
                  {view.store.currency && (
                    <div>
                      <dt className="inline text-ink-secondary">{t("store.currency")}: </dt>
                      <dd className="inline text-ink">{view.store.currency}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-2">
                  <SyncLine sync={view.store.sync} />
                </div>
                {canEdit && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={syncing || view.store.sync.status === "syncing"}
                      onClick={() =>
                        startSync(async () => {
                          const result = await syncCatalogNow();
                          setMessage("error" in result && result.error ? result.error : t("syncStarted"));
                        })
                      }
                    >
                      <RefreshCw className={cn(syncing && "animate-spin")} />
                      {t("sync")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialog({ kind: storePlatform, update: true, values: { store: view.store!.address } })}>
                      {t("editConnection")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "disconnect", type: view.store!.type })}>
                      {t("disconnect")}
                    </Button>
                  </div>
                )}
              </section>
            )}
            {view.feed && (
              <section className="card p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FDF5F3] text-[#C2410C]"><Link2 className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{t(`platforms.${view.feed.format}`)}</p>
                    <p className="truncate text-xs text-ink-subtle">{view.feed.url}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-ink-secondary">
                  {t("store.products")}: <span className="text-ink">{view.bySource[view.feed.format] ?? 0}</span> · {t("feed.daily")}
                </p>
                <div className="mt-2">
                  <SyncLine sync={view.feed.sync} />
                </div>
                {canEdit && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!view.store && (
                      <Button
                        size="sm"
                        disabled={syncing || view.feed.sync.status === "syncing"}
                        onClick={() =>
                          startSync(async () => {
                            const result = await syncCatalogNow();
                            setMessage("error" in result && result.error ? result.error : t("syncStarted"));
                          })
                        }
                      >
                        <RefreshCw className={cn(syncing && "animate-spin")} />
                        {t("sync")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "feed", format: view.feed!.format, url: view.feed!.url })}>
                      {t("editConnection")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "disconnect", type: "product_feed" })}>
                      {t("feed.remove")}
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <form method="get" className="flex min-w-[240px] flex-1 items-center gap-2" role="search">
                <label className="relative flex-1">
                  <span className="sr-only">{t("table.search")}</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
                  <input name="q" defaultValue={view.filters.q} placeholder={t("table.searchPlaceholder")} className="h-10 w-full rounded-control border border-control bg-white pl-9 pr-3 text-sm outline-none focus:border-ink/40" />
                </label>
                {view.filters.status && <input type="hidden" name="status" value={view.filters.status} />}
                <Button type="submit" size="sm" variant="outline">{t("table.searchButton")}</Button>
              </form>
              <div className="flex gap-1.5" role="group" aria-label={t("table.status")}>
                {(["", "active", "draft"] as const).map((status) => (
                  <Link
                    key={status || "all"}
                    href={query({ status, page: 1 })}
                    aria-current={view.filters.status === status ? "page" : undefined}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", view.filters.status === status ? "border-ink bg-ink text-white" : "border-control bg-white text-ink-secondary hover:text-ink")}
                  >
                    {t(`table.${status || "all"}` as "table.all")}
                  </Link>
                ))}
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => setDialog({ kind: "sources" })}>
                  <Plus />
                  {t("addProducts")}
                </Button>
              )}
            </div>

            {view.products.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-secondary">{t("table.noMatches")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-canvas/60 text-left text-xs uppercase tracking-wide text-ink-subtle">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">{t("table.product")}</th>
                      <th className="px-3 py-2.5 font-medium">{t("table.source")}</th>
                      <th className="px-3 py-2.5 font-medium">{t("table.price")}</th>
                      <th className="px-3 py-2.5 font-medium">{t("table.updated")}</th>
                      <th className="px-3 py-2.5 font-medium">{t("table.includeShort")}</th>
                      <th className="px-4 py-2.5 font-medium"><span className="sr-only">{t("table.actions")}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {view.products.map((product) => (
                      <tr key={product.id} className="align-middle">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-3">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- product photos come from the client's store or our /media route
                              <img src={product.imageUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg border border-line object-cover" />
                            ) : (
                              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-canvas text-ink-subtle"><Package className="size-4" /></span>
                            )}
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="block max-w-[260px] truncate font-medium text-ink">{product.name}</span>
                                {product.status === "draft" && <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-ink-secondary">{t("table.draft")}</span>}
                              </span>
                              <span className="block max-w-[280px] truncate text-xs text-ink-subtle">
                                {[product.brand, product.category, product.variants > 1 ? t("table.variants", { count: product.variants }) : null].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-secondary">{t(`sourceShort.${product.source}`)}</td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink">{product.priceLabel ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-secondary">{product.updatedLabel}</td>
                        <td className="px-3 py-3">
                          <IncludeSwitch key={`${product.id}-${product.includeInArticles}`} product={product} canEdit={canEdit} />
                        </td>
                        <td className="px-2 py-3">
                          <span className="flex justify-end gap-1">
                            {product.source === "manual" && canEdit ? (
                              <>
                                <button type="button" onClick={() => setDialog({ kind: "product", product })} className="grid size-8 place-items-center rounded-lg text-ink-secondary hover:bg-canvas hover:text-ink" aria-label={`${t("table.edit")}: ${product.name}`}>
                                  <Pencil className="size-4" />
                                </button>
                                <button type="button" onClick={() => setDialog({ kind: "delete", product })} className="grid size-8 place-items-center rounded-lg text-ink-secondary hover:bg-canvas hover:text-[#9A3412]" aria-label={`${t("table.delete")}: ${product.name}`}>
                                  <Trash2 className="size-4" />
                                </button>
                              </>
                            ) : (
                              <button type="button" onClick={() => setDialog({ kind: "view", product })} className="grid size-8 place-items-center rounded-lg text-ink-secondary hover:bg-canvas hover:text-ink" aria-label={`${t("table.view")}: ${product.name}`}>
                                <Eye className="size-4" />
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-secondary">
              <span className="inline-flex items-center gap-2">
                <Store className="size-4" />
                {t("table.showing", { count: view.matching })}
              </span>
              {view.pages > 1 && (
                <span className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline" disabled={view.page <= 1}>
                    <Link href={query({ page: Math.max(1, view.page - 1) })} aria-disabled={view.page <= 1}>{t("table.previous")}</Link>
                  </Button>
                  <span>{t("table.page", { page: view.page, pages: view.pages })}</span>
                  <Button asChild size="sm" variant="outline" disabled={view.page >= view.pages}>
                    <Link href={query({ page: Math.min(view.pages, view.page + 1) })} aria-disabled={view.page >= view.pages}>{t("table.next")}</Link>
                  </Button>
                </span>
              )}
            </div>
          </section>
        </>
      )}

      <CatalogDialogs state={dialog} view={view} onClose={() => setDialog(null)} onChange={setDialog} onDone={(text) => setMessage(text)} />
    </div>
  );
}
