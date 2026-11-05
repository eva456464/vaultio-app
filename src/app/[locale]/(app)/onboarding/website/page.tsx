import { WebsiteStep } from "@/components/onboarding/website-step";
import { redirect } from "@/i18n/navigation";
import { getAppContext, getBrand } from "@/server/context";

/** Step 1 of adding a website (or a client, for agencies). */
export default async function AddWebsitePage({ params }: PageProps<"/[locale]/onboarding/website">) {
  const { locale } = await params;
  const [context, brand] = await Promise.all([getAppContext(), getBrand()]);
  if (!context?.organization) return redirect({ href: "/sign-in", locale });
  const organization = context.organization;
  // An agency that hasn't finished its own setup continues that first.
  if (organization.isAgency && organization.agencySetupStep && organization.agencySetupStep !== "done") return redirect({ href: `/onboarding/agency/${organization.agencySetupStep}`, locale });
  const ready = context.sites.filter((site) => site.onboardingStatus !== "not_started");
  return (
    <WebsiteStep
      brand={{ name: brand.name, logoUrl: brand.logoUrl }}
      isAgency={organization.isAgency}
      backHref={ready.length ? (organization.isAgency ? "/clients" : "/dashboard/overview") : null}
      canStartAgency={!organization.isAgency && ready.length === 0 && context.member?.role === "admin" && brand.organizationId === null}
    />
  );
}
