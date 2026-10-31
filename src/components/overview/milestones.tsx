"use client";

import {
  Award,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Eye,
  FileText,
  Info,
  MessageSquareQuote,
  MousePointerClick,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, compactNumber } from "@/lib/utils";
import { dismissAchievements } from "@/server/actions/overview";
import type { MilestoneCard } from "@/server/queries/overview";

type BadgeStyle = { icon: LucideIcon; from: string; to: string; shape: "shield" | "coin" | "hex" };

function badgeStyle(category: string): BadgeStyle {
  if (category === "backlinks") return { icon: ExternalLink, from: "#4CC2B4", to: "#1F7F78", shape: "shield" };
  if (category === "backlinks_value" || category === "ad_spend_saved") return { icon: CircleDollarSign, from: "#5BD39E", to: "#1E8E63", shape: "coin" };
  if (category.includes("clicks")) return { icon: MousePointerClick, from: "#F7A56E", to: "#D25F27", shape: "coin" };
  if (category.includes("impressions")) return { icon: Eye, from: "#F8CF5C", to: "#DB9614", shape: "coin" };
  if (category.startsWith("ai_mention")) return { icon: MessageSquareQuote, from: "#9C8CFF", to: "#5B43D6", shape: "hex" };
  if (category.startsWith("ai_")) return { icon: Sparkles, from: "#D274F0", to: "#8E3BC0", shape: "hex" };
  if (category.startsWith("dr_")) return { icon: TrendingUp, from: "#6FA5FA", to: "#2A5BD7", shape: "shield" };
  if (category === "articles_indexed") return { icon: FileText, from: "#6FC3F7", to: "#1F86C7", shape: "coin" };
  if (category.startsWith("keywords_")) return { icon: Trophy, from: "#F7787F", to: "#C93743", shape: "hex" };
  return { icon: Award, from: "#B5BAC4", to: "#6B7280", shape: "coin" };
}

const SHAPES = {
  shield: "polygon(50% 0, 100% 14%, 100% 58%, 50% 100%, 0 58%, 0 14%)",
  hex: "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
  coin: "circle(50% at 50% 50%)",
};

export function MilestoneBadge({ category, size = 80 }: { category: string; size?: number }) {
  const style = badgeStyle(category);
  const Icon = style.icon;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      <span
        className="absolute inset-0"
        style={{ clipPath: SHAPES[style.shape], background: `linear-gradient(160deg, ${style.from}, ${style.to})` }}
      />
      <span
        className="absolute inset-[9%] opacity-60"
        style={{ clipPath: SHAPES[style.shape], background: `linear-gradient(340deg, ${style.from}, ${style.to})` }}
      />
      <span
        className="absolute inset-[22%] grid place-items-center rounded-full border border-white/40"
        style={{ background: `${style.to}55` }}
      >
        <Icon className="size-[45%] text-white" strokeWidth={2} />
      </span>
    </span>
  );
}

export function useMilestoneText() {
  const t = useTranslations("milestones");
  const format = useFormatter();
  const formatValue = (category: string, value: number) => {
    if (category === "backlinks_value" || category === "ad_spend_saved")
      return format.number(value, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    if (category.includes("impressions")) return compactNumber(value);
    return format.number(value);
  };
  const title = (card: Pick<MilestoneCard, "category" | "threshold">) => {
    const key = card.category;
    const valueArg = /value|saved|impressions/.test(key) ? formatValue(card.category, card.threshold) : card.threshold;
    return t(key as "backlinks", { value: valueArg as number });
  };
  const explain = (category: string, brand: string) => {
    if (category === "backlinks" || category === "backlinks_value" || category === "ad_spend_saved" || category === "articles_indexed")
      return t(`explain.${category}`, { brand });
    if (category.startsWith("ai_")) return t("explain.ai");
    if (category.startsWith("dr_")) return t("explain.dr");
    if (category.startsWith("keywords_")) return t("explain.keywords");
    return t("explain.search");
  };
  return { title, explain, formatValue };
}

type BacklinkProof = { kind: "backlinks"; items: { url: string; domainRating: number; date: string; value?: number }[] };

function ProofDialog({ card, brand, open, onOpenChange }: { card: MilestoneCard; brand: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("overview.achievement");
  const tm = useTranslations("milestones");
  const format = useFormatter();
  const { title, explain, formatValue } = useMilestoneText();
  const proof = card.proof as BacklinkProof | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center">
          <MilestoneBadge category={card.category} size={72} />
          <DialogTitle className="mt-4">{title(card)}</DialogTitle>
          <DialogDescription>{t("unlockedOn", { date: format.dateTime(new Date(card.achievedAt), { dateStyle: "medium" }) })}</DialogDescription>
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{explain(card.category, brand)}</p>
        </div>
        {proof?.kind === "backlinks" && proof.items.length > 0 && (
          <ul className="mt-5 max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {proof.items.map((item) => (
              <li key={item.url + item.date} className="px-4 py-3">
                <p className="truncate text-sm font-medium text-ink">{item.url}</p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  DR {item.domainRating} · {format.dateTime(new Date(item.date), { dateStyle: "medium" })}
                  {item.value ? ` · ${tm("worth", { value: formatValue("backlinks_value", item.value) })}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Celebration card for achievements the user has not seen yet. */
export function AchievementCelebration({ unseen, brand }: { unseen: MilestoneCard[]; brand: string }) {
  const t = useTranslations("overview.achievement");
  const { title } = useMilestoneText();
  const [index, setIndex] = useState(0);
  const [proofOpen, setProofOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();
  if (dismissed || unseen.length === 0) return null;
  const card = unseen[index % unseen.length]!;
  const more = unseen.length - 1;

  return (
    <section className="relative pb-3">
      <span aria-hidden className="absolute inset-x-6 bottom-0 h-6 rounded-b-card border border-t-0 border-line bg-white" />
      <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-6 rounded-b-card border border-t-0 border-line bg-white" />
      <div
        className="card relative flex h-full min-h-[420px] flex-col items-center overflow-hidden px-6 pb-8 pt-5 text-center"
        style={{ background: "radial-gradient(120% 60% at 50% 0%, rgba(79,209,163,.22) 0%, transparent 70%), #fff" }}
      >
        <div className="flex w-full items-center justify-between">
          {more > 0 ? (
            <button
              type="button"
              onClick={() => setIndex(index + 1)}
              className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-medium text-ink"
            >
              {t("moreAchievements", { count: more })}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label={t("dismiss")}
            onClick={() => {
              setDismissed(true);
              startTransition(() => dismissAchievements());
            }}
            className="grid size-8 place-items-center rounded-full text-ink-secondary hover:bg-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <Confetti />
        <div className="relative mt-10">
          <MilestoneBadge category={card.category} size={112} />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.12em] text-success">{t("congratulations")}</p>
        <p className="mt-2 font-heading text-[26px] font-semibold leading-8 tracking-[-0.48px] text-ink">{title(card)}</p>
        <p className="mt-2 text-[15px] text-ink-secondary">{t("unlocked")}</p>
        <button type="button" onClick={() => setProofOpen(true)} className="mt-2 text-[15px] font-medium text-success hover:underline">
          {t("viewProof")}
        </button>
      </div>
      <ProofDialog card={card} brand={brand} open={proofOpen} onOpenChange={setProofOpen} />
    </section>
  );
}

const CONFETTI = [
  { x: 18, y: 22, c: "#F25533", r: 0, round: true },
  { x: 34, y: 14, c: "#F2B233", r: 40 },
  { x: 55, y: 16, c: "#22A06B", r: 0, round: true },
  { x: 70, y: 22, c: "#22A06B", r: 75 },
  { x: 80, y: 34, c: "#E35FB0", r: 0, round: true },
  { x: 86, y: 47, c: "#F25533", r: 25 },
  { x: 12, y: 40, c: "#22A06B", r: -30 },
  { x: 22, y: 52, c: "#F2B233", r: 0, round: true },
  { x: 76, y: 56, c: "#F2B233", r: -15 },
  { x: 90, y: 60, c: "#22A06B", r: 0, round: true },
  { x: 30, y: 62, c: "#E35FB0", r: 70 },
  { x: 64, y: 62, c: "#22A06B", r: 0, round: true },
];

function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className={cn("absolute", piece.round ? "size-2 rounded-full" : "h-1.5 w-3.5 rounded-sm")}
          style={{ left: `${piece.x}%`, top: `${piece.y}%`, background: piece.c, transform: `rotate(${piece.r}deg)` }}
        />
      ))}
    </span>
  );
}

export function OrganicWins({ cards, brand }: { cards: MilestoneCard[]; brand: string }) {
  const t = useTranslations("overview");
  const { title, explain, formatValue } = useMilestoneText();
  const scroller = useRef<HTMLDivElement>(null);
  const [proof, setProof] = useState<MilestoneCard | null>(null);
  if (cards.length === 0) return null;

  const scroll = (direction: 1 | -1) =>
    scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="card p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t("organicWins")}</p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 tracking-[-0.44px] text-ink">{t("organicWinsTitle")}</h2>
        </div>
        <div className="flex h-11 items-center rounded-full border border-control">
          <button type="button" aria-label={t("previousAchievements")} onClick={() => scroll(-1)} className="grid size-11 place-items-center text-ink-secondary hover:text-ink">
            <ChevronLeft className="size-4" />
          </button>
          <span className="h-5 w-px bg-line" />
          <button type="button" aria-label={t("nextAchievements")} onClick={() => scroll(1)} className="grid size-11 place-items-center text-ink hover:text-ink">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto">
        {cards.map((card) => {
          const progress = card.nextThreshold ? Math.min(100, (card.value / card.nextThreshold) * 100) : 100;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setProof(card)}
              className="relative flex w-[236px] shrink-0 snap-start flex-col items-center rounded-2xl bg-canvas px-4 pb-5 pt-6 text-center transition-colors hover:bg-[#F3F4F6]"
            >
              {card.isNew && (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                  {t("new")}
                </span>
              )}
              <MilestoneBadge category={card.category} size={84} />
              <span className="mt-5 flex items-center gap-1 text-[15px] font-medium text-ink">
                {title(card)}
                <Tooltip content={explain(card.category, brand)}>
                  <Info className="size-3.5 text-ink-subtle" />
                </Tooltip>
              </span>
              <span className="mt-1 h-4 text-[11px] font-medium text-success">
                {card.gainLast7Days > 0 && t("gainLast7Days", { value: formatValue(card.category, card.gainLast7Days) })}
              </span>
              <span className="mt-4 text-[11px] font-medium text-ink-secondary">
                {card.nextThreshold ? t("nextMilestone", { value: formatValue(card.category, card.nextThreshold) }) : t("topTier")}
              </span>
              <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      {proof && <ProofDialog card={proof} brand={brand} open onOpenChange={(open) => !open && setProof(null)} />}
    </section>
  );
}
