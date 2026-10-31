import { getFormatter, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { ListPager, ListToolbar } from "@/components/traffic/list-controls";
import { ConnectState, DataTable, KpiCard, PathCell, SectionCard } from "@/components/traffic/parts";
import { RangeSelect } from "@/components/traffic/range-select";
import { BreakdownTable, SeriesChart, type ChartPoint } from "@/components/traffic/series-chart";
import { Link } from "@/i18n/navigation";
import { AI_SERIES } from "@/lib/ai-sources";
import { isTrafficRange } from "@/lib/traffic";
import { cn } from "@/lib/utils";
import { getAppContext, getBrand } from "@/server/context";
import { getAiTraffic, getGoogleConnections, listParams } from "@/server/queries/traffic";

const NAMES = { q: "q", page: "page", mine: "mine" };
const COLOR = Object.fromEntries(AI_SERIES.map((series) => [series.key, series.color])) as Record<string, string>;

export default async function AiTrafficPage({ searchParams }: PageProps<"/[locale]/dashboard/analytics/ai-traffic">) {
  const context = (await getAppContext())!;
  const site = context.site!;
  const query = await searchParams;
  const range = isTrafficRange(query.range) ? query.range : "30d";
  const group = query.group === "models" ? "models" : "pages";
  const list = listParams(query, NAMES);
  const [t, tTraffic, format, brand, connections] = await Promise.all([
    getTranslations("traffic.ai"),
    getTranslations("traffic"),
    getFormatter(),
    getBrand(),
    getGoogleConnections(site.id),
  ]);
  const data = connections.ga4?.connected ? await getAiTraffic(site, range, { ...list, group }) : null;
  const seriesLabel = (key: string) => (key === "Other AI" ? t("otherAi") : key);
  const articleTag = (isArticle: boolean) => (isArticle ? tTraffic("articleTag", { brand: brand.name }) : null);
  const percent = (value: number) => `${format.number(value, { maximumFractionDigits: 1 })}%`;
  const plainQuery = Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));

  return (
    <>
      <PageHeader title={t("title")} subtitle={tTraffic("subtitle")} actions={data?.hasData ? <RangeSelect range={range} /> : undefined} />
      <PageBody>
        {!data?.hasData ? (
          <ConnectState product="ga4" syncing={Boolean(connections.ga4?.connected)} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard {...t.raw("kpis.activeUsers")} value={format.number(data.kpis.activeUsers)} />
              <KpiCard {...t.raw("kpis.sessions")} value={format.number(data.kpis.sessions)} />
              <KpiCard {...t.raw("kpis.topModel")} value={data.kpis.topModel ?? "—"} />
              <KpiCard {...t.raw("kpis.models")} value={format.number(data.kpis.modelCount)} />
            </div>

            <SectionCard title={t("chartTitle")} subtitle={t("chartSubtitle")}>
              <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                <SeriesChart series={AI_SERIES.map(({ key, color }) => ({ key, label: seriesLabel(key), color }))} data={data.series as ChartPoint[]} curve="linear" />
                <BreakdownTable
                  title={t("modelsTitle")}
                  labelHeader={t("columns.model")}
                  valueHeader={t("columns.activeUsers")}
                  shareHeader={t("columns.share")}
                  rows={data.models.map((row) => ({ key: row.model, label: row.model, color: COLOR[row.series]!, value: row.activeUsers, share: row.share }))}
                />
              </div>
            </SectionCard>

            <SectionCard
              title={t("pagesTitle")}
              subtitle={t("pagesSubtitle")}
              actions={
                <div className="flex items-center gap-2 text-sm text-ink-secondary">
                  {t("groupBy")}
                  <span className="flex rounded-full border border-control bg-white p-1">
                    {(["pages", "models"] as const).map((option) => (
                      <Link
                        key={option}
                        href={{ pathname: "/dashboard/analytics/ai-traffic", query: { ...plainQuery, group: option, page: "1" } }}
                        replace
                        scroll={false}
                        aria-current={group === option}
                        className={cn("rounded-full px-3 py-1.5 font-medium", group === option ? "bg-ink text-white" : "text-ink hover:bg-canvas")}
                      >
                        {t(`groups.${option}`)}
                      </Link>
                    ))}
                  </span>
                </div>
              }
            >
              <ListToolbar names={NAMES} q={list.q} mine={list.mine} placeholder={tTraffic("searchPages")} mineLabel={tTraffic("articlesOnly", { brand: brand.name })} />
              {group === "pages" ? (
                <>
                  <DataTable
                    columns={[{ header: t("columns.page") }, { header: t("columns.activeUsers") }, { header: t("columns.pageShare") }, { header: t("columns.topModel") }]}
                    rows={data.pages.rows.map((row) => ({
                      key: row.path,
                      cells: [
                        <PathCell key="page" path={row.path} tag={articleTag(row.isArticle)} homepage={tTraffic("homepage")} />,
                        format.number(row.activeUsers),
                        percent(row.share),
                        row.topModel,
                      ],
                    }))}
                    empty={list.q || list.mine ? tTraffic("noMatches") : tTraffic("noData")}
                  />
                  <ListPager names={NAMES} page={data.pages.page} pageSize={data.pages.pageSize} total={data.pages.total} />
                </>
              ) : (
                <div className="mt-4 space-y-6">
                  {data.modelPages.map((model) => (
                    <div key={model.model}>
                      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                        <span className="size-2 rounded-full" style={{ background: COLOR[model.series] }} />
                        {model.model}
                        <span className="text-sm font-normal text-ink-secondary">{format.number(model.activeUsers)}</span>
                      </p>
                      <DataTable
                        columns={[{ header: t("columns.page") }, { header: t("columns.activeUsers") }, { header: t("columns.share") }]}
                        rows={model.pages.map((row) => ({
                          key: row.path,
                          cells: [<PathCell key="page" path={row.path} tag={articleTag(row.isArticle)} homepage={tTraffic("homepage")} />, format.number(row.activeUsers), percent(row.share)],
                        }))}
                        empty={tTraffic("noMatches")}
                      />
                    </div>
                  ))}
                  {data.modelPages.length === 0 && <p className="text-sm text-ink-secondary">{tTraffic("noData")}</p>}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </PageBody>
    </>
  );
}
