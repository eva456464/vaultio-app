"use client";

import { ChartColumn, Check, SearchCheck } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { disconnectGoogle, listGoogleProperties, selectGoogleProperty, type PropertyList } from "@/server/actions/analytics";
import type { GoogleProduct } from "@/server/google/client";

export type DataSource = {
  product: GoogleProduct;
  status: "connected" | "pending" | "error" | "off";
  email: string | null;
  propertyName: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const ICONS: Record<GoogleProduct, ReactNode> = {
  ga4: <ChartColumn className="size-5 text-[#E8710A]" />,
  gsc: <SearchCheck className="size-5 text-[#2A78D6]" />,
};

function StatusPill({ status }: { status: DataSource["status"] }) {
  const t = useTranslations("settings.analytics.status");
  const style = {
    connected: "bg-success-bg text-success",
    pending: "bg-[#EEF4FF] text-[#2A5BD7]",
    error: "bg-[#FBEAE6] text-[#9A3412]",
    off: "bg-[#F3F4F6] text-ink-secondary",
  }[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", style)}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </span>
  );
}

export function AnalyticsSettings({
  canEdit,
  configured,
  siteName,
  timeZone,
  sources,
  openManage,
  error,
}: {
  canEdit: boolean;
  configured: boolean;
  siteName: string;
  timeZone: string;
  sources: DataSource[];
  openManage: GoogleProduct | null;
  error: string | null;
}) {
  const t = useTranslations("settings.analytics");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const [managing, setManaging] = useState<GoogleProduct | null>(canEdit ? openManage : null);
  const close = () => {
    setManaging(null);
    router.replace("/dashboard/settings/analytics", { scroll: false });
    router.refresh();
  };
  const managed = sources.find((source) => source.product === managing);

  return (
    <section className="card mt-8 p-5 md:p-6">
      <h2 className="font-sans text-[16px] font-semibold text-ink">{t("dataSources")}</h2>
      <p className="mt-1 text-sm text-ink-secondary">{t("dataSourcesHint")}</p>
      {!configured && <p className="mt-4 rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("notConfigured")}</p>}
      {error && t.has(`errors.${error}`) && <p className="mt-4 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]">{t(`errors.${error}` as "errors.denied")}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <div key={source.product} className="flex flex-col rounded-2xl border border-line p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas">{ICONS[source.product]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-sans text-[15px] font-semibold text-ink">{t(`products.${source.product}.name`)}</h3>
                  <StatusPill status={source.status} />
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{t(`products.${source.product}.description`)}</p>
              </div>
            </div>
            <div className="mt-3 flex-1 space-y-0.5 pl-14 text-xs text-ink-secondary">
              {source.propertyName && <p>{t("property", { name: source.propertyName })}</p>}
              {source.status === "connected" && (
                <p>
                  {source.lastSyncedAt
                    ? t("lastSynced", { date: format.dateTime(new Date(source.lastSyncedAt), { dateStyle: "medium", timeStyle: "short", timeZone }) })
                    : t("firstSync")}
                </p>
              )}
              {source.lastError && <p className="text-[#9A3412]">{source.lastError}</p>}
            </div>
            <div className="mt-4 pl-14">
              {source.status === "off" ? (
                configured && canEdit ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={`/api/integrations/google/start?product=${source.product}&locale=${locale}`}>{t("connect")}</a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    {t("connect")}
                  </Button>
                )
              ) : (
                <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => setManaging(source.product)}>
                  {t("manage")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-subtle">{t("schedule")}</p>

      {managed && managed.status !== "off" && <ManageDialog source={managed} siteName={siteName} onClose={close} />}
    </section>
  );
}

function ManageDialog({ source, siteName, onClose }: { source: DataSource; siteName: string; onClose: () => void }) {
  const t = useTranslations("settings.analytics");
  const [list, setList] = useState<PropertyList | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listGoogleProperties(source.product).then((result) => {
      if (cancelled) return;
      setList(result);
      if (result.ok) setChoice(result.selected ?? (result.items.length === 1 ? result.items[0]!.id : null));
    });
    return () => {
      cancelled = true;
    };
  }, [source.product]);

  const items = list?.ok ? list.items : [];
  const selected = list?.ok ? list.selected : null;
  const canSave = Boolean(choice) && (choice !== selected || source.status !== "connected");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0">
        <div className="flex items-center gap-4 border-b border-line p-6 pr-14">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-line">{ICONS[source.product]}</span>
          <div className="min-w-0">
            <DialogTitle className="font-sans text-lg">{t(`products.${source.product}.name`)}</DialogTitle>
            <DialogDescription className="truncate">{source.email ? t("connectedAs", { email: source.email }) : t(`products.${source.product}.description`)}</DialogDescription>
          </div>
        </div>

        <div className="max-h-[50dvh] overflow-y-auto p-6">
          <p className="text-sm font-medium text-ink">{t(`products.${source.product}.pick`, { site: siteName })}</p>
          {!list && (
            <div className="mt-3 space-y-2" aria-busy>
              {[0, 1].map((row) => (
                <div key={row} className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 p-4">
                  <span className="size-8 animate-pulse rounded-lg bg-line" />
                  <span className="h-3 w-48 animate-pulse rounded bg-line" />
                </div>
              ))}
            </div>
          )}
          {list && !list.ok && <p className="mt-3 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]">{t("loadError", { message: list.error })}</p>}
          {list?.ok && items.length === 0 && <p className="mt-3 rounded-xl bg-canvas p-4 text-sm text-ink-secondary">{t(`products.${source.product}.empty`)}</p>}
          <ul className="mt-3 space-y-2" role="radiogroup">
            {items.map((item) => {
              const active = choice === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setChoice(item.id)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors", active ? "border-ink bg-canvas" : "border-line hover:bg-canvas/60")}
                  >
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", active ? "border-ink bg-ink text-white" : "border-control")}>
                      {active && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                      <span className="block truncate text-xs text-ink-secondary">
                        {source.product === "ga4"
                          ? t("products.ga4.option", { id: item.id.replace("properties/", ""), account: item.account })
                          : t("products.gsc.option", { kind: item.account })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {failure && <p className="mt-3 text-sm text-[#9A3412]">{failure}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line p-6">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await disconnectGoogle(source.product);
                onClose();
              })
            }
            className="text-sm text-ink-secondary hover:text-[#9A3412] disabled:opacity-50"
          >
            {t("disconnect")}
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              disabled={!canSave || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await selectGoogleProperty(source.product, choice!);
                  if (!result.ok) setFailure(t("loadError", { message: result.error }));
                  else onClose();
                })
              }
            >
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
