"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { addSite, type AddSiteState } from "@/server/actions/clients";
import { startAgencySetup } from "@/server/actions/agency-setup";
import { SitePreview } from "./previews";
import { WizardFrame } from "./wizard-frame";

const fieldClass =
  "h-12 w-full rounded-control border border-control bg-white px-4 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

/** Step 1 of the onboarding wizard: the website's address. */
export function WebsiteStep({ brand, isAgency, backHref, canStartAgency }: { brand: { name: string; logoUrl: string | null }; isAgency: boolean; backHref: string | null; canStartAgency: boolean }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const [state, action, pending] = useActionState<AddSiteState, FormData>(addSite, null);
  const [url, setUrl] = useState("");
  const domain = url.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();

  return (
    <WizardFrame
      brand={brand}
      step={t("stepOf", { step: 1, total: 5 })}
      title={isAgency ? t("website.titleAgency") : t("website.title")}
      description={isAgency ? t("website.descriptionAgency") : t("website.description", { brand: brand.name })}
      preview={<SitePreview domain={domain} />}
    >
      {backHref && (
        <Link href={backHref} className="-mt-4 mb-6 inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
      )}
      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="timeZone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        <label className="block">
          <span className="sr-only">{t("url")}</span>
          <input name="url" required autoFocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t("website.placeholder")} className={fieldClass} />
        </label>
        {state?.error && <p className="mt-3 text-sm text-[#B42318]" role="alert">{t(`website.errors.${state.error}`)}</p>}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || !url.trim()}>
          {pending ? t("website.checking") : t("website.start")}
        </Button>
      </form>
      {canStartAgency && (
        <form action={startAgencySetup} className="mt-8 rounded-2xl border border-line bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Building2 className="size-4" /> {t("website.agencyTitle")}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">{t("website.agencyBody")}</p>
          <button type="submit" className="mt-2 text-sm font-medium text-ink underline">
            {t("website.agencyCta")}
          </button>
        </form>
      )}
    </WizardFrame>
  );
}
