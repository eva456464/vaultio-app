import { getFormatter, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { ListPager, ListToolbar } from "@/components/traffic/list-controls";
import { ConnectState, DataTable, KpiCard, PathCell, SectionCard } from "@/components/traffic/parts";
import { RangeSelect } from "@/components/traffic/range-select";
import { BreakdownTable, SeriesChart, type ChartPoint } from "@/components/traffic/series-chart";
import type { Ga4Channel } from "@/db/schema";
import { CHANNEL_COLOR, CHANNEL_SERIES } from "@/lib/channels";
import { isTrafficRange } from "@/lib/traffic";
import { getAppContext, getBrand } from "@/server/context";
import { getAllTraffic, getGoogleConnections, listParams } from "@/server/queries/traffic";

const NAMES = { q: "q", page: "page", mine: "mine" };

export default async function AllTrafficPage({ searchParams }: PageProps<"/[locale]/dashboard/analytics/ga4">) {
  const context = (await getAppContext())!;
  const site = context.site!;
  const query = await searchParams;
  const range = isTrafficRange(query.range) ? query.range : "30d";
  const list = listParams(query, NAMES);
  const [t, tTraffic, tChannels, format, brand, connections] = await Promise.all([
    getTranslations("traffic.all"),
    getTranslations("traffic"),
    getTranslations("overview.traffic"),
    getFormatter(),
    getBrand(),
    getGoogleConnections(site.id),
  ]);
  const channel = (key: Ga4Channel) => tChannels(`channels.${key}` as "channels.Direct");
  const data = connections.ga4?.connected ? await getAllTraffic(site, range, list) : null;

  return (
    <>
      <PageHeader title={t("title")} subtitle={tTraffic("subtitle")} actions={data?.hasData ? <RangeSelect range={range} /> : undefined} />
      <PageBody>
        {!data?.hasData ? (
          <ConnectState product="ga4" syncing={Boolean(connections.ga4?.connected)} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard {...t.raw("kpis.activeUsers")} value={format.number(data.kpis.activeUsers, { notation: "compact" })} />
              <KpiCard {...t.raw("kpis.sessions")} value={format.number(data.kpis.sessions, { notation: "compact" })} />
              <KpiCard {...t.raw("kpis.topChannel")} value={data.kpis.topChannel ? channel(data.kpis.topChannel) : "—"} />
              <KpiCard {...t.raw("kpis.aiUsers")} value={format.number(data.kpis.aiUsers)} />
            </div>

            <SectionCard title={t("chartTitle")} subtitle={t("chartSubtitle")}>
              <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                <SeriesChart series={CHANNEL_SERIES.map(({ channel: key, color }) => ({ key, label: channel(key), color }))} data={data.series as ChartPoint[]} />
                <BreakdownTable
                  title={tChannels("channelBreakdown")}
                  labelHeader={tChannels("channel")}
                  valueHeader={tChannels("activeUsers")}
                  shareHeader={tChannels("share")}
                  rows={data.breakdown.map((row) => ({ key: row.channel, label: channel(row.channel), color: CHANNEL_COLOR[row.channel], value: row.activeUsers, share: row.percentage }))}
                />
              </div>
            </SectionCard>

            <SectionCard title={t("pagesTitle")} subtitle={t("pagesSubtitle")}>
              <ListToolbar names={NAMES} q={list.q} mine={list.mine} placeholder={tTraffic("searchPages")} mineLabel={tTraffic("articlesOnly", { brand: brand.name })} />
              <DataTable
                columns={[
                  { header: t("columns.page") },
                  { header: t("columns.activeUsers"), hint: t("hints.activeUsers") },
                  { header: t("columns.pageShare"), hint: t("hints.pageShare") },
                  { header: t("columns.topSource"), hint: t("hints.topSource") },
                ]}
                rows={data.pages.rows.map((row) => ({
                  key: row.path,
                  cells: [
                    <PathCell key="page" path={row.path} tag={row.isArticle ? tTraffic("articleTag", { brand: brand.name }) : null} homepage={tTraffic("homepage")} />,
                    format.number(row.activeUsers),
                    `${format.number(row.share, { maximumFractionDigits: 1 })}%`,
                    row.topSource ? channel(row.topSource as Ga4Channel) : "—",
                  ],
                }))}
                empty={list.q || list.mine ? tTraffic("noMatches") : tTraffic("noData")}
              />
              <ListPager names={NAMES} page={data.pages.page} pageSize={data.pages.pageSize} total={data.pages.total} />
            </SectionCard>
          </>
        )}
      </PageBody>
    </>
  );
}
