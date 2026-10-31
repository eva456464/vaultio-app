"use client";

import { Menu, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { NAV_BY_MODE, type ShellMode } from "./nav-config";

export function MobileNav({ mode, logo, selector }: { mode: ShellMode; logo: ReactNode; selector: ReactNode }) {
  const sections = NAV_BY_MODE[mode];
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger aria-label={t("menu")} className="grid size-9 place-items-center rounded-full text-ink md:hidden">
        <Menu className="size-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-y-auto bg-white px-5 py-4 data-[state=open]:animate-fade-in">
          <DialogPrimitive.Title className="sr-only">{t("menu")}</DialogPrimitive.Title>
          <div className="flex items-center justify-between">
            {logo}
            <DialogPrimitive.Close aria-label="Close" className="grid size-9 place-items-center rounded-full bg-[#F3F4F6]">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-5">{selector}</div>
          {sections.map((section, index) => (
            <div key={index} className="mt-6">
              {section.label && (
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[1.1px] text-section">{t(section.label)}</p>
              )}
              <ul className="space-y-1">
                {section.items.flatMap((item) =>
                  (item.children ?? [{ key: item.key, href: item.href! }]).map((leaf) => (
                    <li key={leaf.key}>
                      <Link
                        href={leaf.href}
                        onClick={() => setOpen(false)}
                        className="flex h-11 items-center gap-3 rounded-control px-2 font-inter text-[15px] font-medium text-nav hover:bg-nav-active"
                      >
                        <item.icon className="size-[18px]" strokeWidth={1.75} />
                        {item.children ? `${t(item.key)} · ${t(leaf.key)}` : t(leaf.key)}
                      </Link>
                    </li>
                  )),
                )}
              </ul>
            </div>
          ))}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
