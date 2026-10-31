import { ChartColumn, Info, SearchCheck, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <button type="button" aria-label={text} className="text-ink-subtle hover:text-ink-secondary">
        <Info className="size-3.5" />
      </button>
    </Tooltip>
  );
}

export function KpiCard({ label, hint, value, caption, delta }: { label: string; hint: string; value: ReactNode; caption: string; delta?: ReactNode }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
        {label}
        <InfoHint text={hint} />
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</span>
        {delta}
      </div>
      <p className="mt-2 text-xs text-ink-secondary">{caption}</p>
    </div>
  );
}

/** "+21" / "-5" next to a number; the sign carries the meaning, colour only reinforces it. */
export function Delta({ value, label, title }: { value: number | null; label: string; title: string }) {
  if (value === null) return null;
  return (
    <span title={title} className={cn("text-sm font-medium tabular-nums", value > 0 ? "text-success" : value < 0 ? "text-[#9A3412]" : "text-ink-secondary")}>
      {value > 0 ? "+" : ""}
      {label}
    </span>
  );
}

export function SectionCard({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px] text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export type Column = { header: string; hint?: string; align?: "left" | "right" };

export function DataTable({ columns, rows, empty }: { columns: Column[]; rows: { key: string; cells: ReactNode[] }[]; empty: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-canvas text-ink-secondary">
            {columns.map((column, index) => (
              <th key={column.header} className={cn("px-5 py-3.5 font-medium", column.align === "right" || (index > 0 && column.align !== "left") ? "text-right" : "text-left")}>
                <span className="inline-flex items-center gap-1.5">
                  {column.header}
                  {column.hint && <InfoHint text={column.hint} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, index) => (
                <td key={index} className={cn("px-5 py-3.5", index === 0 ? "max-w-[420px] text-ink" : "text-right tabular-nums text-ink-secondary", columns[index]?.align === "left" && "text-left")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-ink-secondary">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** A page path ("Homepage" for /) with the brand's article tag when Vaultio wrote it. */
export function PathCell({ path, tag, homepage }: { path: string; tag: string | null; homepage: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="truncate font-medium text-ink" title={path}>
        {path === "/" ? homepage : path}
      </span>
      {tag && <BrandTag label={tag} />}
    </span>
  );
}

export function BrandTag({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/30 bg-brand/5 px-2 py-0.5 text-xs font-medium text-brand">
      <Sparkles className="size-3" />
      {label}
    </span>
  );
}

/** Shown instead of the page body until the data source is connected and synced. */
export async function ConnectState({ product, syncing }: { product: "ga4" | "gsc"; syncing: boolean }) {
  const t = await getTranslations("traffic.connect");
  const Icon = product === "ga4" ? ChartColumn : SearchCheck;
  return (
    <section className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-canvas">
        <Icon className={cn("size-6", product === "ga4" ? "text-[#E8710A]" : "text-[#2A78D6]")} />
      </span>
      {syncing ? (
        <p className="mt-5 max-w-md text-[15px] text-ink-secondary">{t("syncing")}</p>
      ) : (
        <>
          <p className="mt-5 font-heading text-lg font-semibold text-ink">{t(`${product}.title`)}</p>
          <p className="mt-1 max-w-md text-sm text-ink-secondary">{t(`${product}.body`)}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/settings/analytics">{t("button")}</Link>
          </Button>
        </>
      )}
    </section>
  );
}
