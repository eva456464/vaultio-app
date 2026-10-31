"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BreakdownTable, SeriesChart, type ChartPoint } from "@/components/traffic/series-chart";
import { RangeSelect } from "@/components/traffic/range-select";
import type { Ga4Channel } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { CHANNEL_COLOR, CHANNEL_SERIES } from "@/lib/channels";
import type { TrafficRange } from "@/lib/traffic";

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
  const label = (channel: Ga4Channel) => t(`channels.${channel}` as "channels.Direct");

  return (
    <section className="card p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 tracking-[-0.44px] text-ink">{t("title")}</h2>
          <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <RangeSelect range={range} />
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
          <SeriesChart series={CHANNEL_SERIES.map(({ channel, color }) => ({ key: channel, label: label(channel), color }))} data={series as ChartPoint[]} />
          <BreakdownTable
            title={t("channelBreakdown")}
            labelHeader={t("channel")}
            valueHeader={t("activeUsers")}
            shareHeader={t("share")}
            rows={breakdown.map((row) => ({ key: row.channel, label: label(row.channel), color: CHANNEL_COLOR[row.channel], value: row.activeUsers, share: row.percentage }))}
          />
        </div>
      )}
    </section>
  );
}
