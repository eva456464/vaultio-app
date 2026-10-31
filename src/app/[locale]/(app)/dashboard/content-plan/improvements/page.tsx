import { Radar, SearchCheck, Sparkles } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { ContentHeader } from "@/components/content/content-header";
import { HowItWorks, ImprovementsList } from "@/components/content/improvements-list";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getAppContext, getBrand } from "@/server/context";
import { getImprovementsList } from "@/server/queries/improvements";

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Radar; title: string; body: string; action?: React.ReactNode }) {
  return (
    <section className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-canvas text-ink-subtle">
        <Icon className="size-7" strokeWidth={1.5} />
      </span>
      <p className="mt-5 font-heading text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-sm text-ink-secondary">{body}</p>
      {action}
    </section>
  );
}

export default async function ImprovementsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, format, brand, data] = await Promise.all([getTranslations("content.improvements"), getFormatter(), getBrand(), getImprovementsList(site)]);
  const day = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <>
      <ContentHeader tab="improvements" />
      <div className="px-4 py-8 md:px-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.44px] text-ink">{t("title")}</h2>
            <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>
            <p className="mt-1 text-xs text-ink-subtle">{t("scope", { brand: brand.name })}</p>
          </div>
          <HowItWorks />
        </div>

        {!data.enabled ? (
          <EmptyState
            icon={Sparkles}
            title={t("off.title")}
            body={t("off.body")}
            action={
              <Button asChild className="mt-6">
                <Link href="/dashboard/settings/improvements">{t("off.cta")}</Link>
              </Button>
            }
          />
        ) : !data.gscConnected ? (
          <EmptyState
            icon={SearchCheck}
            title={t("needsGsc.title")}
            body={t("needsGsc.body")}
            action={
              <Button asChild className="mt-6">
                <Link href="/dashboard/settings/analytics">{t("needsGsc.cta")}</Link>
              </Button>
            }
          />
        ) : data.rows.length === 0 ? (
          <EmptyState icon={Radar} title={t("emptyTitle")} body={t("emptyBody")} action={<p className="mt-4 rounded-full bg-canvas px-3 py-1 text-xs text-ink-secondary">{t("nextScan", { date: day(data.nextScan) })}</p>} />
        ) : (
          <div className="mt-6">
            <ImprovementsList
              canEdit={context.member?.role === "admin"}
              nextDay={data.nextDay}
              rows={data.rows.map(({ improvement, title }) => ({
                id: improvement.id,
                status: improvement.status,
                opportunity: improvement.opportunity,
                evidence: improvement.gscSnapshot,
                title: title ?? improvement.originalTitle ?? improvement.pageUrl,
                pageUrl: improvement.pageUrl,
                scheduledFor: improvement.scheduledFor,
                changes: improvement.changes.length,
                approved: improvement.changes.filter((change) => change.status === "approved").length,
                rejected: improvement.changes.filter((change) => change.status === "rejected").length,
                error: improvement.error,
              }))}
            />
          </div>
        )}
      </div>
    </>
  );
}
