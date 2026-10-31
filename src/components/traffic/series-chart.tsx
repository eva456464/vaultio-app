"use client";

import { useFormatter } from "next-intl";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

export type ChartSeries = { key: string; label: string; color: string };
export type ChartPoint = { date: string } & Record<string, number | string>;

/**
 * Multi-line time series on one axis. Series keep a fixed colour and order; the pills are the
 * legend and switch lines on and off. Hovering shows every visible series for that day.
 */
export function SeriesChart({
  series,
  data,
  height = 340,
  curve = "monotone",
}: {
  series: ChartSeries[];
  data: ChartPoint[];
  height?: number;
  /** "linear" for sparse daily counts, where smoothing would draw humps between days. */
  curve?: "monotone" | "linear";
}) {
  const format = useFormatter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const shortDate = (date: string) => format.dateTime(new Date(`${date}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2">
        {series.map(({ key, label, color }) => {
          const off = hidden.has(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={!off}
              onClick={() => {
                const next = new Set(hidden);
                if (off) next.delete(key);
                else next.add(key);
                setHidden(next);
              }}
              className={cn("flex h-9 items-center gap-2 rounded-full border border-control px-3.5 text-sm text-ink transition-opacity", off && "opacity-45")}
            >
              <span className="size-2 rounded-full" style={{ background: color }} />
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="#EEF0F2" />
            <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
            <Tooltip
              cursor={{ stroke: "#D1D5DB", strokeWidth: 1 }}
              content={(props) => <SeriesTooltip {...(props as TooltipContentProps<number, string>)} series={series} shortDate={shortDate} />}
            />
            {series
              .filter((s) => !hidden.has(s.key))
              .map(({ key, color }) => (
                <Line key={key} type={curve} dataKey={key} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SeriesTooltip({ active, payload, series, shortDate }: TooltipContentProps<number, string> & { series: ChartSeries[]; shortDate: (date: string) => string }) {
  const format = useFormatter();
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="min-w-44 rounded-xl border border-line bg-white px-3.5 py-3 text-sm shadow-lg">
      <p className="mb-2 font-medium text-ink">{shortDate(point.date)}</p>
      <ul className="space-y-1">
        {(payload ?? []).map((entry) => {
          const meta = series.find((s) => s.key === entry.dataKey);
          return (
            <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-ink-secondary">
                <span className="size-2 rounded-full" style={{ background: meta?.color }} />
                {meta?.label}
              </span>
              <span className="tabular-nums text-ink">{format.number(Number(entry.value))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Ranked table next to a chart: coloured dot (the series), label, value and share. */
export function BreakdownTable({
  title,
  labelHeader,
  valueHeader,
  shareHeader,
  rows,
}: {
  title: string;
  labelHeader: string;
  valueHeader: string;
  shareHeader: string;
  rows: { key: string; label: string; color: string; value: number; share: number }[];
}) {
  const format = useFormatter();
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="font-heading text-lg font-semibold text-ink">{title}</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="bg-canvas text-left text-ink-secondary">
            <th className="rounded-l-lg px-3 py-2.5 font-medium">{labelHeader}</th>
            <th className="px-3 py-2.5 text-right font-medium">{valueHeader} ↓</th>
            <th className="rounded-r-lg px-3 py-2.5 text-right font-medium">{shareHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-3 text-ink">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-ink">{format.number(row.value)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">{row.share.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
