import { getFormatter, getTranslations } from "next-intl/server";
import { CreditsDialog, ExchangeToggle, ExternalTitle, LinkTable, PoolChart, StateBadge } from "@/components/backlinks/backlinks-parts";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { KpiCard, SectionCard } from "@/components/traffic/parts";
import { cn } from "@/lib/utils";
import { getAppContext } from "@/server/context";
import { getBacklinksPage } from "@/server/queries/backlinks";

/** Tiny trend line for the domain rating card (decorative; the number beside it carries the value). */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const coords = points.map((value, index) => `${(index / (points.length - 1)) * 120},${36 - ((value - min) / Math.max(1, max - min)) * 32}`).join(" ");
  return (
    <svg aria-hidden viewBox="0 0 120 40" className="h-10 w-28">
      <polyline points={coords} fill="none" stroke="#22A06B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default async function BacklinksPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, format, data] = await Promise.all([getTranslations("backlinks"), getFormatter(), getBacklinksPage(site)]);
  const day = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: site.timeZone });
  const usd = (value: number) => format.number(value, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const canEdit = context.member?.role === "admin";

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExchangeToggle enabled={data.enabled} canEdit={canEdit} />
            <CreditsDialog />
          </div>
        }
      />
      <PageBody>
        {!data.enabled && <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("offNote")}</p>}
        {data.enabled && data.balance <= 0 && <p className="rounded-xl bg-[#EEF4FF] p-3 text-sm text-[#2A5BD7]">{t("negativeNote")}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={t("kpis.credits.label")} hint={t("kpis.credits.hint")} caption={t("kpis.credits.caption")} value={<span className={cn(data.balance < 0 && "text-[#9A3412]")}>{format.number(data.balance)}</span>} />
          <KpiCard label={t("kpis.received.label")} hint={t("kpis.received.hint")} caption={t("kpis.received.caption", { value: usd(data.receivedValue) })} value={format.number(data.receivedCount)} />
          <KpiCard label={t("kpis.given.label")} hint={t("kpis.given.hint")} caption={t("kpis.given.caption")} value={format.number(data.givenCount)} />
          <KpiCard
            label={t("kpis.rating.label")}
            hint={t("kpis.rating.hint")}
            caption={
              data.ratingChange
                ? t("kpis.rating.caption", { change: `${data.ratingChange.change >= 0 ? "+" : ""}${data.ratingChange.change}`, date: format.dateTime(new Date(`${data.ratingChange.since}T12:00:00Z`), { month: "short", year: "numeric", timeZone: "UTC" }) })
                : t("kpis.rating.captionNone")
            }
            value={
              <span className="flex items-center gap-3">
                {data.domainRating ?? "—"}
                <Sparkline points={data.ratingHistory.map((point) => point.rating)} />
              </span>
            }
          />
        </div>

        <SectionCard
          title={t("pool.title")}
          actions={<span className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-secondary">{t("pool.range", { from: data.pool.floor })}</span>}
        >
          <p className="-mt-3 mb-8 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-ink">{t("pool.inRange", { count: data.pool.inRange })}</span>
            <span className="text-sm text-ink-secondary">{t("pool.inRangeHint")}</span>
          </p>
          <PoolChart buckets={data.pool.buckets} floor={data.pool.floor} rating={data.domainRating} />
          <p className="mt-4 text-center text-sm text-ink-secondary">{t("pool.note")}</p>
          {data.domainRating === null && <p className="mt-1 text-center text-xs text-ink-subtle">{t("pool.noRating")}</p>}
        </SectionCard>

        <section>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px] text-ink">{t("given.title")}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{t("given.flow")}</p>
          <LinkTable
            headers={[{ label: t("given.source"), hint: t("given.sourceHint") }, { label: t("given.destination"), hint: t("given.destinationHint") }, { label: t("date") }]}
            empty={t("given.empty")}
            rows={data.given.map((row) => ({
              id: row.id,
              cells: [
                <ExternalTitle key="title" title={row.title} url={row.articleUrl} />,
                <span key="domain" className="flex flex-col gap-1">
                  <ExternalTitle title={row.domain} url={row.targetUrl} />
                </span>,
                <span key="date" className="flex flex-wrap items-center gap-2 text-ink-secondary">
                  {day(row.date)}
                  {row.state !== "live" && <StateBadge state={row.state} own />}
                </span>,
              ],
            }))}
          />
        </section>

        <section>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px] text-ink">{t("received.title")}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{t("received.flow")}</p>
          <LinkTable
            headers={[
              { label: t("received.source"), hint: t("received.sourceHint") },
              { label: t("received.customer"), hint: t("received.customerHint") },
              { label: t("date") },
              { label: t("received.credits"), hint: t("received.creditsHint"), align: "right" },
            ]}
            empty={t("received.empty")}
            rows={data.received.map((row) => ({
              id: row.id,
              cells: [
                <ExternalTitle key="title" title={row.title} url={row.state === "live" ? row.articleUrl : null} />,
                <span key="domain" className="font-medium">{row.domain}</span>,
                <span key="date" className="flex flex-wrap items-center gap-2 text-ink-secondary">
                  {day(row.date)}
                  {row.state !== "live" && <StateBadge state={row.state} />}
                </span>,
                <span key="credits" className={cn(row.credits < 0 ? "text-[#9A3412]" : "text-ink-secondary")}>{row.credits ? format.number(row.credits) : "—"}</span>,
              ],
            }))}
          />
        </section>
      </PageBody>
    </>
  );
}
