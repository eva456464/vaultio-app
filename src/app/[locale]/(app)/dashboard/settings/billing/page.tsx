import { BillingView } from "@/components/settings/billing/billing-view";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";
import { getBillingPage } from "@/server/queries/billing";

export default async function BillingPage({ searchParams }: PageProps<"/[locale]/dashboard/settings/billing">) {
  const query = await searchParams;
  const context = (await getAppContext())!;
  const data = await getBillingPage(context);
  const checkout = typeof query.checkout === "string" && query.checkout.startsWith("cs_") ? query.checkout : null;
  return (
    <>
      <SettingsTitle section="billing" />
      <BillingView data={data} site={new URL(context.site!.url).hostname} checkoutSession={checkout} />
    </>
  );
}
