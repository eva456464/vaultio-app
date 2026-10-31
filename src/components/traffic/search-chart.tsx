"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";

type Point = { date: string; clicks: number; impressions: number; position: number | null };
type Metric = "clicks" | "impressions" | "position";

// One metric at a time on one axis: clicks, impressions and ranking have different scales.
const METRICS: { key: Metric; color: string }[] = [
  { key: "clicks", color: "#2a78d6" },
  { key: "impressions", color: "#6250d6" },
  { key: "position", color: "#eb6834" },
];

export function SearchChart({ data }: { data: Point[] }) {
  const t = useTranslations("traffic.google");
  const format = useFormatter();
  const [metric, setMetric] = useState<Metric>("clicks");
  const color = METRICS.find((m) => m.key === metric)!.color;
  const shortDate = (date: string) => format.dateTime(new Date(`${date}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" });
  const value = (v: number) => (metric === "position" ? format.number(v, { maximumFractionDigits: 1 }) : format.number(v));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("chartTitle")}>
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cn("flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm", metric === m.key ? "border-ink text-ink" : "border-control text-ink-secondary hover:text-ink")}
          >
            <span className="size-2 rounded-full" style={{ background: m.color }} />
            {t(`metrics.${m.key}`)}
          </button>
        ))}
        {metric === "position" && <span className="text-xs text-ink-secondary">{t("rankingNote")}</span>}
      </div>
      <div className="mt-4 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="search-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.14} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EEF0F2" />
            <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={32} tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis
              reversed={metric === "position"}
              // Ranking: whole-number bounds so ticks land on even steps (23, 23.25, 23.5…).
              domain={metric === "position" ? [(min: number) => Math.floor(min), (max: number) => Math.ceil(max)] : [0, "auto"]}
              allowDecimals={metric === "position"}
              tickFormatter={(v: number) => (metric === "position" ? format.number(v, { maximumFractionDigits: 2 }) : value(v))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "#D1D5DB", strokeWidth: 1 }}
              content={(props) => <SearchTooltip {...(props as TooltipContentProps<number, string>)} label={t(`metrics.${metric}`)} color={color} shortDate={shortDate} value={value} />}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              fill={metric === "position" ? "none" : "url(#search-fill)"}
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SearchTooltip({
  active,
  payload,
  label,
  color,
  shortDate,
  value,
}: TooltipContentProps<number, string> & { label: string; color: string; shortDate: (date: string) => string; value: (v: number) => string }) {
  const entry = payload?.[0];
  const point = entry?.payload as Point | undefined;
  if (!active || !point || entry?.value === null || entry?.value === undefined) return null;
  return (
    <div className="min-w-40 rounded-xl border border-line bg-white px-3.5 py-3 text-sm shadow-lg">
      <p className="mb-1.5 font-medium text-ink">{shortDate(point.date)}</p>
      <p className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-ink-secondary">
          <span className="size-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular-nums text-ink">{value(Number(entry.value))}</span>
      </p>
    </div>
  );
}
