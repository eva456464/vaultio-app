"use client";

import { ChevronDown, ChevronUp, Clock, ExternalLink, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { setExchangeEnabled } from "@/server/actions/backlinks";
import type { LinkState } from "@/server/queries/backlinks";

export function ExchangeToggle({ enabled, canEdit }: { enabled: boolean; canEdit: boolean }) {
  const t = useTranslations("backlinks");
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex h-10 items-center gap-3 rounded-full border border-control bg-white px-4 text-sm font-medium text-ink">
      {t("exchangeOn")}
      <input
        type="checkbox"
        role="switch"
        checked={on}
        disabled={!canEdit || pending}
        onChange={(event) => {
          const next = event.target.checked;
          setOn(next);
          startTransition(async () => {
            await setExchangeEnabled(next);
            router.refresh();
          });
        }}
        className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-brand checked:before:translate-x-[22px] disabled:opacity-60"
      />
    </label>
  );
}

export function CreditsDialog() {
  const t = useTranslations("backlinks");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("howCredits")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>{t("credits.title")}</DialogTitle>
          <ol className="mt-5 space-y-4">
            {(t.raw("credits.steps") as [string, string][]).map(([title, body], index) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">{index + 1}</span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-sm text-ink-secondary">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm font-semibold text-ink">{t("credits.placementTitle")}</p>
          <p className="mt-1 text-sm text-ink-secondary">{t("credits.placement")}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Network sites by domain rating (5-point buckets): buckets in your match range in the brand colour,
 * the rest grey, and a marker at your own rating (your site isn't counted in the pool).
 */
export function PoolChart({ buckets, floor, rating }: { buckets: { from: number; count: number }[]; floor: number; rating: number | null }) {
  const t = useTranslations("backlinks.pool");
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const own = rating === null ? -1 : Math.min(20, Math.floor(rating / 5));
  return (
    <div className="flex gap-1.5 sm:gap-2" role="img" aria-label={t("axis")}>
      {buckets.map((bucket, index) => {
        const inRange = bucket.from + 4 >= floor;
        const label = t("bucket", { from: bucket.from, to: Math.min(100, bucket.from + 4), count: bucket.count });
        return (
          <div key={bucket.from} className="flex flex-1 flex-col" title={label}>
            <div className="relative flex h-44 flex-col justify-end">
              {index === own && (
                <>
                  <span className="absolute inset-y-0 left-1/2 z-0 w-0.5 -translate-x-1/2 bg-ink" />
                  <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white">
                    {t("yours", { rating: rating ?? 0 })}
                  </span>
                </>
              )}
              <div
                className={cn("relative w-full rounded-t-[4px]", inRange ? "bg-brand/45" : "bg-[#E5E7EB]", index === own && bucket.count && "bg-brand")}
                style={{ height: bucket.count ? `${Math.max(6, (bucket.count / max) * 100)}%` : "3px" }}
              />
            </div>
            <span className="mt-2 h-4 text-center text-[11px] tabular-nums text-ink-subtle">{bucket.from % 10 === 0 ? bucket.from : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

const STATE_STYLE: Record<LinkState, string> = {
  live: "bg-success-bg text-success",
  awaiting: "bg-[#EEF4FF] text-[#2A5BD7]",
  nofollow: "bg-[#FDF3E2] text-[#8A6320]",
  removed: "bg-[#F3F4F6] text-ink-secondary",
};

export function StateBadge({ state, own }: { state: LinkState; own?: boolean }) {
  const t = useTranslations("backlinks.status");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATE_STYLE[state])}>
      {state === "awaiting" && <Clock className="size-3" />}
      {state === "nofollow" && <TriangleAlert className="size-3" />}
      {state === "awaiting" ? t(own ? "awaitingOwn" : "awaiting") : t(state)}
    </span>
  );
}

export type LinkRow = { id: number; cells: ReactNode[] };

/** A table that shows five rows and expands to the rest. */
export function LinkTable({ headers, rows, empty }: { headers: { label: string; hint?: string; align?: "right" }[]; rows: LinkRow[]; empty: string }) {
  const t = useTranslations("backlinks");
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-canvas text-left text-ink-secondary">
            {headers.map((header) => (
              <th key={header.label} title={header.hint} className={cn("px-5 py-3.5 font-medium", header.align === "right" && "text-right")}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {shown.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={index} className={cn("px-5 py-3.5 align-top", headers[index]?.align === "right" ? "text-right tabular-nums" : "text-ink")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-5 py-10 text-center text-ink-secondary">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > 5 && (
        <div className="border-t border-line p-3">
          <Button variant="outline" size="sm" onClick={() => setAll(!all)}>
            {all ? <ChevronUp /> : <ChevronDown />}
            {all ? t("showLess") : t("showMore", { count: rows.length - 5 })}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExternalTitle({ title, url }: { title: string; url: string | null }) {
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 font-medium text-ink hover:underline">
      {title}
      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-ink-subtle" />
    </a>
  ) : (
    <span className="font-medium text-ink">{title}</span>
  );
}
