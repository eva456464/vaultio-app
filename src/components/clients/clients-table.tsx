"use client";

import { ArrowRight, Globe, Percent, Plus, Search } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LanguageFlag } from "@/components/ui/flag";
import { SiteLogo } from "@/components/ui/site-logo";
import { Link } from "@/i18n/navigation";
import { cn, displayDomain } from "@/lib/utils";
import { selectSite } from "@/server/actions/site";
import type { SiteSummary } from "@/server/context";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success-bg text-success",
  trialing: "bg-[#EEF4FF] text-[#2A5BD7]",
  past_due: "bg-[#FDF3E2] text-[#8A6320]",
  paused: "bg-[#F3F4F6] text-ink-secondary",
  canceled: "bg-[#FBEAE6] text-[#9A5340]",
};

export function ClientsTable({ sites, canAdd }: { sites: SiteSummary[]; canAdd: boolean }) {
  const t = useTranslations("clients");
  const tLang = useTranslations("languages");
  const format = useFormatter();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = sites.filter((site) => site.url.toLowerCase().includes(query.trim().toLowerCase()));
  const open = (siteId: number) => startTransition(() => selectSite(siteId, locale));

  return (
    <section className={cn("card overflow-hidden", pending && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-6">
        <div>
          <h2 className="font-sans text-lg font-semibold text-ink">{t("yourClients", { count: sites.length })}</h2>
          <p className="mt-1 text-[15px] text-ink-secondary">{t("yourClientsSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex h-11 w-64 items-center gap-2 rounded-control border border-control px-3">
            <Search className="size-4 text-ink-subtle" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
            />
          </label>
          {canAdd && <AddClientDialog sites={sites} />}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.04em] text-ink-secondary">
              <th className="px-6 py-3 font-medium">{t("columns.website")}</th>
              <th className="px-6 py-3 font-medium">{t("columns.language")}</th>
              <th className="px-6 py-3 font-medium">{t("columns.subscription")}</th>
              <th className="px-6 py-3 font-medium">{t("columns.dateAdded")}</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((site) => {
              const status = site.subscriptionStatus ?? "none";
              return (
                <tr key={site.id} onClick={() => open(site.id)} className="cursor-pointer transition-colors hover:bg-canvas">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <SiteLogo url={site.logoUrl} />
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-semibold text-ink">{displayDomain(site.url)}</p>
                        <p className="truncate text-[15px] text-ink-secondary">{site.url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-[15px] text-ink">
                      <LanguageFlag language={site.selectedLanguage} />
                      {tLang(site.selectedLanguage as "en")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium", STATUS_STYLE[status] ?? "bg-[#F3F4F6] text-ink-secondary")}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {t(`status.${status}` as "status.active")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[15px] text-ink">{format.dateTime(new Date(site.createdAt), { dateStyle: "medium" })}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      aria-label={t("openDashboard", { domain: displayDomain(site.url) })}
                      onClick={(event) => {
                        event.stopPropagation();
                        open(site.id);
                      }}
                      className="grid size-9 place-items-center rounded-full text-ink-secondary hover:bg-white hover:text-ink"
                    >
                      <ArrowRight className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-secondary">{sites.length ? t("noResults") : t("empty")}</p>
        )}
      </div>
    </section>
  );
}

function AddClientDialog({ sites }: { sites: SiteSummary[] }) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-control">
          <Plus />
          {t("addClient")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{t("addDialog.title")}</DialogTitle>
        <DialogDescription>{t("addDialog.subtitle")}</DialogDescription>
        <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.06em] text-ink-secondary">
          <span>{t("addDialog.clientWebsites")}</span>
          <span className="normal-case tracking-normal">{t("addDialog.sitesCount", { count: sites.length })}</span>
        </div>
        <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {sites.map((site) => (
            <li key={site.id} className="flex items-center gap-3 px-4 py-3">
              <Globe className="size-4 text-ink-subtle" />
              <span className="flex-1 truncate text-sm font-medium text-ink">{displayDomain(site.url)}</span>
              <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-semibold uppercase text-ink-secondary">
                {site.selectedLanguage}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-canvas p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-brand">
            <Percent className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{t("addDialog.bulkTitle")}</p>
            <p className="mt-0.5 text-sm text-ink-secondary">{t("addDialog.bulkBody")}</p>
          </div>
          <Link href="/clients/settings/talk-with-team" className="flex items-center gap-1 text-sm font-medium text-ink hover:underline">
            {t("addDialog.bookCall")}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              {tCommon("close")}
            </Button>
          </DialogClose>
          <Button asChild size="lg">
            <Link href="/onboarding/website">
              <Plus />
              {t("addDialog.addNew")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
