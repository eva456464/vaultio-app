import { AppShell } from "@/components/shell/app-shell";
import { redirect } from "@/i18n/navigation";
import { getAppContext, getBrand } from "@/server/context";

export default async function ClientsLayout({ children, params }: LayoutProps<"/[locale]/clients">) {
  const { locale } = await params;
  const [context, brand] = await Promise.all([getAppContext(), getBrand()]);
  if (!context) return redirect({ href: "/sign-in", locale });
  // An agency that hasn't finished its setup continues it first.
  const step = context.organization?.agencySetupStep;
  if (context.organization?.isAgency && step && step !== "done" && context.member?.role === "admin") return redirect({ href: `/onboarding/agency/${step}`, locale });

  return (
    <AppShell mode="agency" context={context} brand={brand}>
      {children}
    </AppShell>
  );
}
