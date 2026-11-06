"use client";

import { ArrowBigUp, ArrowRight, Check, EllipsisVertical, Info, LoaderCircle, MessageSquare, Pencil, RefreshCw, Search, Sparkles, Trash2, TrendingUp, Undo2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import type { CommunityPlatform } from "@/db/schema";
import { cn } from "@/lib/utils";
import { discardCommunityOpportunity, draftCommunityReply, markCommunityReplied, saveCommunityReply } from "@/server/actions/community";

export type Opportunity = {
  id: number;
  title: string;
  url: string;
  subreddit: string | null;
  upvotes: number | null;
  numComments: number | null;
  keyword: string | null;
  /** Why it was found: Google ranking for the keyword, a web search for it, or trending in the subreddit. */
  source: "google" | "web" | "trending" | null;
  reply: string | null;
  reasoning: string | null;
  repliedAt: string | null;
};

/** Small platform mark (letter in the platform colour); the label beside it names the platform. */
export function PlatformMark({ platform, size = "sm" }: { platform: CommunityPlatform; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold text-white",
        platform === "reddit" ? "bg-[#FF4500]" : "bg-[#B92B27]",
        size === "lg" ? "size-11 text-[20px]" : "size-[18px] text-[11px]",
      )}
    >
      {platform === "reddit" ? "r" : "Q"}
    </span>
  );
}

export function OpportunityCard({ platform, item, llmAvailable }: { platform: CommunityPlatform; item: Opportunity; llmAvailable: boolean }) {
  const t = useTranslations("socials");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"draft" | "save" | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.reply ?? "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replied = Boolean(item.repliedAt);

  const run = (kind: "draft" | "save" | null, action: () => Promise<{ ok: true } | { error: string }>, after?: () => void) => {
    setBusy(kind);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if ("error" in result) setError(result.error);
      else {
        setError(null);
        after?.();
      }
    });
  };

  const draft = () =>
    run("draft", async () => {
      const result = await draftCommunityReply(item.id);
      if ("reply" in result) setText(result.reply);
      return result;
    });

  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(item.reply ?? "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="rounded-2xl border border-line bg-canvas/70 p-4 md:p-5">
      <div className="flex items-center gap-2 text-sm text-ink-secondary">
        <PlatformMark platform={platform} />
        {platform === "reddit" && item.subreddit ? t("reddit.community", { name: item.subreddit }) : t("quora.community")}
        {item.numComments != null && (
          <span className="flex items-center gap-1 text-ink-subtle">
            · <MessageSquare className="size-3.5" aria-hidden /> {t("comments", { count: item.numComments })}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">
        <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
          {item.title}
        </a>
        {item.upvotes != null && (
          <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-sm font-normal text-ink-secondary" title={t("upvotes", { count: item.upvotes })}>
            {format.number(item.upvotes)}
            <ArrowBigUp className="size-4" aria-label={t("upvotes", { count: item.upvotes })} />
          </span>
        )}
      </h3>

      {editing ? (
        <div className="mt-4">
          <textarea
            aria-label={t("edit")}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-control bg-white p-3.5 text-[15px] leading-relaxed text-ink outline-none focus:border-ink/40"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run("save", () => saveCommunityReply(item.id, text), () => setEditing(false))}>
              {busy === "save" ? <LoaderCircle className="animate-spin" /> : <Check />}
              {t("save")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setText(item.reply ?? "");
                setEditing(false);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        item.reply && (
          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              <Sparkles className="size-3.5" aria-hidden />
              {t("suggestedReply")}
            </p>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{item.reply}</p>
          </div>
        )
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {replied ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-sm font-medium text-success">
              <Check className="size-4" />
              {t("repliedOn", { date: format.dateTime(new Date(item.repliedAt!), { dateStyle: "medium" }) })}
            </span>
          ) : item.reply && !editing ? (
            <Button onClick={copyAndOpen} className="bg-ink text-white hover:bg-ink/90">
              {t("copyOpen")}
              <ArrowRight />
            </Button>
          ) : (
            !editing && (
              <Button onClick={draft} disabled={pending || !llmAvailable} className="bg-ink text-white hover:bg-ink/90">
                {busy === "draft" ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                {busy === "draft" ? t("drafting") : t("draft")}
              </Button>
            )
          )}
          {copied && !replied && (
            <span className="flex flex-wrap items-center gap-2 text-sm text-ink-secondary" role="status">
              {t("copied")}
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(null, () => markCommunityReplied(item.id, true))}>
                <Check />
                {t("markReplied")}
              </Button>
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("moreActions")} className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink-secondary outline-none hover:text-ink">
            <EllipsisVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {!replied && item.reply && (
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil />
                {t("edit")}
              </DropdownMenuItem>
            )}
            {!replied && item.reply && llmAvailable && (
              <DropdownMenuItem onSelect={draft}>
                <RefreshCw />
                {t("redraft")}
              </DropdownMenuItem>
            )}
            {replied ? (
              <DropdownMenuItem onSelect={() => run(null, () => markCommunityReplied(item.id, false))}>
                <Undo2 />
                {t("moveBack")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => run(null, () => markCommunityReplied(item.id, true))}>
                <Check />
                {t("markReplied")}
              </DropdownMenuItem>
            )}
            {!replied && (
              <DropdownMenuItem onSelect={() => run(null, () => discardCommunityOpportunity(item.id))} className="text-[#C4320A]">
                <Trash2 />
                {t("notRelevant")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && <p className="mt-2 text-sm text-[#9A3412]">{error}</p>}

      {(item.keyword || item.reasoning || item.source === "trending") && (
        <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[13px] text-ink-secondary">
          {item.source === "trending" ? <TrendingUp className="size-3.5 shrink-0 text-ink-subtle" aria-hidden /> : <Search className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />}
          {item.source === "trending" && item.subreddit ? (
            <span>{t.rich("trendingIn", { subreddit: item.subreddit, q: (chunks) => <strong className="font-semibold text-ink">{chunks}</strong> })}</span>
          ) : item.keyword ? (
            <span>{t.rich(item.source === "google" ? "ranksFor" : "foundFor", { keyword: item.keyword, q: (chunks) => <strong className="font-semibold text-ink">“{chunks}”</strong> })}</span>
          ) : null}
          {item.reasoning && (
            <Tooltip content={`${t("whyRelevant")}: ${item.reasoning}`}>
              <button type="button" aria-label={`${t("whyRelevant")}: ${item.reasoning}`} className="text-ink-subtle hover:text-ink-secondary">
                <Info className="size-3.5" />
              </button>
            </Tooltip>
          )}
        </p>
      )}
    </article>
  );
}
