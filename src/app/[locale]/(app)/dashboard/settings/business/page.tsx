import { BusinessForm } from "@/components/settings/sections/business-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function BusinessSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const canEdit = context.member?.role === "admin";
  return (
    <>
      <SettingsTitle section="business" canEdit={canEdit} />
      <BusinessForm
        canEdit={canEdit}
        initial={{
          brandName: site.brandName ?? "",
          description: site.description ?? "",
          industry: site.industry ?? "",
          businessType: site.businessType ?? "",
          positioning: site.positioning ?? "",
          targetAudience: site.targetAudience,
          servicesOffered: site.servicesOffered,
        }}
      />
    </>
  );
}
