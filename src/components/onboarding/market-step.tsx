"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CONTENT_LANGUAGES, countryFlag, languageName, LOCATION_OF_COUNTRY } from "@/lib/languages";
import { wizardDetectMarket, wizardSaveMarket } from "@/server/actions/onboarding";
import { SitePreview } from "./previews";
import { useAdvance } from "./use-advance";
import { Loading, StepActions, WizardFrame } from "./wizard-frame";

const selectClass = "mt-1.5 h-12 w-full rounded-control border border-control bg-white px-3.5 text-[15px] text-ink outline-none focus:border-ink/40";

/** Step 2: the market to rank in and the articles' language, detected from the website. */
export function MarketStep({
  brand,
  domain,
  saved,
  next,
}: {
  brand: { name: string; logoUrl: string | null };
  domain: string;
  saved: { language: string; country: string } | null;
  next: string;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const advance = useAdvance(next);
  const [value, setValue] = useState(saved);
  const [error, setError] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (saved) return;
    let live = true;
    wizardDetectMarket()
      .then((guess) => live && setValue({ language: guess.language, country: guess.country ?? "global" }))
      .catch(() => live && setValue({ language: "en", country: "US" }));
    return () => {
      live = false;
    };
  }, [saved]);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return Object.keys(LOCATION_OF_COUNTRY)
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  const languages = useMemo(() => CONTENT_LANGUAGES.map((language) => ({ code: language.code, name: languageName(language.code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)), [locale]);

  const save = () =>
    startSaving(async () => {
      if (!value) return;
      setError(false);
      const result = await wizardSaveMarket(value);
      if ("error" in result) return setError(true);
      await advance();
    });

  return (
    <WizardFrame brand={brand} step={t("stepOf", { step: 2, total: 5 })} title={t("market.title")} description={t("market.description")} preview={<SitePreview domain={domain} />}>
      {!value ? (
        <Loading title={t("market.detecting")} hint={t("market.detectingHint")} />
      ) : (
        <>
          <label className="block text-sm font-medium text-ink" title={t("market.marketTip")}>
            {t("market.market")}
            <select value={value.country} onChange={(event) => setValue({ ...value, country: event.target.value })} className={selectClass}>
              <option value="global">🌐 {t("market.global")}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {countryFlag(country.code)} {country.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-ink-subtle">{t("market.marketTip")}</span>
          </label>
          <label className="mt-5 block text-sm font-medium text-ink">
            {t("market.language")}
            <select value={value.language} onChange={(event) => setValue({ ...value, language: event.target.value })} className={selectClass}>
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-ink-subtle">{t("market.languageTip")}</span>
          </label>
          {value.country === "global" && (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-secondary">
              <Globe className="size-4" /> {t("market.globalHint")}
            </p>
          )}
          {error && <p className="mt-4 text-sm text-[#B42318]">{t("failed")}</p>}
          <StepActions>
            <Button size="lg" onClick={save} disabled={saving}>
              {saving ? t("saving") : t("continue")}
            </Button>
          </StepActions>
        </>
      )}
    </WizardFrame>
  );
}
