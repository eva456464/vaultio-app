"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SETTINGS_GROUPS } from "@/lib/settings-sections";
import { cn } from "@/lib/utils";


export function SettingsNav() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  return (
    <nav className="w-full shrink-0 space-y-5 md:w-56">
      <Link href="/dashboard/overview" className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink">
        <ArrowLeft className="size-4" />
        {tCommon("backToDashboard")}
      </Link>
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[1.1px] text-section">{t(`groups.${group.key}`)}</p>
          <ul className="space-y-0.5">
            {group.sections.map((section) => {
              const href = `/dashboard/settings/${section}`;
              const active = pathname === href;
              return (
                <li key={section}>
                  <Link
                    href={href}
                    className={cn("block rounded-control px-2.5 py-2 font-inter text-sm", active ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-line" : "text-nav hover:bg-white/70")}
                  >
                    {t(`sections.${section}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
