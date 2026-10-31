import { BrandingForm } from "@/components/settings/sections/branding-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function BrandingSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const canEdit = context.member?.role === "admin";
  return (
    <>
      <SettingsTitle section="branding" canEdit={canEdit} />
      <BrandingForm
        canEdit={canEdit}
        initial={{ brandColor: site.brandColor ?? "#221F1F", brandSecondaryColor: site.brandSecondaryColor ?? "#FFFFFF", exampleArticleUrl: site.exampleArticleUrl ?? "" }}
      />
    </>
  );
}
