"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ASSISTANT_NAMES } from "@/lib/visibility";

type Answer = { provider: string; model: string; html: string; mentioned: boolean; checkedAt: string };

export function AnswerTabs({ answers }: { answers: Answer[] }) {
  const t = useTranslations("aiVisibility.detail");
  const format = useFormatter();
  const [active, setActive] = useState(answers[0]!.provider);
  const current = answers.find((answer) => answer.provider === active) ?? answers[0]!;
  return (
    <section className="card overflow-hidden">
      <div className="flex gap-1 border-b border-line bg-canvas px-3 pt-3" role="tablist">
        {answers.map((answer) => (
          <button
            key={answer.provider}
            type="button"
            role="tab"
            aria-selected={answer.provider === active}
            onClick={() => setActive(answer.provider)}
            className={cn("rounded-t-lg px-4 py-2 text-sm font-medium", answer.provider === active ? "bg-white text-ink ring-1 ring-line" : "text-ink-secondary hover:text-ink")}
          >
            {ASSISTANT_NAMES[answer.provider] ?? answer.provider}
            {answer.mentioned && <span className="ml-2 inline-block size-1.5 rounded-full bg-[#22A06B] align-middle" />}
          </button>
        ))}
      </div>
      <div className="p-5 md:p-7">
        <p className="text-xs text-ink-secondary">
          {t("answeredBy", { assistant: ASSISTANT_NAMES[current.provider] ?? current.provider })} · {current.model} · {t("checked", { date: format.dateTime(new Date(current.checkedAt), { dateStyle: "medium" }) })}
        </p>
        <div className="article-body mt-4 text-[15px]" dangerouslySetInnerHTML={{ __html: current.html }} />
      </div>
    </section>
  );
}
