"use client";

import { CircleCheck, Languages, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { endTrialNow, openBillingPortal, startLanguageCheckout } from "@/server/actions/billing";
import { selectSite } from "@/server/actions/site";
import { CheckoutReturn } from "./billing-view";

export type LanguageBillingData = {
  mode: "off" | "exempt" | "billed";
  language: string;
  website: string;
  primaryId: number;
  coverage: "included" | "addon" | "locked" | "paused" | "none";
  primaryPlan: "grow" | "scale" | null;
  primaryActive: boolean;
  /** The website's plan subscription while it is on a free trial (to end the trial early). */
  trialSubscriptionId: number | null;
  freeLanguages: number;
  price: string | null;
  isAdmin: boolean;
};

/** Billing of a language site: how the language is paid for, and the language add-on. */
export function LanguageBilling({ data, locale, checkoutSession }: { data: LanguageBillingData; locale: string; checkoutSession: string | null }) {
  const t = useTranslations("settings.billing.language");
  const [error, setError] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipTrial = () =>
    startTransition(async () => {
      const result = await endTrialNow(data.trialSubscriptionId!);
      if ("error" in result) {
        if (result.invoiceUrl) window.location.href = result.invoiceUrl;
        else setError(result.error === "payment" ? t("skipFailed") : result.error);
      } else setSkipped(true);
      setConfirmSkip(false);
    });
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
          : data.coverage === "locked"
            ? t("locked", { total: data.freeLanguages })
            : data.coverage === "paused"
              ? t("paused")
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
            {(data.coverage === "none" || data.coverage === "locked" || data.coverage === "paused") && data.primaryActive && data.price && (
              <Button variant={data.coverage === "locked" ? "outline" : "primary"} disabled={pending} onClick={() => go(startLanguageCheckout)}>
                {pending && <LoaderCircle className="animate-spin" />}
                {data.coverage === "paused" ? t("keep", { price: data.price }) : data.coverage === "locked" ? t("buyNow", { price: data.price }) : t("buy", { price: data.price })}
              </Button>
            )}
            {data.coverage === "locked" && data.trialSubscriptionId && !skipped && (
              <Button disabled={pending} onClick={() => setConfirmSkip(true)}>
                {t("skipTrial")}
              </Button>
            )}
            {data.coverage === "addon" && (
              <Button variant="outline" disabled={pending} onClick={() => go(openBillingPortal)}>
                {t("manage")}
              </Button>
            )}
            {(data.coverage === "none" || data.coverage === "paused" || data.primaryPlan !== "scale") && (
              <Button variant={data.coverage === "none" && data.price ? "outline" : "primary"} disabled={pending} onClick={() => startTransition(() => selectSite(data.primaryId, locale, "/dashboard/settings/billing"))}>
                {data.primaryActive ? t("upgrade", { website: data.website }) : t("choosePlan", { website: data.website })}
              </Button>
            )}
          </div>
        )}
        {confirmSkip && (
          <div className="mt-4 rounded-xl border border-line p-4 text-sm">
            <p className="font-semibold text-ink">{t("skipTitle")}</p>
            <p className="mt-1 text-ink-secondary">{t("skipDescription", { total: data.freeLanguages })}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" disabled={pending} onClick={() => setConfirmSkip(false)}>{t("cancel")}</Button>
              <Button disabled={pending} onClick={skipTrial}>
                {pending && <LoaderCircle className="animate-spin" />}
                {t("skipConfirm")}
              </Button>
            </div>
          </div>
        )}
        {skipped && <p className="mt-3 rounded-xl bg-success-bg p-3 text-sm text-success" role="status">{t("skipped")}</p>}
        {error && <p className="mt-3 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]" role="alert">{error}</p>}
      </section>
    </div>
  );
}
