"use client";

import { CalendarDays, Download, ExternalLink, Mail } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { REPORT_BLOCKS, SEARCH_CONSOLE_BLOCKS, type ReportBlock } from "@/lib/report-blocks";
import { cn } from "@/lib/utils";
import { saveReportSettings } from "@/server/actions/reporting";
import type { KpiMetric, ReportSettings } from "@/server/reports/settings";

type Period = "previous_month" | "this_month";
type PeriodInfo = { period: Period; range: { start: string; end: string }; availability: Record<ReportBlock, boolean> };
type HistoryRow = { id: number; start: string; end: string; sentTo: string | null; sentAt: string | null; token: string | null };

const KPIS: KpiMetric[] = ["clicks", "impressions", "position"];

function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-4 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-brand checked:before:translate-x-[18px] disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

export function ReportBuilder({
  canEdit,
  settings,
  periods,
  emailConfigured,
  gscConnected,
  history,
}: {
  canEdit: boolean;
  settings: ReportSettings;
  periods: PeriodInfo[];
  emailConfigured: boolean;
  gscConnected: boolean;
  history: HistoryRow[];
}) {
  const t = useTranslations("reporting");
  const format = useFormatter();
  const [period, setPeriod] = useState<Period>("previous_month");
  const [blocks, setBlocks] = useState(new Set(settings.blocks));
  const [kpis, setKpis] = useState(new Set(settings.kpiMetrics));
  const [autoSend, setAutoSend] = useState(settings.autoSend);
  const [recipient, setRecipient] = useState(settings.recipientEmail ?? "");
  const [emailOpen, setEmailOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const info = periods.find((p) => p.period === period)!;
  const enabled = REPORT_BLOCKS.filter((block) => blocks.has(block) && info.availability[block]);
  const query = useMemo(
    () => new URLSearchParams({ period, blocks: [...blocks].join(","), kpis: [...kpis].join(",") }).toString(),
    [period, blocks, kpis],
  );
  const range = `${format.dateTime(new Date(`${info.range.start}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" })} – ${format.dateTime(new Date(`${info.range.end}T12:00:00Z`), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;

  const persist = (next: { blocks?: Set<ReportBlock>; kpis?: Set<KpiMetric>; autoSend?: boolean; recipient?: string }) => {
    if (!canEdit) return;
    startTransition(async () => {
      const result = await saveReportSettings({
        blocks: [...(next.blocks ?? blocks)],
        kpiMetrics: [...(next.kpis ?? kpis)],
        autoSend: next.autoSend ?? autoSend,
        recipientEmail: next.recipient ?? recipient,
      });
      setMessage("error" in result && result.error ? { ok: false, text: result.error } : { ok: true, text: t("saved") });
    });
  };

  return (
    <div className="grid gap-6 px-4 py-8 md:px-12 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-[100px] xl:self-start">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/api/reports/preview?${query}&print=1`} target="_blank" rel="noreferrer" title={t("downloadHint")}>
              <Download />
              {t("download")}
            </a>
          </Button>
          <Button variant="outline" onClick={() => setEmailOpen(true)}>
            <Mail />
            {autoSend ? t("email.on") : t("email.off")}
          </Button>
        </div>

        <section className="card p-4">
          <label htmlFor="period" className="flex items-center gap-2 text-sm font-medium text-ink">
            <CalendarDays className="size-4 text-ink-secondary" />
            {t("period")}
          </label>
          <select id="period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="mt-2 h-10 w-full rounded-control border border-control bg-white px-3 text-sm">
            {periods.map((p) => <option key={p.period} value={p.period}>{t(`periods.${p.period}`)}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-ink-secondary">{range}</p>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">{t("sections")}</p>
            <p className="text-xs text-ink-secondary">{t("sectionsOn", { on: enabled.length, total: REPORT_BLOCKS.length })}</p>
          </div>
          <ul className="mt-3 space-y-1">
            {REPORT_BLOCKS.map((block) => {
              const [title, description] = t.raw(`blocks.${block}`) as [string, string];
              const available = info.availability[block];
              return (
                <li key={block} className={cn("flex items-center gap-3 rounded-lg px-2 py-2", !available && "opacity-60")}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{title}</span>
                    <span className="block text-xs text-ink-secondary">{available ? description : !gscConnected && SEARCH_CONSOLE_BLOCKS.has(block) ? t("needsGsc") : t("noData")}</span>
                  </span>
                  <Switch
                    label={title}
                    checked={blocks.has(block) && available}
                    disabled={!available || !canEdit}
                    onChange={(value) => {
                      const next = new Set(blocks);
                      if (value) next.add(block);
                      else next.delete(block);
                      setBlocks(next);
                      persist({ blocks: next });
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">{t("kpis")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {KPIS.map((metric) => {
                const on = kpis.has(metric);
                return (
                  <button
                    key={metric}
                    type="button"
                    aria-pressed={on}
                    disabled={!canEdit || (on && kpis.size === 1)}
                    onClick={() => {
                      const next = new Set(kpis);
                      if (on) next.delete(metric);
                      else next.add(metric);
                      setKpis(next);
                      persist({ kpis: next });
                    }}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "border-ink bg-ink text-white" : "border-control text-ink-secondary")}
                  >
                    {t(`kpiNames.${metric}`)}
                  </button>
                );
              })}
            </div>
          </div>
          {message && <p className={cn("mt-3 text-xs", message.ok ? "text-success" : "text-[#9A3412]")}>{message.text}</p>}
        </section>

        <section className="card p-4">
          <p className="text-sm font-semibold text-ink">{t("history")}</p>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">
                  {format.dateTime(new Date(`${row.start}T12:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" })}
                  {row.sentTo && ` · ${row.sentTo}`}
                </span>
                {row.token && (
                  <a href={`/api/reports/shared/${row.token}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ink hover:underline">
                    {t("open")}
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
            {history.length === 0 && <li className="text-ink-secondary">{t("historyEmpty")}</li>}
          </ul>
        </section>
      </aside>

      <div className="min-w-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">{t("preview")}</p>
        <iframe key={query} title={t("preview")} src={`/api/reports/preview?${query}`} className="h-[1120px] w-full rounded-2xl border border-line bg-[#E9EAEE]" />
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogTitle>{t("email.title")}</DialogTitle>
          <DialogDescription>{t("email.hint")}</DialogDescription>
          {!emailConfigured && <p className="mt-4 rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("email.needsSetup")}</p>}
          <div className="mt-5 flex items-center justify-between gap-4">
            <label htmlFor="auto-send" className="text-sm text-ink">{t("email.toggle")}</label>
            <input
              id="auto-send"
              type="checkbox"
              role="switch"
              checked={autoSend}
              disabled={!canEdit}
              onChange={(event) => setAutoSend(event.target.checked)}
              className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[22px]"
            />
          </div>
          <label htmlFor="recipient" className="mt-4 block text-sm font-medium text-ink">
            {t("email.recipient")}
            <input id="recipient" type="email" value={recipient} disabled={!canEdit} onChange={(e) => setRecipient(e.target.value)} placeholder="client@example.com" className="mt-1.5 h-11 w-full rounded-control border border-control px-3 text-sm outline-none focus:border-ink/40" />
          </label>
          {message && !message.ok && <p className="mt-2 text-sm text-[#9A3412]">{message.text}</p>}
          <Button
            className="mt-5 w-full"
            size="lg"
            disabled={!canEdit}
            onClick={() => {
              persist({ autoSend, recipient });
              setEmailOpen(false);
            }}
          >
            {t("save")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
