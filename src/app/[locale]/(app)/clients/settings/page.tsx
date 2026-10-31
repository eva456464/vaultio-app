import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AgencySettingsIndex() {
  redirect({ href: "/clients/settings/profile", locale: await getLocale() });
}
