import { redirect } from "@/i18n/navigation";
import { getAppContext } from "@/server/context";

export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  const context = await getAppContext();
  if (!context) return redirect({ href: "/sign-in", locale });
  return children;
}
