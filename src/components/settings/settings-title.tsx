import { getTranslations } from "next-intl/server";

export async function SettingsTitle({ section, canEdit = true }: { section: string; canEdit?: boolean }) {
  const t = await getTranslations("settings");
  return (
    <div className="mb-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{t(`sections.${section}` as "sections.account")}</h1>
      {!canEdit && <p className="mt-1 text-sm text-ink-secondary">{t("adminOnly")}</p>}
    </div>
  );
}
