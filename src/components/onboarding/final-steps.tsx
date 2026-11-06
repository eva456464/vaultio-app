"use client";

import { Check, CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { listGoogleProperties, selectGoogleProperty, type PropertyList } from "@/server/actions/analytics";
import { startCheckout } from "@/server/actions/billing";
import { wizardSaveSurvey, wizardSkip } from "@/server/actions/onboarding";
import { SearchConsolePreview } from "./previews";
import { useAdvance } from "./use-advance";
import { StepActions, WizardFrame } from "./wizard-frame";

type Brand = { name: string; logoUrl: string | null };

/** Optional: connect Search Console (view-only), then pick the site's property. */
export function SearchConsoleStep({ brand, connected, error, back, next }: { brand: Brand; connected: boolean; error: string | null; back: string; next: string }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const advance = useAdvance(next);
  const [list, setList] = useState<PropertyList | null>(null);
  const [choice, setChoice] = useState("");
  const [busy, startBusy] = useTransition();

  useEffect(() => {
    if (!connected) return;
    listGoogleProperties("gsc")
      .then((result) => {
        setList(result);
        if (result.ok) setChoice(result.selected ?? result.items[0]?.id ?? "");
      })
      .catch(() => setList({ ok: false, error: "failed" }));
  }, [connected]);

  const skip = () =>
    startBusy(async () => {
      await wizardSkip("search-console");
      await advance();
    });
  const use = () =>
    startBusy(async () => {
      if (choice) await selectGoogleProperty("gsc", choice);
      await wizardSkip("search-console");
      await advance();
    });

  return (
    <WizardFrame brand={brand} title={t("gsc.title")} description={t("gsc.description")} preview={<SearchConsolePreview />}>
      {error && <p className="mb-4 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]">{t("gsc.error")}</p>}
      {connected ? (
        <>
          {!list ? (
            <p className="text-sm text-ink-secondary">{t("gsc.loading")}</p>
          ) : list.ok && list.items.length ? (
            <label className="block text-sm font-medium text-ink">
              {t("gsc.property")}
              <select value={choice} onChange={(event) => setChoice(event.target.value)} className="mt-1.5 h-12 w-full rounded-control border border-control bg-white px-3.5 text-[15px] text-ink">
                {list.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-medium text-ink">{t("gsc.noSitesTitle")}</p>
              <p className="mt-1 text-sm text-ink-secondary">{t("gsc.noSites")}</p>
            </div>
          )}
          <StepActions>
            <Button size="lg" onClick={use} disabled={busy || !list}>
              {t("continue")}
            </Button>
          </StepActions>
        </>
      ) : (
        <StepActions>
          <Button size="lg" asChild>
            <a href={`/api/integrations/google/start?product=gsc&locale=${locale}&from=onboarding`}>{t("gsc.connect")}</a>
          </Button>
          <Button size="lg" variant="ghost" onClick={skip} disabled={busy}>
            {t("gsc.withoutConnecting")}
          </Button>
          <Link href={back} className="text-sm font-medium text-ink-secondary hover:text-ink">
            {t("back")}
          </Link>
        </StepActions>
      )}
    </WizardFrame>
  );
}

const CHANNELS = ["google", "chatgpt", "friend", "linkedin", "youtube", "reddit", "x", "facebook", "newsletter", "podcast", "other"] as const;

/** "How did you hear about us?" (once per workspace). */
export function SurveyStep({ brand, next }: { brand: Brand; next: string }) {
  const t = useTranslations("onboarding");
  const advance = useAdvance(next);
  const [channel, setChannel] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState(false);
  const [busy, startBusy] = useTransition();
  const detailLabel = channel === "friend" ? t("survey.friend") : channel === "linkedin" ? t("survey.linkedin") : channel === "other" ? t("survey.other") : null;

  const submit = () =>
    startBusy(async () => {
      const result = await wizardSaveSurvey({ channel, detail });
      if ("error" in result) return setError(true);
      await advance();
    });

  return (
    <WizardFrame brand={brand} step={t("survey.step")} title={t("survey.title", { brand: brand.name })} description={t("survey.description")}>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("survey.title", { brand: brand.name })}>
        {CHANNELS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={channel === value}
            onClick={() => {
              setChannel(value);
              setError(false);
            }}
            className={cn("flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm text-ink", channel === value ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/30")}
          >
            {t(`survey.channels.${value}`)}
            {channel === value && <Check className="size-4" />}
          </button>
        ))}
      </div>
      {detailLabel && (
        <label className="mt-4 block text-sm font-medium text-ink">
          {detailLabel}
          <input value={detail} onChange={(event) => setDetail(event.target.value)} className="mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none focus:border-ink/40" />
        </label>
      )}
      {error && <p className="mt-3 text-sm text-[#B42318]">{channel === "other" ? t("survey.specify") : t("failed")}</p>}
      <StepActions>
        <Button size="lg" onClick={submit} disabled={busy || !channel || (channel === "other" && !detail.trim())}>
          {next === "finish" ? t("finish") : t("continue")}
        </Button>
      </StepActions>
    </WizardFrame>
  );
}

/** Last step when billing is on: start the free trial of a plan (Stripe Checkout). */
export function PlanStep({
  brand,
  domain,
  plans,
  trialDays,
  volumePercent,
  scaleHref,
  checkoutFailed,
}: {
  brand: Brand;
  domain: string;
  plans: { plan: "grow" | "scale"; price: string | null }[];
  trialDays: number;
  volumePercent: number;
  scaleHref: string;
  checkoutFailed: boolean;
}) {
  const t = useTranslations("onboarding");
  const [busy, startBusy] = useTransition();
  const [failure, setFailure] = useState<string | null>(checkoutFailed ? t("plan.checkoutFailed") : null);
  const grow = plans.find((entry) => entry.plan === "grow");
  const start = (plan: "grow" | "scale") =>
    startBusy(async () => {
      setFailure(null);
      const result = await startCheckout({ plan, interval: "month" }, { returnTo: "onboarding" });
      if ("error" in result) return setFailure(result.error);
      if ("url" in result && result.url) window.location.href = result.url;
    });

  return (
    <WizardFrame brand={brand} title={t("plan.title")} description={t.rich("plan.description", { domain, highlight: (chunks) => <span className="font-semibold text-ink">{chunks}</span> })}>
      <div className="rounded-2xl border border-ink bg-white p-6 ring-1 ring-ink">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">{t("plan.grow")}</p>
          {trialDays > 0 && <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">{t("plan.trialBadge", { days: trialDays })}</span>}
        </div>
        {grow?.price && <p className="mt-1 text-sm text-ink-secondary">{t("plan.price", { price: grow.price })}</p>}
        {volumePercent > 0 && <p className="mt-1 text-sm font-medium text-success">{t("plan.volume", { percent: volumePercent })}</p>}
        <ul className="mt-4 space-y-2 text-sm text-ink">
          {(t.raw("plan.features") as string[]).map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" /> {feature}
            </li>
          ))}
        </ul>
        <Button size="lg" className="mt-6 w-full" onClick={() => start("grow")} disabled={busy || !grow?.price}>
          {trialDays > 0 ? t("plan.startTrial", { days: trialDays }) : t("plan.start")}
        </Button>
        <p className="mt-2 text-center text-xs text-ink-subtle">{trialDays > 0 ? t("plan.noCharge") : t("plan.cancelAnytime")}</p>
      </div>
      {failure && <p className="mt-4 text-sm text-[#B42318]">{failure}</p>}
      <p className="mt-5 text-sm text-ink-secondary">
        {t("plan.scalePrompt")}{" "}
        <a href={scaleHref} className="font-medium text-ink underline" onClick={(event) => { event.preventDefault(); start("scale"); }}>
          {t("plan.scaleCta")}
        </a>
      </p>
    </WizardFrame>
  );
}
