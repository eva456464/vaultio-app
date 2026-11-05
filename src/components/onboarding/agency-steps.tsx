"use client";

import { CalendarClock, Check, Copy, MonitorSmartphone, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveAgencyWebsite, setAgencyMode, setAgencyStep, type AgencyStep } from "@/server/actions/agency-setup";
import { inviteMember } from "@/server/actions/team";
import { StepActions, WizardFrame } from "./wizard-frame";

type Brand = { name: string; logoUrl: string | null };
const field = "h-12 w-full rounded-control border border-control bg-white px-4 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

/** What clients will see: the agency's name, colour and address (illustrative layout). */
export function WhiteLabelPreview({ name, color, domain, mode }: { name: string; color: string; domain: string; mode: "whitelabel" | "reports" | null }) {
  const t = useTranslations("onboarding.agency.preview");
  return (
    <div className="w-full max-w-[480px]">
      <h2 className="text-xl font-semibold text-ink">{mode === "reports" ? t("reportsHeading") : t("heading")}</h2>
      <p className="mt-1 text-sm text-ink-secondary">{mode === "reports" ? t("reportsSub") : t("sub")}</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(16,24,40,0.35)]">
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#F87171]" />
          <span className="size-2.5 rounded-full bg-[#FBBF24]" />
          <span className="size-2.5 rounded-full bg-[#34D399]" />
          <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-1 text-xs text-ink-secondary">{domain || t("address")}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr]">
          <div className="space-y-2 border-r border-line p-3">
            <p className="truncate text-xs font-semibold text-ink">{name || t("agency")}</p>
            {[t("overview"), t("content"), t("backlinks"), t("reporting")].map((item, index) => (
              <p key={item} className={cn("truncate rounded px-2 py-1 text-[11px]", index === 0 ? "bg-canvas font-medium text-ink" : "text-ink-secondary")}>{item}</p>
            ))}
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-ink">{t("welcome")}</p>
            <p className="mt-1 text-[11px] text-ink-secondary">{t("welcomeSub")}</p>
            <div className="mt-3 rounded-lg p-3 text-[11px] font-medium text-white" style={{ background: color }}>
              {t("running")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgencyWebsiteStep({ brand }: { brand: Brand }) {
  const t = useTranslations("onboarding.agency");
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [busy, startBusy] = useTransition();
  return (
    <WizardFrame brand={brand} step={t("stepOf", { step: 1 })} title={t("website.title")} description={t("website.description")} preview={<WhiteLabelPreview name="" color="#111827" domain="" mode={null} />}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startBusy(async () => {
            setError(false);
            const result = await saveAgencyWebsite(url);
            if (result && "error" in result) setError(true);
          });
        }}
      >
        <input value={url} onChange={(event) => setUrl(event.target.value)} autoFocus placeholder={t("website.placeholder")} aria-label={t("website.label")} className={field} />
        {error && <p className="mt-3 text-sm text-[#B42318]">{t("website.invalid")}</p>}
        <StepActions>
          <Button size="lg" type="submit" disabled={busy || !url.trim()}>
            {t("continue")}
          </Button>
          <Button size="lg" type="button" variant="ghost" disabled={busy} onClick={() => startBusy(async () => void (await setAgencyStep("brand")))}>
            {t("skip")}
          </Button>
        </StepActions>
      </form>
    </WizardFrame>
  );
}

/** Step 2: white label or branded reports, then the brand (the existing branding form). */
export function AgencyBrandStep({ brand, mode: initialMode, preview, children }: { brand: Brand; mode: "whitelabel" | "reports" | null; preview: { name: string; color: string; domain: string }; children: ReactNode }) {
  const t = useTranslations("onboarding.agency");
  const [mode, setMode] = useState(initialMode);
  const [busy, startBusy] = useTransition();
  const choose = (value: "whitelabel" | "reports") =>
    startBusy(async () => {
      setMode(value);
      await setAgencyMode(value);
    });
  const options = [
    { value: "whitelabel" as const, icon: MonitorSmartphone, title: t("brand.whitelabelTitle"), body: t("brand.whitelabelBody", { platform: brand.name }) },
    { value: "reports" as const, icon: Users, title: t("brand.reportsTitle"), body: t("brand.reportsBody") },
  ];
  return (
    <WizardFrame brand={brand} step={t("stepOf", { step: 2 })} title={t("brand.title")} description={t("brand.description")} preview={<WhiteLabelPreview {...preview} mode={mode} />}>
      <p className="text-sm font-medium text-ink">{t("brand.purpose")}</p>
      <div className="mt-2 grid gap-2" role="radiogroup">
        {options.map(({ value, icon: Icon, title, body }) => (
          <button key={value} type="button" role="radio" aria-checked={mode === value} disabled={busy} onClick={() => choose(value)} className={cn("flex items-start gap-3 rounded-xl border bg-white p-4 text-left", mode === value ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/30")}>
            <Icon className="mt-0.5 size-5 shrink-0 text-ink" />
            <span>
              <span className="block text-sm font-semibold text-ink">{title}</span>
              <span className="block text-sm text-ink-secondary">{body}</span>
            </span>
          </button>
        ))}
      </div>
      {mode && (
        <>
          <div className="mt-6">{children}</div>
          <StepActions>
            <Button size="lg" disabled={busy} onClick={() => startBusy(async () => void (await setAgencyStep(mode === "whitelabel" ? "dns" : "team")))}>
              {t("continue")}
            </Button>
          </StepActions>
        </>
      )}
    </WizardFrame>
  );
}

/** Step 3 (white label only): the hosting and sending domains with their DNS records. */
export function AgencyDnsStep({ brand, connected, children }: { brand: Brand; connected: boolean; children: ReactNode }) {
  const t = useTranslations("onboarding.agency");
  const [busy, startBusy] = useTransition();
  return (
    <WizardFrame brand={brand} step={t("stepOf", { step: 3 })} title={t("dns.title")} description={t("dns.description")}>
      {children}
      {!connected && <p className="mt-4 text-sm text-ink-secondary">{t("dns.notYet")}</p>}
      <p className="mt-2 text-xs text-ink-subtle">{t("dns.propagation")}</p>
      <StepActions>
        <Button size="lg" disabled={busy} onClick={() => startBusy(async () => void (await setAgencyStep("team")))}>
          {t("dns.continue")}
        </Button>
      </StepActions>
    </WizardFrame>
  );
}

export function AgencyTeamStep({ brand }: { brand: Brand }) {
  const t = useTranslations("onboarding.agency");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<{ email: string; link?: string; emailed: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const invite = () =>
    startBusy(async () => {
      setError(null);
      const result = await inviteMember({ email, role: "admin", websiteIds: [] });
      if ("error" in result) return setError(result.error ?? t("team.error"));
      setSent([...sent, { email: email.trim().toLowerCase(), link: result.link, emailed: Boolean(result.emailed) }]);
      setEmail("");
    });
  return (
    <WizardFrame brand={brand} step={t("stepOf", { step: 4 })} title={t("team.title")} description={t("team.description")}>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          invite();
        }}
      >
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("team.placeholder")} aria-label={t("team.label")} className={field} />
        <Button size="lg" type="submit" disabled={busy || !email.includes("@")}>
          <Send /> {t("team.invite")}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-[#B42318]">{error}</p>}
      {sent.length > 0 && (
        <ul className="mt-4 space-y-2">
          {sent.map((entry) => (
            <li key={entry.email} className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink">
              <Check className="size-4 text-success" />
              <span className="flex-1">{entry.emailed ? t("team.invited", { email: entry.email }) : t("team.saved", { email: entry.email })}</span>
              {!entry.emailed && entry.link && (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(entry.link!);
                    setCopied(entry.email);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink"
                >
                  <Copy className="size-3.5" /> {copied === entry.email ? t("team.copied") : t("team.copyLink")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <StepActions>
        <Button size="lg" variant={sent.length ? "primary" : "outline"} disabled={busy} onClick={() => startBusy(async () => void (await setAgencyStep("call")))}>
          {sent.length ? t("continue") : t("skip")}
        </Button>
      </StepActions>
    </WizardFrame>
  );
}

export function AgencyCallStep({ brand, booking }: { brand: Brand; booking: string | null }) {
  const t = useTranslations("onboarding.agency");
  const [busy, startBusy] = useTransition();
  return (
    <WizardFrame brand={brand} step={t("stepOf", { step: 5 })} title={t("call.title")} description={t("call.description")}>
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
          <CalendarClock className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{t("call.card")}</p>
          <p className="text-sm text-ink-secondary">{booking ? t("call.cardBody") : t("call.notSet")}</p>
        </div>
        {booking && (
          <Button asChild variant="outline">
            <a href={booking} target="_blank" rel="noreferrer">
              {t("call.book")}
            </a>
          </Button>
        )}
      </div>
      <StepActions>
        <Button size="lg" disabled={busy} onClick={() => startBusy(async () => void (await setAgencyStep("done")))}>
          {t("call.continue")}
        </Button>
      </StepActions>
    </WizardFrame>
  );
}

export type { AgencyStep };
