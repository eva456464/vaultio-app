"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { AGENCY_SETTINGS_GROUPS, SETTINGS_GROUPS } from "@/lib/settings-sections";
import { cn } from "@/lib/utils";
import { NAV_BY_MODE, type ShellMode } from "./nav-config";

/** "Go to page" (⌘K / Ctrl+K): every page of the sidebar and every settings section. */
export function CommandPalette({ mode }: { mode: ShellMode }) {
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const pages = useMemo(() => {
    const entries: { label: string; group: string; href: string }[] = [];
    for (const section of NAV_BY_MODE[mode]) {
      for (const item of section.items) {
        if (item.key === "settings") continue;
        if (item.children) for (const child of item.children) entries.push({ label: tNav(child.key as "overview"), group: tNav(item.key as "overview"), href: child.href });
        else if (item.href) entries.push({ label: tNav(item.key as "overview"), group: "", href: item.href });
      }
    }
    const groups = mode === "agency" ? AGENCY_SETTINGS_GROUPS : SETTINGS_GROUPS;
    const base = mode === "agency" ? "/clients/settings" : "/dashboard/settings";
    for (const group of groups) {
      for (const section of group.sections) {
        const key = `sections.${section}` as "sections.account";
        if (tSettings.has(key)) entries.push({ label: tSettings(key), group: tNav("settings"), href: `${base}/${section}` });
      }
    }
    return entries;
  }, [mode, tNav, tSettings]);

  const needle = query.trim().toLowerCase();
  const results = needle ? pages.filter((page) => `${page.label} ${page.group}`.toLowerCase().includes(needle)) : pages;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    setActive(0);
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 text-ink-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => Math.min(results.length - 1, value + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              } else if (event.key === "Enter" && results[active]) {
                event.preventDefault();
                go(results[active].href);
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("title")}
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </div>
        <ul ref={list} className="max-h-80 overflow-y-auto p-2" role="listbox">
          {results.map((page, index) => (
            <li key={page.href} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(page.href)}
                className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm", index === active ? "bg-nav-active text-ink" : "text-ink-secondary")}
              >
                <span className="truncate">{page.label}</span>
                {page.group && <span className="shrink-0 text-xs text-ink-subtle">{page.group}</span>}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-secondary">{t("empty")}</li>}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-ink-subtle">
          <span>{t("navigateHint")}</span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="size-3" /> {t("openHint")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
