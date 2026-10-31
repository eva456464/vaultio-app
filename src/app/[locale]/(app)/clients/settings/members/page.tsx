import { TeamForm } from "@/components/settings/sections/team-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";
import { getTeam } from "@/server/queries/team";

export default async function AgencyMembersPage() {
  const context = (await getAppContext())!;
  const data = await getTeam(context);
  return (
    <>
      <SettingsTitle section="members" canEdit={data.isAdmin} />
      <TeamForm data={data} />
    </>
  );
}
