"use client";

import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CONTENT_LANGUAGES, contentLanguage, languageName } from "@/lib/languages";
import { addSite, type AddSiteState } from "@/server/actions/clients";

const fieldClass =
  "h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

export function AddWebsiteForm({ isAgency, hasSites }: { isAgency: boolean; hasSites: boolean }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const languages = CONTENT_LANGUAGES.map((language) => ({ code: language.code, name: languageName(language.code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale));
  const [state, action, pending] = useActionState<AddSiteState, FormData>(addSite, null);

  return (
    <form action={action} className="card p-8">
      {hasSites && (
        <Link href={isAgency ? "/clients" : "/dashboard/overview"} className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
      )}
      <h1 className="text-page-title font-semibold tracking-[-0.025em] text-ink">{isAgency ? t("titleAgency") : t("title")}</h1>
      <p className="mt-1 text-sm text-ink-secondary">{t("subtitle")}</p>

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="timeZone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />

      <label className="mt-6 block text-sm font-medium text-ink">
        {t("url")}
        <input name="url" required autoFocus placeholder={t("urlPlaceholder")} className={`${fieldClass} mt-1.5`} />
      </label>
      <label className="mt-4 block text-sm font-medium text-ink">
        {t("language")}
        <select name="language" defaultValue={contentLanguage(locale) ? locale : "en"} className={`${fieldClass} mt-1.5`}>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-ink-subtle">{t("languageHint")}</span>
      </label>

      {state?.error && (
        <p className="mt-4 text-sm text-red-600">{state.error === "invalid_url" ? t("invalidUrl") : t("notAllowed")}</p>
      )}
      <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
