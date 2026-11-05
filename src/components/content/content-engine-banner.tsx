"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MESSAGES = ["opportunities", "articles", "keywords", "competitors", "research", "outlines", "internalLinks", "citations"] as const;

/** What the content engine is doing, cycling through its steps while the website's agents run. */
export function ContentEngineBanner({ running }: { running: boolean }) {
  const t = useTranslations("content.engine");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % MESSAGES.length), 4000);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-5 py-3">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[1px] text-ink-secondary">
        {t("label")}
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal", running ? "bg-success-bg text-success" : "bg-canvas text-ink-secondary")}>
          <span className={cn("size-1.5 rounded-full bg-current", running && "animate-pulse")} />
          {running ? t("running") : t("stopped")}
        </span>
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-ink-secondary" aria-live="polite">
        {running ? t(`messages.${MESSAGES[index]}`) : t("stoppedHint")}
      </p>
    </div>
  );
}
