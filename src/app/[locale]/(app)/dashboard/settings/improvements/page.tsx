import { ImprovementsForm } from "@/components/settings/sections/improvements-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { availableRequirements } from "@/server/agents/capabilities";
import { getAppContext } from "@/server/context";

export default async function ImprovementsSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const canEdit = context.member?.role === "admin";
  const available = await availableRequirements(site.id);
  return (
    <>
      <SettingsTitle section="improvements" canEdit={canEdit} />
      <ImprovementsForm
        canEdit={canEdit}
        gscConnected={available.has("gsc")}
        initial={{ enabled: site.improvementsEnabled, weekdays: site.improvementWeekdays, autoPublish: site.improvementsAutoPublish }}
      />
    </>
  );
}
