"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { COVER_STYLES, type CoverStyle } from "@/lib/visuals";
import { wizardDetectBrand, wizardSaveBrand } from "@/server/actions/onboarding";
import { BrandPreview } from "./previews";
import { useAdvance } from "./use-advance";
import { Loading, StepActions, WizardFrame } from "./wizard-frame";

type Draft = { brandColor: string; brandSecondaryColor: string; brandDescription: string; voiceExampleUrl: string; heroImageStyle: CoverStyle };
const HEX = /^#[0-9a-f]{6}$/i;

function ColorField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-control border border-control bg-white px-2">
        <input type="color" aria-label={label} value={HEX.test(value) ? value : "#000000"} onChange={(event) => onChange(event.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
        <input id={id} value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} placeholder="#E94545" className="h-10 min-w-0 flex-1 bg-transparent text-sm uppercase text-ink outline-none" />
      </div>
      <p className="mt-1 text-xs text-ink-subtle">{hint}</p>
    </div>
  );
}

/** Step 5: brand colours (found on the website), the look of images, an example article and the cover style. */
export function BrandStep({ brand, back, next }: { brand: { name: string; logoUrl: string | null }; back: string; next: string }) {
  const t = useTranslations("onboarding");
  const tv = useTranslations("settings.visual");
  const advance = useAdvance(next);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let live = true;
    wizardDetectBrand()
      .then((found) => {
        if (!live) return;
        setDraft({
          brandColor: found.primary ?? "#111827",
          brandSecondaryColor: found.secondary ?? "",
          brandDescription: found.brandDescription,
          voiceExampleUrl: "",
          heroImageStyle: (COVER_STYLES as readonly string[]).includes(found.heroImageStyle) ? (found.heroImageStyle as CoverStyle) : "realistic_with_title",
        });
      })
      .catch(() => live && setDraft({ brandColor: "#111827", brandSecondaryColor: "", brandDescription: "", voiceExampleUrl: "", heroImageStyle: "realistic_with_title" }));
    return () => {
      live = false;
    };
  }, []);

  const save = () =>
    startSaving(async () => {
      if (!draft) return;
      if (!HEX.test(draft.brandColor) || (draft.brandSecondaryColor && !HEX.test(draft.brandSecondaryColor))) return setError(t("brand.badColor"));
      setError(null);
      const result = await wizardSaveBrand(draft);
      if ("error" in result) return setError(result.error === "voiceUrl" ? t("brand.badUrl") : t("brand.failed"));
      await advance();
    });

  return (
    <WizardFrame
      brand={brand}
      step={t("stepOf", { step: 5, total: 5 })}
      title={t("brand.title")}
      description={t("brand.description")}
      preview={<BrandPreview primary={draft && HEX.test(draft.brandColor) ? draft.brandColor : "#111827"} secondary={draft && HEX.test(draft.brandSecondaryColor) ? draft.brandSecondaryColor : ""} />}
    >
      {!draft ? (
        <Loading title={t("brand.detecting")} hint={t("brand.detectingHint")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField id="brand-color" label={t("brand.color")} hint={t("brand.colorHint")} value={draft.brandColor} onChange={(brandColor) => setDraft({ ...draft, brandColor })} />
            <ColorField id="brand-secondary" label={t("brand.secondary")} hint={t("brand.secondaryHint")} value={draft.brandSecondaryColor} onChange={(brandSecondaryColor) => setDraft({ ...draft, brandSecondaryColor })} />
          </div>
          <label className="mt-5 block text-sm font-medium text-ink">
            {t("brand.look")}
            <textarea
              rows={3}
              value={draft.brandDescription}
              onChange={(event) => setDraft({ ...draft, brandDescription: event.target.value })}
              placeholder={t("brand.lookPlaceholder")}
              className="mt-1.5 w-full rounded-control border border-control bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-ink/40"
            />
            <span className="mt-1 block text-xs font-normal text-ink-subtle">{t("brand.lookHint")}</span>
          </label>
          <label className="mt-5 block text-sm font-medium text-ink">
            {t("brand.voice")} <span className="font-normal text-ink-subtle">({t("optional")})</span>
            <input
              type="url"
              value={draft.voiceExampleUrl}
              onChange={(event) => setDraft({ ...draft, voiceExampleUrl: event.target.value })}
              placeholder={t("brand.voicePlaceholder")}
              className="mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none focus:border-ink/40"
            />
            <span className="mt-1 block text-xs font-normal text-ink-subtle">{t("brand.voiceHint")}</span>
          </label>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-ink">{t("brand.cover")}</legend>
            <p className="text-xs text-ink-subtle">{t("brand.coverHint")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
              {COVER_STYLES.map((style) => {
                const [name, description] = tv.raw(`styles.${style}`) as [string, string];
                const on = draft.heroImageStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDraft({ ...draft, heroImageStyle: style })}
                    className={cn("rounded-xl border p-3 text-left", on ? "border-ink bg-white ring-1 ring-ink" : "border-line bg-white hover:border-ink/30")}
                  >
                    <span className="block text-sm font-medium text-ink">{name}</span>
                    <span className="block text-xs text-ink-secondary">{description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
          <StepActions>
            <Button size="lg" onClick={save} disabled={saving}>
              {saving ? t("saving") : t("continue")}
            </Button>
            <Link href={back} className="text-sm font-medium text-ink-secondary hover:text-ink">
              {t("back")}
            </Link>
          </StepActions>
        </>
      )}
    </WizardFrame>
  );
}
