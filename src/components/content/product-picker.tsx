"use client";

import { Check, LoaderCircle, Package, RotateCcw, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { searchCatalogProducts } from "@/server/actions/catalog";
import type { CalendarProduct } from "@/server/queries/content";

export const MAX_FEATURED = 3;
type Option = { id: number; name: string; imageUrl: string | null };

function Thumb({ product }: { product: Option }) {
  return product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- product photo from the client's catalog
    <img src={product.imageUrl} alt="" className="size-8 shrink-0 rounded-md border border-line object-cover" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-canvas text-ink-subtle"><Package className="size-3.5" /></span>
  );
}

/**
 * Picks the products an article features. `custom` is false while the agent's suggestion is used;
 * changing the selection makes it the article's own choice.
 */
export function ProductPicker({
  selected,
  custom,
  proposedIds,
  onChange,
}: {
  selected: CalendarProduct[];
  custom: boolean;
  proposedIds: number[];
  onChange: (value: { selected: CalendarProduct[]; custom: boolean }) => void;
}) {
  const t = useTranslations("content.instructions.products");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[] | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchCatalogProducts(query);
      if (cancelled) return;
      setOptions(found);
      if (!query) setEmpty(found.length === 0);
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const chosen = new Set(selected.map((product) => product.id));
  const toggle = (product: Option & { url?: string | null }) => {
    if (chosen.has(product.id)) onChange({ selected: selected.filter((item) => item.id !== product.id), custom: true });
    else if (selected.length < MAX_FEATURED) onChange({ selected: [...selected, { id: product.id, name: product.name, imageUrl: product.imageUrl, url: product.url ?? null }], custom: true });
  };
  const restore = async () => {
    const products = proposedIds.length ? await searchCatalogProducts("", proposedIds) : [];
    onChange({ selected: proposedIds.flatMap((id) => products.filter((product) => product.id === id)), custom: false });
  };

  if (empty && !selected.length) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-control p-4">
        <p className="text-sm font-medium text-ink">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-ink-secondary">{t("emptyBody")}</p>
        <Link href="/dashboard/settings/product-catalog" className="mt-2 inline-block text-sm font-medium text-ink underline underline-offset-2">
          {t("goToCatalog")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{t("title")}</p>
        <span className="text-xs text-ink-subtle">{custom ? t("chosenByHand") : t("suggested")}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-secondary">{t("subtitle", { max: MAX_FEATURED })}</p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label={t("selected")}>
        {selected.length === 0 && <li className="text-sm text-ink-subtle">{t("none")}</li>}
        {selected.map((product) => (
          <li key={product.id} className="flex items-center gap-2 rounded-full border border-line bg-canvas py-1 pl-1 pr-2 text-sm text-ink">
            <Thumb product={product} />
            <span className="max-w-[180px] truncate">{product.name}</span>
            <button type="button" onClick={() => toggle(product)} aria-label={t("remove", { name: product.name })} className="text-ink-subtle hover:text-ink">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange({ selected: [], custom: true })} className="font-medium text-ink-secondary hover:text-ink">
            {t("clear")}
          </button>
        )}
        {custom && (
          <button type="button" onClick={() => void restore()} className="inline-flex items-center gap-1 font-medium text-ink-secondary hover:text-ink">
            <RotateCcw className="size-3" />
            {t("restore")}
          </button>
        )}
      </div>
      <label className="relative mt-3 block">
        <span className="sr-only">{t("search")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className="h-10 w-full rounded-control border border-control pl-9 pr-3 text-sm outline-none focus:border-ink/40" />
      </label>
      <ul className="mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {options === null && (
          <li className="flex items-center gap-2 p-3 text-sm text-ink-secondary">
            <LoaderCircle className="size-4 animate-spin" />
          </li>
        )}
        {options?.length === 0 && <li className="p-3 text-sm text-ink-secondary">{t("noResults")}</li>}
        {options?.map((product) => {
          const on = chosen.has(product.id);
          const full = !on && selected.length >= MAX_FEATURED;
          return (
            <li key={product.id}>
              <button type="button" disabled={full} onClick={() => toggle(product)} aria-pressed={on} title={full ? t("max", { max: MAX_FEATURED }) : undefined} className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-canvas disabled:opacity-50">
                <Thumb product={product} />
                <span className="min-w-0 flex-1 truncate text-ink">{product.name}</span>
                <span className={cn("grid size-5 place-items-center rounded-md border", on ? "border-ink bg-ink text-white" : "border-control")}>{on && <Check className="size-3.5" />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
