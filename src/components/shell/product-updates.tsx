"use client";

import { Bell } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ProductUpdate = { id: number; title: string; body: string; launchedAt: string; linkUrl: string | null };

export function ProductUpdatesBell({ updates }: { updates: ProductUpdate[] }) {
  const t = useTranslations("productUpdates");
  const tHeader = useTranslations("header");
  const format = useFormatter();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={tHeader("productUpdates")}
        className="grid size-9 place-items-center rounded-full bg-[#F3F4F6] text-ink outline-none transition-colors hover:bg-[#E9EAEC]"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="border-b border-line px-5 py-4">
          <p className="font-heading text-lg font-semibold text-ink">{t("title")}</p>
        </div>
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
          {updates.map((update) => (
            <li key={update.id} className="px-5 py-4">
              <p className="text-xs text-ink-secondary">
                <span className="mr-2 rounded-full bg-success-bg px-2 py-0.5 font-medium text-success">{t("launched")}</span>
                {format.dateTime(new Date(update.launchedAt), { dateStyle: "medium" })}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">{update.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{update.body}</p>
            </li>
          ))}
          {updates.length === 0 && <li className="px-5 py-6 text-sm text-ink-secondary">{t("empty")}</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
