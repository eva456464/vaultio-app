import { getTranslations } from "next-intl/server";
import { ClientsTable } from "@/components/clients/clients-table";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { PortalButton } from "@/components/settings/billing/portal-button";
import { billingEnabled } from "@/server/billing/stripe";
import { getAppContext } from "@/server/context";

export default async function ClientsPage() {
  const context = (await getAppContext())!;
  const t = await getTranslations("clients");
  const firstName = context.user.name.split(" ")[0] ?? context.user.name;

  return (
    <>
      <PageHeader
        title={t("welcomeBack", { name: firstName })}
        subtitle={t("subtitle")}
        actions={
          // Stripe's portal lists every client site's subscription, payment methods and invoices.
          billingEnabled() && context.member?.role === "admin" && context.organization?.stripeCustomerId && !context.organization.billingExempt ? (
            <PortalButton label={t("manageSubscriptions")} />
          ) : undefined
        }
      />
      <PageBody>
        <ClientsTable sites={context.sites} canAdd={context.member?.role === "admin"} />
      </PageBody>
    </>
  );
}
