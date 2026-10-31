"use client";

import { ArrowRight, Info, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import type { ImprovementEvidence, ImprovementStatus, Opportunity } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { pathOf } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { discardCandidate } from "@/server/actions/improvements";

export type ImprovementRow = {
  id: number;
  status: ImprovementStatus;
  opportunity: Opportunity | null;
  evidence: ImprovementEvidence | null;
  title: string;
  pageUrl: string;
  scheduledFor: string | null;
  changes: number;
  approved: number;
  rejected: number;
  error: string | null;
};

const STATUS_STYLE: Partial<Record<ImprovementStatus, string>> = {
  pending_review: "bg-[#EEF4FF] text-[#2A5BD7]",
  published: "bg-success-bg text-success",
  failed: "bg-[#FBEAE6] text-[#9A3412]",
  scheduled: "bg-[#FDF3E2] text-[#8A6320]",
  generating: "bg-[#FDF3E2] text-[#8A6320]",
};

export function HowItWorks() {
  const t = useTranslations("content.improvements");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Info />
        {t("howItWorks")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{t("how.title")}</DialogTitle>
          <p className="mt-3 text-sm text-ink-secondary">{t("how.intro")}</p>
          <ol className="mt-5 space-y-4">
            {(t.raw("how.steps") as [string, string][]).map(([title, body], index) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">{index + 1}</span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-sm text-ink-secondary">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm font-semibold text-ink">{t("how.eligibilityTitle")}</p>
          <p className="mt-1 text-sm text-ink-secondary">{t("how.eligibility")}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Evidence({ opportunity, evidence }: { opportunity: Opportunity; evidence: ImprovementEvidence }) {
  const t = useTranslations("content.improvements.evidence");
  const format = useFormatter();
  const b = (chunks: React.ReactNode) => <strong className="font-semibold text-ink">{chunks}</strong>;
  const values = {
    change: evidence.previousClicks28 ? Math.round(((evidence.previousClicks28 - evidence.clicks28) / evidence.previousClicks28) * 100) : 0,
    position: evidence.position === null ? "—" : format.number(evidence.position, { maximumFractionDigits: 1 }),
    ctr: format.number(evidence.ctr * 100, { maximumFractionDigits: 1 }),
    impressions: format.number(evidence.impressions90),
    words: format.number(evidence.words),
    date: format.dateTime(new Date(`${evidence.lastUpdated}T12:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" }),
  };
  return <p className="mt-2 text-sm text-ink-secondary">{t.rich(opportunity, { ...values, b })}</p>;
}

export function ImprovementsList({ rows, nextDay, canEdit }: { rows: ImprovementRow[]; nextDay: string | null; canEdit: boolean }) {
  const t = useTranslations("content.improvements");
  const format = useFormatter();
  const [filter, setFilter] = useState<"all" | "queued">("all");
  const [pending, startTransition] = useTransition();
  const day = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
  const visible = rows.filter((row) => filter === "all" || row.status === "candidate");
  const firstCandidate = rows.find((row) => row.status === "candidate")?.id;

  return (
    <div>
      <div className="flex gap-2" role="tablist">
        {(["all", "queued"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={filter === option}
            onClick={() => setFilter(option)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", filter === option ? "border-ink bg-ink text-white" : "border-control bg-white text-ink-secondary hover:text-ink")}
          >
            {t(`filter.${option}`)}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {visible.map((row) => {
          const [opportunityName, opportunityHint] = row.opportunity ? (t.raw(`opportunity.${row.opportunity}`) as [string, string]) : ["", ""];
          const reviewable = !["candidate", "scheduled", "generating"].includes(row.status);
          return (
            <li key={row.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[row.status] ?? "bg-[#F3F4F6] text-ink-secondary")}>{t(`status.${row.status}`)}</span>
                {row.opportunity && (
                  <Tooltip content={opportunityHint}>
                    <span className="cursor-help rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand">{opportunityName}</span>
                  </Tooltip>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {reviewable ? (
                    <Link href={`/dashboard/content-plan/improvements/${row.id}`} className="text-[17px] font-semibold text-ink hover:underline">
                      {row.title}
                    </Link>
                  ) : (
                    <p className="text-[17px] font-semibold text-ink">{row.title}</p>
                  )}
                  <p className="truncate text-xs text-ink-subtle">{pathOf(row.pageUrl)}</p>
                  {row.opportunity && row.evidence && <Evidence opportunity={row.opportunity} evidence={row.evidence} />}
                  {row.status === "failed" && row.error && <p className="mt-2 text-sm text-[#9A3412]">{row.error}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 text-sm">
                  {row.status === "pending_review" && (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/content-plan/improvements/${row.id}`}>
                        {t("review")}
                        <ArrowRight />
                      </Link>
                    </Button>
                  )}
                  {(row.status === "published" || row.status === "rejected" || row.status === "no_changes") && (
                    <Link href={`/dashboard/content-plan/improvements/${row.id}`} className="font-medium text-ink hover:underline">
                      {t("open")}
                    </Link>
                  )}
                  {row.changes > 0 && <span className="text-xs text-ink-secondary">{row.status === "published" || row.status === "rejected" ? t("approvedSummary", { approved: row.approved, rejected: row.rejected }) : t("summary", { changes: row.changes })}</span>}
                  {row.scheduledFor && row.status !== "published" && <span className="text-xs text-ink-secondary">{t("willImprove", { date: day(row.scheduledFor) })}</span>}
                  {row.status === "candidate" && row.id === firstCandidate && nextDay && <span className="text-xs text-ink-secondary">{t("willImprove", { date: day(nextDay) })}</span>}
                  {row.status === "candidate" && canEdit && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(t("discardConfirm"))) startTransition(async () => void (await discardCandidate(row.id)));
                      }}
                      className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-[#9A3412]"
                    >
                      <Trash2 className="size-3.5" />
                      {t("discard")}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
