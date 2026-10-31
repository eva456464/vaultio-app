import { Radar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ContentHeader } from "@/components/content/content-header";

export default async function ImprovementsPage() {
  const t = await getTranslations("content.improvements");
  return (
    <>
      <ContentHeader tab="improvements" />
      <div className="px-4 py-8 md:px-12">
        <h2 className="text-[22px] font-semibold tracking-[-0.44px] text-ink">{t("title")}</h2>
        <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
        <section className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-canvas text-ink-subtle">
            <Radar className="size-7" strokeWidth={1.5} />
          </span>
          <p className="mt-5 font-heading text-lg font-semibold text-ink">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-md text-sm text-ink-secondary">{t("emptyBody")}</p>
        </section>
      </div>
    </>
  );
}
