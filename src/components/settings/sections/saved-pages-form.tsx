"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { updateSitemapUrl } from "@/server/actions/settings";
import { Field, inputClass, SettingsCard, useSave } from "../form-kit";

export function SavedPagesForm({ canEdit, sitemapUrl, pages }: { canEdit: boolean; sitemapUrl: string; pages: { url: string; title: string | null }[] }) {
  const t = useTranslations("settings.savedPages");
  const [value, setValue] = useState(sitemapUrl);
  const { button } = useSave(() => updateSitemapUrl(value));
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(50);
  const query = search.trim().toLowerCase();
  const matches = useMemo(() => (query ? pages.filter((page) => page.url.toLowerCase().includes(query) || (page.title ?? "").toLowerCase().includes(query)) : pages), [pages, query]);
  return (
    <SettingsCard title={t("subtitle")} hint={t("hint")} footer={canEdit ? button() : undefined}>
      <Field label={t("sitemap")} htmlFor="sitemap">
        <input id="sitemap" value={value} disabled={!canEdit} onChange={(e) => setValue(e.target.value)} placeholder={t("sitemapPlaceholder")} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-ink">{query ? t("matchCount", { count: matches.length }) : t("count", { count: pages.length })}</p>
        {pages.length > 0 && (
          <label className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setShown(50);
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-10 w-full rounded-control border border-control bg-white pl-9 pr-3 text-sm text-ink outline-none focus:border-ink/40"
            />
          </label>
        )}
      </div>
      <ul className="max-h-[420px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {matches.slice(0, shown).map((page) => (
          <li key={page.url} className="px-4 py-2.5 text-sm">
            {page.title && <p className="font-medium text-ink">{page.title}</p>}
            <p className="truncate text-ink-secondary">{page.url}</p>
          </li>
        ))}
        {pages.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-secondary">{t("empty")}</li>}
        {pages.length > 0 && matches.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-secondary">
            <p className="font-medium text-ink">{t("noResults", { search: search.trim() })}</p>
            <p>{t("noResultsHint")}</p>
          </li>
        )}
      </ul>
      {matches.length > shown && (
        <button type="button" onClick={() => setShown(shown + 50)} className="text-sm font-medium text-ink underline-offset-4 hover:underline">
          {t("loadMore")}
        </button>
      )}
    </SettingsCard>
  );
}
