import { AppShell } from "@/components/shell/app-shell";
import { redirect } from "@/i18n/navigation";
import { getAppContext, getBrand } from "@/server/context";

export default async function ClientsLayout({ children, params }: LayoutProps<"/[locale]/clients">) {
  const { locale } = await params;
  const [context, brand] = await Promise.all([getAppContext(), getBrand()]);
  if (!context) return redirect({ href: "/sign-in", locale });

  return (
    <AppShell mode="agency" context={context} brand={brand}>
      {children}
    </AppShell>
  );
}
