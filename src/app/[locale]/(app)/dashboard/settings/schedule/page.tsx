import { ScheduleForm } from "@/components/settings/sections/schedule-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function ScheduleSettingsPage() {
  const context = (await getAppContext())!;
  const canEdit = context.member?.role === "admin";
  return (
    <>
      <SettingsTitle section="schedule" canEdit={canEdit} />
      <ScheduleForm canEdit={canEdit} weekdays={context.site!.articleScheduleWeekdays} />
    </>
  );
}
