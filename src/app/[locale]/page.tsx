import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/server/context";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const context = await getAppContext();
  if (!context) return redirect({ href: "/sign-in", locale });
  if (!context.site) return redirect({ href: context.organization?.isAgency ? "/clients" : "/onboarding/website", locale });
  return redirect({ href: "/dashboard/overview", locale });
}
