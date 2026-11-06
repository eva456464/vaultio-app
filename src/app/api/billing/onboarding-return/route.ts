import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { confirmCheckout } from "@/server/actions/billing";
import { getAppContext } from "@/server/context";
import { beginOnboarding } from "@/server/onboarding/wizard";

/**
 * Stripe Checkout sends the owner here from the onboarding wizard's plan step: the trial is
 * confirmed (the webhook may not have arrived yet), the onboarding agents start, Overview opens.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const to = (path: string) => NextResponse.redirect(new URL(`/${locale}${path}`, request.url));
  const sessionId = params.get("checkout");
  const context = await getAppContext();
  if (!context?.site) return to("/sign-in");
  if (!sessionId) return to("/onboarding/plan");
  const confirmed = await confirmCheckout(sessionId).catch((error) => ({ error: (error as Error).message }));
  if ("error" in confirmed) {
    console.error("[onboarding] checkout confirmation failed:", confirmed.error);
    return to("/onboarding/plan?checkoutFailed=1");
  }
  await beginOnboarding(context.site.id);
  return to("/dashboard/overview");
}
