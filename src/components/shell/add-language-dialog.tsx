"use client";

import { Check, LoaderCircle, Search } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { CONTENT_LANGUAGES, languageFlag, languageName } from "@/lib/languages";
import { cn, displayDomain } from "@/lib/utils";
import { addLanguages, languageOptions } from "@/server/actions/languages";

type Options = NonNullable<Awaited<ReturnType<typeof languageOptions>>>;

/** Adds content languages to the selected website (one language site each). */
export function AddLanguageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("languagesDialog");
  const locale = useLocale();
  const format = useFormatter();
  const [options, setOptions] = useState<Options | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [market, setMarket] = useState<"site" | "language">("site");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    languageOptions().then((result) => {
      if (cancelled || !result) return;
      setOptions(result);
      setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const languages = useMemo(
    () =>
      CONTENT_LANGUAGES.map((language) => ({ code: language.code, name: languageName(language.code, locale) }))
        .filter((language) => !options?.existing.includes(language.code))
        .filter((language) => !query.trim() || language.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [options, query, locale],
  );
  const eligibility = options?.eligibility;
  const price = eligibility?.addonPrice ? format.number(eligibility.addonPrice.amount / 100, { style: "currency", currency: eligibility.addonPrice.currency.toUpperCase() }) : null;
  const extra = eligibility?.mode === "plan" ? Math.max(0, chosen.length - eligibility.includedLeft) : eligibility?.mode === "addon" ? chosen.length : 0;
  const toggle = (code: string) => setChosen((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setChosen([]);
          setError(null);
          setQuery("");
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("subtitle")}</DialogDescription>
        {!options ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-ink-secondary">
            <LoaderCircle className="size-4 animate-spin" />
          </p>
        ) : eligibility?.mode === "blocked" ? (
          <div className="mt-5 rounded-xl border border-[#F5D9A8] bg-[#FDF3E2] p-4 text-sm text-[#8A6320]">
            <p>{eligibility.reason === "noPlan" ? t("blocked.noPlan") : t("blocked.needsScale")}</p>
            <Link href="/dashboard/settings/billing" onClick={() => onOpenChange(false)} className="mt-2 inline-block font-medium underline underline-offset-2">
              {t("blocked.action")}
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-subtle">{t("website")}</p>
            <p className="text-sm font-medium text-ink">{displayDomain(options.url)}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{t("languages")}</p>
              <label className="relative">
                <span className="sr-only">{t("search")}</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className="h-8 w-44 rounded-control border border-control pl-8 pr-2 text-sm outline-none focus:border-ink/40" />
              </label>
            </div>
            <div className="mt-2 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3" role="group" aria-label={t("languages")}>
              {languages.map((language) => {
                const on = chosen.includes(language.code);
                return (
                  <button
                    key={language.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(language.code)}
                    className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm", on ? "border-ink bg-canvas font-medium text-ink" : "border-line text-ink-secondary hover:border-ink/30")}
                  >
                    <span aria-hidden>{languageFlag(language.code)}</span>
                    <span className="min-w-0 flex-1 truncate">{language.name}</span>
                    {on && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })}
              {languages.length === 0 && <p className="col-span-full p-2 text-sm text-ink-secondary">{t("noLanguages")}</p>}
            </div>

            {chosen.length > 0 && (
              <p className="mt-2 text-xs text-ink-secondary">
                {t("selected", { languages: chosen.map((code) => languageName(code, locale)).join(", ") })}
              </p>
            )}

            <fieldset className="mt-5">
              <legend className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{t("market.title")}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["site", "language"] as const).map((option) => (
                  <label key={option} className={cn("cursor-pointer rounded-xl border p-3", market === option ? "border-ink bg-canvas" : "border-line hover:bg-canvas")}>
                    <input type="radio" name="market" className="sr-only" checked={market === option} onChange={() => setMarket(option)} />
                    <span className="block text-sm font-semibold text-ink">{t(`market.${option}`)}</span>
                    <span className="mt-0.5 block text-xs text-ink-secondary">{option === "site" ? (options.country ? t("market.siteHint", { country: options.country }) : t("market.siteHintNoCountry")) : t("market.languageHint")}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {chosen.length === 1 && (
              <label className="mt-4 block text-sm font-medium text-ink">
                {t("url", { language: languageName(chosen[0]!, locale) })}
                <input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1.5 h-10 w-full rounded-control border border-control px-3 text-sm outline-none focus:border-ink/40" />
                <span className="mt-1 block text-xs font-normal text-ink-subtle">{t("urlHint")}</span>
              </label>
            )}

            <div className="mt-5 rounded-xl bg-canvas p-3 text-sm text-ink-secondary">
              {eligibility?.mode === "free" && t("pricing.free")}
              {eligibility?.mode === "plan" && t("pricing.plan", { left: eligibility.includedLeft, total: eligibility.included })}
              {eligibility?.mode === "addon" && price && t("pricing.addon", { price })}
              {extra > 0 && eligibility?.mode === "plan" && price && <span className="mt-1 block">{t("pricing.extra", { count: extra, price })}</span>}
            </div>
            {error && <p className="mt-3 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]" role="alert">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
              <Button
                disabled={!chosen.length || pending || !options.canEdit}
                onClick={() =>
                  startTransition(async () => {
                    // On success the action opens the new language (a redirect); only errors come back.
                    const result = await addLanguages({ languages: chosen, market, url: chosen.length === 1 ? url : undefined });
                    if (result && "error" in result) setError(result.error ?? null);
                  })
                }
              >
                {pending && <LoaderCircle className="animate-spin" />}
                {t("add", { count: chosen.length })}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
