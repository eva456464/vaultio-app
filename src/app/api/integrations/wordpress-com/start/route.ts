import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getAppContext } from "@/server/context";
import { encryptJson } from "@/server/crypto";
import { wpcomAuthorizeUrl, wpcomConfigured } from "@/server/publishing/platforms/wordpress-com";
import { wpcomRedirectUri } from "@/server/publishing/wpcom-oauth";


/** Sends an admin to WordPress.com to pick the site and approve publishing. */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const back = (query: string) => NextResponse.redirect(new URL(`/${locale}/dashboard/settings/publishing?${query}`, request.url));
  const context = await getAppContext();
  if (!context?.site) return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  if (context.member?.role !== "admin") return back("wpcom=admin");
  if (!wpcomConfigured()) return back("wpcom=notConfigured");
  // Sealed, so the callback knows which site and person started it and that it's recent.
  const state = encryptJson({ siteId: context.site.id, userId: context.user.id, locale, exp: Date.now() + 15 * 60_000 });
  return NextResponse.redirect(wpcomAuthorizeUrl(await wpcomRedirectUri(), state));
}
