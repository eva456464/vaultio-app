import { and, eq } from "drizzle-orm";
import { getFormatter, getLocale } from "next-intl/server";
import { BillingView } from "@/components/settings/billing/billing-view";
import { LanguageBilling } from "@/components/settings/billing/language-billing";
import { SettingsTitle } from "@/components/settings/settings-title";
import { db } from "@/db";
import { orgWebsites, subscriptions } from "@/db/schema";
import { LANGUAGE_ADDON, PLAN_LIMITS } from "@/lib/billing";
import { languageName } from "@/lib/languages";
import { displayDomain } from "@/lib/utils";
import { siteEntitlements } from "@/server/billing/entitlements";
import { billingEnabled, priceCatalog } from "@/server/billing/stripe";
import { getAppContext } from "@/server/context";
import { getBillingPage } from "@/server/queries/billing";

export default async function BillingPage({ searchParams }: PageProps<"/[locale]/dashboard/settings/billing">) {
  const query = await searchParams;
  const context = (await getAppContext())!;
  const site = context.site!;
  const checkout = typeof query.checkout === "string" && query.checkout.startsWith("cs_") ? query.checkout : null;

  // A language site is paid for through its website's plan or its own language add-on.
  if (site.primaryOrgWebsiteId) {
    const [locale, format, entitlements, primaryEntitlements, [primary]] = await Promise.all([
      getLocale(),
      getFormatter(),
      siteEntitlements(site.id),
      siteEntitlements(site.primaryOrgWebsiteId),
      db.select({ url: orgWebsites.url }).from(orgWebsites).where(eq(orgWebsites.id, site.primaryOrgWebsiteId)),
    ]);
    const [trialRow] = primaryEntitlements.trialing
      ? await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.orgWebsiteId, site.primaryOrgWebsiteId), eq(subscriptions.type, "main"), eq(subscriptions.status, "trialing"))).limit(1)
      : [];
    const price = entitlements.mode === "billed" && billingEnabled() ? ((await priceCatalog().catch(() => new Map())).get(LANGUAGE_ADDON.lookupKey) ?? null) : null;
    return (
      <>
        <SettingsTitle section="billing" />
        <LanguageBilling
          locale={locale}
          checkoutSession={checkout}
          data={{
            mode: entitlements.mode,
            language: languageName(site.selectedLanguage, locale),
            website: displayDomain(primary?.url ?? site.url),
            primaryId: site.primaryOrgWebsiteId,
            coverage: entitlements.language?.coverage ?? "none",
            primaryPlan: primaryEntitlements.plan,
            primaryActive: primaryEntitlements.active,
            trialSubscriptionId: primaryEntitlements.trialing ? (trialRow?.id ?? null) : null,
            freeLanguages: PLAN_LIMITS.scale.extraLanguages,
            price: price ? format.number(price.amount / 100, { style: "currency", currency: price.currency.toUpperCase() }) : null,
            isAdmin: context.member?.role === "admin",
          }}
        />
      </>
    );
  }

  const data = await getBillingPage(context);
  return (
    <>
      <SettingsTitle section="billing" />
      <BillingView data={data} site={new URL(site.url).hostname} checkoutSession={checkout} />
    </>
  );
}
