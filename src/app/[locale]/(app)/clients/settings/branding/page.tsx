import { getTranslations } from "next-intl/server";
import { SettingsTitle } from "@/components/settings/settings-title";
import { BrandingForm } from "@/components/settings/white-label/branding-form";
import { getAppContext } from "@/server/context";
import { getWhiteLabel } from "@/server/queries/white-label";

export default async function AgencyBrandingPage() {
  const context = (await getAppContext())!;
  const [data, t] = await Promise.all([getWhiteLabel(context), getTranslations("settings.whiteLabel")]);
  return (
    <>
      <SettingsTitle section="branding" canEdit={data.canEdit} />
      <p className="-mt-4 mb-6 text-[15px] text-ink-secondary">{t("brandSubtitle")}</p>
      <BrandingForm data={data} />
    </>
  );
}
