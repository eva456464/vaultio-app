"use client";

import { ArrowRight, FileText, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { DialogState } from "./dialogs";

type StoreType = "shopify_catalog" | "woocommerce";

export const PLATFORM_BADGE: Record<"shopify" | "woocommerce", { letter: string; color: string }> = {
  shopify: { letter: "S", color: "#5E8E3E" },
  woocommerce: { letter: "W", color: "#7F54B3" },
};

export function Badge({ platform }: { platform: "shopify" | "woocommerce" }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white" style={{ background: PLATFORM_BADGE[platform].color }} aria-hidden>
      {PLATFORM_BADGE[platform].letter}
    </span>
  );
}

const SOURCE_STYLE: Record<string, string> = {
  shopify: "border-[#D4E5C7] bg-[#F4F9F0] hover:border-[#5E8E3E]/50",
  woocommerce: "border-[#E2D7F0] bg-[#F8F4FC] hover:border-[#7F54B3]/50",
  manual: "border-[#D6E0F5] bg-[#F3F6FD] hover:border-[#2A5BD7]/40",
  feed: "border-[#F3D9D4] bg-[#FDF5F3] hover:border-[#C2410C]/40",
};

/** The four ways to add products (empty state and the "Add products" dialog). */
export function SourceCards({ view, open, compact }: { view: { store: { type: StoreType } | null }; open: (state: DialogState) => void; compact?: boolean }) {
  const t = useTranslations("settings.catalog");
  const storeType = view.store?.type;
  const cards = [
    { key: "shopify", icon: <Badge platform="shopify" />, state: { kind: "shopify" } as DialogState, blocked: storeType === "woocommerce", connected: storeType === "shopify_catalog" },
    { key: "woocommerce", icon: <Badge platform="woocommerce" />, state: { kind: "woocommerce" } as DialogState, blocked: storeType === "shopify_catalog", connected: storeType === "woocommerce" },
    { key: "manual", icon: <span className="grid size-10 place-items-center rounded-xl bg-white text-[#2A5BD7]"><FileText className="size-5" /></span>, state: { kind: "manual" } as DialogState },
    { key: "feed", icon: <span className="grid size-10 place-items-center rounded-xl bg-white text-[#C2410C]"><Link2 className="size-5" /></span>, state: { kind: "feed", format: "google_shopping" } as DialogState },
  ];
  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "md:grid-cols-2")}>
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          disabled={card.blocked || card.connected}
          onClick={() => open(card.state)}
          className={cn("group rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60", SOURCE_STYLE[card.key])}
        >
          <span className="flex items-center gap-3">
            {card.icon}
            <span className="flex-1 text-[15px] font-semibold text-ink">{t(`sources.${card.key}.title` as "sources.shopify.title")}</span>
            {card.connected ? (
              <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">{t("connected")}</span>
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-white text-ink-secondary group-hover:text-ink"><ArrowRight className="size-4" /></span>
            )}
          </span>
          <span className="mt-3 block text-sm text-ink-secondary">
            {card.blocked ? t("onePlatform", { platform: t(`platforms.${storeType === "woocommerce" ? "woocommerce" : "shopify"}`) }) : t(`sources.${card.key}.description` as "sources.shopify.description")}
          </span>
        </button>
      ))}
    </div>
  );
}

