import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BrandStep } from "@/components/onboarding/brand-step";
import { BusinessStep } from "@/components/onboarding/business-step";
import { CompetitorsStep } from "@/components/onboarding/competitors-step";
import { PlanStep, SearchConsoleStep, SurveyStep } from "@/components/onboarding/final-steps";
import { MarketStep } from "@/components/onboarding/market-step";
import { db } from "@/db";
import { targetLocations } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { PLAN_LOOKUP_KEYS } from "@/lib/billing";
import { priceCatalog } from "@/server/billing/stripe";
import { volumeDiscount } from "@/server/billing/volume";
import { getAppContext, getBrand } from "@/server/context";
import { beginOnboarding, WIZARD_STEPS, type WizardStep } from "@/server/onboarding/wizard";
import { searchConsoleConnected, wizardPosition, wizardRoute, wizardSkips } from "@/server/queries/onboarding";

/** Steps 2–5 of adding a website, then Search Console, the survey and the plan. */
export default async function OnboardingStepPage({ params, searchParams }: PageProps<"/[locale]/onboarding/[step]">) {
  const [{ locale, step: raw }, query] = await Promise.all([params, searchParams]);
  if (!(WIZARD_STEPS as readonly string[]).includes(raw)) notFound();
  const step = raw as WizardStep;
  const [context, brandInfo] = await Promise.all([getAppContext(), getBrand()]);
  const site = context?.site;
  if (!context?.organization || !site) return redirect({ href: "/onboarding/website", locale });
  if (site.onboardingStatus !== "not_started" || context.member?.role !== "admin") return redirect({ href: "/dashboard/overview", locale });

  const skips = await wizardSkips(site, context.organization);
  const position = wizardPosition(site, skips);
  if (!position) {
    await beginOnboarding(site.id);
    return redirect({ href: "/dashboard/overview", locale });
  }
  // Steps ahead of the first unanswered one (or that don't apply) lead back to it.
  if (skips[step] || WIZARD_STEPS.indexOf(step) > WIZARD_STEPS.indexOf(position)) return redirect({ href: `/onboarding/${position}`, locale });

  const { next, back } = wizardRoute(step, skips);
  const brand = { name: brandInfo.name, logoUrl: brandInfo.logoUrl };
  const domain = new URL(site.url).hostname.replace(/^www\./, "");
  const answered = WIZARD_STEPS.indexOf(step) < WIZARD_STEPS.indexOf(position);

  switch (step) {
    case "market": {
      const [country] = answered ? await db.select({ code: targetLocations.countryCode }).from(targetLocations).where(and(eq(targetLocations.orgWebsiteId, site.id), eq(targetLocations.kind, "country"))) : [];
      const saved = answered ? { language: site.selectedLanguage, country: site.onboardingAnswers.market === "global" ? "global" : (country?.code ?? "global") } : null;
      return <MarketStep brand={brand} domain={domain} saved={saved} next={next} />;
    }
    case "business":
      return <BusinessStep brand={brand} url={domain} back={back ?? "/onboarding/market"} next={next} />;
    case "competitors":
      return <CompetitorsStep brand={brand} back={back ?? "/onboarding/business"} next={next} />;
    case "brand":
      return <BrandStep brand={brand} back={back ?? "/onboarding/competitors"} next={next} />;
    case "search-console":
      return <SearchConsoleStep brand={brand} connected={await searchConsoleConnected(site.id)} error={typeof query.error === "string" ? query.error : null} back={back ?? "/onboarding/brand"} next={next} />;
    case "survey":
      return <SurveyStep brand={brand} next={next} />;
    case "plan": {
      const prices = await priceCatalog().catch(() => new Map());
      const money = (key: string) => {
        const price = prices.get(key);
        return price ? new Intl.NumberFormat(locale, { style: "currency", currency: price.currency.toUpperCase(), maximumFractionDigits: 0 }).format(price.amount / 100) : null;
      };
      const plans = (["grow", "scale"] as const).map((plan) => ({ plan, price: money(PLAN_LOOKUP_KEYS[plan].month) }));
      return (
        <PlanStep
          brand={brand}
          domain={domain}
          plans={plans}
          trialDays={Number(process.env.BILLING_TRIAL_DAYS ?? 3)}
          volumePercent={(await volumeDiscount(context.organization.id, site.id).catch(() => null))?.percent ?? 0}
          scaleHref="/dashboard/settings/billing"
          checkoutFailed={query.checkoutFailed === "1"}
        />
      );
    }
  }
}
