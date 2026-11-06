import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Check, ExternalLink, FileText, Link2, Link as LinkIcon, Package, Quote, Settings2, Sparkles, SquarePen, X } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArticleExportMenu } from "@/components/content/article-export-menu";
import { CoverImagePanel } from "@/components/content/cover-image-panel";
import { ArticleEditor } from "@/components/content/editor/article-editor";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { PublishButton } from "@/components/content/publish-button";
import { Link } from "@/i18n/navigation";
import { withHeadingIds } from "@/lib/article-html";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { images } from "@/server/ai/images";
import { getAppContext } from "@/server/context";
import { markdownToEditorHtml } from "@/server/articles/document";
import { mediaUrl } from "@/server/media";
import { getAlternativeTopics, getArticle } from "@/server/queries/content";
import { ArticleFeedback } from "@/components/content/article-feedback";

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="text-xs text-ink-secondary">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ArticlePage({ params, searchParams }: PageProps<"/[locale]/dashboard/articles/[id]">) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const query = await searchParams;
  const context = (await getAppContext())!;
  const site = context.site!;
  const row = await getArticle(site.id, Number(id));
  if (!row) notFound();
  const { article } = row;
  const canEdit = context.member?.role === "admin";

  if (query.edit && canEdit && article.content && !row.regenerating) {
    // Images this article or the site already has, offered when an image is replaced.
    const recent = await db
      .select({ id: mediaAssets.id, articleId: mediaAssets.articleId, kind: mediaAssets.kind })
      .from(mediaAssets)
      .where(eq(mediaAssets.orgWebsiteId, site.id))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(24);
    const suggested = [
      ...article.media.filter((item) => item.type !== "video").map((item) => ({ url: item.url, altText: item.altText ?? "" })),
      ...recent.filter((item) => item.kind !== "infographic").map((item) => ({ url: mediaUrl(item.id), altText: "" })),
    ].filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index);
    return (
      <ArticleEditor
        articleId={article.id}
        initial={{ title: article.title, html: markdownToEditorHtml(article.content, article.blocks), metaDescription: article.metaDescription ?? "", slug: article.slug }}
        cards={article.blocks.map((block) => ({ kind: block.kind, title: block.kind === "product" ? block.name : block.title }))}
        keyword={row.keyword ? { value: row.keyword, volume: row.volume, difficulty: row.difficulty } : null}
        suggestedImages={suggested}
        aiImagesRemaining={Math.max(0, 5 - article.aiImageRegenerationCount)}
        imagesAvailable={images.available()}
        aiAvailable={Boolean(process.env.ANTHROPIC_API_KEY)}
        siteOrigin={new URL(site.url).origin}
        readUrl={`/dashboard/articles/${article.id}`}
      />
    );
  }

  const [t, format, alternatives] = await Promise.all([getTranslations("article"), getFormatter(), canEdit && row.planItemId ? getAlternativeTopics(site.id) : Promise.resolve([])]);
  const { html, toc } = withHeadingIds(article.htmlContent ?? "");
  const passed = article.qualityChecks.filter((check) => check.passed).length;
  const minutes = Math.max(1, Math.round((article.wordCount ?? 0) / 225));
  const rationale = article.generationRationale ?? {};
  const cover = article.media.find((item) => item.identifier === "hero_image");

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
        {canEdit && article.content && !row.regenerating && (
          <Link href={`/dashboard/articles/${article.id}?edit=1`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">
            <SquarePen className="size-4" /> {t("edit")}
          </Link>
        )}
      </div>
      {row.regenerating && (
        <p role="status" className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink md:mx-8">
          <Sparkles className="size-4 text-brand" /> {t("regeneratingBanner")}
        </p>
      )}
      {query.saved && (
        <p role="status" className="mx-4 mt-4 rounded-xl border border-success-border bg-success-bg px-4 py-3 text-sm text-success md:mx-8">
          {query.saved === "republish" ? t("savedRepublish") : t("saved")}
        </p>
      )}

      <div className="grid gap-8 px-4 py-8 md:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="card mx-auto w-full max-w-[860px] px-6 py-10 md:px-14">
          <p className="text-right text-xs font-medium uppercase tracking-wide text-ink-secondary">
            {format.dateTime(article.publishedAt ?? article.createdAt, { dateStyle: "medium" })}
          </p>
          <h1 className="mt-4 font-heading text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink md:text-[38px]">{article.title}</h1>
          {article.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.heroImageUrl} alt={cover?.altText ?? ""} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
          )}
          {site.includeToc && toc.length > 2 && !html.includes("vaultio-toc") && (
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

          <CoverImagePanel
            articleId={article.id}
            imageUrl={article.heroImageUrl}
            altText={cover?.altText ?? null}
            remaining={Math.max(0, 5 - article.aiImageRegenerationCount)}
            canEdit={canEdit}
            available={images.available()}
            published={Boolean(article.publishedUrl)}
          />

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

          {article.featuredProducts.length > 0 && (
            <Panel title={t("featuredProducts")} hint={t("featuredProductsHint")}>
              <ul className="space-y-2">
                {article.featuredProducts.map((product) => (
                  <li key={product.id}>
                    <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl p-1 hover:bg-canvas">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- product photo from the client's catalog
                        <img src={product.imageUrl} alt="" className="size-10 shrink-0 rounded-lg border border-line object-cover" />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-canvas text-ink-subtle"><Package className="size-4" /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{product.name}</span>
                        {product.price && <span className="block text-xs text-ink-secondary">{formatPrice(product.price, product.currency, site.selectedLanguage)}</span>}
                      </span>
                      <ExternalLink className="size-3.5 shrink-0 text-ink-subtle" />
                    </a>
                  </li>
                ))}
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
            <PublishButton articleId={article.id} published={Boolean(article.publishedUrl)} canEdit={canEdit} />
            <ArticleExportMenu articleId={article.id} />
          </div>

          {canEdit && !row.regenerating && <ArticleFeedback articleId={article.id} alreadyGiven={article.isHappyFeedback !== null} alternatives={alternatives} canRegenerate={Boolean(row.planItemId)} />}
        </aside>
      </div>
    </>
  );
}
