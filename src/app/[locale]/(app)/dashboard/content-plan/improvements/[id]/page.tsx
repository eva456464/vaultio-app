import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ImprovementReview, type ReviewChange } from "@/components/content/improvement-review";
import { Link } from "@/i18n/navigation";
import { pathOf } from "@/lib/paths";
import { getAppContext } from "@/server/context";
import { protectBlocks } from "@/server/improvements/sections";
import { renderArticleHtml } from "@/server/markdown";
import { getImprovement } from "@/server/queries/improvements";

export default async function ImprovementPage({ params }: PageProps<"/[locale]/dashboard/content-plan/improvements/[id]">) {
  const { id } = await params;
  const context = (await getAppContext())!;
  const site = context.site!;
  const data = await getImprovement(site, Number(id));
  if (!data) notFound();
  const { improvement, article, impact } = data;
  const [t, tList, format] = await Promise.all([getTranslations("content.improvements.detail"), getTranslations("content.improvements"), getFormatter()]);
  // CTA and video cards are kept as they are; in the preview they show as a note.
  const html = (markdown?: string) => (markdown === undefined ? undefined : renderArticleHtml(protectBlocks(markdown).replace(/\[\[KEEP-\d+\]\]/g, `*${t("card")}*`)));
  const changes: ReviewChange[] = improvement.changes.map((change) =>
    change.kind === "rewrite" || change.kind === "add" ? { ...change, originalHtml: html(change.original), suggestedHtml: html(change.suggested) } : change,
  );
  const [opportunityName] = improvement.opportunity ? (tList.raw(`opportunity.${improvement.opportunity}`) as [string, string]) : [""];
  const signed = (value: number) => `${value > 0 ? "+" : ""}${format.number(value)}`;

  return (
    <>
      <div className="sticky top-[76px] z-30 flex items-center gap-4 border-b border-line bg-white/95 px-5 py-4 backdrop-blur md:px-8">
        <Link href="/dashboard/content-plan/improvements" aria-label={t("back")} className="grid size-9 place-items-center rounded-full border border-control text-ink hover:bg-canvas">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{t("eyebrow")}</p>
          <p className="truncate text-[15px] font-semibold text-ink">{article?.title ?? improvement.originalTitle ?? improvement.pageUrl}</p>
        </div>
        <span className="hidden rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-ink-secondary sm:inline">{tList(`status.${improvement.status}`)}</span>
      </div>

      <div className="grid gap-8 px-4 py-8 md:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {improvement.status === "failed" && improvement.error && <p className="mb-4 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]">{t("error", { error: improvement.error })}</p>}
          <ImprovementReview id={improvement.id} status={improvement.status} changes={changes} flags={improvement.safetyFlags} canEdit={context.member?.role === "admin"} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[160px] xl:self-start">
          {opportunityName && (
            <section className="rounded-2xl border border-line bg-white p-5">
              <span className="rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand">{opportunityName}</span>
              {improvement.scheduledFor && <p className="mt-3 text-sm text-ink-secondary">{tList("willImprove", { date: format.dateTime(new Date(`${improvement.scheduledFor}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" }) })}</p>}
            </section>
          )}
          {improvement.status === "published" && (
            <section className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[15px] font-semibold text-ink">{t("impact")}</p>
              <p className="mt-2 text-sm text-ink-secondary">{impact ? tList("measured", { days: impact.days, clicks: signed(impact.clicks), impressions: signed(impact.impressions) }) : t("impactPending")}</p>
            </section>
          )}
          {article && (
            <section className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[15px] font-semibold text-ink">{t("data")}</p>
              <dl className="mt-3 divide-y divide-line text-sm">
                {[
                  [t("words"), article.wordCount ?? 0],
                  [t("internalLinks"), article.internalLinksCount],
                  [t("externalLinks"), article.externalLinksCount],
                ].map(([name, value]) => (
                  <div key={String(name)} className="flex justify-between py-2">
                    <dt className="text-ink-secondary">{name}</dt>
                    <dd className="tabular-nums text-ink">{format.number(Number(value))}</dd>
                  </div>
                ))}
              </dl>
              <Link href={`/dashboard/articles/${article.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
                {t("viewArticle")}
                <ExternalLink className="size-3.5" />
              </Link>
              <p className="mt-1 truncate text-xs text-ink-subtle">{pathOf(improvement.pageUrl)}</p>
            </section>
          )}
          {improvement.queries.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[15px] font-semibold text-ink">{t("searches")}</p>
              <p className="text-xs text-ink-secondary">{t("searchesHint")}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {improvement.queries.slice(0, 10).map((query) => (
                  <li key={query.query}>
                    <p className="text-ink">{query.query}</p>
                    <p className="text-xs text-ink-secondary">
                      {format.number(query.impressions)} {t("impressions")} · {format.number(query.clicks)} {t("clicks")} · {t("position")} {format.number(query.position, { maximumFractionDigits: 1 })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
