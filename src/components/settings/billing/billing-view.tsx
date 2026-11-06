"use client";

import { ArrowRight, CalendarDays, Check, CircleCheck, CirclePause, CirclePlay, LoaderCircle, Package, Settings, Sparkles, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import type { AddonId, Interval, Plan } from "@/lib/billing";
import { cn } from "@/lib/utils";
import {
  acceptRetentionOffer,
  cancellationRecap,
  cancelWithFeedback,
  changePlan,
  confirmCheckout,
  endTrialNow,
  openBillingPortal,
  setBillingPaused,
  setCancelAtPeriodEnd,
  setInvoiceEmails,
  startCheckout,
} from "@/server/actions/billing";
import type { BillingData } from "@/server/queries/billing";

type Billed = Extract<BillingData, { mode: "billed" }>;
type Price = { amount: number; currency: string };

function useMoney() {
  const format = useFormatter();
  return (cents: number, currency = "usd", whole = false) =>
    format.number(cents / 100, { style: "currency", currency: currency.toUpperCase(), ...(whole && cents % 100 === 0 ? { maximumFractionDigits: 0 } : {}) });
}

const go = (url: string) => {
  window.location.href = url;
};

function InvoiceEmailToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("settings.billing");
  const [on, setOn] = useState(initial);
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => {
          setOn(event.target.checked);
          void setInvoiceEmails(event.target.checked);
        }}
        className="size-4 accent-[#111827]"
      />
      {t("invoiceEmails")}
    </label>
  );
}

/** Confirms a Stripe Checkout return (?checkout=cs_…) once, then cleans the URL. */
export function CheckoutReturn({ sessionId }: { sessionId: string | null }) {
  const t = useTranslations("settings.billing");
  const router = useRouter();
  const [state, setState] = useState<"confirming" | "done" | "error" | null>(sessionId ? "confirming" : null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!sessionId || started.current) return;
    started.current = true;
    void confirmCheckout(sessionId).then((result) => {
      if ("error" in result) {
        setError(result.error);
        setState("error");
      } else setState("done");
      router.replace("/dashboard/settings/billing");
      router.refresh();
    });
  }, [sessionId, router]);
  if (!state) return null;
  return (
    <p role="status" className={cn("flex items-center gap-2 rounded-xl p-3 text-sm", state === "error" ? "bg-[#FDECEA] text-[#9A3412]" : "bg-success-bg text-success")}>
      {state === "confirming" ? <LoaderCircle className="size-4 animate-spin" /> : state === "done" ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}
      {state === "confirming" ? t("confirming") : state === "done" ? t("confirmed") : error}
    </p>
  );
}

function IntervalToggle({ value, onChange, savePercent }: { value: Interval; onChange: (value: Interval) => void; savePercent: number | null }) {
  const t = useTranslations("settings.billing.choose");
  return (
    <div role="radiogroup" className="inline-flex rounded-full bg-canvas p-1 text-sm">
      {(["month", "year"] as const).map((interval) => (
        <button
          key={interval}
          type="button"
          role="radio"
          aria-checked={value === interval}
          onClick={() => onChange(interval)}
          className={cn("rounded-full px-4 py-1.5 font-medium", value === interval ? "bg-white text-ink shadow-sm" : "text-ink-secondary hover:text-ink")}
        >
          {interval === "month" ? t("monthly") : t("yearly")}
          {interval === "year" && savePercent ? <span className="ml-1.5 text-success">{t("save", { percent: savePercent })}</span> : null}
        </button>
      ))}
    </div>
  );
}

const savePercent = (prices: Billed["prices"]) => {
  const month = prices.grow.month?.amount;
  const year = prices.grow.year?.amount;
  return month && year ? Math.round((1 - year / 12 / month) * 100) : null;
};

function PlanPicker({ data, site }: { data: Billed; site: string }) {
  const t = useTranslations("settings.billing");
  const money = useMoney();
  const [interval, setInterval] = useState<Interval>("month");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Plan | null>(null);

  return (
    <section className="card p-5 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-sans text-[20px] font-semibold text-ink">{t("choose.title", { site })}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{t("choose.subtitle")}</p>
        </div>
        <IntervalToggle value={interval} onChange={setInterval} savePercent={savePercent(data.prices)} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(["grow", "scale"] as const).map((plan) => {
          const price: Price | undefined = data.prices[plan][interval];
          const monthly = price ? (interval === "year" ? price.amount / 12 : price.amount) : null;
          const features = t.raw(`plans.${plan}.features`) as string[];
          return (
            <div key={plan} className={cn("flex flex-col rounded-2xl border p-6", plan === "scale" ? "border-brand/40 bg-brand/[0.03]" : "border-line")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-ink">{t(`plans.${plan}.name`)}</h3>
                {plan === "scale" && <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">{t("choose.popular")}</span>}
              </div>
              <p className="mt-1 text-sm text-ink-secondary">{t(`plans.${plan}.tagline`)}</p>
              <p className="mt-5 flex items-baseline gap-1">
                {monthly !== null ? (
                  <>
                    <span className="text-[34px] font-semibold tracking-tight text-ink">{money(Math.round(monthly), price!.currency, true)}</span>
                    <span className="text-sm text-ink-secondary">{t("choose.perMonth")}</span>
                  </>
                ) : (
                  <span className="text-sm text-ink-secondary">{t("choose.notOnSale")}</span>
                )}
              </p>
              <p className="text-xs text-ink-subtle">{price ? (interval === "year" ? t("choose.billedYearly", { amount: money(price.amount, price.currency) }) : t("choose.billedMonthly")) : " "}</p>
              {price && data.volume?.percent ? (
                <p className="mt-1 text-xs font-medium text-success">
                  {t("choose.volumePrice", { amount: money(Math.round((monthly! * (100 - data.volume.percent)) / 100), price.currency, true), percent: data.volume.percent })}
                </p>
              ) : null}
              <ul className="mt-5 flex-1 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              {data.isAdmin && (
                <Button
                  className="mt-6 w-full"
                  variant={plan === "scale" ? "brand" : "primary"}
                  size="lg"
                  disabled={!price || pending}
                  onClick={() => {
                    setBusy(plan);
                    startTransition(async () => {
                      const result = await startCheckout({ plan, interval });
                      if ("error" in result) {
                        setError(result.error);
                        setBusy(null);
                      } else if ("url" in result) go(result.url);
                    });
                  }}
                >
                  {busy === plan ? <LoaderCircle className="animate-spin" /> : null}
                  {data.trialDays > 0 ? t("choose.trial", { days: data.trialDays }) : t("choose.choose", { plan: t(`plans.${plan}.name`) })}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {data.volume?.percent ? <p className="mt-4 text-center text-sm text-ink-secondary">{t("choose.volumeNote", { percent: data.volume.percent, count: data.volume.activeWebsites })}</p> : null}
      {data.trialDays > 0 && <p className="mt-4 text-center text-xs text-ink-subtle">{t("choose.trialNote", { days: data.trialDays })}</p>}
      {!data.isAdmin && <p className="mt-4 text-center text-sm text-ink-secondary">{t("adminOnly")}</p>}
      {error && <p className="mt-4 text-center text-sm text-[#9A3412]">{error}</p>}
    </section>
  );
}

function UpgradeDialog({ data, open, onOpenChange }: { data: Billed; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("settings.billing");
  const money = useMoney();
  const [interval, setInterval] = useState<Interval>(data.main?.interval ?? "month");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const price = data.prices.scale[interval];
  const monthPrice = data.prices.scale.month;
  const features = (t.raw("plans.scale.features") as string[]).filter((_, index) => index > 0);
  const percent = price && monthPrice && interval === "year" ? Math.round((1 - price.amount / 12 / monthPrice.amount) * 100) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-8 text-center">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
          <Sparkles className="size-3.5" />
          {t("upgrade.badge")}
        </span>
        <DialogTitle className="mt-3 text-[28px]">{t("upgrade.title")}</DialogTitle>
        <DialogDescription className="mt-2 text-[15px] text-ink-secondary">{t("upgrade.subtitle")}</DialogDescription>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" role="switch" checked={interval === "year"} onChange={(event) => setInterval(event.target.checked ? "year" : "month")} className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-brand checked:before:translate-x-[22px]" />
          {t("upgrade.payYearly")}
          {percent ? <span className="font-medium text-brand">· {t("upgrade.save", { percent })}</span> : null}
        </label>
        <p className="mt-4 flex items-baseline justify-center gap-2">
          {interval === "year" && monthPrice && price && <span className="text-xl text-ink-subtle line-through">{money(monthPrice.amount, monthPrice.currency, true)}</span>}
          <span className="text-[44px] font-semibold tracking-tight text-brand">{price ? money(Math.round(interval === "year" ? price.amount / 12 : price.amount), price.currency, true) : "—"}</span>
          <span className="text-ink-secondary">{t("choose.perMonth")}</span>
        </p>
        <p className="text-sm text-ink-secondary">{t("upgrade.billed", { interval })}</p>
        <p className="mt-6 text-left text-xs font-semibold uppercase tracking-wide text-brand">{t("upgrade.advantage")}</p>
        <ul className="mt-3 space-y-2.5 text-left">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm text-ink">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-dashed border-line pt-3 text-left text-sm text-ink-secondary">{t("upgrade.everything")}</p>
        {done ? (
          <p className="mt-6 rounded-xl bg-success-bg p-3 text-sm text-success">{t("upgrade.done")}</p>
        ) : (
          <>
            <Button
              variant="brand"
              size="lg"
              className="mt-6 w-full"
              disabled={!price || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await changePlan("scale", interval);
                  if ("error" in result) setError(result.error);
                  else setDone(true);
                })
              }
            >
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              {t("upgrade.continue")}
              <ArrowRight />
            </Button>
            <p className="mt-2 text-xs text-ink-subtle">{t("upgrade.prorated")}</p>
          </>
        )}
        {error && <p className="mt-3 text-sm text-[#9A3412]">{error}</p>}
        <button type="button" onClick={() => onOpenChange(false)} className="mt-3 text-sm text-ink-secondary hover:text-ink">
          {t("upgrade.cancel")}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="flex items-center gap-2 text-sm text-ink-secondary">
        <Icon className="size-4" aria-hidden />
        {label}
      </p>
      <p className="mt-3 text-[18px] font-semibold text-ink">{value}</p>
    </div>
  );
}

const CANCEL_REASONS = ["too_expensive", "missing_features", "switched_service", "unused", "customer_service", "too_complex", "low_quality", "other"] as const;
type Recap = Awaited<ReturnType<typeof cancellationRecap>>;

/** Cancelling: what the website built so far, why they're leaving, an offer if one is set up, then confirm. */
function CancelDialog({ id, open, onOpenChange, endDate, paused }: { id: number; open: boolean; onOpenChange: (open: boolean) => void; endDate: string; paused: boolean }) {
  const t = useTranslations("settings.billing.cancelFlow");
  const [step, setStep] = useState<"recap" | "reason" | "offer" | "done">("recap");
  const [recap, setRecap] = useState<Recap | null>(null);
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [kept, setKept] = useState<"discount" | "paused" | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let live = true;
    cancellationRecap(id).then((result) => live && setRecap(result)).catch(() => live && setRecap(null));
    return () => {
      live = false;
    };
  }, [id, open]);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setStep("recap");
      setReason("");
      setComment("");
      setError(null);
      setKept(null);
    }
  };
  const cancel = () =>
    startTransition(async () => {
      const result = await cancelWithFeedback(id, reason, comment);
      if ("error" in result) return setError(result.error);
      setStep("done");
    });
  const stats = recap
    ? [
        [t("stats.articles"), recap.articles],
        [t("stats.published"), recap.published],
        [t("stats.backlinks"), recap.backlinks],
        [t("stats.aiMentions"), recap.aiMentions],
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        {step === "recap" && (
          <>
            <DialogTitle className="text-xl">{t("recapTitle")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-secondary">{recap?.trial ? t("recapTrial") : t("recapPaying")}</DialogDescription>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {stats.map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-canvas p-3">
                  <p className="text-2xl font-semibold text-ink tabular-nums">{value}</p>
                  <p className="text-xs text-ink-secondary">{label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
              {(t.raw("whatStops") as string[]).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("reason")} disabled={!recap}>
                {t("continue")}
              </Button>
              <Button onClick={() => close(false)}>{t("keep")}</Button>
            </div>
          </>
        )}
        {step === "reason" && (
          <>
            <DialogTitle className="text-xl">{t("reasonTitle")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("reasonHint")}</DialogDescription>
            <div className="mt-4 grid gap-2" role="radiogroup">
              {CANCEL_REASONS.map((value) => (
                <label key={value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", reason === value ? "border-ink" : "border-line")}>
                  <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
                  {t(`reasons.${value}`)}
                </label>
              ))}
            </div>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("commentPlaceholder")} rows={3} className="mt-3 w-full rounded-control border border-control p-3 text-sm" />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                {t("keep")}
              </Button>
              <Button variant="outline" disabled={!reason || pending} onClick={() => (recap?.offer || (!recap?.trial && !paused) ? setStep("offer") : cancel())}>
                {t("continue")}
              </Button>
            </div>
          </>
        )}
        {step === "offer" && (
          <>
            <DialogTitle className="text-xl">{t("offerTitle")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("offerHint")}</DialogDescription>
            <div className="mt-5 space-y-3">
              {recap?.offer && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await acceptRetentionOffer(id);
                      if ("error" in result) return setError(result.error);
                      setKept("discount");
                      setStep("done");
                    })
                  }
                  className="w-full rounded-xl border border-ink p-4 text-left ring-1 ring-ink"
                >
                  <span className="block text-sm font-semibold text-ink">{t("discountTitle")}</span>
                  <span className="block text-sm text-ink-secondary">{t("discountBody")}</span>
                </button>
              )}
              {!paused && !recap?.trial && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await setBillingPaused(id, true);
                      if ("error" in result) return setError(result.error);
                      setKept("paused");
                      setStep("done");
                    })
                  }
                  className="w-full rounded-xl border border-line p-4 text-left hover:border-ink/30"
                >
                  <span className="block text-sm font-semibold text-ink">{t("pauseTitle")}</span>
                  <span className="block text-sm text-ink-secondary">{t("pauseBody")}</span>
                </button>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" className="border-[#F3B4A9] text-[#C4320A] hover:bg-[#FDECEA]" disabled={pending} onClick={cancel}>
                {t("cancelAnyway")}
              </Button>
            </div>
          </>
        )}
        {step === "done" && (
          <>
            <DialogTitle className="text-xl">{kept === "discount" ? t("keptDiscount") : kept === "paused" ? t("keptPaused") : recap?.trial ? t("doneTrial") : t("donePaying")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-secondary">
              {kept ? t("keptBody") : recap?.trial ? t("doneTrialBody", { date: endDate }) : t("donePayingBody", { date: endDate })}
            </DialogDescription>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => close(false)}>{t("close")}</Button>
            </div>
          </>
        )}
        {error && <p className="mt-3 text-sm text-[#9A3412]">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

function ActivePlan({ data }: { data: Billed }) {
  const t = useTranslations("settings.billing");
  const format = useFormatter();
  const money = useMoney();
  const main = data.main!;
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const date = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { month: "short", day: "numeric", year: "numeric" }) : "—");
  const run = (action: () => Promise<{ ok: true } | { error: string } | { ok: true; url: string } | { ok: true; changed: true }>) =>
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setError(result.error);
      else if ("url" in result) go(result.url);
      else setError(null);
    });

  const statusKey = main.paused ? "paused" : main.cancelAtPeriodEnd && main.status !== "canceled" ? "canceling" : main.status;
  const next = main.paused
    ? t("active.pausedValue")
    : main.trialEnd
      ? t("active.trialEnds", { date: date(main.trialEnd) })
      : main.cancelAtPeriodEnd
        ? t("active.endsOn", { date: date(main.currentPeriodEnd) })
        : t("active.nextValue", { amount: money(main.amount ?? 0, main.currency), date: date(main.currentPeriodEnd) });

  return (
    <>
      {main.status === "past_due" && (
        <p className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FDECEA] p-3 text-sm text-[#9A3412]">
          {t("active.pastDue")}
          {data.isAdmin && (
            <Button size="sm" variant="outline" onClick={() => run(openBillingPortal)}>
              {t("active.updatePayment")}
            </Button>
          )}
        </p>
      )}
      {main.paused && <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("active.pausedNote")}</p>}
      <section className="card">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 md:p-6">
          <div>
            <h2 className="font-sans text-[18px] font-semibold text-ink">{t("active.title")}</h2>
            <p className="mt-1 text-sm text-ink-secondary">{t("active.subtitle")}</p>
          </div>
          {data.isAdmin && (
            <button type="button" aria-label={t("active.manage")} title={t("active.manage")} disabled={pending} onClick={() => run(openBillingPortal)} className="grid size-10 place-items-center rounded-full bg-ink text-white hover:bg-ink/90">
              <Settings className="size-5" />
            </button>
          )}
        </div>
        <div className="p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Tile icon={Package} label={t("active.plan")} value={t("active.planValue", { plan: t(`plans.${main.plan}.name`), interval: main.interval })} />
            <Tile icon={CalendarDays} label={t("active.next")} value={next} />
            <Tile icon={CircleCheck} label={t("active.status")} value={t(`statuses.${statusKey}`)} />
          </div>
          {data.isAdmin && main.status !== "canceled" && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (main.paused || window.confirm(t("active.pauseConfirm"))) run(() => setBillingPaused(main.id, !main.paused));
                }}
              >
                {main.paused ? <CirclePlay /> : <CirclePause />}
                {main.paused ? t("active.resume") : t("active.pause")}
              </Button>
              {main.cancelAtPeriodEnd ? (
                <Button variant="outline" disabled={pending} onClick={() => run(() => setCancelAtPeriodEnd(main.id, false))}>
                  {t("active.keep")}
                </Button>
              ) : (
                <Button variant="outline" disabled={pending} className="border-[#F3B4A9] text-[#C4320A] hover:bg-[#FDECEA]" onClick={() => setCancelling(true)}>
                  {main.status === "trialing" ? t("active.cancelTrial") : t("active.cancel")}
                </Button>
              )}
              {main.status === "trialing" && !main.cancelAtPeriodEnd && (
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await endTrialNow(main.id);
                      if ("error" in result) {
                        setError(result.error === "payment" ? t("active.endTrialPayment") : result.error);
                        setInvoiceUrl(result.invoiceUrl ?? null);
                      } else setError(null);
                    })
                  }
                >
                  {t("active.endTrial")}
                </Button>
              )}
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-[#9A3412]">
              {error}{" "}
              {invoiceUrl && (
                <a href={invoiceUrl} target="_blank" rel="noreferrer" className="font-medium underline">
                  {t("active.payInvoice")}
                </a>
              )}
            </p>
          )}
          <CancelDialog id={main.id} open={cancelling} onOpenChange={setCancelling} endDate={date(main.trialEnd ?? main.currentPeriodEnd)} paused={main.paused} />
        </div>
      </section>
      {main.plan === "grow" && data.isAdmin && main.live && (data.prices.scale.month || data.prices.scale.year) && (
        <div className="px-1 text-sm text-ink-secondary">
          <p>{t("active.scaleTeaser")}</p>
          <button type="button" onClick={() => setUpgrading(true)} className="mt-1 inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline">
            {t("active.seeScale")}
            <ArrowRight className="size-4" />
          </button>
          <UpgradeDialog data={data} open={upgrading} onOpenChange={setUpgrading} />
        </div>
      )}
    </>
  );
}

function Addons({ data }: { data: Billed }) {
  const t = useTranslations("settings.billing.addons");
  const format = useFormatter();
  const money = useMoney();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AddonId | null>(null);
  const [pending, startTransition] = useTransition();
  if (!data.addons.length) return null;
  const canBuy = Boolean(data.main?.live);
  const run = (id: AddonId, action: () => Promise<{ ok: true } | { error: string } | { ok: true; url: string } | { ok: true; changed: true }>) => {
    setBusy(id);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if ("error" in result) setError(result.error);
      else if ("url" in result) go(result.url);
      else setError(null);
    });
  };
  return (
    <section className="card">
      <div className="border-b border-line p-5 md:p-6">
        <h2 className="font-sans text-[18px] font-semibold text-ink">{t("title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{canBuy ? t("subtitle") : t("needsPlan")}</p>
      </div>
      <ul className="divide-y divide-line">
        {data.addons.map((addon) => {
          const sub = addon.subscription;
          const sameType = data.addons.find((other) => other.type === addon.type && other.id !== addon.id && other.subscription);
          return (
            <li key={addon.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-ink">
                  {t(`items.${addon.id}.name`)}
                  {sub && <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">{t("activeBadge")}</span>}
                </p>
                <p className="mt-0.5 text-sm text-ink-secondary">{t(`items.${addon.id}.body`, { credits: addon.credits ?? 0 })}</p>
              </div>
              <span className="text-sm tabular-nums text-ink-secondary">{t("perMonth", { amount: money(addon.amount, addon.currency) })}</span>
              {data.isAdmin &&
                (sub ? (
                  sub.cancelAtPeriodEnd ? (
                    <span className="flex items-center gap-2 text-sm text-ink-secondary">
                      {t("endsOn", { date: sub.currentPeriodEnd ? format.dateTime(new Date(sub.currentPeriodEnd), { dateStyle: "medium" }) : "—" })}
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(addon.id, () => setCancelAtPeriodEnd(sub.id, false))}>
                        {t("keep")}
                      </Button>
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(addon.id, () => setCancelAtPeriodEnd(sub.id, true))}>
                      {t("cancel")}
                    </Button>
                  )
                ) : (
                  <Button size="sm" disabled={!canBuy || !addon.onSale || pending} onClick={() => run(addon.id, () => startCheckout({ addon: addon.id }))}>
                    {busy === addon.id ? <LoaderCircle className="animate-spin" /> : null}
                    {sameType ? t("switchTo") : t("add")}
                  </Button>
                ))}
            </li>
          );
        })}
      </ul>
      {error && <p className="px-5 pb-4 text-sm text-[#9A3412] md:px-6">{error}</p>}
    </section>
  );
}

function History({ data }: { data: Billed }) {
  const t = useTranslations("settings.billing.history");
  const format = useFormatter();
  const money = useMoney();
  return (
    <section className="card">
      <div className="border-b border-line p-5 md:p-6">
        <h2 className="font-sans text-[18px] font-semibold text-ink">{t("title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{t("subtitle")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="bg-canvas text-left text-ink-secondary">
              <th className="px-5 py-3 font-medium md:px-6">{t("columns.invoice")}</th>
              <th className="px-3 py-3 font-medium">{t("columns.date")}</th>
              <th className="px-3 py-3 font-medium">{t("columns.item")}</th>
              <th className="px-3 py-3 text-right font-medium">{t("columns.amount")}</th>
              <th className="px-3 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-5 py-3 font-medium md:px-6">{t("columns.pdf")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-5 py-3.5 font-mono text-xs text-ink md:px-6">{invoice.reference}</td>
                <td className="px-3 py-3.5 text-ink-secondary">{format.dateTime(new Date(invoice.issuedAt), { dateStyle: "medium" })}</td>
                <td className="px-3 py-3.5 text-ink-secondary">{invoice.type ? t(`types.${invoice.type}`) : "—"}</td>
                <td className="px-3 py-3.5 text-right tabular-nums text-ink">{money(invoice.amount, invoice.currency)}</td>
                <td className="px-3 py-3.5">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", invoice.status === "paid" ? "bg-success-bg text-success" : invoice.status === "open" ? "bg-[#FDF3E2] text-[#8A6320]" : "bg-[#F3F4F6] text-ink-secondary")}>{t(`statuses.${invoice.status}`)}</span>
                </td>
                <td className="px-5 py-3.5 md:px-6">
                  {invoice.url ? (
                    <a href={invoice.url} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
                      {t("download")}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {data.invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-secondary">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BillingView({ data, site, checkoutSession }: { data: BillingData; site: string; checkoutSession: string | null }) {
  const t = useTranslations("settings.billing");
  return (
    <div className="space-y-6">
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-secondary">{t("subtitle")}</p>
        <InvoiceEmailToggle initial={data.invoiceEmails} />
      </div>
      <CheckoutReturn sessionId={checkoutSession} />
      {data.mode === "off" || data.mode === "exempt" ? (
        <section className="card p-6">
          <h2 className="font-sans text-[16px] font-semibold text-ink">{t(`${data.mode}.title`)}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{t(`${data.mode}.body`)}</p>
        </section>
      ) : data.mode === "unavailable" ? (
        <p className="rounded-xl bg-[#FDECEA] p-3 text-sm text-[#9A3412]">{t("unavailable")}</p>
      ) : (
        <>
          {data.main && data.main.status !== "canceled" ? <ActivePlan data={data} /> : <PlanPicker data={data} site={site} />}
          <Addons data={data} />
          <History data={data} />
        </>
      )}
    </div>
  );
}
