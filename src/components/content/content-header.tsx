import { CalendarDays, Info, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Tooltip } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function ContentHeader({ tab }: { tab: "calendar" | "improvements" }) {
  const t = await getTranslations("content");
  const tabs = [
    { key: "calendar", href: "/dashboard/content-plan", icon: CalendarDays, label: t("tabs.calendar") },
    { key: "improvements", href: "/dashboard/content-plan/improvements", icon: Sparkles, label: t("tabs.improvements"), badge: t("tabs.beta") },
  ] as const;
  return (
    <div className="border-b border-line bg-canvas px-5 pt-8 md:px-12 md:pt-11">
      <h1 className="flex items-center gap-2 text-[28px] font-semibold leading-9 tracking-[-0.025em] text-ink">
        {t("title")}
        <Tooltip content={t("titleInfo")}>
          <Info className="size-4 text-ink-subtle" />
        </Tooltip>
      </h1>
      <p className="mt-2 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      <nav className="mt-6 flex gap-6">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2 px-4 pb-3 text-[15px]",
              tab === item.key ? "font-medium text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand" : "text-ink-secondary hover:text-ink",
            )}
          >
            <item.icon className="size-4" strokeWidth={1.75} />
            {item.label}
            {"badge" in item && <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] text-ink-secondary">{item.badge}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
