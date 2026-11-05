"use client";

import { DOMSerializer, type Node as PmNode, type Slice } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { Bold, Check, ChevronLeft, ChevronRight, Italic, LoaderCircle, RotateCcw, Send, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { aiEditSelection, aiTable, askAssistant, assistantHistory, clearAssistant, decideProposal, type AiAction, type AssistantMessage } from "@/server/actions/editor-ai";

function sliceHtml(editor: Editor, slice: Slice) {
  const container = document.createElement("div");
  container.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content));
  return container.innerHTML;
}

function nodeHtml(editor: Editor, node: PmNode) {
  const container = document.createElement("div");
  container.appendChild(DOMSerializer.fromSchema(editor.schema).serializeNode(node));
  return container.innerHTML;
}

const ACTIONS: AiAction[] = ["rewrite", "improve_writing", "make_longer", "shorten", "simplify", "fix_grammar", "convert_to_list", "create_table", "add_keyword", "add_internal_link"];

type Pending = { from: number; to: number; text: string; action: AiAction; instruction?: string; versions: string[]; index: number; busy: boolean; error: string | null; unchanged: boolean };

/** The menu over selected text: formatting, AI edits, and the review of each suggestion. */
export function AiEditing({ editor, articleId, onCreateTable }: { editor: Editor; articleId: number; onCreateTable: () => void }) {
  const t = useTranslations("editor.ai");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      const isText = !empty && editor.state.doc.textBetween(from, to, " ").trim().length > 1 && !editor.isActive("image");
      if (!isText || pending) {
        if (!pending) setPosition(null);
        return;
      }
      const wrapper = editor.view.dom.closest("[data-editor-wrapper]") as HTMLElement | null;
      const box = wrapper?.getBoundingClientRect();
      const start = editor.view.coordsAtPos(from);
      setPosition({ top: start.top - (box?.top ?? 0) - 48, left: Math.max(8, start.left - (box?.left ?? 0)) });
    };
    const blur = () => {
      if (!pending && !holder.current?.matches(":focus-within")) setPosition(null);
    };
    editor.on("selectionUpdate", update);
    editor.on("blur", blur);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", blur);
    };
  }, [editor, pending]);

  const request = async (action: AiAction, instruction?: string, base?: Pending) => {
    const { from, to } = base ?? editor.state.selection;
    const $from = editor.state.doc.resolve(from);
    const $to = editor.state.doc.resolve(to);
    const inline = $from.parent === $to.parent && $from.parent.isTextblock && !(from === $from.start() && to === $from.end());
    const html = inline ? sliceHtml(editor, editor.state.doc.slice(from, to)).replace(/^<p>|<\/p>$/g, "") : sliceHtml(editor, editor.state.doc.slice(from, to));
    const text = editor.state.doc.textBetween(from, to, " ");
    const next: Pending = base
      ? { ...base, busy: true, error: null }
      : { from, to, text, action, instruction, versions: [], index: 0, busy: true, error: null, unchanged: false };
    setPending(next);
    const result = await aiEditSelection(articleId, {
      action,
      html,
      inline,
      instruction,
      before: editor.state.doc.textBetween(Math.max(0, from - 800), from, " "),
      after: editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 800), " "),
    }).catch(() => ({ error: t("error") }));
    if ("error" in result) return setPending({ ...next, busy: false, error: result.error });
    if ("unchanged" in result) return setPending({ ...next, busy: false, unchanged: true });
    setPending({ ...next, busy: false, versions: [...next.versions, result.html], index: next.versions.length, unchanged: false });
  };

  const accept = () => {
    if (!pending) return;
    const current = editor.state.doc.textBetween(pending.from, Math.min(pending.to, editor.state.doc.content.size), " ");
    if (current !== pending.text) return setPending({ ...pending, error: t("selectionChanged") });
    editor.chain().focus().insertContentAt({ from: pending.from, to: pending.to }, pending.versions[pending.index]!).run();
    setPending(null);
    setPosition(null);
  };

  if (!position && !pending) return null;
  return (
    <div ref={holder} className="absolute z-30" style={{ top: Math.max(0, position?.top ?? 0), left: position?.left ?? 0 }}>
      {pending ? (
        <div className="w-[min(520px,80vw)] rounded-2xl border border-line bg-white p-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            <p className="flex-1 text-sm font-semibold text-ink">{t("suggestion", { action: t(`actions.${pending.action}`) })}</p>
            {pending.versions.length > 1 && (
              <span className="flex items-center gap-1 text-xs text-ink-secondary">
                <button type="button" aria-label={t("previous")} disabled={pending.index === 0} onClick={() => setPending({ ...pending, index: pending.index - 1 })} className="rounded p-0.5 hover:bg-canvas disabled:opacity-40">
                  <ChevronLeft className="size-4" />
                </button>
                {pending.index + 1}/{pending.versions.length}
                <button type="button" aria-label={t("next")} disabled={pending.index === pending.versions.length - 1} onClick={() => setPending({ ...pending, index: pending.index + 1 })} className="rounded p-0.5 hover:bg-canvas disabled:opacity-40">
                  <ChevronRight className="size-4" />
                </button>
              </span>
            )}
            <button type="button" aria-label={t("close")} onClick={() => { setPending(null); setPosition(null); }} className="rounded p-1 text-ink-secondary hover:bg-canvas">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl bg-canvas p-3 text-sm">
            {pending.busy ? (
              <p className="flex items-center gap-2 text-ink-secondary"><LoaderCircle className="size-4 animate-spin" /> {t("generating")}</p>
            ) : pending.unchanged ? (
              <p className="text-ink-secondary">{t("noChanges")}</p>
            ) : pending.versions[pending.index] ? (
              <div className="article-body text-[15px]" dangerouslySetInnerHTML={{ __html: pending.versions[pending.index]! }} />
            ) : null}
          </div>
          {pending.error && <p className="mt-2 text-sm text-[#9A3412]">{pending.error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={pending.busy} onClick={() => request(pending.action, pending.instruction, pending)}>
              <RotateCcw /> {pending.versions.length ? t("tryAnother") : t("retry")}
            </Button>
            <Button type="button" size="sm" disabled={pending.busy || !pending.versions[pending.index]} onClick={accept}>
              <Check /> {t("accept")}
            </Button>
          </div>
        </div>
      ) : custom !== null ? (
        <form
          className="flex w-[min(420px,80vw)] items-center gap-2 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          onSubmit={(event) => {
            event.preventDefault();
            if (custom.trim()) request("custom", custom.trim());
            setCustom(null);
          }}
        >
          <Wand2 className="ml-1.5 size-4 shrink-0 text-brand" />
          <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setCustom(null)} placeholder={t("customPlaceholder")} className="h-8 flex-1 bg-transparent text-sm text-ink outline-none" />
          <Button type="submit" size="sm">{t("apply")}</Button>
        </form>
      ) : (
        <div className="flex max-w-[90vw] flex-wrap items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg" onMouseDown={(event) => event.preventDefault()}>
          <button type="button" title={t("bold")} onClick={() => editor.chain().focus().toggleBold().run()} className={cn("grid size-8 place-items-center rounded-lg hover:bg-canvas", editor.isActive("bold") && "bg-canvas")}>
            <Bold className="size-4" />
          </button>
          <button type="button" title={t("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("grid size-8 place-items-center rounded-lg hover:bg-canvas", editor.isActive("italic") && "bg-canvas")}>
            <Italic className="size-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-line" />
          {ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => (action === "create_table" && editor.state.selection.empty ? onCreateTable() : request(action))}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-secondary hover:bg-canvas hover:text-ink"
            >
              {t(`actions.${action}`)}
            </button>
          ))}
          <button type="button" onClick={() => setCustom("")} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand hover:bg-canvas">
            <Wand2 className="size-3.5" /> {t("custom")}
          </button>
        </div>
      )}
    </div>
  );
}

/** "Create table with AI" (from the selection) or "Regenerate with AI" (the table the cursor is in). */
export function TableAiDialog({ editor, articleId, mode, onClose }: { editor: Editor; articleId: number; mode: "create" | "edit"; onClose: () => void }) {
  const t = useTranslations("editor.tableAi");
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The range to replace: the table around the cursor, or the selection (or the current block).
  const target = (() => {
    const { $from, from, to, empty } = editor.state.selection;
    if (mode === "edit") {
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === "table") return { from: $from.before(depth), to: $from.after(depth), html: nodeHtml(editor, node) };
      }
    }
    if (!empty) return { from, to, html: sliceHtml(editor, editor.state.doc.slice(from, to)) };
    const depth = Math.min(1, $from.depth);
    return { from: $from.before(depth), to: $from.after(depth), html: nodeHtml(editor, $from.node(depth)) };
  })();
  const [range] = useState(target);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const result = await aiTable(articleId, { html: range.html, instruction, mode }).catch(() => ({ error: t("error") }));
    setBusy(false);
    if ("error" in result) return setError(result.error);
    if ("html" in result) setPreview(result.html);
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-xl">{mode === "edit" ? t("editTitle") : t("createTitle")}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("description")}</DialogDescription>
        <label className="mt-5 block">
          <span className="text-sm font-medium text-ink">{t("instruction")}</span>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={1000} placeholder={mode === "edit" ? t("editPlaceholder") : t("createPlaceholder")} className="mt-1.5 min-h-20 w-full rounded-control border border-control p-3 text-sm outline-none focus:border-ink/40" />
        </label>
        {preview && <div className="article-body mt-4 max-h-80 overflow-auto rounded-xl border border-line p-3 text-sm" dangerouslySetInnerHTML={{ __html: preview }} />}
        {error && <p className="mt-3 text-sm text-[#9A3412]">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{preview ? t("reject") : t("cancel")}</Button>
          {preview ? (
            <Button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, preview).run();
                onClose();
              }}
            >
              <Check /> {t("accept")}
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={generate}>
              {busy && <LoaderCircle className="animate-spin" />} {t("generate")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The document as numbered top-level blocks, as the assistant sees it. */
function documentBlocks(editor: Editor) {
  const blocks: { text: string; html: string; from: number; to: number }[] = [];
  editor.state.doc.forEach((node, offset) => {
    blocks.push({ text: node.textContent, html: nodeHtml(editor, node), from: offset, to: offset + node.nodeSize });
  });
  return blocks;
}

/** "AI Chat" in the editor's sidebar: questions about the article, with changes to accept or reject. */
export function AssistantPanel({ editor, articleId }: { editor: Editor; articleId: number }) {
  const t = useTranslations("editor.assistant");
  const [messages, setMessages] = useState<AssistantMessage[] | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState<Record<string, boolean>>({});
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    assistantHistory(articleId).then((result) => (Array.isArray(result) ? setMessages(result) : setError(t("historyError"))));
  }, [articleId, t]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);

  const ask = async () => {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    const asked = question;
    setQuestion("");
    const result = await askAssistant(
      articleId,
      asked,
      documentBlocks(editor).map(({ text, html }) => ({ text, html })),
    ).catch(() => ({ error: t("error") }));
    setBusy(false);
    if ("error" in result) {
      setQuestion(asked);
      return setError(result.error);
    }
    setMessages(result.messages);
  };

  const decide = (message: AssistantMessage, index: number, status: "accepted" | "rejected") => {
    const proposal = message.proposals[index]!;
    if (status === "accepted") {
      const block = documentBlocks(editor).find((entry) => entry.text === proposal.originalText);
      if (!block) return setStale({ ...stale, [`${message.id}-${index}`]: true });
      editor.chain().focus().insertContentAt({ from: block.from, to: block.to }, proposal.html).run();
    }
    setMessages((current) => current?.map((entry) => (entry.id === message.id ? { ...entry, proposals: entry.proposals.map((p, i) => (i === index ? { ...p, status } : p)) } : entry)) ?? null);
    void decideProposal(articleId, message.id, index, status);
  };

  return (
    <section className="flex max-h-[calc(100vh-240px)] min-h-[420px] flex-col rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Sparkles className="size-4 text-brand" />
        <p className="flex-1 text-[15px] font-semibold text-ink">{t("title")}</p>
        {messages && messages.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              await clearAssistant(articleId);
              setMessages([]);
            }}
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink"
          >
            <Trash2 className="size-3.5" /> {t("clear")}
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages === null ? (
          <p className="text-sm text-ink-secondary">{t("loadingHistory")}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t("welcome")}</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn("rounded-2xl px-3.5 py-2.5 text-sm", message.role === "user" ? "ml-8 bg-ink text-white" : "mr-4 bg-canvas text-ink")}>
              <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
              {message.proposals.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.proposals.length > 1 && message.proposals.some((p) => !p.status) && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => message.proposals.forEach((p, i) => !p.status && decide(message, i, "accepted"))}>{t("acceptAll")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => message.proposals.forEach((p, i) => !p.status && decide(message, i, "rejected"))}>{t("rejectAll")}</Button>
                    </div>
                  )}
                  {message.proposals.map((proposal, index) => (
                    <div key={index} className="rounded-xl border border-line bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{/<table/.test(proposal.html) ? t("tablePreview") : t("changePreview")}</p>
                      <p className="mt-1 text-xs text-ink-secondary">{proposal.reason}</p>
                      <div className="article-body mt-2 max-h-48 overflow-auto text-[13px]" dangerouslySetInnerHTML={{ __html: proposal.html }} />
                      {stale[`${message.id}-${index}`] && <p className="mt-2 text-xs text-[#9A3412]">{t("staleProposal")}</p>}
                      {proposal.status ? (
                        <p className={cn("mt-2 text-xs font-medium", proposal.status === "accepted" ? "text-success" : "text-ink-subtle")}>{t(proposal.status)}</p>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => decide(message, index, "accepted")}><Check /> {t("accept")}</Button>
                          <Button size="sm" variant="outline" onClick={() => decide(message, index, "rejected")}>{t("reject")}</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {busy && <p className="flex items-center gap-2 text-sm text-ink-secondary"><LoaderCircle className="size-4 animate-spin" /> {t("thinking")}</p>}
        <div ref={end} />
      </div>
      {error && <p className="px-4 pb-2 text-sm text-[#9A3412]">{error}</p>}
      <form className="flex items-end gap-2 border-t border-line p-3" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={t("placeholder")}
          className="min-h-11 flex-1 resize-none rounded-control border border-control px-3 py-2 text-sm outline-none focus:border-ink/40"
        />
        <Button type="submit" size="icon" aria-label={t("send")} disabled={busy || !question.trim()}>
          <Send />
        </Button>
      </form>
    </section>
  );
}
