import { getTranslations } from "next-intl/server";
import { SettingsTitle } from "@/components/settings/settings-title";
import { HostingForm } from "@/components/settings/white-label/hosting-form";
import { getAppContext } from "@/server/context";
import { getWhiteLabel } from "@/server/queries/white-label";

export default async function AgencyHostingPage() {
  const context = (await getAppContext())!;
  const [data, t] = await Promise.all([getWhiteLabel(context), getTranslations("settings.whiteLabel")]);
  return (
    <>
      <SettingsTitle section="hosting" canEdit={data.canEdit} />
      <p className="-mt-4 mb-6 text-[15px] text-ink-secondary">{t("hostingSubtitle")}</p>
      <HostingForm data={data} />
    </>
  );
}
