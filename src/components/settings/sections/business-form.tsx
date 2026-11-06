"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ServiceOffered } from "@/db/schema";
import { updateBusiness } from "@/server/actions/settings";
import { Field, inputClass, ListInput, SettingsCard, useSave } from "../form-kit";

type Props = {
  canEdit: boolean;
  initial: {
    brandName: string;
    description: string;
    industry: string;
    businessType: string;
    positioning: string;
    targetAudience: string[];
    servicesOffered: ServiceOffered[];
    blogUrl: string;
  };
};

export function BusinessForm({ canEdit, initial }: Props) {
  const t = useTranslations("settings.business");
  const [form, setForm] = useState(initial);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const { button } = useSave(() =>
    updateBusiness({
      ...form,
      servicesOffered: form.servicesOffered.map((offer) => ({
        kind: offer.kind,
        name: offer.name,
        amount: offer.amount || undefined,
        priceType: offer.amount ? (offer.priceType ?? "fixed") : undefined,
        currency: offer.amount ? offer.currency || "USD" : undefined,
        period: offer.period || undefined,
      })),
    }),
  );
  const updateOffer = (index: number, patch: Partial<ServiceOffered>) =>
    set("servicesOffered", form.servicesOffered.map((offer, i) => (i === index ? { ...offer, ...patch } : offer)));

  return (
    <div className="space-y-6">
      <SettingsCard title={t("about")} hint={t("aboutHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")} htmlFor="brand-name">
            <input id="brand-name" value={form.brandName} disabled={!canEdit} onChange={(e) => set("brandName", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("industry")} htmlFor="industry">
            <input id="industry" value={form.industry} disabled={!canEdit} onChange={(e) => set("industry", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("businessType")} htmlFor="business-type">
            <input id="business-type" value={form.businessType} disabled={!canEdit} onChange={(e) => set("businessType", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label={t("description")} htmlFor="description">
          <textarea id="description" value={form.description} disabled={!canEdit} onChange={(e) => set("description", e.target.value)} className={`${inputClass} h-28 py-3`} />
        </Field>
        <Field label={t("blogUrl")} htmlFor="blog-url" hint={t("blogUrlHint")}>
          <input id="blog-url" value={form.blogUrl} disabled={!canEdit} onChange={(e) => set("blogUrl", e.target.value)} placeholder={t("blogUrlPlaceholder")} className={inputClass} />
        </Field>
        <Field label={t("positioning")} htmlFor="positioning" hint={`${t("positioningHint")} ${t("counter", { count: form.positioning.length, max: 500 })}`}>
          <textarea id="positioning" maxLength={500} value={form.positioning} disabled={!canEdit} onChange={(e) => set("positioning", e.target.value)} className={`${inputClass} h-24 py-3`} />
        </Field>
      </SettingsCard>

      <SettingsCard title={t("audience")} hint={t("audienceHint")}>
        <ListInput id="audience" items={form.targetAudience} onChange={(items) => set("targetAudience", items)} placeholder={t("audiencePlaceholder")} disabled={!canEdit} />
      </SettingsCard>

      <SettingsCard title={t("offers")} hint={t("offersHint")} footer={canEdit ? button() : undefined}>
        <ul className="space-y-3">
          {form.servicesOffered.map((offer, index) => (
            <li key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <input aria-label={t("offerName")} value={offer.name} disabled={!canEdit} onChange={(e) => updateOffer(index, { name: e.target.value })} placeholder={t("offerName")} className={`${inputClass} mt-0`} />
              <select aria-label={t("offerKind")} value={offer.kind} disabled={!canEdit} onChange={(e) => updateOffer(index, { kind: e.target.value as ServiceOffered["kind"] })} className={`${inputClass} mt-0`}>
                <option value="service">{t("kinds.service")}</option>
                <option value="product_line">{t("kinds.product_line")}</option>
              </select>
              <input aria-label={t("amount")} value={offer.amount ?? ""} disabled={!canEdit} onChange={(e) => updateOffer(index, { amount: e.target.value.replace(/[^\d.]/g, "") })} placeholder={t("amount")} className={`${inputClass} mt-0`} />
              <input aria-label={t("period")} value={offer.period ?? ""} disabled={!canEdit} onChange={(e) => updateOffer(index, { period: e.target.value })} placeholder={t("period")} className={`${inputClass} mt-0`} />
              {canEdit && (
                <button type="button" aria-label={t("remove")} onClick={() => set("servicesOffered", form.servicesOffered.filter((_, i) => i !== index))} className="grid size-11 place-items-center rounded-control text-ink-subtle hover:bg-canvas hover:text-ink">
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && form.servicesOffered.length < 20 && (
          <Button type="button" variant="outline" onClick={() => set("servicesOffered", [...form.servicesOffered, { kind: "service", name: "" }])}>
            <Plus />
            {t("addOffer")}
          </Button>
        )}
      </SettingsCard>
    </div>
  );
}
