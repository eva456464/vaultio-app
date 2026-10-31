import { getTranslations } from "next-intl/server";
import { AccountForm } from "@/components/settings/sections/account-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function AgencyProfilePage() {
  const [{ user }, t] = await Promise.all([getAppContext().then((context) => context!), getTranslations("settings.account")]);
  return (
    <>
      <SettingsTitle section="profile" />
      <p className="-mt-4 mb-6 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      <AccountForm name={user.name} email={user.email} />
    </>
  );
}
