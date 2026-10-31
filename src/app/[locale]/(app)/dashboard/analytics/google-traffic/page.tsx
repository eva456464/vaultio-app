import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { ListPager, ListToolbar } from "@/components/traffic/list-controls";
import { BrandTag, ConnectState, DataTable, Delta, KpiCard, PathCell, SectionCard } from "@/components/traffic/parts";
import { RangeSelect } from "@/components/traffic/range-select";
import { SearchChart } from "@/components/traffic/search-chart";
import { countryName } from "@/lib/countries";
import { SEARCH_RANGES, type SearchRange } from "@/lib/traffic";
import { getAppContext, getBrand } from "@/server/context";
import { getGoogleConnections, getGoogleTraffic, listParams } from "@/server/queries/traffic";

const PAGES = { q: "pq", page: "pp", mine: "pm" };
const KEYWORDS = { q: "kq", page: "kp", mine: "km" };

export default async function GoogleTrafficPage({ searchParams }: PageProps<"/[locale]/dashboard/analytics/google-traffic">) {
  const context = (await getAppContext())!;
  const site = context.site!;
  const query = await searchParams;
  const range: SearchRange = SEARCH_RANGES.find((r) => r === query.range) ?? "30d";
  const lists = { pages: listParams(query, PAGES), keywords: listParams(query, KEYWORDS) };
  const [t, tTraffic, format, locale, brand, connections] = await Promise.all([
    getTranslations("traffic.google"),
    getTranslations("traffic"),
    getFormatter(),
    getLocale(),
    getBrand(),
    getGoogleConnections(site.id),
  ]);
  const data = connections.gsc?.connected ? await getGoogleTraffic(site, range, lists) : null;
  const percent = (value: number) => `${format.number(value, { maximumFractionDigits: 1 })}%`;
  const day = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHeader title={t("title")} subtitle={tTraffic("subtitle")} actions={data ? <RangeSelect range={range} ranges={SEARCH_RANGES} /> : undefined} />
      <PageBody>
        {!data ? (
          <ConnectState product="gsc" syncing={Boolean(connections.gsc?.connected)} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <KpiCard
                {...t.raw("kpis.clicks")}
                value={format.number(data.kpis.clicks)}
                delta={<Delta value={data.kpis.clicksChange} label={format.number(data.kpis.clicksChange ?? 0)} title={t("changeHint")} />}
              />
              <KpiCard
                {...t.raw("kpis.impressions")}
                value={format.number(data.kpis.impressions)}
                delta={<Delta value={data.kpis.impressionsChange} label={format.number(data.kpis.impressionsChange ?? 0)} title={t("changeHint")} />}
              />
              <KpiCard {...t.raw("kpis.position")} value={data.kpis.position === null ? "—" : format.number(data.kpis.position, { maximumFractionDigits: 1 })} />
            </div>

            {data.countries.length > 0 && (
              <SectionCard title={t("countriesTitle")}>
                <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                  {data.countries.map((row) => (
                    <li key={row.country}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-ink">{countryName(row.country, locale)}</span>
                        <span className="shrink-0 tabular-nums text-ink">
                          {format.number(row.clicks)} <span className="ml-1.5 text-xs text-ink-secondary">{percent(row.share)}</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${Math.max(1, row.share)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            <SectionCard title={t("chartTitle")} subtitle={t("chartSubtitle")} actions={<span className="text-xs text-ink-secondary">{t("dataThrough", { date: day(data.range.end) })}</span>}>
              <SearchChart data={data.series} />
            </SectionCard>

            <SectionCard title={t("pagesTitle")} subtitle={t("pagesSubtitle")}>
              <ListToolbar names={PAGES} q={lists.pages.q} mine={lists.pages.mine} placeholder={tTraffic("searchPages")} mineLabel={tTraffic("articlesOnly", { brand: brand.name })} />
              <DataTable
                columns={[
                  { header: t("columns.page") },
                  { header: t("columns.clicks"), hint: t("hints.clicks") },
                  { header: t("columns.impressions"), hint: t("hints.impressions") },
                  { header: t("columns.clickShare"), hint: t("hints.clickShare") },
                  { header: t("columns.ctr"), hint: t("hints.ctr") },
                  { header: t("columns.position"), hint: t("hints.position") },
                ]}
                rows={data.pages.rows.map((row) => ({
                  key: row.url,
                  cells: [
                    <PathCell key="page" path={row.path} tag={row.isArticle ? tTraffic("articleTag", { brand: brand.name }) : null} homepage={tTraffic("homepage")} />,
                    format.number(row.clicks),
                    format.number(row.impressions),
                    percent(row.clickShare),
                    percent(row.ctr),
                    format.number(row.position, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
                  ],
                }))}
                empty={lists.pages.q || lists.pages.mine ? tTraffic("noMatches") : tTraffic("noData")}
              />
              <ListPager names={PAGES} page={data.pages.page} pageSize={data.pages.pageSize} total={data.pages.total} />
            </SectionCard>

            <SectionCard title={t("keywordsTitle")} subtitle={t("keywordsSubtitle")}>
              <ListToolbar names={KEYWORDS} q={lists.keywords.q} mine={lists.keywords.mine} placeholder={tTraffic("searchKeywords")} mineLabel={t("keywordsOnly", { brand: brand.name })} />
              <DataTable
                columns={[
                  { header: t("keywordColumns.keyword") },
                  { header: t("keywordColumns.clicks") },
                  { header: t("keywordColumns.impressions") },
                  { header: t("keywordColumns.position"), hint: t("hints.position") },
                ]}
                rows={data.keywords.rows.map((row) => ({
                  key: row.query,
                  cells: [
                    <span key="keyword" className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{row.query}</span>
                      {row.isArticle && <BrandTag label={t("keywordTag", { brand: brand.name })} />}
                    </span>,
                    format.number(row.clicks),
                    format.number(row.impressions),
                    format.number(row.position, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
                  ],
                }))}
                empty={lists.keywords.q || lists.keywords.mine ? tTraffic("noMatches") : tTraffic("noData")}
              />
              <ListPager names={KEYWORDS} page={data.keywords.page} pageSize={data.keywords.pageSize} total={data.keywords.total} />
            </SectionCard>
          </>
        )}
      </PageBody>
    </>
  );
}
