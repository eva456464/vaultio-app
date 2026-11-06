import { eq } from "drizzle-orm";
import { BusinessForm } from "@/components/settings/sections/business-form";
import { TargetLocationCard } from "@/components/settings/sections/target-location";
import { db } from "@/db";
import { targetLocations } from "@/db/schema";
import { LOCATION_OF_COUNTRY } from "@/lib/languages";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function BusinessSettingsPage({ params }: PageProps<"/[locale]/dashboard/settings/business">) {
  const { locale } = await params;
  // Names come from the server's Intl data so the page renders the same on both sides.
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const countries = Object.keys(LOCATION_OF_COUNTRY)
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const context = (await getAppContext())!;
  const site = context.site!;
  const canEdit = context.member?.role === "admin";
  const locations = await db.select().from(targetLocations).where(eq(targetLocations.orgWebsiteId, site.id));
  const country = locations.find((row) => row.kind === "country");
  const region = locations.find((row) => row.kind === "city");
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
          blogUrl: `${new URL(site.url).origin}${site.blogPath === "/" ? "" : site.blogPath}`,
        }}
      />
      <div className="mt-6">
        <TargetLocationCard
          canEdit={canEdit}
          initial={{ country: country?.countryCode ?? "global", region: region ? { locationCode: region.locationCode, name: region.name } : null }}
          countries={countries}
        />
      </div>
    </>
  );
}
