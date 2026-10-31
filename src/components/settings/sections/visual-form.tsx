"use client";

import { ArrowRight, ArrowUpRight, Check, Contact, Link2, MapPin, Megaphone, Palette, PanelTop, Plus, SquarePlay, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { BODY_STYLES, COVER_STYLES, hasTitle, INFOGRAPHIC_STYLES, type BodyStyle, type CoverStyle, type InfographicStyle } from "@/lib/visuals";
import { updateVisuals } from "@/server/actions/settings";
import { inputClass, ListInput, useSave } from "../form-kit";

export type VisualSettings = {
  rules: string[];
  heroImageStyle: CoverStyle;
  bodyImageStyle: BodyStyle;
  infographicStyle: InfographicStyle;
  imageMood: string;
  links: { enabled: boolean; items: { label: string; url: string }[] };
  map: { enabled: boolean; address: string; mapsUrl: string };
  contact: { enabled: boolean; phone: string; whatsapp: string; email: string };
  promo: { enabled: boolean };
  youtube: { enabled: boolean; channel: string };
};

function Section({ title, hint, badge, children }: { title: ReactNode; hint: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-sans text-[17px] font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{hint}</p>
        </div>
        {badge}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Where({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-secondary">
      <PanelTop className="size-3.5 text-brand" />
      {label}
    </span>
  );
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-brand checked:before:translate-x-[22px] disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/** Small drawn sample of each style (decorative; no example images are shipped). */
function StylePreview({ style, brandColor, title }: { style: string; brandColor: string; title: string }) {
  const backgrounds: Record<string, CSSProperties> = {
    realistic: { background: "linear-gradient(160deg, #c9b79c 0%, #8a7559 45%, #4a5a6a 100%)" },
    "3d_illustration": { background: "radial-gradient(circle at 30% 35%, #ffffff 0 14%, transparent 15%), radial-gradient(circle at 70% 60%, #e8eefc 0 20%, transparent 21%), linear-gradient(135deg, #dfe7f7, #b9c8ee)" },
    sketch: { background: "repeating-linear-gradient(-35deg, transparent 0 9px, rgba(60,60,60,.18) 9px 10px), #f7f3ea" },
    watercolor: { background: "radial-gradient(circle at 25% 30%, rgba(240,150,120,.55), transparent 45%), radial-gradient(circle at 75% 70%, rgba(110,160,220,.5), transparent 50%), #fbf8f2" },
  };
  const base = style.replace("_with_title", "");
  return (
    <span aria-hidden className="relative grid aspect-[4/3] w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-line sm:w-32" style={backgrounds[base] ?? backgrounds.realistic}>
      {base === "3d_illustration" && <span className="size-9 rounded-xl bg-white shadow-[6px_8px_14px_rgba(40,60,120,.35)]" />}
      {hasTitle(style) && (
        <span
          className={cn("px-2 text-center font-serif text-[13px] font-semibold leading-tight", base === "realistic" && "text-white drop-shadow")}
          style={base === "realistic" ? undefined : { color: brandColor }}
        >
          {title}
        </span>
      )}
    </span>
  );
}

function OptionCard({ selected, onSelect, disabled, preview, name, description }: { selected: boolean; onSelect: () => void; disabled?: boolean; preview?: ReactNode; name: string; description: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed",
        selected ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-line bg-white hover:border-ink/20",
      )}
    >
      {preview}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {name}
          {selected && <Check className="size-4 text-brand" />}
        </span>
        <span className="mt-1 block text-sm text-ink-secondary">{description}</span>
      </span>
    </button>
  );
}

function BrandNote() {
  const t = useTranslations("settings.visual");
  return (
    <p className="mt-4 text-sm text-ink-secondary">
      {t("brandNote")}{" "}
      <Link href="/dashboard/settings/branding" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
        <Palette className="size-3.5" />
        {t("editBranding")}
      </Link>
    </p>
  );
}

function CtaRow({ icon, name, where, description, enabled, onToggle, canToggle, warning, children }: { icon: ReactNode; name: string; where: string; description: string; enabled: boolean; onToggle: (value: boolean) => void; canToggle: boolean; warning?: string | null; children?: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border", enabled ? "border-brand/50 bg-brand/[0.03]" : "border-line")}>
      <div className="flex items-start gap-4 p-4 md:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-canvas text-brand">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-ink">{name}</p>
            <Where label={where} />
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
          {warning && <p className="mt-1 text-sm font-medium text-brand">{warning}</p>}
        </div>
        <Switch checked={enabled} onChange={onToggle} disabled={!canToggle} label={name} />
      </div>
      {children && <div className="border-t border-line px-4 py-4 md:px-5">{children}</div>}
    </div>
  );
}

export function VisualForm({ canEdit, initial, brandColor, brandName, imagesAvailable }: { canEdit: boolean; initial: VisualSettings; brandColor: string; brandName: string; imagesAvailable: boolean }) {
  const t = useTranslations("settings.visual");
  const [form, setForm] = useState(initial);
  const set = <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  // Rows left completely empty are dropped rather than reported as errors.
  const { button } = useSave(() => updateVisuals({ ...form, links: { ...form.links, items: form.links.items.filter((item) => item.label.trim() || item.url.trim()) } }));
  const label = (group: "styles" | "bodyStyles" | "infographicStyles", key: string) => t.raw(`${group}.${key}`) as [string, string];
  const contactReady = Boolean(form.contact.phone || form.contact.whatsapp || form.contact.email);
  const mapReady = Boolean(form.map.address);

  return (
    <div className="space-y-6 pb-24">
      <p className="-mt-4 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      {!imagesAvailable && <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("noProvider")}</p>}

      <Section
        title={
          <>
            {t("rules")}
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-secondary">{t("optional")}</span>
          </>
        }
        hint={t("rulesHint")}
        badge={
          <Link href="/dashboard/settings/writing" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink">
            {t("writingLink")}
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        <ListInput id="image-rules" items={form.rules} onChange={(rules) => set("rules", rules)} placeholder={t("rulePlaceholder")} disabled={!canEdit} />
      </Section>

      <Section title={t("cover.title")} hint={t("cover.hint")} badge={<Where label={t("where.top")} />}>
        <div className="grid gap-3 lg:grid-cols-2" role="radiogroup" aria-label={t("cover.title")}>
          {COVER_STYLES.map((style) => {
            const [name, description] = label("styles", style);
            return (
              <OptionCard
                key={style}
                selected={form.heroImageStyle === style}
                onSelect={() => set("heroImageStyle", style)}
                disabled={!canEdit}
                preview={<StylePreview style={style} brandColor={brandColor} title={t("sampleTitle")} />}
                name={name}
                description={description}
              />
            );
          })}
        </div>
        <BrandNote />
      </Section>

      <Section title={t("body.title")} hint={t("body.hint")} badge={<Where label={t("where.body")} />}>
        <div className="grid gap-3 lg:grid-cols-2" role="radiogroup" aria-label={t("body.title")}>
          {BODY_STYLES.map((style) => {
            const [name, description] = label("bodyStyles", style);
            return <OptionCard key={style} selected={form.bodyImageStyle === style} onSelect={() => set("bodyImageStyle", style)} disabled={!canEdit} preview={<StylePreview style={style} brandColor={brandColor} title="" />} name={name} description={description} />;
          })}
        </div>
        <label htmlFor="image-mood" className="mt-5 block text-sm font-medium text-ink">
          {t("mood")}
        </label>
        <p className="mt-0.5 text-xs text-ink-subtle">{t("moodHint")}</p>
        <textarea
          id="image-mood"
          value={form.imageMood}
          disabled={!canEdit}
          maxLength={600}
          rows={3}
          onChange={(event) => set("imageMood", event.target.value)}
          placeholder={t("moodPlaceholder")}
          className={cn(inputClass, "h-auto py-2.5")}
        />
        <BrandNote />
      </Section>

      <Section title={t("infographic.title")} hint={t("infographic.hint")} badge={<Where label={t("where.body")} />}>
        <div className="grid gap-3 lg:grid-cols-2" role="radiogroup" aria-label={t("infographic.title")}>
          {INFOGRAPHIC_STYLES.map((style) => {
            const [name, description] = label("infographicStyles", style);
            return <OptionCard key={style} selected={form.infographicStyle === style} onSelect={() => set("infographicStyle", style)} disabled={!canEdit} name={name} description={description} />;
          })}
        </div>
        <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-ink-secondary">{t("infographic.soon")}</p>
      </Section>

      <Section title={t("ctas.title")} hint={t("ctas.hint")}>
        <div className="space-y-3">
          <CtaRow
            icon={<Link2 className="size-5" />}
            name={t("link.name")}
            where={t("where.afterSummary")}
            description={t("link.description")}
            enabled={form.links.enabled}
            onToggle={(enabled) => set("links", { ...form.links, enabled })}
            canToggle={canEdit}
          >
            {form.links.enabled && (
              <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                <div>
                  <p className="text-sm text-ink-secondary">{t("link.pagesHint")}</p>
                  <div className="mt-3 space-y-2">
                    {form.links.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] items-end gap-2">
                        <label className="text-xs font-medium text-ink-secondary">
                          {index === 0 && t("link.buttonText")}
                          <input
                            aria-label={`${t("link.buttonText")} ${index + 1}`}
                            value={item.label}
                            disabled={!canEdit}
                            maxLength={40}
                            placeholder={t("link.buttonPlaceholder")}
                            onChange={(event) => set("links", { ...form.links, items: form.links.items.map((other, i) => (i === index ? { ...other, label: event.target.value } : other)) })}
                            className={inputClass}
                          />
                        </label>
                        <label className="text-xs font-medium text-ink-secondary">
                          {index === 0 && t("link.page")}
                          <input
                            aria-label={`${t("link.page")} ${index + 1}`}
                            value={item.url}
                            disabled={!canEdit}
                            placeholder={t("link.pagePlaceholder")}
                            onChange={(event) => set("links", { ...form.links, items: form.links.items.map((other, i) => (i === index ? { ...other, url: event.target.value } : other)) })}
                            className={inputClass}
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={t("link.removePage")}
                          disabled={!canEdit}
                          onClick={() => set("links", { ...form.links, items: form.links.items.filter((_, i) => i !== index) })}
                          className="grid size-11 place-items-center rounded-control text-ink-subtle hover:bg-canvas hover:text-ink"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {canEdit && form.links.items.length < 5 && (
                    <button type="button" onClick={() => set("links", { ...form.links, items: [...form.links.items, { label: "", url: "" }] })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                      <Plus className="size-4" />
                      {t("link.addPage")}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{t("link.look")}</p>
                  <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                    <div className="p-4 text-white" style={{ background: brandColor }}>
                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: brandColor }}>
                        {brandName}
                      </span>
                      <p className="mt-3 text-[15px] font-semibold leading-snug">{t("link.lookTitle")}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-ink-secondary">{t("link.lookPitch")}</p>
                      <span className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: brandColor }}>
                        {form.links.items[0]?.label || t("link.lookButton")}
                        <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-ink-subtle">{t("link.lookNote")}</p>
                </div>
              </div>
            )}
          </CtaRow>

          <CtaRow
            icon={<MapPin className="size-5" />}
            name={t("map.name")}
            where={t("where.body")}
            description={t("map.description")}
            enabled={form.map.enabled && mapReady}
            onToggle={(enabled) => set("map", { ...form.map, enabled })}
            canToggle={canEdit && mapReady}
            warning={mapReady ? null : t("map.needs")}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-ink">
                {t("map.address")}
                <input value={form.map.address} disabled={!canEdit} maxLength={200} placeholder={t("map.addressPlaceholder")} onChange={(event) => set("map", { ...form.map, address: event.target.value, enabled: event.target.value ? form.map.enabled : false })} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-ink">
                {t("map.mapsUrl")}
                <input value={form.map.mapsUrl} disabled={!canEdit} placeholder="https://maps.google.com/…" onChange={(event) => set("map", { ...form.map, mapsUrl: event.target.value })} className={inputClass} />
              </label>
            </div>
          </CtaRow>

          <CtaRow
            icon={<Contact className="size-5" />}
            name={t("contact.name")}
            where={t("where.end")}
            description={t("contact.description")}
            enabled={form.contact.enabled && contactReady}
            onToggle={(enabled) => set("contact", { ...form.contact, enabled })}
            canToggle={canEdit && contactReady}
            warning={contactReady ? null : t("contact.needs")}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(["phone", "whatsapp", "email"] as const).map((field) => (
                <label key={field} className="text-sm font-medium text-ink">
                  {t(`contact.${field}`)}
                  <input
                    type={field === "email" ? "email" : "tel"}
                    value={form.contact[field]}
                    disabled={!canEdit}
                    maxLength={field === "email" ? 200 : 40}
                    onChange={(event) => {
                      const next = { ...form.contact, [field]: event.target.value };
                      set("contact", { ...next, enabled: next.phone || next.whatsapp || next.email ? next.enabled : false });
                    }}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </CtaRow>

          <CtaRow
            icon={<Megaphone className="size-5" />}
            name={t("promo.name")}
            where={t("where.beforeFaq")}
            description={t("promo.description")}
            enabled={form.promo.enabled}
            onToggle={(enabled) => set("promo", { enabled })}
            canToggle={canEdit}
          />
        </div>
        <BrandNote />
      </Section>

      <Section title={t("youtube.title")} hint={t("youtube.hint")} badge={<Where label={t("where.body")} />}>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <SquarePlay className="size-4 text-brand" />
            {t("youtube.toggle")}
          </span>
          <Switch checked={form.youtube.enabled} onChange={(enabled) => set("youtube", { ...form.youtube, enabled })} disabled={!canEdit} label={t("youtube.toggle")} />
        </div>
        {form.youtube.enabled && (
          <label className="mt-4 block max-w-sm text-sm font-medium text-ink">
            {t("youtube.channel")}
            <input value={form.youtube.channel} disabled={!canEdit} maxLength={100} placeholder={t("youtube.channelPlaceholder")} onChange={(event) => set("youtube", { ...form.youtube, channel: event.target.value })} className={inputClass} />
          </label>
        )}
      </Section>

      {canEdit && <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-line bg-white/95 px-5 py-3 shadow-lg backdrop-blur">{button()}</div>}
    </div>
  );
}
