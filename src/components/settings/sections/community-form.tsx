"use client";

import { List, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { CommunityPlatform } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { normalizeSubreddit } from "@/lib/community";
import { cn } from "@/lib/utils";
import { addCommunityKeyword, deleteCommunityKeyword, setCommunityKeywordActive, updateCommunityPreferences } from "@/server/actions/community";
import { inputClass, SettingsCard, useSave } from "../form-kit";

type Keyword = { id: number; keyword: string };

export type CommunitySettingsData = {
  platform: CommunityPlatform;
  maxKeywords: number;
  active: Keyword[];
  suggestions: Keyword[];
  subreddits: string[];
  replyInstructions: string;
  llmAvailable: boolean;
  nextSearch: string | null;
  upgradeAvailable: boolean;
};

function KeywordsCard({ data, canEdit }: { data: CommunitySettingsData; canEdit: boolean }) {
  const t = useTranslations("settings.community");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = data.active.length >= data.maxKeywords;
  const run = (action: () => Promise<{ ok: true } | { error: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setError(result.error);
      else {
        setError(null);
        after?.();
      }
    });

  return (
    <section className="card overflow-hidden">
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-[16px] font-semibold text-ink">{t(`${data.platform}.keywordsTitle`)}</h2>
            <p className="mt-1 text-sm text-ink-secondary">{t("keywordsHint")}</p>
          </div>
          <span className={cn("text-sm font-semibold tabular-nums", full ? "text-[#9A3412]" : "text-ink-secondary")}>
            {t("selected", { count: data.active.length, max: data.maxKeywords })}
          </span>
        </div>
        <ul className="mt-5 flex flex-wrap gap-2">
          {data.active.map((keyword) => (
            <li key={keyword.id} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1.5 pl-3.5 pr-2 text-sm text-ink">
              {keyword.keyword}
              {canEdit && (
                <button
                  type="button"
                  aria-label={t("stopMonitoring", { keyword: keyword.keyword })}
                  title={t("stopMonitoring", { keyword: keyword.keyword })}
                  disabled={pending}
                  onClick={() => run(() => setCommunityKeywordActive(keyword.id, false))}
                  className="grid size-5 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink"
                >
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
          {data.active.length === 0 && <li className="text-sm text-ink-secondary">{t("noKeywords")}</li>}
        </ul>
        {data.nextSearch && <p className="mt-3 text-xs text-ink-subtle">{t("nextSearch", { when: data.nextSearch })}</p>}
      </div>

      {canEdit && (
        <div className="border-t border-line p-5 md:p-6">
          <h3 className="text-sm font-semibold text-ink">{t("addMore")}</h3>
          {data.suggestions.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.suggestions.map((keyword) => (
                <li key={keyword.id} className={cn("flex items-center rounded-full border border-dashed border-control bg-white text-sm", full ? "text-ink-subtle" : "text-ink-secondary")}>
                  <button
                    type="button"
                    disabled={pending || full}
                    aria-label={t("addSuggestion", { keyword: keyword.keyword })}
                    onClick={() => run(() => setCommunityKeywordActive(keyword.id, true))}
                    className="flex items-center gap-1 py-1.5 pl-3 pr-1 hover:text-ink disabled:cursor-not-allowed"
                  >
                    <Plus className="size-3" />
                    {keyword.keyword}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={t("deleteSuggestion", { keyword: keyword.keyword })}
                    title={t("deleteSuggestion", { keyword: keyword.keyword })}
                    onClick={() => run(() => deleteCommunityKeyword(keyword.id))}
                    className="mr-1.5 grid size-5 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-secondary">{t("noSuggestions")}</p>
          )}
          <form
            className="mt-4 flex max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => addCommunityKeyword(data.platform, draft), () => setDraft(""));
            }}
          >
            <input
              aria-label={t("addPlaceholder")}
              value={draft}
              disabled={full}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("addPlaceholder")}
              maxLength={80}
              className={cn(inputClass, "mt-0 flex-1")}
            />
            <Button type="submit" variant="outline" className="h-11 rounded-control" disabled={pending || full || draft.trim().length < 3}>
              <Plus />
              {t("add")}
            </Button>
          </form>
          {full && <p className="mt-2 text-xs text-ink-subtle">{t("limitReached", { max: data.maxKeywords })}</p>}
          {data.upgradeAvailable && (
            <p className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/[0.04] p-3 text-sm text-ink">
              {t(`upgrade.${data.platform}`)}
              <Link href="/dashboard/settings/billing" className="font-medium text-brand hover:underline">
                {t("upgrade.action")}
              </Link>
            </p>
          )}
          {error && <p className="mt-2 text-sm text-[#9A3412]">{error}</p>}
        </div>
      )}
    </section>
  );
}

function Optional({ children }: { children: string }) {
  return <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 align-middle text-xs font-medium text-ink-secondary">{children}</span>;
}

export function CommunityForm({ data, canEdit, brand }: { data: CommunitySettingsData; canEdit: boolean; brand: string }) {
  const t = useTranslations("settings.community");
  const [subreddits, setSubreddits] = useState(data.subreddits);
  const [instructions, setInstructions] = useState(data.replyInstructions);
  const [subredditDraft, setSubredditDraft] = useState("");
  const [subredditError, setSubredditError] = useState(false);
  const { button } = useSave(() => updateCommunityPreferences(data.platform, { subreddits, replyInstructions: instructions }));

  const addSubreddit = () => {
    const name = normalizeSubreddit(subredditDraft);
    if (!name) {
      setSubredditError(true);
      return;
    }
    if (!subreddits.some((existing) => existing.toLowerCase() === name.toLowerCase())) setSubreddits([...subreddits, name]);
    setSubredditDraft("");
    setSubredditError(false);
  };

  return (
    <div className="space-y-6">
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[15px] text-ink-secondary">{t(`${data.platform}.subtitle`)}</p>
        <Link href={`/dashboard/socials?tab=${data.platform}`} className="inline-flex items-center gap-1.5 rounded-full border border-control bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
          <List className="size-4" />
          {t(`view.${data.platform}`)}
        </Link>
      </div>
      {!data.llmAvailable && <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("needsLlm")}</p>}

      <KeywordsCard data={data} canEdit={canEdit} />

      {data.platform === "reddit" && (
        <SettingsCard title={<>{t("subredditsTitle")}<Optional>{t("optional")}</Optional></>} hint={t("subredditsHint")} footer={canEdit ? button() : undefined}>
          <ul className="flex flex-wrap gap-2">
            {subreddits.map((name) => (
              <li key={name} className="flex items-center gap-1.5 rounded-full border border-line bg-canvas py-1 pl-3 pr-1.5 text-sm text-ink">
                r/{name}
                {canEdit && (
                  <button
                    type="button"
                    aria-label={t("removeSubreddit", { name })}
                    onClick={() => setSubreddits(subreddits.filter((other) => other !== name))}
                    className="grid size-5 place-items-center rounded-full text-ink-subtle hover:bg-white hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="flex max-w-xl gap-2">
              <input
                aria-label={t("subredditPlaceholder")}
                value={subredditDraft}
                onChange={(event) => {
                  setSubredditDraft(event.target.value);
                  setSubredditError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubreddit();
                  }
                }}
                placeholder={t("subredditPlaceholder")}
                aria-invalid={subredditError}
                className={cn(inputClass, "mt-0 flex-1", subredditError && "border-[#9A3412]")}
              />
              <Button type="button" variant="outline" className="h-11 rounded-control" disabled={!subredditDraft.trim()} onClick={addSubreddit}>
                <Plus />
                {t("add")}
              </Button>
            </div>
          )}
          {subredditError && <p className="text-sm text-[#9A3412]">{t("invalidSubreddit")}</p>}
        </SettingsCard>
      )}

      <SettingsCard title={<>{t("repliesTitle")}<Optional>{t("optional")}</Optional></>} hint={t(`repliesHint.${data.platform}`)} footer={canEdit ? button() : undefined}>
        <textarea
          aria-label={t("repliesTitle")}
          value={instructions}
          disabled={!canEdit}
          maxLength={1500}
          rows={4}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder={t("repliesPlaceholder")}
          className={cn(inputClass, "mt-0 h-auto py-3 leading-relaxed")}
        />
        <p className="text-xs text-ink-subtle">{t("honesty", { brand })}</p>
      </SettingsCard>
    </div>
  );
}
