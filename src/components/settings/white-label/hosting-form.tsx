"use client";

import { Check, CircleAlert, CircleCheck, Clock, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { checkDomains, saveDomains } from "@/server/actions/white-label";
import type { WhiteLabelData } from "@/server/queries/white-label";
import { inputClass, useSave } from "../form-kit";

type State = "verified" | "pending" | "failed" | "notSet";

function StatusBadge({ state }: { state: State }) {
  const t = useTranslations("settings.whiteLabel.status");
  const Icon = { verified: CircleCheck, pending: Clock, failed: CircleAlert, notSet: Clock }[state];
  const style = { verified: "bg-success-bg text-success", pending: "bg-[#FDF3E2] text-[#8A6320]", failed: "bg-[#FDECEA] text-[#9A3412]", notSet: "bg-[#F3F4F6] text-ink-secondary" }[state];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", style)}>
      <Icon className="size-3.5" aria-hidden />
      {t(state)}
    </span>
  );
}

function CopyValue({ value }: { value: string }) {
  const t = useTranslations("settings.whiteLabel");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${t("copy")} ${value}`}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 inline-flex shrink-0 items-center text-ink-subtle hover:text-ink"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Records({ records, intro }: { records: { type: string; name: string; value: string; status?: string }[]; intro: string }) {
  const t = useTranslations("settings.whiteLabel");
  const withStatus = records.some((record) => record.status);
  return (
    <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
      <p className="mb-2 text-xs text-ink-secondary">{intro}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-ink-subtle">
            <tr>
              <th className="py-1.5 pr-3 font-medium">{t("columns.type")}</th>
              <th className="py-1.5 pr-3 font-medium">{t("columns.name")}</th>
              <th className="py-1.5 pr-3 font-medium">{t("columns.value")}</th>
              {withStatus && <th className="py-1.5 font-medium">{t("columns.status")}</th>}
            </tr>
          </thead>
          <tbody className="font-mono text-ink">
            {records.map((record, index) => (
              <tr key={index} className="border-t border-line align-top">
                <td className="py-2 pr-3">{record.type}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-start break-all">
                    {record.name}
                    <CopyValue value={record.name} />
                  </span>
                </td>
                <td className="max-w-[320px] py-2 pr-3">
                  <span className="inline-flex items-start break-all">
                    {record.value}
                    <CopyValue value={record.value} />
                  </span>
                </td>
                {withStatus && <td className="py-2 font-sans">{record.status === "verified" ? <StatusBadge state="verified" /> : <StatusBadge state="pending" />}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DomainField({ id, label, hint, placeholder, value, onChange, disabled, state, children }: { id: string; label: string; hint: string; placeholder: string; value: string; onChange: (value: string) => void; disabled: boolean; state: State; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <StatusBadge state={state} />
      </div>
      <p className="mt-0.5 text-sm text-ink-secondary">{hint}</p>
      <input id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} spellCheck={false} className={inputClass} />
      {children}
    </div>
  );
}

export function HostingForm({ data }: { data: WhiteLabelData }) {
  const t = useTranslations("settings.whiteLabel");
  const router = useRouter();
  const [form, setForm] = useState({ domain: data.hosting.domain, sendingDomain: data.email.domain });
  const [open, setOpen] = useState<{ hosting: boolean; email: boolean }>({ hosting: !data.hosting.verified && Boolean(data.hosting.domain), email: data.email.status !== "verified" && Boolean(data.email.domain) });
  const { button } = useSave(() => saveDomains(form));
  const [checking, startCheck] = useTransition();
  const checked = useRef(false);

  // Waiting for DNS is "pending"; "failed" only when setup couldn't start (no records to show).
  const hostingState: State = !data.hosting.domain ? "notSet" : data.hosting.verified ? "verified" : data.hosting.records.length ? "pending" : "failed";
  const emailState: State = !data.email.domain ? "notSet" : data.email.status === "verified" ? "verified" : data.email.status === "failed" ? "failed" : "pending";
  const pending = hostingState === "pending" || hostingState === "failed" || emailState === "pending";
  const recheck = () =>
    startCheck(async () => {
      await checkDomains();
      router.refresh();
    });

  // Pending domains are checked once when the page opens.
  useEffect(() => {
    if (checked.current || !pending || !data.canEdit) return;
    checked.current = true;
    recheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <section className="card overflow-hidden">
      <div className="space-y-7 p-5 md:p-6">
        <DomainField id="hosting-domain" label={t("hostingDomain")} hint={t("hostingDomainHint")} placeholder={t("placeholderDomain")} value={form.domain} onChange={(domain) => setForm({ ...form, domain })} disabled={!data.canEdit} state={hostingState}>
          {hostingState === "verified" && <p className="mt-2 text-sm text-success">{t("signInHere", { url: `https://${data.hosting.domain}` })}</p>}
          {data.hosting.error && <p className={cn("mt-2 text-sm", hostingState === "failed" ? "text-[#9A3412]" : "text-ink-secondary")}>{data.hosting.error}</p>}
          {data.hosting.records.length > 0 && hostingState !== "verified" && (
            <>
              <button type="button" onClick={() => setOpen({ ...open, hosting: !open.hosting })} className="mt-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
                {open.hosting ? t("hideRecords") : t("showRecords")}
              </button>
              {open.hosting && <Records records={data.hosting.records} intro={data.hosting.onVercel ? t("recordsIntro") : `${t("hostingManual")} ${t("recordsIntro")}`} />}
            </>
          )}
          {data.hosting.domain && <p className="mt-1 text-xs text-ink-subtle">{data.hosting.checkedLabel}</p>}
        </DomainField>

        <DomainField id="sending-domain" label={t("sendingDomain")} hint={t("sendingDomainHint")} placeholder={t("placeholderSending")} value={form.sendingDomain} onChange={(sendingDomain) => setForm({ ...form, sendingDomain })} disabled={!data.canEdit || !data.email.available} state={emailState}>
          {!data.email.available && <p className="mt-2 rounded-xl bg-[#EEF4FF] p-3 text-sm text-[#2A5BD7]">{t("emailNeedsResend")}</p>}
          {data.email.records.length > 0 && emailState !== "verified" && (
            <>
              <button type="button" onClick={() => setOpen({ ...open, email: !open.email })} className="mt-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
                {open.email ? t("hideRecords") : t("showRecords")}
              </button>
              {open.email && <Records records={data.email.records} intro={t("recordsIntro")} />}
            </>
          )}
          {data.email.domain && <p className="mt-1 text-xs text-ink-subtle">{data.email.checkedLabel}</p>}
        </DomainField>
      </div>
      {data.canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-3 md:px-6">
          <Button type="button" variant="outline" disabled={checking || (!data.hosting.domain && !data.email.domain)} onClick={recheck}>
            {checking ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            {checking ? t("checking") : t("checkNow")}
          </Button>
          <span className="flex items-center gap-3">{button()}</span>
        </div>
      )}
    </section>
  );
}
