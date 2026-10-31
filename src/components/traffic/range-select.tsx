"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TRAFFIC_RANGES, type TrafficRange } from "@/lib/traffic";

/** Period picker; changing it resets search and paging on the page. */
export function RangeSelect({ range, ranges = TRAFFIC_RANGES }: { range: TrafficRange; ranges?: readonly TrafficRange[] }) {
  const t = useTranslations("overview.traffic");
  const router = useRouter();
  const pathname = usePathname();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("reportingPeriod")}
        className="flex h-10 items-center gap-2 rounded-full border border-control bg-white px-4 text-sm font-medium text-ink outline-none"
      >
        <CalendarDays className="size-4 text-ink-secondary" />
        {t(`ranges.${range}`)}
        <ChevronDown className="size-4 text-ink-secondary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {ranges.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => router.replace({ pathname, query: { range: option } }, { scroll: false })}
            className={cn(option === range && "font-semibold")}
          >
            {t(`ranges.${option}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
