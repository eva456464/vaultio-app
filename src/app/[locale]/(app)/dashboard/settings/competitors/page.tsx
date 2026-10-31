import { asc, eq } from "drizzle-orm";
import { CompetitorsForm } from "@/components/settings/sections/competitors-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { db } from "@/db";
import { competitors } from "@/db/schema";
import { getAppContext } from "@/server/context";

export default async function CompetitorsSettingsPage() {
  const context = (await getAppContext())!;
  const canEdit = context.member?.role === "admin";
  const rows = await db.select({ id: competitors.id, url: competitors.url }).from(competitors).where(eq(competitors.orgWebsiteId, context.site!.id)).orderBy(asc(competitors.createdAt));
  return (
    <>
      <SettingsTitle section="competitors" canEdit={canEdit} />
      <CompetitorsForm canEdit={canEdit} competitors={rows} />
    </>
  );
}
