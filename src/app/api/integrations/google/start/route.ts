import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getAppContext } from "@/server/context";
import { authorizeUrl, googleConfigured, signState } from "@/server/google/client";

/** Sends an admin to Google's consent screen to connect GA4 or Search Console for the selected site. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const back = (query: string) => NextResponse.redirect(new URL(`/${locale}/dashboard/settings/analytics?${query}`, request.url));

  const product = params.get("product");
  if (product !== "ga4" && product !== "gsc") return back("error=product");
  const context = await getAppContext();
  if (!context?.site) return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  if (context.member?.role !== "admin") return back("error=admin");
  if (!googleConfigured()) return back("error=notConfigured");

  return NextResponse.redirect(authorizeUrl(product, signState({ siteId: context.site.id, product, userId: context.user.id, locale })));
}
