"use client";

import { ArrowRight, Check, ChevronDown, Languages, Plus, Search, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { LanguageFlag } from "@/components/ui/flag";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { languageName } from "@/lib/languages";
import { cn, displayDomain } from "@/lib/utils";
import { selectSite } from "@/server/actions/site";
import type { SiteSummary } from "@/server/context";
import { AddLanguageDialog } from "./add-language-dialog";

export function WebsiteSelector({
  sites,
  currentSiteId,
  agencyMode,
  isAgency,
  canEdit = true,
  className,
}: {
  sites: SiteSummary[];
  currentSiteId: number | null;
  agencyMode: boolean;
  isAgency: boolean;
  canEdit?: boolean;
  className?: string;
}) {
  const t = useTranslations("websiteSelector");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const current = sites.find((site) => site.id === currentSiteId) ?? null;

  const [addingLanguage, setAddingLanguage] = useState(false);
  // Each website first, followed by its other languages.
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const matches = (site: SiteSummary) => displayDomain(site.url).includes(text) || languageName(site.selectedLanguage, locale).toLowerCase().includes(text);
    const primaries = sites.filter((site) => !site.primaryOrgWebsiteId || !sites.some((other) => other.id === site.primaryOrgWebsiteId));
    return primaries.flatMap((primary) => [primary, ...sites.filter((site) => site.primaryOrgWebsiteId === primary.id)]).filter(matches);
  }, [sites, query, locale]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-[50px] w-[276px] items-center gap-3 rounded-control border border-control bg-white px-3.5 text-left outline-none transition-colors hover:bg-canvas",
          pending && "opacity-60",
          className,
        )}
      >
        {agencyMode || !current ? (
          <Users className="size-5 shrink-0 text-ink" strokeWidth={1.75} />
        ) : (
          <LanguageFlag language={current.selectedLanguage} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] font-semibold uppercase leading-3 tracking-[0.3px] text-ink-secondary">
            {t("website")}
          </span>
          <span className="block truncate text-[15px] font-semibold leading-5 text-ink">
            {agencyMode || !current ? t("manageClients") : displayDomain(current.url)}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-secondary" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-1.5">
        {sites.length > 6 && (
          <label className="mb-1 flex items-center gap-2 rounded-lg border border-line px-2.5">
            <Search className="size-4 text-ink-subtle" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        )}
        <ul className="max-h-72 overflow-y-auto">
          {filtered.map((site) => {
            const selected = !agencyMode && site.id === currentSiteId;
            return (
              <li key={site.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    startTransition(() => selectSite(site.id, locale));
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink",
                    selected ? "bg-[#FFF1EE]" : "hover:bg-nav-active",
                  )}
                >
                  <LanguageFlag language={site.selectedLanguage} />
                  {site.primaryOrgWebsiteId ? (
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-ink-secondary">{displayDomain(site.url)} · </span>
                      {languageName(site.selectedLanguage, locale)}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{displayDomain(site.url)}</span>
                  )}
                  {site.onboardingStatus !== "completed" && (
                    <span className="text-xs font-normal text-ink-subtle">{t("onboarding")}</span>
                  )}
                  {selected && <Check className="size-4 text-ink" />}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="px-2.5 py-3 text-sm text-ink-secondary">{t("noMatches")}</li>}
        </ul>
        <div className="mt-1 border-t border-line pt-1">
          {!agencyMode && current && canEdit && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAddingLanguage(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-nav-active"
            >
              <Languages className="size-4" />
              <span className="min-w-0 flex-1 truncate">{t("addLanguageTo", { site: displayDomain(current.url) })}</span>
            </button>
          )}
          <Link
            href="/onboarding/website"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:bg-nav-active"
          >
            <Plus className="size-4" />
            {isAgency ? t("addClient") : t("addNewWebsite")}
          </Link>
          {isAgency && (
            <Link
              href="/clients"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:bg-nav-active"
            >
              <Users className="size-4" />
              <span className="flex-1">{t("manageClients")}</span>
              <ArrowRight className="size-4 text-ink-secondary" />
            </Link>
          )}
        </div>
      </PopoverContent>
      <AddLanguageDialog open={addingLanguage} onOpenChange={setAddingLanguage} />
    </Popover>
  );
}
