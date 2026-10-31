import { AccountForm } from "@/components/settings/sections/account-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function AccountSettingsPage() {
  const { user } = (await getAppContext())!;
  return (
    <>
      <SettingsTitle section="account" />
      <AccountForm name={user.name} email={user.email} />
    </>
  );
}
