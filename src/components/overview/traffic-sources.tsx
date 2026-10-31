"use client";

import { ArrowDown, ArrowUpRight, CalendarDays, ChevronDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TRAFFIC_RANGES, type TrafficRange } from "@/lib/traffic";
import type { Ga4Channel } from "@/db/schema";

// Fixed series order, validated for color-vision separation of neighbours.
const SERIES: { channel: Ga4Channel; color: string }[] = [
  { channel: "Paid", color: "#22A06B" },
  { channel: "Organic search", color: "#3B82F6" },
  { channel: "Direct", color: "#F26B2A" },
  { channel: "LLM referrers", color: "#8B5CF6" },
  { channel: "Other", color: "#3FB8A6" },
];
const COLOR = Object.fromEntries(SERIES.map((s) => [s.channel, s.color])) as Record<Ga4Channel, string>;

type Point = { date: string } & Record<Ga4Channel, number>;

export function TrafficSources({
  range,
  series,
  breakdown,
  hasData,
}: {
  range: TrafficRange;
  series: Point[];
  breakdown: { channel: Ga4Channel; activeUsers: number; percentage: number }[];
  hasData: boolean;
}) {
  const t = useTranslations("overview.traffic");
  const format = useFormatter();
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<Ga4Channel>>(new Set());
  const label = (channel: Ga4Channel) => t(`channels.${channel}` as "channels.Direct");
  const shortDate = (date: string) => format.dateTime(new Date(`${date}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <section className="card p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 tracking-[-0.44px] text-ink">{t("title")}</h2>
          <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("reportingPeriod")}
              className="flex h-10 items-center gap-2 rounded-full border border-control bg-white px-4 text-sm font-medium text-ink outline-none"
            >
              <CalendarDays className="size-4 text-ink-secondary" />
              {t(`ranges.${range}`)}
              <ChevronDown className="size-4 text-ink-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TRAFFIC_RANGES.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={() => router.replace({ pathname: "/dashboard/overview", query: { range: option } }, { scroll: false })}
                  className={cn(option === range && "font-semibold")}
                >
                  {t(`ranges.${option}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/dashboard/analytics/ga4"
            className="flex h-10 items-center gap-1.5 rounded-full border border-control bg-white px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            {t("siteTraffic")}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      {!hasData ? (
        <p className="mt-8 rounded-2xl bg-canvas px-6 py-10 text-center text-sm text-ink-secondary">{t("noData")}</p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_440px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {SERIES.map(({ channel, color }) => {
                const off = hidden.has(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    aria-pressed={!off}
                    onClick={() => {
                      const next = new Set(hidden);
                      if (off) next.delete(channel);
                      else next.add(channel);
                      setHidden(next);
                    }}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full border border-control px-3.5 text-sm text-ink transition-opacity",
                      off && "opacity-45",
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ background: color }} />
                    {label(channel)}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="#EEF0F2" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ stroke: "#D1D5DB", strokeWidth: 1 }}
                    content={(props) => <ChartTooltip {...(props as TooltipContentProps<number, string>)} channelLabel={label} shortDate={shortDate} />}
                  />
                  {SERIES.filter((s) => !hidden.has(s.channel)).map(({ channel, color }) => (
                    <Line
                      key={channel}
                      type="monotone"
                      dataKey={channel}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="font-heading text-lg font-semibold text-ink">{t("channelBreakdown")}</p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="bg-canvas text-left text-ink-secondary">
                  <th className="rounded-l-lg px-3 py-2.5 font-medium">{t("channel")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      {t("activeUsers")}
                      <ArrowDown className="size-3.5" />
                    </span>
                  </th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right font-medium">{t("share")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {breakdown.map((row) => (
                  <tr key={row.channel}>
                    <td className="px-3 py-3 text-ink">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: COLOR[row.channel] }} />
                        {label(row.channel)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{format.number(row.activeUsers)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">{row.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  channelLabel,
  shortDate,
}: TooltipContentProps<number, string> & { channelLabel: (channel: Ga4Channel) => string; shortDate: (date: string) => string }) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="min-w-44 rounded-xl border border-line bg-white px-3.5 py-3 text-sm shadow-lg">
      <p className="mb-2 font-medium text-ink">{shortDate(point.date)}</p>
      <ul className="space-y-1">
        {(payload ?? []).map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span className="size-2 rounded-full" style={{ background: COLOR[entry.dataKey as Ga4Channel] }} />
              {channelLabel(entry.dataKey as Ga4Channel)}
            </span>
            <span className="tabular-nums text-ink">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
