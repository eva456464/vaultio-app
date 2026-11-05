"use client";

import { Gift, LoaderCircle, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { regenerateArticle, sendArticleFeedback } from "@/server/actions/articles";
import type { AlternativeTopic } from "@/server/queries/content";

type Step = "ask" | "happy" | "reason" | "content" | "regenerateQuestion" | "instructions" | "topic" | "done";

const area = "w-full rounded-control border border-control bg-white p-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

/**
 * "Leave your feedback": a thumbs up or down, and for a thumbs down either a rewrite with
 * instructions or a new topic. The first feedback on an article earns a backlink credit.
 */
export function ArticleFeedback({ articleId, alreadyGiven, alternatives, canRegenerate }: { articleId: number; alreadyGiven: boolean; alternatives: AlternativeTopic[]; canRegenerate: boolean }) {
  const t = useTranslations("articleFeedback");
  const router = useRouter();
  const [step, setStep] = useState<Step>("ask");
  const [comment, setComment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const topics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alternatives.filter((topic) => !q || topic.keyword.toLowerCase().includes(q)).slice(0, 30);
  }, [alternatives, query]);

  const run = (work: () => Promise<{ ok: true } | { error: string }>, message: string) =>
    startTransition(async () => {
      const result = await work();
      if ("error" in result) return setError(result.error);
      setError(null);
      setOutcome(message);
      setStep("done");
      router.refresh();
    });

  const feedback = (happy: boolean, text: string) => sendArticleFeedback(articleId, { happy, comment: text });

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="text-[15px] font-semibold text-ink">{t("title")}</p>
      {!alreadyGiven && step !== "done" && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
          <Gift className="size-3.5 text-brand" /> {t("earnCredit")}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {step === "ask" && (
          <>
            <p className="text-sm text-ink">{t("areYouHappy")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep("happy")}>
                <ThumbsUp /> {t("yes")}
              </Button>
              <Button variant="outline" onClick={() => setStep(canRegenerate ? "reason" : "content")}>
                <ThumbsDown /> {t("no")}
              </Button>
            </div>
          </>
        )}

        {step === "happy" && (
          <>
            <p className="text-sm text-ink">{t("whatDidYouLike")}</p>
            <textarea className={area} rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("happyPlaceholder")} />
            <Button disabled={pending} onClick={() => run(() => feedback(true, comment), t("thanks"))}>
              {pending && <LoaderCircle className="animate-spin" />} {t("submit")}
            </Button>
          </>
        )}

        {step === "reason" && (
          <>
            <p className="text-sm text-ink">{t("reasonTitle")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep("content")}>{t("reasonContent")}</Button>
              <Button variant="outline" onClick={() => setStep("topic")}>{t("reasonTopic")}</Button>
            </div>
          </>
        )}

        {step === "content" && (
          <>
            <p className="text-sm text-ink">{t("howCanWeImprove")}</p>
            <textarea className={area} rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("contentPlaceholder")} />
            <Button disabled={!comment.trim()} onClick={() => (canRegenerate ? setStep("regenerateQuestion") : run(() => feedback(false, comment), t("thanks")))}>
              {t("continue")}
            </Button>
          </>
        )}

        {step === "regenerateQuestion" && (
          <>
            <p className="text-sm font-medium text-ink">{t("regenerateQuestion")}</p>
            <p className="text-xs text-ink-secondary">{t("regenerateQuestionHint")}</p>
            <div className="grid gap-2">
              <Button onClick={() => { setInstructions(comment); setStep("instructions"); }}>{t("regenerateYes")}</Button>
              <Button variant="outline" disabled={pending} onClick={() => run(() => feedback(false, comment), t("thanks"))}>
                {t("regenerateNo")}
              </Button>
            </div>
          </>
        )}

        {step === "instructions" && (
          <>
            <p className="text-sm text-ink">{t("instructionsTitle")}</p>
            <textarea className={area} rows={4} maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t("instructionsPlaceholder")} />
            <Button
              disabled={pending || !instructions.trim()}
              onClick={() =>
                run(async () => {
                  const sent = await feedback(false, comment);
                  if ("error" in sent) return sent;
                  return regenerateArticle(articleId, { instructions });
                }, t("regenerating"))
              }
            >
              {pending && <LoaderCircle className="animate-spin" />} {t("regenerateSubmit")}
            </Button>
          </>
        )}

        {step === "topic" && (
          <>
            <p className="text-sm text-ink">{t("pickTopic")}</p>
            <label className="flex items-center gap-2 rounded-control border border-control px-3 focus-within:border-ink/40">
              <Search className="size-4 text-ink-subtle" />
              <input className="h-10 w-full bg-transparent text-sm text-ink outline-none" value={query} onChange={(e) => { setQuery(e.target.value); setChosen(null); }} placeholder={t("searchTopics")} />
            </label>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {topics.map((topic) => (
                <button
                  key={topic.clusterId}
                  type="button"
                  onClick={() => setChosen(topic.clusterId)}
                  className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm", chosen === topic.clusterId ? "bg-ink text-white" : "hover:bg-canvas text-ink")}
                >
                  <span className="truncate">{topic.keyword}</span>
                  {topic.searchVolume !== null && <span className="shrink-0 text-xs opacity-70">{topic.searchVolume}</span>}
                </button>
              ))}
              {!topics.length && <p className="px-1 text-xs text-ink-secondary">{query.trim() ? t("useOwnTopic", { topic: query.trim() }) : t("noTopics")}</p>}
            </div>
            <textarea className={area} rows={2} maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t("topicInstructionsPlaceholder")} />
            <Button
              disabled={pending || (!chosen && query.trim().length < 3)}
              onClick={() =>
                run(async () => {
                  const sent = await feedback(false, t("topicFeedback"));
                  if ("error" in sent) return sent;
                  return regenerateArticle(articleId, { instructions, ...(chosen ? { clusterId: chosen } : { topic: query.trim() }) });
                }, t("topicChanged"))
              }
            >
              {pending && <LoaderCircle className="animate-spin" />} {t("confirm")}
            </Button>
          </>
        )}

        {step === "done" && outcome && <p className="rounded-xl bg-success-bg p-3 text-sm text-success">{outcome}</p>}
        {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      </div>
    </section>
  );
}
