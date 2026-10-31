import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { BrandsView, PromptsView, SourcesView, VisibilityOverview } from "@/components/visibility/visibility-views";
import { Link } from "@/i18n/navigation";
import { cn, displayDomain } from "@/lib/utils";
import { getAppContext } from "@/server/context";
import { getVisibility } from "@/server/queries/visibility";

const TABS = ["overview", "prompts", "brands-mentioned", "sources"] as const;

export default async function AiVisibilityPage({ searchParams }: PageProps<"/[locale]/dashboard/ai-visibility">) {
  const { tab: requested } = await searchParams;
  const tab = TABS.find((option) => option === requested) ?? "overview";
  const site = (await getAppContext())!.site!;
  const [data, t] = await Promise.all([getVisibility(site.id), getTranslations("aiVisibility")]);
  const brand = site.brandName ?? displayDomain(site.url);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="border-b border-line bg-canvas px-5 md:px-12">
        <nav className="flex gap-6 overflow-x-auto">
          {TABS.map((option) => (
            <Link
              key={option}
              href={option === "overview" ? "/dashboard/ai-visibility" : `/dashboard/ai-visibility?tab=${option}`}
              className={cn(
                "relative whitespace-nowrap px-1 py-3 text-[15px]",
                tab === option ? "font-medium text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand" : "text-ink-secondary hover:text-ink",
              )}
            >
              {t(`tabs.${option}`)}
            </Link>
          ))}
        </nav>
      </div>
      <PageBody>
        {tab === "prompts" ? (
          <PromptsView data={data} brand={brand} />
        ) : !data.hasData ? (
          <section className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-ink-subtle">
              <Sparkles className="size-6" strokeWidth={1.5} />
            </span>
            <p className="mt-4 font-heading text-lg font-semibold text-ink">{t("noData.title")}</p>
            <p className="mt-1 max-w-md text-sm text-ink-secondary">{t("noData.body")}</p>
          </section>
        ) : tab === "brands-mentioned" ? (
          <BrandsView data={data} />
        ) : tab === "sources" ? (
          <SourcesView data={data} />
        ) : (
          <VisibilityOverview data={data} />
        )}
      </PageBody>
    </>
  );
}
