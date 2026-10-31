"use client";

import { CircleCheck, Languages, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { openBillingPortal, startLanguageCheckout } from "@/server/actions/billing";
import { selectSite } from "@/server/actions/site";
import { CheckoutReturn } from "./billing-view";

export type LanguageBillingData = {
  mode: "off" | "exempt" | "billed";
  language: string;
  website: string;
  primaryId: number;
  coverage: "included" | "addon" | "none";
  primaryPlan: "grow" | "scale" | null;
  primaryActive: boolean;
  price: string | null;
  isAdmin: boolean;
};

/** Billing of a language site: how the language is paid for, and the language add-on. */
export function LanguageBilling({ data, locale, checkoutSession }: { data: LanguageBillingData; locale: string; checkoutSession: string | null }) {
  const t = useTranslations("settings.billing.language");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const go = (action: () => Promise<{ ok: true; url: string } | { ok: true; changed: true } | { error: string }>) =>
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setError(result.error);
      else if ("url" in result) window.location.href = result.url;
    });

  const status =
    data.mode !== "billed"
      ? t(data.mode === "off" ? "free" : "exempt")
      : data.coverage === "included"
        ? t("included", { website: data.website })
        : data.coverage === "addon"
          ? t("addon")
          : !data.primaryActive
            ? t("noPlan", { website: data.website })
            : t("notCovered", { website: data.website });

  return (
    <div className="space-y-4">
      <CheckoutReturn sessionId={checkoutSession} />
      <section className="card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <Languages className="size-5" />
          </span>
          <div>
            <h2 className="font-sans text-[16px] font-semibold text-ink">{t("title", { language: data.language, website: data.website })}</h2>
            <p className="mt-1 text-sm text-ink-secondary">{t("intro", { website: data.website })}</p>
          </div>
        </div>
        <p className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${data.mode !== "billed" || data.coverage !== "none" ? "bg-success-bg text-success" : "bg-[#FDF3E2] text-[#8A6320]"}`}>
          {(data.mode !== "billed" || data.coverage !== "none") && <CircleCheck className="size-4 shrink-0" />}
          {status}
        </p>
        {data.isAdmin && data.mode === "billed" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.coverage === "none" && data.primaryActive && data.price && (
              <Button disabled={pending} onClick={() => go(startLanguageCheckout)}>
                {pending && <LoaderCircle className="animate-spin" />}
                {t("buy", { price: data.price })}
              </Button>
            )}
            {data.coverage === "addon" && (
              <Button variant="outline" disabled={pending} onClick={() => go(openBillingPortal)}>
                {t("manage")}
              </Button>
            )}
            {(data.coverage === "none" || data.primaryPlan !== "scale") && (
              <Button variant={data.coverage === "none" && data.price ? "outline" : "primary"} disabled={pending} onClick={() => startTransition(() => selectSite(data.primaryId, locale, "/dashboard/settings/billing"))}>
                {data.primaryActive ? t("upgrade", { website: data.website }) : t("choosePlan", { website: data.website })}
              </Button>
            )}
          </div>
        )}
        {error && <p className="mt-3 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]" role="alert">{error}</p>}
      </section>
    </div>
  );
}
