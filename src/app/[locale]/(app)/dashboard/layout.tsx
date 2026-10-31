import { AppShell } from "@/components/shell/app-shell";
import { redirect } from "@/i18n/navigation";
import { getAppContext, getBrand } from "@/server/context";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  const [context, brand] = await Promise.all([getAppContext(), getBrand()]);
  if (!context) return redirect({ href: "/sign-in", locale });
  if (!context.site) return redirect({ href: context.organization?.isAgency ? "/clients" : "/onboarding/website", locale });

  return (
    <AppShell mode="site" context={context} brand={brand}>
      {children}
    </AppShell>
  );
}
