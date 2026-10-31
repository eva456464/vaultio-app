"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateSitemapUrl } from "@/server/actions/settings";
import { Field, inputClass, SettingsCard, useSave } from "../form-kit";

export function SavedPagesForm({ canEdit, sitemapUrl, pages }: { canEdit: boolean; sitemapUrl: string; pages: { url: string; title: string | null }[] }) {
  const t = useTranslations("settings.savedPages");
  const [value, setValue] = useState(sitemapUrl);
  const { button } = useSave(() => updateSitemapUrl(value));
  return (
    <SettingsCard title={t("subtitle")} hint={t("hint")} footer={canEdit ? button() : undefined}>
      <Field label={t("sitemap")} htmlFor="sitemap">
        <input id="sitemap" value={value} disabled={!canEdit} onChange={(e) => setValue(e.target.value)} placeholder={t("sitemapPlaceholder")} className={inputClass} />
      </Field>
      <p className="text-sm font-medium text-ink">{t("count", { count: pages.length })}</p>
      <ul className="max-h-[420px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {pages.map((page) => (
          <li key={page.url} className="px-4 py-2.5 text-sm">
            {page.title && <p className="font-medium text-ink">{page.title}</p>}
            <p className="truncate text-ink-secondary">{page.url}</p>
          </li>
        ))}
        {pages.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-secondary">{t("empty")}</li>}
      </ul>
    </SettingsCard>
  );
}
