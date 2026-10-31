import { ChevronLeft, ChevronRight, Radar, Settings2 } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { PageBody } from "@/components/shell/app-shell";
import { OpportunityCard, PlatformMark } from "@/components/socials/opportunity-card";
import type { CommunityPlatform } from "@/db/schema";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getAppContext } from "@/server/context";
import { getCommunityPage, type CommunityView } from "@/server/queries/community";

const pageHref = (platform: CommunityPlatform, view: CommunityView, page = 1) => ({
  pathname: "/dashboard/socials",
  query: { tab: platform, ...(view === "replied" ? { view } : {}), ...(page > 1 ? { page: String(page) } : {}) },
});

export default async function SocialsPage({ searchParams }: PageProps<"/[locale]/dashboard/socials">) {
  const query = await searchParams;
  if (query.tab !== "reddit" && query.tab !== "quora") redirect({ href: "/dashboard/socials?tab=reddit", locale: await getLocale() });
  const platform: CommunityPlatform = query.tab === "quora" ? "quora" : "reddit";
  const view: CommunityView = query.view === "replied" ? "replied" : "open";
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);

  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, format, data] = await Promise.all([getTranslations("socials"), getFormatter(), getCommunityPage(site, platform, view, page)]);
  const brand = site.brandName ?? new URL(site.url).hostname;
  const nextSearch =
    data.nextSearch?.kind === "soon"
      ? t("nextSearch.soon")
      : data.nextSearch
        ? format.dateTime(new Date(`${data.nextSearch.day}T12:00:00Z`), { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
        : null;

  return (
    <>
      <div className="border-b border-line bg-canvas px-5 py-8 md:px-12 md:py-11">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PlatformMark platform={platform} size="lg" />
            <div>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.025em] text-ink">{t(`${platform}.title`)}</h1>
              <p className="mt-2 text-[15px] text-ink-secondary">{t(`${platform}.subtitle`, { brand })}</p>
            </div>
          </div>
          <Link href={`/dashboard/settings/${platform}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-control bg-white px-4 text-sm font-medium text-ink hover:bg-canvas">
            <Settings2 className="size-4" />
            {t("manageKeywords")}
          </Link>
        </div>
      </div>
      <PageBody>
        {!data.llmAvailable && <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("needsLlm")}</p>}
        {data.lastRun?.status === "failed" && <p className="rounded-xl bg-[#FDECEA] p-3 text-sm text-[#9A3412]">{t("lastRunFailed", { detail: data.lastRun.detail ?? "" })}</p>}

        <section className="card p-4 md:p-6">
          <nav className="inline-flex rounded-xl bg-canvas p-1" aria-label={t(`${platform}.title`)}>
            {(["open", "replied"] as const).map((tab) => (
              <Link
                key={tab}
                href={pageHref(platform, tab)}
                aria-current={tab === view ? "page" : undefined}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium", tab === view ? "bg-white text-ink shadow-sm" : "text-ink-secondary hover:text-ink")}
              >
                {t(`tabs.${tab}`)}
                <span className="ml-1.5 tabular-nums text-ink-subtle">{format.number(data.counts[tab])}</span>
              </Link>
            ))}
          </nav>

          {view === "open" && data.total > 0 && <p className="mt-4 text-sm text-ink-secondary">{t("reviewNote")}</p>}

          {data.items.length > 0 ? (
            <div className="mt-4 space-y-4">
              {data.items.map((item) => (
                <OpportunityCard key={item.id} platform={platform} item={item} llmAvailable={data.llmAvailable} />
              ))}
            </div>
          ) : view === "replied" ? (
            <p className="py-14 text-center text-sm text-ink-secondary">{t(`${platform}.emptyReplied`)}</p>
          ) : data.keywordCount === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-canvas text-ink-subtle">
                <Radar className="size-6" strokeWidth={1.5} />
              </span>
              <p className="mt-4 font-heading text-lg font-semibold text-ink">{t("noKeywords.title")}</p>
              <p className="mt-1 max-w-md text-sm text-ink-secondary">{t("noKeywords.body", { platform: t(`${platform}.title`) })}</p>
              <Link href={`/dashboard/settings/${platform}`} className="mt-5 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/90">
                {t("noKeywords.action")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-canvas text-ink-subtle">
                <Radar className="size-6" strokeWidth={1.5} />
              </span>
              <p className="mt-4 font-heading text-lg font-semibold text-ink">{t("waiting.title")}</p>
              <p className="mt-1 max-w-md text-sm text-ink-secondary">{t("waiting.body", { when: nextSearch ?? t("nextSearch.soon") })}</p>
            </div>
          )}

          {data.total > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-secondary">
              <span>{t("showing", { from: data.from, to: data.to, total: data.total })}</span>
              {data.pages > 1 && (
                <div className="flex items-center gap-2">
                  {data.page > 1 ? (
                    <Link href={pageHref(platform, view, data.page - 1)} aria-label={t("previous")} className="grid size-10 place-items-center rounded-control border border-control bg-white text-ink hover:bg-canvas">
                      <ChevronLeft className="size-4" />
                    </Link>
                  ) : (
                    <span aria-disabled className="grid size-10 place-items-center rounded-control border border-line text-ink-subtle">
                      <ChevronLeft className="size-4" />
                    </span>
                  )}
                  {Array.from({ length: data.pages }, (_, index) => index + 1)
                    .filter((number) => number === 1 || number === data.pages || Math.abs(number - data.page) <= 1)
                    .map((number) => (
                      <Link
                        key={number}
                        href={pageHref(platform, view, number)}
                        aria-current={number === data.page ? "page" : undefined}
                        className={cn("grid size-10 place-items-center rounded-control border text-sm font-medium", number === data.page ? "border-ink bg-ink text-white" : "border-control bg-white text-ink hover:bg-canvas")}
                      >
                        {number}
                      </Link>
                    ))}
                  {data.page < data.pages ? (
                    <Link href={pageHref(platform, view, data.page + 1)} aria-label={t("next")} className="grid size-10 place-items-center rounded-control border border-control bg-white text-ink hover:bg-canvas">
                      <ChevronRight className="size-4" />
                    </Link>
                  ) : (
                    <span aria-disabled className="grid size-10 place-items-center rounded-control border border-line text-ink-subtle">
                      <ChevronRight className="size-4" />
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
}
