import { getTranslations } from "next-intl/server";
import { ContentCalendar, ContentToolbar } from "@/components/content/content-calendar";
import { ContentHeader } from "@/components/content/content-header";
import { getAppContext } from "@/server/context";
import { getAlternativeTopics, getContentCalendar } from "@/server/queries/content";

export default async function ContentPlanPage({ searchParams }: PageProps<"/[locale]/dashboard/content-plan">) {
  const { month } = await searchParams;
  const site = (await getAppContext())!.site!;
  const [calendar, alternatives, t] = await Promise.all([
    getContentCalendar(site, typeof month === "string" ? month : undefined),
    getAlternativeTopics(site.id),
    getTranslations("content"),
  ]);
  const empty = calendar.counts.published + calendar.counts.ready + calendar.counts.queued === 0;

  return (
    <>
      <ContentHeader tab="calendar" />
      <ContentToolbar calendar={calendar} />
      <div className="px-4 py-8 md:px-12">
        {empty && <p className="mb-6 rounded-2xl border border-line bg-white px-6 py-4 text-sm text-ink-secondary">{t("emptyPlan")}</p>}
        <ContentCalendar calendar={calendar} alternatives={alternatives} />
      </div>
    </>
  );
}
