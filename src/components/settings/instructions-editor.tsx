"use client";

import { ArrowRight, Check, ChevronDown, Clock, Loader2, MoreHorizontal, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import type { InstructionChange, InstructionField, InstructionRule } from "@/db/schema";
import { cn } from "@/lib/utils";
import { addInstruction, dismissInstructionUnsupported, editInstructionRule, removeInstructionRule } from "@/server/actions/instructions";
import type { InstructionResult } from "@/server/instructions";

const MAX_RULE = 300;

export type UnsupportedItem = { index: number; request: string; reason: string; at: string };

/** Settings → Writing / Visuals rule list: requests are reviewed by AI into rules (and setting changes). */
export function InstructionsEditor({
  field,
  rules,
  history,
  unsupported,
  canEdit,
  otherHref,
}: {
  field: InstructionField;
  rules: InstructionRule[];
  history: InstructionChange[];
  unsupported: UnsupportedItem[];
  canEdit: boolean;
  otherHref: string;
}) {
  const t = useTranslations("settings.instructions");
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [working, startWorking] = useTransition();
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<InstructionResult | null>(null);
  const [error, setError] = useState<{ kind: "failed" | "tooLong"; max?: number } | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnsupported, setShowUnsupported] = useState(true);
  const [fresh, setFresh] = useState<string[]>([]);

  const submit = (text = draft) => {
    const value = text.trim();
    if (!value || working) return;
    setError(null);
    setResult(null);
    setPending(value);
    startWorking(async () => {
      const response = await addInstruction(field, value);
      setPending(null);
      if ("error" in response) {
        if (response.error !== "empty") setError({ kind: response.error === "tooLong" ? "tooLong" : "failed", max: response.max });
        return;
      }
      setDraft("");
      setResult(response.result);
      setFresh(response.result.added);
      router.refresh();
    });
  };

  return (
    <section className="card overflow-hidden" aria-labelledby={`${field}-instructions`}>
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`${field}-instructions`} className="font-sans text-[16px] font-semibold text-ink">
            {t(`${field}.label`)}
          </h2>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-secondary">{t("optional")}</span>
          <Link href={otherHref} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink">
            {t(`${field}.otherLink`)} <ArrowRight className="size-3" />
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">{t(`${field}.description`)}</p>

        {rules.length === 0 && !pending ? (
          <div className="mt-5 rounded-xl border border-dashed border-line bg-canvas/60 p-4">
            <p className="text-sm font-medium text-ink">{t(`${field}.emptyTitle`)}</p>
            <p className="mt-1 text-sm text-ink-secondary">{t(`${field}.emptyDescription`)}</p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
            {rules.map((rule, index) => (
              <RuleRow key={`${index}-${rule.text}`} field={field} index={index} rule={rule} canEdit={canEdit} isNew={fresh.includes(rule.text)} />
            ))}
            {pending && (
              <li className="flex items-start gap-3 px-4 py-3">
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-ink-subtle" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-secondary">{pending}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{t("pendingBadge")}</p>
                </div>
              </li>
            )}
          </ul>
        )}

        {canEdit && (
          <>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <input
                aria-label={t(`${field}.label`)}
                value={draft}
                maxLength={2000}
                disabled={working}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t(`${field}.placeholder`)}
                className="h-11 min-w-0 flex-1 rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40 disabled:bg-canvas"
              />
              <Button type="submit" variant="outline" size="lg" disabled={working || !draft.trim()}>
                {working ? <Loader2 className="animate-spin" /> : null}
                {t("add")}
              </Button>
            </form>
            {working && (
              <p className="mt-2 text-xs text-ink-secondary" role="status">
                <span className="font-medium text-ink">{t("working")}</span> {t(`${field}.workingHint`)}
              </p>
            )}
            {draft.length > MAX_RULE && !working && <p className="mt-2 text-xs text-ink-subtle">{t("longHint", { max: MAX_RULE })}</p>}
            {error && (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#B42318]" role="alert">
                <TriangleAlert className="size-4" />
                {error.kind === "tooLong" ? t("tooLong", { max: error.max ?? 4000 }) : t("error")}
                {error.kind === "failed" && (
                  <button type="button" className="font-medium underline" onClick={() => submit()}>
                    {t("retry")}
                  </button>
                )}
              </p>
            )}
            {rules.length === 0 && (
              <div className="mt-3">
                <button type="button" onClick={() => setShowExamples((value) => !value)} className="text-xs font-medium text-ink-secondary hover:text-ink">
                  {showExamples ? t("hideExamples") : t("showExamples")}
                </button>
                {showExamples && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3].map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => setDraft(t(`${field}.examples.${number}`))}
                        className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink hover:bg-canvas"
                      >
                        {t(`${field}.examples.${number}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {result && <ResultPanel field={field} result={result} onClose={() => setResult(null)} />}

        {unsupported.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#FEDF89] bg-[#FFFAEB]">
            <button type="button" onClick={() => setShowUnsupported((value) => !value)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#93370D]">
              <TriangleAlert className="size-4" />
              {showUnsupported ? t("hideUnsupported") : t("showUnsupported", { count: unsupported.length })}
              <ChevronDown className={cn("ml-auto size-4 transition-transform", showUnsupported && "rotate-180")} />
            </button>
            {showUnsupported && (
              <ul className="space-y-3 border-t border-[#FEDF89] px-4 py-3">
                {unsupported.map((item) => (
                  <li key={`${item.index}-${item.at}`} className="text-sm">
                    <p className="font-medium text-ink">“{item.request}”</p>
                    <p className="mt-0.5 text-ink-secondary">{item.reason}</p>
                    {canEdit && <DismissButton index={item.index} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4">
            <button type="button" onClick={() => setShowHistory((value) => !value)} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink">
              <Clock className="size-3.5" />
              {showHistory ? t("hideHistory") : t("showHistory", { count: history.length })}
              <ChevronDown className={cn("size-3.5 transition-transform", showHistory && "rotate-180")} />
            </button>
            {showHistory && (
              <ol className="mt-3 space-y-3 border-l border-line pl-4">
                {history.map((change, index) => (
                  <HistoryEntry key={`${change.at}-${index}`} change={change} />
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function useAgo() {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const t = useTranslations("settings.instructions");
  return (at: string) => (now.getTime() - new Date(at).getTime() < 60_000 ? t("justNow") : format.relativeTime(new Date(at), now));
}

function SourceLine({ rule }: { rule: InstructionRule }) {
  const t = useTranslations("settings.instructions");
  const ago = useAgo();
  const source =
    rule.source === "feedback"
      ? rule.articleTitle ? t("source.feedbackWithArticle", { title: rule.articleTitle }) : t("source.feedback")
      : rule.source === "regenerate"
        ? rule.articleTitle ? t("source.regenerateWithArticle", { title: rule.articleTitle }) : t("source.regenerate")
        : null;
  return (
    <p className="mt-0.5 text-xs text-ink-subtle">
      {source ? `${source} · ${ago(rule.addedAt)}` : t("addedAt", { time: ago(rule.addedAt) })}
    </p>
  );
}

function RuleRow({ field, index, rule, canEdit, isNew }: { field: InstructionField; index: number; rule: InstructionRule; canEdit: boolean; isNew: boolean }) {
  const t = useTranslations("settings.instructions");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rule.text);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () =>
    startBusy(async () => {
      if (value.trim() === rule.text) return setEditing(false);
      const response = await editInstructionRule(field, index, value);
      if ("error" in response) return setError(response.error === "tooLong" ? t("tooLong", { max: response.max ?? 4000 }) : t("error"));
      setEditing(false);
      router.refresh();
    });
  const remove = () =>
    startBusy(async () => {
      const response = await removeInstructionRule(field, index);
      if ("error" in response) return setError(t("error"));
      router.refresh();
    });

  return (
    <li className={cn("flex items-start gap-3 px-4 py-3", busy && "opacity-60")}>
      <Check className="mt-0.5 size-4 shrink-0 text-[#22A06B]" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <>
            <input
              autoFocus
              aria-label={t("editLine")}
              value={value}
              maxLength={MAX_RULE}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
                if (event.key === "Escape") {
                  setValue(rule.text);
                  setEditing(false);
                }
              }}
              onBlur={() => !busy && save()}
              className="h-9 w-full rounded-control border border-control bg-white px-2.5 text-sm text-ink outline-none focus:border-ink/40"
            />
            <p className="mt-1 text-xs text-ink-subtle">{t("editHint")}</p>
          </>
        ) : (
          <p className="text-sm text-ink">
            {rule.text}
            {isNew && <span className="ml-2 rounded-full bg-[#ECFDF3] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#067647]">{t("newChip")}</span>}
            {rule.pendingReview && (
              <span title={t("pendingReviewTooltip")} className="ml-2 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
                {t("pendingReviewBadge")}
              </span>
            )}
          </p>
        )}
        {!editing && <SourceLine rule={rule} />}
        {error && <p className="mt-1 text-xs text-[#B42318]">{error}</p>}
      </div>
      {canEdit && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("ruleMenu")} className="grid size-7 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil /> {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={remove} className="text-[#B42318]">
              <Trash2 /> {t("remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function useSettingText() {
  const t = useTranslations("settings.instructions");
  return (change: { key: string; from: string; to: string }) => {
    const label = t.has(`settingLabels.${change.key}`) ? t(`settingLabels.${change.key}`) : t("settingLabels.unknown");
    const value = (raw: string) => (raw === "true" ? t("settingLabels.on") : raw === "false" ? t("settingLabels.off") : t.has(`settingLabels.values.${raw}`) ? t(`settingLabels.values.${raw}`) : raw);
    return `${label}: ${value(change.from)} → ${value(change.to)}`;
  };
}

function ResultPanel({ field, result, onClose }: { field: InstructionField; result: InstructionResult; onClose: () => void }) {
  const t = useTranslations("settings.instructions");
  const settingText = useSettingText();
  const nothing = !result.added.length && !result.removed.length && !result.settings.length && !result.unsupported.length && !result.other.added.length;
  return (
    <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-4" role="status">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{nothing ? t("result.titleNoChange") : t("result.title")}</p>
        <button type="button" onClick={onClose} className="text-xs font-medium text-ink-secondary hover:text-ink">
          {t("close")}
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
        {result.added.length > 0 && <li>{t("result.addedTo", { count: result.added.length, field: t(`result.field.${field}`) })}</li>}
        {result.other.added.length > 0 && <li>{t("result.addedTo", { count: result.other.added.length, field: t(`result.field.${result.other.field}`) })}</li>}
        {result.removed.length > 0 && <li>{t("result.removedLines", { count: result.removed.length })}</li>}
        {result.settings.map((change) => (
          <li key={change.key}>
            {settingText(change)} <span className="text-ink-subtle">({t("result.settingHint")})</span>
          </li>
        ))}
        {result.unsupported.length > 0 && <li>{t("result.unsupportedBelow", { count: result.unsupported.length })}</li>}
      </ul>
      {result.removed.length > 0 && (
        <div className="mt-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{t("result.removed")}</p>
          <ul className="mt-1 space-y-0.5 text-ink-secondary line-through">
            {result.removed.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {result.summary && <p className="mt-2 text-sm text-ink">{result.summary}</p>}
      {result.pendingReview && <p className="mt-2 text-xs text-ink-subtle">{t("pendingReviewTooltip")}</p>}
    </div>
  );
}

function HistoryEntry({ change }: { change: InstructionChange }) {
  const t = useTranslations("settings.instructions");
  const format = useFormatter();
  const settingText = useSettingText();
  return (
    <li className="text-sm">
      <p className="text-xs text-ink-subtle">
        {format.dateTime(new Date(change.at), { dateStyle: "medium", timeStyle: "short" })} · {t(`historySource.${change.source}`)}
      </p>
      {change.request && change.source !== "edit" && <p className="mt-0.5 text-xs italic text-ink-secondary">“{change.request}”</p>}
      <ul className="mt-1 space-y-0.5">
        {change.added.map((line) => (
          <li key={`+${line}`} className="text-ink">
            <span className="mr-1.5 font-semibold text-[#067647]">+</span>
            {line}
          </li>
        ))}
        {change.removed.map((line) => (
          <li key={`-${line}`} className="text-ink-secondary line-through">
            <span className="mr-1.5 font-semibold text-[#B42318] no-underline">−</span>
            {line}
          </li>
        ))}
        {change.settings.map((setting) => (
          <li key={setting.key} className="text-ink-secondary">{settingText(setting)}</li>
        ))}
      </ul>
      {change.summary && <p className="mt-1 text-xs text-ink-secondary">{change.summary}</p>}
    </li>
  );
}

function DismissButton({ index }: { index: number }) {
  const t = useTranslations("settings.instructions");
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        startBusy(async () => {
          await dismissInstructionUnsupported(index);
          router.refresh();
        })
      }
      className="mt-1 text-xs font-medium text-[#93370D] underline disabled:opacity-60"
    >
      {t("dismissUnsupported")}
    </button>
  );
}
