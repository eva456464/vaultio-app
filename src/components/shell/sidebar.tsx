"use client";

import { ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_BY_MODE, type NavItem, type NavLeaf, type ShellMode } from "./nav-config";

export const SIDEBAR_COOKIE = "sidebar_collapsed";

function splitHref(href: string) {
  const [path, query = ""] = href.split("?");
  return { path: path!, tab: new URLSearchParams(query).get("tab") };
}

function useActiveMatcher() {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");

  const isLeafActive = (leaf: NavLeaf, siblings: NavLeaf[]) => {
    const target = splitHref(leaf.href);
    if (pathname !== target.path) return false;
    if (target.tab) return tab === target.tab;
    // A tab-less leaf is active when no sibling claims the current tab.
    return !siblings.some((other) => splitHref(other.href).tab === tab && tab !== null);
  };

  const isItemActive = (item: NavItem) => {
    if (item.children) return item.children.some((leaf) => isLeafActive(leaf, item.children!));
    if (!item.href) return false;
    return pathname === item.href || (item.match ?? []).some((prefix) => pathname.startsWith(prefix));
  };

  return { isLeafActive, isItemActive };
}

export function Sidebar({ mode, initialCollapsed }: { mode: ShellMode; initialCollapsed: boolean }) {
  const sections = NAV_BY_MODE[mode];
  const t = useTranslations("nav");
  const { isLeafActive, isItemActive } = useActiveMatcher();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const activeGroup = sections.flatMap((s) => s.items).find((item) => item.children && isItemActive(item))?.key ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  function setCollapsedPersisted(value: boolean) {
    setCollapsed(value);
    document.cookie = `${SIDEBAR_COOKIE}=${value ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={cn(
        "sticky top-[76px] hidden h-[calc(100dvh-76px)] shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, index) => (
          <div key={index} className={cn(index > 0 && "mt-2 border-t border-line pt-2")}>
            {section.label && !collapsed && (
              <p className="px-2.5 pb-2 pt-3 text-[11px] font-medium uppercase leading-[16.5px] tracking-[1.1px] text-section">
                {t(section.label)}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;
                const itemClass = cn(
                  "relative flex h-10 w-full items-center gap-3 rounded-control px-2.5 font-inter text-[14px] leading-5 transition-colors",
                  active ? "bg-nav-active font-semibold text-[#1F1F1F]" : "font-medium text-nav hover:bg-nav-active/60",
                  collapsed && "justify-center px-0",
                );
                const indicator = active && (
                  <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-ink" />
                );

                if (!item.children) {
                  return (
                    <li key={item.key}>
                      <Link href={item.href!} className={itemClass} title={collapsed ? t(item.key) : undefined}>
                        {indicator}
                        <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                        {!collapsed && t(item.key)}
                      </Link>
                    </li>
                  );
                }

                const open = openGroup === item.key && !collapsed;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={itemClass}
                      aria-expanded={open}
                      title={collapsed ? t(item.key) : undefined}
                      onClick={() => {
                        if (collapsed) setCollapsedPersisted(false);
                        setOpenGroup(open ? null : item.key);
                      }}
                    >
                      {indicator}
                      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{t(item.key)}</span>
                          <ChevronRight
                            className={cn("size-4 text-ink-subtle transition-transform", open && "rotate-90")}
                          />
                        </>
                      )}
                    </button>
                    {open && (
                      <ul className="relative ml-[22px] mt-1 space-y-0.5 border-l border-line pl-3">
                        {item.children.map((leaf) => {
                          const leafActive = isLeafActive(leaf, item.children!);
                          return (
                            <li key={leaf.key}>
                              <Link
                                href={leaf.href}
                                className={cn(
                                  "flex h-9 items-center rounded-control px-2.5 font-inter text-[14px] transition-colors",
                                  leafActive ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink",
                                )}
                              >
                                {t(leaf.key)}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("flex items-center border-t border-line px-4 py-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <span className="text-xs font-medium text-ink-secondary">{t("sidebar")}</span>}
        <div className="flex items-center gap-1 rounded-lg bg-canvas p-0.5">
          <button
            type="button"
            aria-label={t("expandSidebar")}
            aria-pressed={!collapsed}
            onClick={() => setCollapsedPersisted(false)}
            className={cn("grid size-7 place-items-center rounded-md", !collapsed ? "bg-white shadow-sm ring-1 ring-line" : "text-ink-subtle")}
          >
            <PanelLeft className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={t("collapseSidebar")}
            aria-pressed={collapsed}
            onClick={() => setCollapsedPersisted(true)}
            className={cn("grid size-7 place-items-center rounded-md", collapsed ? "bg-white shadow-sm ring-1 ring-line" : "text-ink-subtle")}
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
