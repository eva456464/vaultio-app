import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AnswerTabs } from "@/components/visibility/answer-tabs";
import { AssistantChips, BrandsTable, SourcesTable } from "@/components/visibility/visibility-views";
import { Link } from "@/i18n/navigation";
import { displayDomain } from "@/lib/utils";
import { getAppContext } from "@/server/context";
import { renderArticleHtml } from "@/server/markdown";
import { getPromptDetail } from "@/server/queries/visibility";

export default async function PromptDetailPage({ params }: PageProps<"/[locale]/dashboard/ai-visibility/[promptId]">) {
  const { promptId } = await params;
  const site = (await getAppContext())!.site!;
  const [detail, t] = await Promise.all([getPromptDetail(site.id, Number(promptId)), getTranslations("aiVisibility")]);
  if (!detail) notFound();
  const brand = site.brandName ?? displayDomain(site.url);
  const mentionedIn = detail.answers.filter((answer) => answer.mentioned).map((answer) => answer.provider);

  const facts = [
    [t("detail.mentionedIn", { brand }), detail.answers.length ? (mentionedIn.length ? <AssistantChips key="m" providers={mentionedIn} /> : t("prompts.notMentioned")) : "—"],
    [t("detail.sources"), detail.sources.length],
    [t("detail.brands"), detail.brands.length],
    [t("detail.intent"), t(`intents.${detail.prompt.intent}`)],
  ] as const;

  return (
    <div className="space-y-6 px-4 py-8 md:px-12">
      <Link href="/dashboard/ai-visibility?tab=prompts" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink">
        <ArrowLeft className="size-4" />
        {t("detail.back")}
      </Link>
      <section className="card p-5 md:p-7">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{t("detail.prompt")}</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-snug tracking-[-0.02em] text-ink">{detail.prompt.prompt}</h1>
        <dl className="mt-6 grid gap-4 sm:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-canvas p-3">
              <dt className="text-xs text-ink-secondary">{label}</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {detail.answers.length ? (
        <AnswerTabs answers={detail.answers.map((answer) => ({ ...answer, html: renderArticleHtml(answer.answer) }))} />
      ) : (
        <p className="card px-6 py-10 text-center text-sm text-ink-secondary">{t("detail.noAnswers")}</p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 md:p-6">
          <p className="text-[15px] font-semibold text-ink">{t("detail.sourcesCited")}</p>
          <div className="mt-3"><SourcesTable rows={detail.sources} /></div>
        </section>
        <section className="card p-5 md:p-6">
          <p className="text-[15px] font-semibold text-ink">{t("detail.brands")}</p>
          <div className="mt-3"><BrandsTable rows={detail.brands} total={Math.max(1, detail.answers.length)} /></div>
        </section>
      </div>
    </div>
  );
}
