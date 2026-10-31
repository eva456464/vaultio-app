import { getTranslations } from "next-intl/server";
import { SettingsTitle } from "@/components/settings/settings-title";
import { BrandingForm } from "@/components/settings/white-label/branding-form";
import { HostingForm } from "@/components/settings/white-label/hosting-form";
import { getAppContext } from "@/server/context";
import { getWhiteLabel } from "@/server/queries/white-label";

/** Settings → White label ("Branding and domains"): the same settings as the agency's Branding and Hosting pages. */
export default async function WhiteLabelSettingsPage() {
  const context = (await getAppContext())!;
  const [data, t] = await Promise.all([getWhiteLabel(context), getTranslations("settings.whiteLabel")]);
  return (
    <>
      <SettingsTitle section="white-label" canEdit={data.canEdit} />
      <p className="-mt-4 mb-6 text-[15px] text-ink-secondary">{t("pageSubtitle")}</p>
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 font-sans text-[16px] font-semibold text-ink">{t("brandTitle")}</h2>
          <BrandingForm data={data} />
        </div>
        <div>
          <h2 className="mb-3 font-sans text-[16px] font-semibold text-ink">{t("hostingTitle")}</h2>
          <HostingForm data={data} />
        </div>
      </div>
    </>
  );
}
