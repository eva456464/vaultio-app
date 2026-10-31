import { desc, eq } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/shell/app-shell";
import { db } from "@/db";
import { invoices, orgWebsites } from "@/db/schema";
import { displayDomain } from "@/lib/utils";
import { getAppContext } from "@/server/context";

export default async function InvoicesPage() {
  const context = (await getAppContext())!;
  const [t, format] = await Promise.all([getTranslations("invoices"), getFormatter()]);
  const rows = context.organization
    ? await db
        .select({ invoice: invoices, url: orgWebsites.url })
        .from(invoices)
        .leftJoin(orgWebsites, eq(orgWebsites.id, invoices.orgWebsiteId))
        .where(eq(invoices.organizationId, context.organization.id))
        .orderBy(desc(invoices.issuedAt))
    : [];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PageBody>
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-medium text-[#7B7B7B]">
                {(["client", "invoiceId", "billingDate", "amount", "status", "pdf"] as const).map((column) => (
                  <th key={column} className="px-6 py-3.5 font-medium">
                    {t(`columns.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[#5F5F5F]">
              {rows.map(({ invoice, url }) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 font-medium text-ink">{url ? displayDomain(url) : "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs">{invoice.number ?? invoice.stripeInvoiceId}</td>
                  <td className="px-6 py-4">{format.dateTime(invoice.issuedAt, { dateStyle: "medium" })}</td>
                  <td className="px-6 py-4 tabular-nums">
                    {format.number(invoice.amountDue / 100, { style: "currency", currency: invoice.currency.toUpperCase() })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success">
                      {t(`status.${invoice.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {invoice.invoicePdfUrl && (
                      <a href={invoice.invoicePdfUrl} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
                        {t("download")}
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-ink-secondary">{t("empty")}</p>}
        </section>
      </PageBody>
    </>
  );
}
