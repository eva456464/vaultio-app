"use client";

import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  ImagePlus,
  Italic,
  LayoutList,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  MessageSquareQuote,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  X,
  MonitorPlay as Youtube,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { saveArticle } from "@/server/actions/editor";
import { AiEditing, AssistantPanel, TableAiDialog } from "./ai";
import { ImageDialog, LinkDialog, YoutubeDialog, type ImageValue } from "./dialogs";
import { CardsContext, VaultioCard, VaultioVideo, type CardSummary } from "./extensions";

export type EditorProps = {
  articleId: number;
  initial: { title: string; html: string; metaDescription: string; slug: string };
  cards: CardSummary[];
  keyword: { value: string; volume: number | null; difficulty: number | null } | null;
  suggestedImages: { url: string; altText: string }[];
  aiImagesRemaining: number;
  imagesAvailable: boolean;
  aiAvailable: boolean;
  siteOrigin: string;
  readUrl: string;
};

const ImageWithCaption = Image.configure({ inline: false, allowBase64: false });

function ToolButton({ icon: Icon, label, active, disabled, onClick }: { icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-lg text-ink-secondary transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40", active && "bg-canvas text-ink")}
    >
      <Icon className="size-4" />
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-line" />;

/** Live counts from the editor's document, for the SEO tab. */
function documentStats(editor: Editor, origin: string) {
  let words = 0;
  let images = 0;
  let headings = 0;
  const links: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.isText) {
      words += (node.text ?? "").split(/\s+/).filter(Boolean).length;
      const link = node.marks.find((mark) => mark.type.name === "link");
      if (link) links.push(String(link.attrs.href));
    }
    if (node.type.name === "image") images++;
    if (node.type.name === "heading") headings++;
  });
  const unique = [...new Set(links)];
  const internal = unique.filter((href) => href.startsWith(origin) || href.startsWith("/")).length;
  return { words, images, headings, internal, external: unique.length - internal };
}

type SlashItem = { key: string; icon: LucideIcon; run: (editor: Editor) => void };

export function ArticleEditor(props: EditorProps) {
  const t = useTranslations("editor");
  const router = useRouter();
  const [title, setTitle] = useState(props.initial.title);
  const [meta, setMeta] = useState(props.initial.metaDescription);
  const [slug, setSlug] = useState(props.initial.slug);
  const [dirtyBody, setDirtyBody] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"seo" | "chat">("seo");
  const [aiRemaining, setAiRemaining] = useState(props.aiImagesRemaining);
  const [dialog, setDialog] = useState<null | { kind: "link"; text: string; url: string; editing: boolean } | { kind: "youtube"; url: string; title: string; editing: boolean } | { kind: "image"; value: ImageValue | null } | { kind: "tableAi"; mode: "create" | "edit" }>(null);
  const [slash, setSlash] = useState<{ query: string; top: number; left: number; index: number } | null>(null);
  const baseline = useRef<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" }, code: false, codeBlock: false }),
      ImageWithCaption,
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: t("placeholder") }),
      VaultioCard,
      VaultioVideo,
    ],
    content: props.initial.html,
    editorProps: { attributes: { class: "article-body article-editor min-h-[60vh] outline-none" } },
    onCreate: ({ editor }) => {
      baseline.current = editor.getHTML();
    },
    onUpdate: ({ editor }) => {
      setDirtyBody(baseline.current !== null && editor.getHTML() !== baseline.current);
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
            h1: editor.isActive("heading", { level: 1 }),
            h2: editor.isActive("heading", { level: 2 }),
            h3: editor.isActive("heading", { level: 3 }),
            paragraph: editor.isActive("paragraph"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            left: editor.isActive({ textAlign: "left" }),
            center: editor.isActive({ textAlign: "center" }),
            right: editor.isActive({ textAlign: "right" }),
            link: editor.isActive("link"),
            table: editor.isActive("table"),
            image: editor.isActive("image"),
            video: editor.isActive("vaultioVideo"),
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
          }
        : null,
  });

  const stats = useEditorState({ editor, selector: ({ editor }) => (editor ? documentStats(editor, props.siteOrigin) : null) });

  const dirty = dirtyBody || title !== props.initial.title || meta !== props.initial.metaDescription || slug !== props.initial.slug;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // "/" at the start of an empty paragraph opens the insert menu.
  const slashItems: SlashItem[] = useMemo(
    () => [
      { key: "paragraph", icon: Pilcrow, run: (e) => e.chain().focus().setParagraph().run() },
      { key: "h2", icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
      { key: "h3", icon: Heading3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
      { key: "bulletList", icon: List, run: (e) => e.chain().focus().toggleBulletList().run() },
      { key: "numberedList", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run() },
      { key: "quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run() },
      { key: "divider", icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
      { key: "table", icon: TableIcon, run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { key: "image", icon: ImagePlus, run: () => setDialog({ kind: "image", value: null }) },
      { key: "youtube", icon: Youtube, run: () => setDialog({ kind: "youtube", url: "", title: "", editing: false }) },
      {
        key: "keyTakeaways",
        icon: LayoutList,
        run: (e) => e.chain().focus().insertContent(`<p><strong>${t("templates.keyTakeaways")}:</strong></p><ul><li><p>…</p></li><li><p>…</p></li><li><p>…</p></li></ul>`).run(),
      },
      {
        key: "faq",
        icon: MessageSquareQuote,
        run: (e) => e.chain().focus().insertContent(`<h2>${t("templates.faq")}</h2><h3>${t("templates.question")}</h3><p>${t("templates.answer")}</p>`).run(),
      },
    ],
    [t],
  );
  const slashQuery = slash?.query ?? null;
  const filtered = useMemo(() => (slashQuery === null ? [] : slashItems.filter((item) => t(`slash.${item.key}`).toLowerCase().includes(slashQuery.toLowerCase()))), [slashItems, slashQuery, t]);

  const runSlash = useCallback(
    (item: SlashItem) => {
      if (!editor) return;
      const { $from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: $from.start(), to: $from.pos }).run();
      setSlash(null);
      item.run(editor);
    },
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const { $from, empty } = editor.state.selection;
      const text = $from.parent.textContent;
      if (empty && $from.parent.type.name === "paragraph" && /^\/[\p{L}\d ]{0,20}$/u.test(text) && $from.parentOffset === text.length) {
        const coords = editor.view.coordsAtPos($from.pos);
        const box = wrapper.current?.getBoundingClientRect();
        setSlash((current) => ({ query: text.slice(1), top: coords.bottom - (box?.top ?? 0) + 6, left: coords.left - (box?.left ?? 0), index: current?.query === text.slice(1) ? current.index : 0 }));
      } else setSlash(null);
    };
    editor.on("selectionUpdate", check);
    editor.on("update", check);
    return () => {
      editor.off("selectionUpdate", check);
      editor.off("update", check);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handleKeyDown: (_view, event) => {
          if (!slash || !filtered.length) return false;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            setSlash({ ...slash, index: (slash.index + (event.key === "ArrowDown" ? 1 : filtered.length - 1)) % filtered.length });
            return true;
          }
          if (event.key === "Enter") {
            runSlash(filtered[slash.index] ?? filtered[0]!);
            return true;
          }
          if (event.key === "Escape") {
            setSlash(null);
            return true;
          }
          return false;
        },
        handleDoubleClickOn: (_view, _pos, node) => {
          if (node.type.name === "image") {
            setDialog({ kind: "image", value: { src: String(node.attrs.src), alt: String(node.attrs.alt ?? ""), title: String(node.attrs.title ?? "") } });
            return true;
          }
          return false;
        },
      },
    });
  }, [editor, slash, filtered, runSlash]);

  const openLink = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const href = String(editor.getAttributes("link").href ?? "");
    if (href) editor.chain().focus().extendMarkRange("link").run();
    const range = editor.state.selection;
    setDialog({ kind: "link", text: editor.state.doc.textBetween(href ? range.from : from, href ? range.to : to, " "), url: href, editing: Boolean(href) });
  };

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    setError(null);
    const result = await saveArticle(props.articleId, { title, html: editor.getHTML(), metaDescription: meta, slug });
    setSaving(false);
    if ("error" in result) return setError(result.error);
    baseline.current = editor.getHTML();
    setDirtyBody(false);
    router.replace(`${props.readUrl}${result.republish ? "?saved=republish" : "?saved=1"}`);
    router.refresh();
  };

  const discard = () => {
    if (dirty && !window.confirm(t("discardConfirm"))) return;
    router.replace(props.readUrl);
  };

  const s = state ?? ({} as Record<string, boolean>);
  const metaLength = meta.length;

  return (
    <CardsContext.Provider value={{ cards: props.cards, labels: { link: t("cards.link"), contact: t("cards.contact"), map: t("cards.map"), product: t("cards.product") } }}>
      <div className="sticky top-[76px] z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white/95 px-5 py-3 backdrop-blur md:px-8">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{t("eyebrow")}</p>
          <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
            <span className={cn("size-2 rounded-full", dirty ? "bg-[#E8A33D]" : "bg-[#22A06B]")} />
            {dirty ? t("unsaved") : t("noChanges")}
          </p>
        </div>
        {error && <p className="text-sm text-[#9A3412]">{error}</p>}
        <Button variant="outline" onClick={discard} disabled={saving}>
          <X /> {t("discard")}
        </Button>
        <Button onClick={save} disabled={saving || !editor}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
          {saving ? t("saving") : t("saveAndClose")}
        </Button>
      </div>

      <div className="grid gap-6 px-4 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card mx-auto w-full max-w-[900px] overflow-visible">
          <div className="sticky top-[150px] z-20 flex flex-wrap items-center gap-0.5 rounded-t-[inherit] border-b border-line bg-white px-3 py-2" role="toolbar" aria-label={t("toolbar")}>
            <ToolButton icon={Undo2} label={t("undo")} disabled={!s.canUndo} onClick={() => editor?.chain().focus().undo().run()} />
            <ToolButton icon={Redo2} label={t("redo")} disabled={!s.canRedo} onClick={() => editor?.chain().focus().redo().run()} />
            <Divider />
            <ToolButton icon={Bold} label={t("bold")} active={s.bold} onClick={() => editor?.chain().focus().toggleBold().run()} />
            <ToolButton icon={Italic} label={t("italic")} active={s.italic} onClick={() => editor?.chain().focus().toggleItalic().run()} />
            <ToolButton icon={UnderlineIcon} label={t("underline")} active={s.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
            <ToolButton icon={Strikethrough} label={t("strike")} active={s.strike} onClick={() => editor?.chain().focus().toggleStrike().run()} />
            <Divider />
            <ToolButton icon={Heading1} label={t("h1")} active={s.h1} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} />
            <ToolButton icon={Heading2} label={t("h2")} active={s.h2} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
            <ToolButton icon={Heading3} label={t("h3")} active={s.h3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
            <ToolButton icon={Pilcrow} label={t("paragraph")} active={s.paragraph} onClick={() => editor?.chain().focus().setParagraph().run()} />
            <Divider />
            <ToolButton icon={List} label={t("bulletList")} active={s.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
            <ToolButton icon={ListOrdered} label={t("orderedList")} active={s.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
            <ToolButton icon={Quote} label={t("blockquote")} active={s.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
            <ToolButton icon={Minus} label={t("divider")} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
            <Divider />
            <ToolButton icon={AlignLeft} label={t("alignLeft")} active={s.left} onClick={() => editor?.chain().focus().setTextAlign("left").run()} />
            <ToolButton icon={AlignCenter} label={t("alignCenter")} active={s.center} onClick={() => editor?.chain().focus().setTextAlign("center").run()} />
            <ToolButton icon={AlignRight} label={t("alignRight")} active={s.right} onClick={() => editor?.chain().focus().setTextAlign("right").run()} />
            <Divider />
            <ToolButton icon={Link2} label={t("link")} active={s.link} onClick={openLink} />
            <ToolButton icon={TableIcon} label={t("insertTable")} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
            <ToolButton icon={ImagePlus} label={t("insertImage")} onClick={() => setDialog({ kind: "image", value: null })} />
            <ToolButton icon={Youtube} label={t("insertYoutube")} onClick={() => setDialog({ kind: "youtube", url: "", title: "", editing: false })} />
            <ToolButton icon={RemoveFormatting} label={t("clearFormatting")} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} />
          </div>

          {(s.table || s.image || s.video) && editor && (
            <div className="sticky top-[198px] z-20 flex flex-wrap items-center gap-1 border-b border-line bg-canvas px-3 py-1.5 text-xs">
              {s.table && (
                <>
                  <ContextButton icon={Rows3} label={t("table.rowAbove")} onClick={() => editor.chain().focus().addRowBefore().run()} />
                  <ContextButton icon={Rows3} label={t("table.rowBelow")} onClick={() => editor.chain().focus().addRowAfter().run()} />
                  <ContextButton icon={Trash2} label={t("table.deleteRow")} onClick={() => editor.chain().focus().deleteRow().run()} />
                  <ContextButton icon={Columns3} label={t("table.columnBefore")} onClick={() => editor.chain().focus().addColumnBefore().run()} />
                  <ContextButton icon={Columns3} label={t("table.columnAfter")} onClick={() => editor.chain().focus().addColumnAfter().run()} />
                  <ContextButton icon={Trash2} label={t("table.deleteColumn")} onClick={() => editor.chain().focus().deleteColumn().run()} />
                  <ContextButton icon={TableIcon} label={t("table.toggleHeader")} onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
                  {props.aiAvailable && <ContextButton icon={TableIcon} label={t("table.regenerate")} onClick={() => setDialog({ kind: "tableAi", mode: "edit" })} />}
                  <ContextButton icon={Trash2} label={t("table.deleteTable")} onClick={() => editor.chain().focus().deleteTable().run()} danger />
                </>
              )}
              {s.image && (
                <ContextButton
                  icon={ImageIcon}
                  label={t("editImage")}
                  onClick={() => {
                    const attrs = editor.getAttributes("image");
                    setDialog({ kind: "image", value: { src: String(attrs.src ?? ""), alt: String(attrs.alt ?? ""), title: String(attrs.title ?? "") } });
                  }}
                />
              )}
              {s.video && (
                <>
                  <ContextButton
                    icon={Youtube}
                    label={t("editVideo")}
                    onClick={() => {
                      const attrs = editor.getAttributes("vaultioVideo");
                      setDialog({ kind: "youtube", url: `https://www.youtube.com/watch?v=${attrs.videoId}`, title: String(attrs.title ?? ""), editing: true });
                    }}
                  />
                  <ContextButton icon={Trash2} label={t("removeVideo")} onClick={() => editor.chain().focus().deleteSelection().run()} danger />
                </>
              )}
            </div>
          )}

          <div ref={wrapper} data-editor-wrapper className="relative px-6 py-8 md:px-14">
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
              rows={2}
              aria-label={t("articleTitle")}
              className="w-full resize-none rounded-xl border border-dashed border-line bg-transparent px-3 py-2 font-heading text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink outline-none focus:border-ink/40 md:text-[34px]"
            />
            <div className="mt-6">
              <EditorContent editor={editor} />
            </div>
            {editor && props.aiAvailable && <AiEditing editor={editor} articleId={props.articleId} onCreateTable={() => setDialog({ kind: "tableAi", mode: "create" })} />}
            {slash && filtered.length > 0 && (
              <div role="listbox" aria-label={t("slash.menuLabel")} className="absolute z-30 w-60 rounded-xl border border-line bg-white p-1 shadow-lg" style={{ top: slash.top, left: slash.left }}>
                {filtered.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    role="option"
                    aria-selected={index === slash.index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runSlash(item)}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink", index === slash.index ? "bg-canvas" : "hover:bg-canvas")}
                  >
                    <item.icon className="size-4 text-ink-secondary" />
                    {t(`slash.${item.key}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[150px] xl:self-start">
          <div role="tablist" aria-label={t("sidebarTabs")} className="grid grid-cols-2 rounded-full bg-canvas p-1 text-sm font-medium">
            {(["seo", "chat"] as const).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("rounded-full px-3 py-1.5", tab === key ? "bg-white text-ink shadow-sm" : "text-ink-secondary")}>
                {t(`tabs.${key}`)}
              </button>
            ))}
          </div>
          {tab === "seo" ? (
            <div className="space-y-4">
              <SidePanel title={t("seo.slug")} hint={t("seo.slugHint")}>
                <div className="flex items-center rounded-control border border-control bg-white px-3 focus-within:border-ink/40">
                  <span className="text-sm text-ink-subtle">/</span>
                  <input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))} aria-label={t("seo.slug")} className="h-10 w-full bg-transparent px-1 font-mono text-xs text-ink outline-none" />
                </div>
              </SidePanel>
              <SidePanel title={t("seo.metaDescription")} hint={t("seo.metaHint")}>
                <textarea value={meta} onChange={(event) => setMeta(event.target.value)} rows={4} maxLength={300} aria-label={t("seo.metaDescription")} className="w-full rounded-control border border-control bg-white p-3 text-sm leading-relaxed text-ink outline-none focus:border-ink/40" />
                <p className={cn("mt-1 text-right text-xs", metaLength > 160 || metaLength < 70 ? "text-[#B45309]" : "text-ink-subtle")}>{t("seo.characters", { count: metaLength })}</p>
              </SidePanel>
              {props.keyword && (
                <SidePanel title={t("seo.keyword")}>
                  <p className="text-sm font-medium text-ink">{props.keyword.value}</p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {props.keyword.volume !== null && t("seo.volume", { value: props.keyword.volume })}
                    {props.keyword.difficulty !== null && <span className="ml-3">{t("seo.difficulty", { value: props.keyword.difficulty })}</span>}
                  </p>
                </SidePanel>
              )}
              {stats && (
                <SidePanel title={t("seo.data")}>
                  <dl className="divide-y divide-line text-sm">
                    {(
                      [
                        ["words", stats.words],
                        ["headings", stats.headings],
                        ["images", stats.images],
                        ["internalLinks", stats.internal],
                        ["externalLinks", stats.external],
                      ] as const
                    ).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <dt className="text-ink-secondary">{t(`seo.${key}`)}</dt>
                        <dd className="tabular-nums text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </SidePanel>
              )}
            </div>
          ) : editor && props.aiAvailable ? (
            <AssistantPanel editor={editor} articleId={props.articleId} />
          ) : (
            <p className="rounded-2xl border border-line bg-white p-5 text-sm text-ink-secondary">{t("assistant.unavailable")}</p>
          )}
        </aside>
      </div>

      {dialog?.kind === "link" && editor && (
        <LinkDialog
          open
          initial={dialog}
          onClose={() => setDialog(null)}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setDialog(null);
          }}
          onSave={(text, url) => {
            const chain = editor.chain().focus();
            if (editor.state.selection.empty || (text && text !== dialog.text)) chain.insertContent({ type: "text", text: text || url, marks: [{ type: "link", attrs: { href: url } }] }).run();
            else chain.extendMarkRange("link").setLink({ href: url }).run();
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "youtube" && editor && (
        <YoutubeDialog
          open
          initial={dialog}
          onClose={() => setDialog(null)}
          onSave={(videoId, videoTitle) => {
            if (dialog.editing) editor.chain().focus().updateAttributes("vaultioVideo", { videoId, title: videoTitle }).run();
            else insertBlock(editor, { type: "vaultioVideo", attrs: { videoId, title: videoTitle } });
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "image" && editor && (
        <ImageDialog
          open
          articleId={props.articleId}
          initial={dialog.value}
          suggested={props.suggestedImages}
          aiRemaining={aiRemaining}
          aiAvailable={props.imagesAvailable}
          onAiUsed={setAiRemaining}
          onClose={() => setDialog(null)}
          onRemove={() => {
            editor.chain().focus().deleteSelection().run();
            setDialog(null);
          }}
          onSave={(value) => {
            const attrs = { src: value.src, alt: value.alt, title: value.title || null };
            if (dialog.value) editor.chain().focus().updateAttributes("image", attrs).run();
            else editor.chain().focus().setImage({ src: value.src, alt: value.alt, title: value.title || undefined }).run();
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "tableAi" && editor && <TableAiDialog editor={editor} articleId={props.articleId} mode={dialog.mode} onClose={() => setDialog(null)} />}
    </CardsContext.Provider>
  );
}

/** Inserts a block-level card at the cursor, or below the table when the cursor is in one (table cells can't hold cards). */
function insertBlock(editor: Editor, content: Record<string, unknown>) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === "table") {
      editor.chain().focus().insertContentAt($from.after(depth), content).run();
      return;
    }
  }
  editor.chain().focus().insertContent(content).run();
}

function ContextButton({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-white", danger ? "text-[#C4320A]" : "text-ink-secondary hover:text-ink")}>
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function SidePanel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="text-xs text-ink-secondary">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
