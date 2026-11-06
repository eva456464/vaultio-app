import { and, eq } from "drizzle-orm";
import { AccountForm } from "@/components/settings/sections/account-form";
import { NotificationsCard } from "@/components/settings/sections/notifications";
import { SettingsTitle } from "@/components/settings/settings-title";
import { db } from "@/db";
import { emailPreferences } from "@/db/schema";
import { displayDomain } from "@/lib/utils";
import { getAppContext } from "@/server/context";
import { emailConfigured } from "@/server/invites";

export default async function AccountSettingsPage() {
  const { user, sites } = (await getAppContext())!;
  const main = sites.filter((site) => !site.primaryOrgWebsiteId && site.onboardingStatus !== "not_started");
  const prefs = await db.select().from(emailPreferences).where(and(eq(emailPreferences.userId, user.id)));
  const ready = emailConfigured();
  return (
    <>
      <SettingsTitle section="account" />
      <AccountForm name={user.name} email={user.email} />
      <div className="mt-6">
        <NotificationsCard
          sites={main.map((site) => ({ id: site.id, name: site.brandName ?? displayDomain(site.url), weekly: prefs.find((pref) => pref.orgWebsiteId === site.id)?.weeklyProgress ?? true, emailReady: ready }))}
        />
      </div>
    </>
  );
}
