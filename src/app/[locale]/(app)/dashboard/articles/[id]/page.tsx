import { ArrowLeft, Check, ExternalLink, FileText, Link2, Link as LinkIcon, Quote, Settings2, Sparkles, X } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArticleExportMenu } from "@/components/content/article-export-menu";
import { PublishButton } from "@/components/content/publish-button";
import { Link } from "@/i18n/navigation";
import { withHeadingIds } from "@/lib/article-html";
import { cn } from "@/lib/utils";
import { getAppContext } from "@/server/context";
import { getArticle } from "@/server/queries/content";

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="text-xs text-ink-secondary">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/dashboard/articles/[id]">) {
  const { id } = await params;
  const site = (await getAppContext())!.site!;
  const row = await getArticle(site.id, Number(id));
  if (!row) notFound();
  const { article } = row;
  const [t, format] = await Promise.all([getTranslations("article"), getFormatter()]);
  const { html, toc } = withHeadingIds(article.htmlContent ?? "");
  const passed = article.qualityChecks.filter((check) => check.passed).length;
  const minutes = Math.max(1, Math.round((article.wordCount ?? 0) / 225));
  const rationale = article.generationRationale ?? {};

  return (
    <>
      <div className="sticky top-[76px] z-30 flex items-center gap-4 border-b border-line bg-white/95 px-5 py-4 backdrop-blur md:px-8">
        <Link href="/dashboard/content-plan" aria-label={t("back")} className="grid size-9 place-items-center rounded-full border border-control text-ink hover:bg-canvas">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{t("eyebrow")}</p>
          <p className="truncate text-[15px] font-semibold text-ink">{article.title}</p>
        </div>
        <p className="hidden text-sm text-ink-secondary md:block">{t("stats", { words: article.wordCount ?? 0, minutes })}</p>
      </div>

      <div className="grid gap-8 px-4 py-8 md:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="card mx-auto w-full max-w-[860px] px-6 py-10 md:px-14">
          <p className="text-right text-xs font-medium uppercase tracking-wide text-ink-secondary">
            {format.dateTime(article.publishedAt ?? article.createdAt, { dateStyle: "medium" })}
          </p>
          <h1 className="mt-4 font-heading text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink md:text-[38px]">{article.title}</h1>
          {article.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.heroImageUrl} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
          )}
          {site.includeToc && toc.length > 2 && (
            <nav className="mt-8 rounded-2xl bg-canvas p-5">
              <p className="text-sm font-semibold text-ink">{t("toc")}</p>
              <ol className="mt-2 space-y-1.5 text-sm">
                {toc.filter((entry) => entry.level === 2).map((entry) => (
                  <li key={entry.id}>
                    <a href={`#${entry.id}`} className="text-[#2A5BD7] hover:underline">{entry.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        <aside className="space-y-4 xl:sticky xl:top-[160px] xl:self-start">
          <Link href="/dashboard/settings/writing" className="flex items-center gap-2 text-sm font-medium text-ink hover:underline">
            <Settings2 className="size-4" />
            {t("customize")}
          </Link>

          <details className="group rounded-2xl border border-line bg-white p-5" open>
            <summary className="flex cursor-pointer list-none items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <span className="flex-1 text-[15px] font-semibold text-ink">{t("aiOptimized")}</span>
              <span className="text-xs font-medium text-success">{t("checksPassed", { passed, total: article.qualityChecks.length })}</span>
            </summary>
            <ul className="mt-4 space-y-2">
              {article.qualityChecks.map((check) => (
                <li key={check.key} className="flex items-center gap-2 text-sm">
                  {check.passed ? <Check className="size-4 text-success" /> : <X className="size-4 text-[#C2410C]" />}
                  <span className={cn("flex-1", check.passed ? "text-ink" : "text-ink-secondary")}>{t(`checks.${check.key}` as "checks.jsonLd")}</span>
                  {check.detail && <span className="text-xs text-ink-subtle">{check.detail}</span>}
                </li>
              ))}
            </ul>
          </details>

          {(rationale.whyThisTopic?.length ?? 0) > 0 && (
            <Panel title={t("why")}>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-secondary">
                {rationale.whyThisTopic!.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </Panel>
          )}

          <Panel title={t("publishedUrl")} hint={t("publishedUrlHint")}>
            {article.publishedUrl ? (
              <a href={article.publishedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-ink hover:underline">
                <span className="size-2 shrink-0 rounded-full bg-[#22A06B]" />
                <span className="truncate">{article.publishedUrl}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-ink-secondary">{t("notPublished")}</p>
            )}
          </Panel>

          <Panel title={t("data")} hint={t("dataHint")}>
            {row.keyword && (
              <div className="rounded-xl bg-canvas p-3">
                <p className="text-sm font-medium text-ink">{row.keyword}</p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {row.volume !== null && t("searchVolume", { value: row.volume })}
                  {row.difficulty !== null && <span className="ml-3">{t("difficulty", { value: row.difficulty })}</span>}
                </p>
              </div>
            )}
            <dl className="mt-3 divide-y divide-line text-sm">
              {[
                [FileText, t("wordCount"), article.wordCount ?? 0],
                [LinkIcon, t("internalLinks"), article.internalLinksCount],
                [Link2, t("externalLinks"), article.externalLinksCount],
                [Quote, t("sources"), article.sources.length],
              ].map(([Icon, label, value]) => {
                const IconComponent = Icon as typeof FileText;
                return (
                  <div key={label as string} className="flex items-center gap-2 py-2.5">
                    <IconComponent className="size-4 text-ink-subtle" />
                    <dt className="flex-1 text-ink-secondary">{label as string}</dt>
                    <dd className="tabular-nums text-ink">{format.number(value as number)}</dd>
                  </div>
                );
              })}
            </dl>
          </Panel>

          <Panel title={t("slug")} hint={t("slugHint")}>
            <p className="rounded-control border border-control bg-canvas px-3 py-2 font-mono text-xs text-ink">/{article.slug}</p>
          </Panel>

          <Panel title={t("metaDescription")} hint={t("metaHint")}>
            <p className="rounded-control border border-control bg-canvas px-3 py-2 text-sm leading-relaxed text-ink">{article.metaDescription}</p>
            <p className="mt-1 text-right text-xs text-ink-subtle">{t("characters", { count: article.metaDescription?.length ?? 0 })}</p>
          </Panel>

          <div className="grid grid-cols-2 gap-2">
            <PublishButton articleId={article.id} published={Boolean(article.publishedUrl)} />
            <ArticleExportMenu articleId={article.id} />
          </div>
        </aside>
      </div>
    </>
  );
}
