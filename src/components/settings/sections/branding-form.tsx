"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateBranding } from "@/server/actions/settings";
import { Field, inputClass, SettingsCard, useSave } from "../form-kit";

export function BrandingForm({ canEdit, initial }: { canEdit: boolean; initial: { brandColor: string; brandSecondaryColor: string; exampleArticleUrl: string } }) {
  const t = useTranslations("settings.branding");
  const [form, setForm] = useState(initial);
  const { button } = useSave(() => updateBranding(form));
  const color = (key: "brandColor" | "brandSecondaryColor", label: string) => (
    <Field label={label} htmlFor={key}>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="color" aria-label={label} value={form[key]} disabled={!canEdit} onChange={(e) => setForm({ ...form, [key]: e.target.value.toUpperCase() })} className="h-11 w-14 cursor-pointer rounded-control border border-control bg-white p-1" />
        <input id={key} value={form[key]} disabled={!canEdit} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={`${inputClass} mt-0 font-mono`} />
      </div>
    </Field>
  );
  return (
    <div className="space-y-6">
      <SettingsCard title={t("colors")} hint={t("colorsHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {color("brandColor", t("primary"))}
          {color("brandSecondaryColor", t("secondary"))}
        </div>
      </SettingsCard>
      <SettingsCard title={t("voice")} hint={t("voiceHint")} footer={canEdit ? button() : undefined}>
        <Field label={t("exampleUrl")} htmlFor="example-url">
          <input id="example-url" value={form.exampleArticleUrl} disabled={!canEdit} onChange={(e) => setForm({ ...form, exampleArticleUrl: e.target.value })} placeholder="https://" className={inputClass} />
        </Field>
      </SettingsCard>
    </div>
  );
}
