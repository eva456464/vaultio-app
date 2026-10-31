import { asc, eq } from "drizzle-orm";
import { SavedPagesForm } from "@/components/settings/sections/saved-pages-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { db } from "@/db";
import { sitePages } from "@/db/schema";
import { getAppContext } from "@/server/context";

export default async function SavedPagesSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const canEdit = context.member?.role === "admin";
  const pages = await db.select({ url: sitePages.url, title: sitePages.metaTitle }).from(sitePages).where(eq(sitePages.orgWebsiteId, site.id)).orderBy(asc(sitePages.url)).limit(2000);
  return (
    <>
      <SettingsTitle section="saved-pages" canEdit={canEdit} />
      <SavedPagesForm canEdit={canEdit} sitemapUrl={site.sitemapUrl ?? ""} pages={pages} />
    </>
  );
}
