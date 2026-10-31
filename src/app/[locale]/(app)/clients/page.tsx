import { getTranslations } from "next-intl/server";
import { ClientsTable } from "@/components/clients/clients-table";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
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
          <Button variant="outline" size="lg" disabled title="Billing is connected in a later phase">
            {t("manageSubscriptions")}
          </Button>
        }
      />
      <PageBody>
        <ClientsTable sites={context.sites} canAdd={context.member?.role === "admin"} />
      </PageBody>
    </>
  );
}
