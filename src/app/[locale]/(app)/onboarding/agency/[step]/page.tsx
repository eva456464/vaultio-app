import { notFound } from "next/navigation";
import { AgencyBrandStep, AgencyCallStep, AgencyDnsStep, AgencyTeamStep, AgencyWebsiteStep } from "@/components/onboarding/agency-steps";
import { BrandingForm } from "@/components/settings/white-label/branding-form";
import { HostingForm } from "@/components/settings/white-label/hosting-form";
import { redirect } from "@/i18n/navigation";
import { getAppContext, getBrand } from "@/server/context";
import { AGENCY_STEPS, type AgencyStep } from "@/server/onboarding/wizard";
import { getWhiteLabel } from "@/server/queries/white-label";

/** The agency setup wizard: agency website, branding, domain, team, a call with the account manager. */
export default async function AgencySetupPage({ params }: PageProps<"/[locale]/onboarding/agency/[step]">) {
  const { locale, step: raw } = await params;
  if (!(AGENCY_STEPS as readonly string[]).includes(raw)) notFound();
  const step = raw as AgencyStep;
  const [context, platform] = await Promise.all([getAppContext(), getBrand()]);
  const organization = context?.organization;
  if (!organization || context.member?.role !== "admin") return redirect({ href: "/clients", locale });
  if (!organization.isAgency || !organization.agencySetupStep || organization.agencySetupStep === "done") return redirect({ href: "/clients", locale });
  // Steps can be revisited, not skipped ahead of.
  const current = organization.agencySetupStep as AgencyStep;
  if (AGENCY_STEPS.indexOf(step) > AGENCY_STEPS.indexOf(current)) return redirect({ href: `/onboarding/agency/${current}`, locale });

  const brand = { name: platform.name, logoUrl: platform.logoUrl };
  const data = await getWhiteLabel(context);
  switch (step) {
    case "website":
      return <AgencyWebsiteStep brand={brand} />;
    case "brand":
      return (
        <AgencyBrandStep brand={brand} mode={organization.agencyMode} preview={{ name: data.brand.brandName, color: data.brand.primaryColor, domain: data.hosting.domain }}>
          <BrandingForm data={data} />
        </AgencyBrandStep>
      );
    case "dns":
      return (
        <AgencyDnsStep brand={brand} connected={data.hosting.verified}>
          <HostingForm data={data} />
        </AgencyDnsStep>
      );
    case "team":
      return <AgencyTeamStep brand={brand} />;
    case "call":
      return <AgencyCallStep brand={brand} booking={process.env.SUPPORT_BOOKING_URL ?? null} />;
  }
}
