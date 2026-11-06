"use client";

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  FileText,
  Lightbulb,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { cn, displayDomain } from "@/lib/utils";
import type { AgentDay, ActivityItem, FeaturedArticle, PlannedDay } from "@/server/queries/overview";
import { ACTIVITY_ICONS } from "./activity-icons";

const VISIBLE_ROWS = 2;

function dateAt(day: string) {
  return new Date(`${day}T12:00:00Z`);
}

function useDayLabel() {
  const t = useTranslations("overview");
  const format = useFormatter();
  return (day: string, today: string) => {
    const diff = Math.round((dateAt(day).getTime() - dateAt(today).getTime()) / 86_400_000);
    if (diff === 0) return t("today");
    if (diff === -1) return t("yesterday");
    if (diff === 1) return t("tomorrow");
    return format.dateTime(dateAt(day), { weekday: "long", timeZone: "UTC" });
  };
}

function ActivitySentence({ item }: { item: ActivityItem }) {
  const t = useTranslations("overview.activity");
  const count = item.count ?? 0;
  switch (item.type) {
    case "backlinkReceived":
      return <>{t("backlinkReceived", { domain: displayDomain(item.sourceUrl ?? ""), dr: item.domainRating ?? 0 })}</>;
    case "socialPostPublished":
      return <>{t("socialPostPublished", { network: item.title ?? "" })}</>;
    case "aiVisibilityCheck":
      return <>{t("aiVisibilityCheck", { count, mentions: item.total ?? 0 })}</>;
    case "domainRatingCheck":
      return <>{t("domainRatingCheck", { count: item.domainRating ?? count })}</>;
    case "catalogSynced":
      return <>{t("catalogSynced", { count, source: item.title ?? "" })}</>;
    case "articlePublished":
    case "articleWritten":
    case "topicResearched":
    case "reportSent":
    case "articleImprovementPlanned":
    case "articleImproved":
    case "articleSentAsDraft":
    case "articleRegenerated":
    case "articleUnpublished":
      return <>{t(item.type, { title: item.title ?? "" })}</>;
    default:
      return <>{t(item.type, { count })}</>;
  }
}

/** Groups several backlinks received the same day into one row. */
function groupItems(items: ActivityItem[]) {
  const backlinks = items.filter((item) => item.type === "backlinkReceived");
  const rest = items.filter((item) => item.type !== "backlinkReceived" && item.type !== "articlePublished" && item.type !== "articleWritten");
  const plain = (item: ActivityItem) => ({ ...item, grouped: 0 });
  if (backlinks.length > 1) return { rows: [{ ...backlinks[0]!, grouped: backlinks.length }, ...rest.map(plain)] };
  return { rows: [...backlinks.map(plain), ...rest.map(plain)] };
}

function IconSquare({ type, className }: { type: string; className?: string }) {
  const Icon = ACTIVITY_ICONS[type] ?? FileText;
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-ink-secondary", className)}>
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

function PlannedActionsPopover({ planned, today }: { planned: PlannedDay[]; today: string }) {
  const t = useTranslations("overview");
  const tPlanned = useTranslations("overview.planned");
  const format = useFormatter();
  const dayLabel = useDayLabel();
  const total = planned.reduce((sum, day) => sum + day.actions.length, 0);

  return (
    <Popover>
      <PopoverTrigger className="flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-success-border bg-success-bg pl-3 pr-2 text-sm font-medium text-success outline-none">
        <span className="size-2 rounded-full bg-[#22A06B]" />
        {t("agentsRunning")}
        <span className="mx-0.5 h-4 w-px bg-success-border" />
        <ChevronDown className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">{t("plannedActions")}</p>
          <p className="text-xs text-ink-secondary">{t("plannedActionsSummary", { count: total, days: 14 })}</p>
        </div>
        <div className="max-h-[360px] overflow-y-auto px-4 py-2">
          {planned.map((day) => (
            <div key={day.day} className="py-2">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                {dayLabel(day.day, today)} · {format.dateTime(dateAt(day.day), { month: "short", day: "numeric", timeZone: "UTC" })}
              </p>
              <ul className="space-y-1.5">
                {day.actions.map((action, index) => {
                  const Icon = ACTIVITY_ICONS[action.job] ?? CircleDashed;
                  return (
                    <li key={index} className="flex items-center gap-2 text-sm text-ink">
                      <Icon className="size-4 text-ink-secondary" strokeWidth={1.75} />
                      {action.job === "writeArticle"
                        ? tPlanned("articleWritten", { title: action.title ?? "" })
                        : action.job === "improveArticle"
                          ? tPlanned("improveArticle", { title: action.title ?? "" })
                          : tPlanned(action.job as "sitemapSync")}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WhyThisTopic({ article }: { article: FeaturedArticle }) {
  const t = useTranslations("overview.featured");
  const sections = [
    { title: t("whyThisTopic"), items: article.whyThisTopic },
    { title: t("whyThisStructure"), items: article.whyThisStructure },
    { title: t("characteristics"), items: article.characteristics },
  ].filter((section) => section.items.length);
  if (!sections.length) return null;
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 text-sm text-ink-secondary outline-none hover:text-ink">
        <Lightbulb className="size-4" strokeWidth={1.75} />
        {t("whyThisTopic")}
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-5">
        <p className="font-heading text-base font-semibold text-ink">{article.title}</p>
        {sections.map((section) => (
          <div key={section.title} className="mt-4">
            <p className="text-sm font-semibold text-ink">{section.title}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-secondary">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function FeaturedArticleBlock({ article }: { article: FeaturedArticle | null }) {
  const t = useTranslations("overview.featured");
  if (!article) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-line px-6 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-ink-subtle">
          <CalendarDays className="size-6" strokeWidth={1.5} />
        </span>
        <p className="mt-4 font-heading text-lg font-semibold text-ink">{t("noArticleTitle")}</p>
        <p className="mt-1 text-sm text-ink-secondary">{t("noArticleBody")}</p>
        <Link
          href="/dashboard/content-plan"
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full border border-control px-4 text-sm font-medium text-ink hover:bg-canvas"
        >
          {t("openContentPlan")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const heading = article.status === "published" ? t("published") : article.status === "written" ? t("written") : t("planned");
  return (
    <div className="rounded-2xl border border-line p-5 md:p-6">
      <div className="flex items-center gap-3">
        <IconSquare type="articlePublished" className="rounded-full" />
        <p className="text-[17px] font-medium text-ink">{heading}</p>
      </div>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        {article.imageUrl && (
          <div className="aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl bg-canvas sm:w-[232px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.imageUrl} alt="" className="size-full object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold leading-snug text-ink">{article.title}</p>
          {article.keyword && (
            <p className="mt-1.5 text-[15px] text-ink">
              <span className="text-ink-secondary">{t("targetKeyword")}</span> {article.keyword}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {article.publishedUrl ? (
              <a
                href={article.publishedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-2.5 text-sm font-medium text-success"
              >
                <span className="size-1.5 rounded-full bg-[#22A06B]" />
                {t("live")}
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : (
              article.searchVolume !== null && (
                <span className="flex items-center gap-1.5 text-sm text-ink-secondary">
                  <Search className="size-3.5" />
                  {t("searchesPerMonth", { count: article.searchVolume })}
                </span>
              )
            )}
            <WhyThisTopic article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupProgress({ steps }: { steps: AgentDay["setupSteps"] }) {
  const t = useTranslations("overview.setup");
  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-canvas">
          <LoaderCircle className="size-[18px] animate-spin text-ink-secondary" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">{t("title")}</p>
          <p className="text-sm text-ink-secondary">{t("subtitle")}</p>
        </div>
      </div>
      {steps.length > 0 && (
        <ul className="mt-4 space-y-2">
          {steps.map((step) => (
            <li key={step.job} className="flex items-start gap-2.5 text-sm">
              {step.status === "completed" ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
              ) : step.status === "skipped" || step.status === "failed" ? (
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              ) : (
                <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-ink-subtle" />
              )}
              <span>
                <span className="text-ink">{t(`steps.${step.job}` as "steps.analyzeWebsite")}</span>
                {step.detail && <span className="block text-xs text-ink-secondary">{step.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WaitingAgents({ steps }: { steps: AgentDay["waiting"] }) {
  const t = useTranslations("overview.setup");
  return (
    <div className="rounded-2xl border border-[#F5DFA5] bg-[#FFFBEB] p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-white">
          <TriangleAlert className="size-[18px] text-amber-500" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">{t("waitingTitle", { count: steps.length })}</p>
          <p className="text-sm text-ink-secondary">{t("waitingSubtitle")}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.job} className="flex items-start gap-2.5 text-sm">
            <CircleDashed className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              <span className="text-ink">{t(`steps.${step.job}` as "steps.analyzeWebsite")}</span>
              {step.detail && <span className="block text-xs text-ink-secondary">{step.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AgentActivitiesCard({ data, planned }: { data: AgentDay; planned: PlannedDay[] }) {
  const t = useTranslations("overview");
  const format = useFormatter();
  const dayLabel = useDayLabel();
  const [expanded, setExpanded] = useState(false);
  const { rows } = groupItems(data.items);
  // A single hidden row is shown directly rather than behind a toggle.
  const collapsible = rows.length > VISIBLE_ROWS + 1;
  const visible = expanded || !collapsible ? rows : rows.slice(0, VISIBLE_ROWS);
  const hidden = collapsible ? rows.length - VISIBLE_ROWS : 0;
  const isToday = data.day === data.today;
  const isFuture = data.day > data.today;
  const prevDay = data.day > data.firstDay ? shift(data.day, -1) : null;
  const nextDay = data.day < data.lastDay ? shift(data.day, 1) : null;

  return (
    <section className="card p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t("agentActivities")}</p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 tracking-[-0.44px] text-ink">
            {isToday ? t("titleToday") : isFuture ? t("titleFuture") : t("titleOtherDay")}
          </h2>
          <p className="mt-1 text-[15px] text-ink">{t("activityCount", { count: data.items.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex h-12 items-center rounded-full border border-control">
            <DayLink day={prevDay} label={t("previousDay")}>
              <ChevronLeft className="size-4" />
            </DayLink>
            <div className="min-w-[120px] text-center leading-tight">
              <p className="text-sm font-medium text-ink">{dayLabel(data.day, data.today)}</p>
              <p className="text-xs text-ink-secondary">{format.dateTime(dateAt(data.day), { dateStyle: "medium", timeZone: "UTC" })}</p>
            </div>
            <DayLink day={nextDay} label={t("nextDay")}>
              <ChevronRight className="size-4" />
            </DayLink>
          </div>
          <span className="hidden h-8 w-px bg-line md:block" />
          <PlannedActionsPopover planned={planned} today={data.today} />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {data.setupInProgress && isToday && <SetupProgress steps={data.setupSteps} />}
        {!data.setupInProgress && isToday && data.waiting.length > 0 && <WaitingAgents steps={data.waiting} />}
        {(!data.setupInProgress || data.featured) && <FeaturedArticleBlock article={data.featured} />}

        {rows.length > 0 && (
          <ul className="divide-y divide-line">
            {visible.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-1 py-3.5">
                <IconSquare type={item.type} />
                <p className="text-[15px] text-ink">
                  {item.grouped ? t("activity.backlinksReceived", { count: item.grouped }) : <ActivitySentence item={item} />}
                </p>
              </li>
            ))}
            {hidden > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex w-full items-center gap-4 px-1 py-3.5 text-left"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-ink-secondary">
                    <Search className="size-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="flex-1 text-[15px] text-ink">
                    {expanded ? t("showLess") : t("moreActivities", { count: hidden })}
                  </span>
                  <ChevronDown className={cn("size-4 text-ink-secondary transition-transform", expanded && "rotate-180")} />
                </button>
              </li>
            )}
          </ul>
        )}
        {rows.length === 0 && !data.featured && !data.setupInProgress && (
          <p className="px-1 py-3 text-sm text-ink-secondary">{t("noActivities")}</p>
        )}
      </div>
    </section>
  );
}

function shift(day: string, days: number) {
  const date = dateAt(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function DayLink({ day, label, children }: { day: string | null; label: string; children: React.ReactNode }) {
  const className = "grid size-11 place-items-center rounded-full text-ink";
  if (!day)
    return (
      <span aria-label={label} aria-disabled className={cn(className, "text-ink-subtle/50")}>
        {children}
      </span>
    );
  return (
    <Link href={{ pathname: "/dashboard/overview", query: { date: day } }} aria-label={label} className={cn(className, "hover:bg-canvas")} scroll={false}>
      {children}
    </Link>
  );
}
