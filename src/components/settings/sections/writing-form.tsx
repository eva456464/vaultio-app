"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateWriting } from "@/server/actions/settings";
import { Field, inputClass, ListInput, SettingsCard, Toggle, useSave } from "../form-kit";

export type WritingSettings = {
  rules: string[];
  englishType: "american" | "british";
  articleLengthTarget: number;
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

const LENGTHS = [1200, 1600, 2000, 2500, 3000];

export function WritingForm({ canEdit, initial, isEnglish }: { canEdit: boolean; initial: WritingSettings; isEnglish: boolean }) {
  const t = useTranslations("settings.writing");
  const [form, setForm] = useState(initial);
  const set = <K extends keyof WritingSettings>(key: K, value: WritingSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const { button } = useSave(() => updateWriting(form));
  const toggles: [keyof WritingSettings, string][] = [
    ["includeToc", t("toc")],
    ["includeSourcesSection", t("sources")],
    ["includeInternalLinks", t("internalLinks")],
    ["includePerspective", t("perspective")],
    ["mentionCompetitorsIfRelevant", t("competitors")],
    ["includeJsonLd", t("jsonLd")],
    ["includeFaqJsonLd", t("faqJsonLd")],
  ];

  return (
    <div className="space-y-6">
      <SettingsCard title={t("rules")} hint={t("rulesHint")}>
        <ListInput id="rules" items={form.rules} onChange={(rules) => set("rules", rules)} placeholder={t("rulePlaceholder")} disabled={!canEdit} />
      </SettingsCard>
      <SettingsCard title={t("language")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {isEnglish && (
            <Field label={t("englishType")} htmlFor="english-type">
              <select id="english-type" value={form.englishType} disabled={!canEdit} onChange={(e) => set("englishType", e.target.value as WritingSettings["englishType"])} className={inputClass}>
                <option value="american">{t("english.american")}</option>
                <option value="british">{t("english.british")}</option>
              </select>
            </Field>
          )}
          <Field label={t("length")} htmlFor="length">
            <select id="length" value={form.articleLengthTarget} disabled={!canEdit} onChange={(e) => set("articleLengthTarget", Number(e.target.value))} className={inputClass}>
              {[...new Set([...LENGTHS, form.articleLengthTarget])].sort((a, b) => a - b).map((value) => (
                <option key={value} value={value}>{t("words", { count: value })}</option>
              ))}
            </select>
          </Field>
        </div>
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
