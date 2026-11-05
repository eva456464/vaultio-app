"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ARTICLE_LENGTHS, ENGLISH_TYPES, SELECTABLE_ARTICLE_TYPES, type ArticleLength, type EnglishType } from "@/lib/writing";
import { cn } from "@/lib/utils";
import { updateWriting } from "@/server/actions/settings";
import { Field, inputClass, SettingsCard, Toggle, useSave, useServerState } from "../form-kit";

export type WritingSettings = {
  englishType: EnglishType;
  articleLength: ArticleLength;
  allowedArticleTypes: (typeof SELECTABLE_ARTICLE_TYPES)[number][];
  includeRecommendedReads: boolean;
  includeCitation: boolean;
  useWwwInLinks: boolean;
  useTrailingSlashInLinks: boolean;
  includeTldr: boolean;
  summaryStyle: "tldr" | "key_takeaways";
  includeToc: boolean;
  includeSourcesSection: boolean;
  includeInternalLinks: boolean;
  includePerspective: boolean;
  mentionCompetitorsIfRelevant: boolean;
  includeJsonLd: boolean;
  includeFaqJsonLd: boolean;
  authorName: string;
  articleDisclaimer: string;
};

export function WritingForm({ canEdit, initial, isEnglish, instructions }: { canEdit: boolean; initial: WritingSettings; isEnglish: boolean; instructions: ReactNode }) {
  const t = useTranslations("settings.writing");
  const [form, setForm] = useServerState(initial);
  const set = <K extends keyof WritingSettings>(key: K, value: WritingSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const { button } = useSave(() => updateWriting(form));
  const toggles: [keyof WritingSettings, string][] = [
    ["includeToc", t("toc")],
    ["includeRecommendedReads", t("recommendedReads")],
    ["includeCitation", t("citations")],
    ["includeSourcesSection", t("sources")],
    ["includeInternalLinks", t("internalLinks")],
    ["includePerspective", t("perspective")],
    ["mentionCompetitorsIfRelevant", t("competitors")],
    ["includeJsonLd", t("jsonLd")],
    ["includeFaqJsonLd", t("faqJsonLd")],
  ];

  return (
    <div className="space-y-6">
      {instructions}
      <SettingsCard title={t("language")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {isEnglish && (
            <Field label={t("englishType")} htmlFor="english-type">
              <select id="english-type" value={form.englishType} disabled={!canEdit} onChange={(e) => set("englishType", e.target.value as WritingSettings["englishType"])} className={inputClass}>
                {ENGLISH_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`english.${type}`)}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t("length")} htmlFor="length">
            <select id="length" value={form.articleLength} disabled={!canEdit} onChange={(e) => set("articleLength", e.target.value as ArticleLength)} className={inputClass}>
              {ARTICLE_LENGTHS.map((value) => (
                <option key={value} value={value}>{t(`lengths.${value}`)}</option>
              ))}
            </select>
          </Field>
        </div>
      </SettingsCard>
      <SettingsCard title={t("articleTypes")} hint={t("articleTypesHint")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {SELECTABLE_ARTICLE_TYPES.map((type) => {
            const on = form.allowedArticleTypes.includes(type);
            return (
              <label key={type} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", on ? "border-ink/30 bg-canvas" : "border-line")}>
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-ink"
                  checked={on}
                  disabled={!canEdit || (on && form.allowedArticleTypes.length === 1)}
                  onChange={() => set("allowedArticleTypes", on ? form.allowedArticleTypes.filter((entry) => entry !== type) : [...form.allowedArticleTypes, type])}
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{t(`types.${type}.label`)}</span>
                  <span className="block text-xs text-ink-secondary">{t(`types.${type}.hint`)}</span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-subtle">{form.allowedArticleTypes.length === SELECTABLE_ARTICLE_TYPES.length ? t("typesAutomatic") : t("typesCount", { count: form.allowedArticleTypes.length })}</p>
      </SettingsCard>
      <SettingsCard title={t("structure")} footer={canEdit ? button() : undefined}>
        <Toggle
          id="tldr"
          label={t("tldr")}
          checked={form.includeTldr}
          onChange={(value) => set("includeTldr", value)}
          disabled={!canEdit}
          extra={
            form.includeTldr && (
              <select aria-label={t("tldr")} value={form.summaryStyle} disabled={!canEdit} onChange={(e) => set("summaryStyle", e.target.value as WritingSettings["summaryStyle"])} className="h-9 rounded-control border border-control px-2 text-sm">
                <option value="tldr">{t("summaryStyle.tldr")}</option>
                <option value="key_takeaways">{t("summaryStyle.key_takeaways")}</option>
              </select>
            )
          }
        />
        {toggles.map(([key, label]) => (
          <Toggle key={key} id={key} label={label} checked={Boolean(form[key])} onChange={(value) => set(key, value as never)} disabled={!canEdit} />
        ))}
        <div className="space-y-1 border-t border-line pt-4">
          <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{t("linkFormat")}</p>
          <Toggle id="www" label={t("useWww")} checked={form.useWwwInLinks} onChange={(value) => set("useWwwInLinks", value)} disabled={!canEdit} />
          <Toggle id="slash" label={t("useTrailingSlash")} checked={form.useTrailingSlashInLinks} onChange={(value) => set("useTrailingSlashInLinks", value)} disabled={!canEdit} />
        </div>
        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field label={t("author")} htmlFor="author">
            <input id="author" value={form.authorName} disabled={!canEdit} onChange={(e) => set("authorName", e.target.value)} placeholder={t("authorPlaceholder")} className={inputClass} />
          </Field>
          <Field label={t("disclaimer")} htmlFor="disclaimer">
            <input id="disclaimer" value={form.articleDisclaimer} disabled={!canEdit} onChange={(e) => set("articleDisclaimer", e.target.value)} placeholder={t("disclaimerPlaceholder")} className={inputClass} />
          </Field>
        </div>
      </SettingsCard>
    </div>
  );
}
