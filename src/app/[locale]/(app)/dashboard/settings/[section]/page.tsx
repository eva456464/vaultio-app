import { Construction } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SETTINGS_GROUPS } from "@/lib/settings-sections";

const SECTIONS = new Set<string>(SETTINGS_GROUPS.flatMap((group) => group.sections));

export default async function SettingsSectionPage({ params }: PageProps<"/[locale]/dashboard/settings/[section]">) {
  const { section } = await params;
  if (!SECTIONS.has(section)) notFound();
  const t = await getTranslations("settings");
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{t(`sections.${section}` as "sections.account")}</h1>
      <section className="card mt-6 flex flex-col items-center px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-canvas text-ink-subtle">
          <Construction className="size-5" strokeWidth={1.5} />
        </span>
        <p className="mt-3 text-sm text-ink-secondary">{t("comingSoon")}</p>
      </section>
    </>
  );
}
