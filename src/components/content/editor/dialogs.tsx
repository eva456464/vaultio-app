"use client";

import { ImagePlus, LoaderCircle, Sparkles, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { youtubeId } from "@/lib/visuals";
import { generateArticleImage, uploadArticleImage } from "@/server/actions/editor";

const field = "mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

export function LinkDialog({ open, initial, onClose, onSave, onRemove }: { open: boolean; initial: { text: string; url: string; editing: boolean }; onClose: () => void; onSave: (text: string, url: string) => void; onRemove: () => void }) {
  const t = useTranslations("editor.linkDialog");
  const [text, setText] = useState(initial.text);
  const [url, setUrl] = useState(initial.url);
  const valid = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url.trim()) || /^[\w-]+(\.[\w-]+)+/.test(url.trim());
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-xl">{initial.editing ? t("editTitle") : t("addTitle")}</DialogTitle>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            const href = /^[a-z]+:|^[/#]/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
            onSave(text, href);
          }}
        >
          <Field label={t("text")}>
            <input className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("textPlaceholder")} />
          </Field>
          <Field label={t("url")}>
            <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" autoFocus required />
          </Field>
          <div className="flex justify-between gap-2 pt-2">
            <div>{initial.editing && <Button type="button" variant="ghost" onClick={onRemove}>{t("remove")}</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
              <Button type="submit" disabled={!valid}>{t("save")}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function YoutubeDialog({ open, initial, onClose, onSave }: { open: boolean; initial: { url: string; title: string; editing: boolean }; onClose: () => void; onSave: (videoId: string, title: string) => void }) {
  const t = useTranslations("editor.youtubeDialog");
  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const id = youtubeId(url.trim());
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-xl">{initial.editing ? t("editTitle") : t("insertTitle")}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("description")}</DialogDescription>
        <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); if (id) onSave(id, title.trim()); }}>
          <Field label={t("url")}>
            <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." autoFocus required />
          </Field>
          {url.trim() && !id && <p className="text-sm text-[#9A3412]">{t("invalidUrl")}</p>}
          <Field label={t("videoTitle")} hint={t("videoTitleHint")}>
            <input className={field} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!id}>{initial.editing ? t("update") : t("insert")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type ImageValue = { src: string; alt: string; title: string };
type Suggested = { url: string; altText: string };

/**
 * Insert or edit an image: alt text and caption, or a replacement chosen from the article's
 * suggested images, uploaded, or made with AI (shown next to the current one before it's used).
 */
export function ImageDialog({
  open,
  articleId,
  initial,
  suggested,
  aiRemaining,
  aiAvailable,
  onClose,
  onSave,
  onRemove,
  onAiUsed,
}: {
  open: boolean;
  articleId: number;
  initial: ImageValue | null;
  suggested: Suggested[];
  aiRemaining: number;
  aiAvailable: boolean;
  onClose: () => void;
  onSave: (value: ImageValue) => void;
  onRemove: () => void;
  onAiUsed: (remaining: number) => void;
}) {
  const t = useTranslations("editor.imageDialog");
  const [value, setValue] = useState<ImageValue>(initial ?? { src: "", alt: "", title: "" });
  const [mode, setMode] = useState<"pick" | "ai" | "review">("pick");
  const [prompt, setPrompt] = useState("");
  const [candidate, setCandidate] = useState<{ url: string; alt: string } | null>(null);
  const [busy, setBusy] = useState<"upload" | "ai" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError(t("unsupported"));
    if (file.size > 6 * 1024 * 1024) return setError(t("tooLarge"));
    setBusy("upload");
    const form = new FormData();
    form.set("file", file);
    const result = await uploadArticleImage(articleId, form).catch(() => ({ error: t("uploadFailed") }));
    setBusy(null);
    if ("error" in result) return setError(result.error);
    setValue({ ...value, src: result.url, alt: value.alt || result.altText });
  };

  const generate = async () => {
    setError(null);
    setBusy("ai");
    const result = await generateArticleImage(articleId, prompt).catch(() => ({ error: t("aiError") }));
    setBusy(null);
    if ("error" in result) return setError(result.error);
    onAiUsed(result.remaining ?? 0);
    setCandidate({ url: result.url, alt: result.altText });
    setMode("review");
  };

  const options = suggested.filter((item) => item.url !== value.src);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-xl">{mode === "review" ? t("reviewTitle") : initial ? t("editTitle") : t("insertTitle")}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-secondary">{mode === "review" ? t("reviewDescription") : initial ? t("editDescription") : t("insertDescription")}</DialogDescription>

        {mode === "review" && candidate ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: t("current"), url: value.src },
                { label: t("new"), url: candidate.url },
              ].map((item) => (
                <figure key={item.label} className="space-y-1.5">
                  <figcaption className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{item.label}</figcaption>
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- article image preview
                    <img src={item.url} alt="" className="aspect-[3/2] w-full rounded-xl border border-line object-cover" />
                  ) : (
                    <div className="grid aspect-[3/2] place-items-center rounded-xl border border-dashed border-line text-xs text-ink-subtle">{t("noImage")}</div>
                  )}
                </figure>
              ))}
            </div>
            <Field label={t("newAltText")} hint={t("newAltTextHint")}>
              <input className={field} value={candidate.alt} onChange={(e) => setCandidate({ ...candidate, alt: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMode("pick")}>{t("keepCurrent")}</Button>
              <Button
                type="button"
                onClick={() => {
                  setValue({ ...value, src: candidate.url, alt: candidate.alt });
                  setMode("pick");
                }}
              >
                {t("useImage")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              {value.src ? (
                // eslint-disable-next-line @next/next/no-img-element -- article image preview
                <img src={value.src} alt={value.alt} className="aspect-[3/2] w-full rounded-xl border border-line object-cover" />
              ) : (
                <div className="grid aspect-[3/2] place-items-center rounded-xl border border-dashed border-line px-4 text-center text-xs text-ink-subtle">{t("selectOrUpload")}</div>
              )}
              {initial && (
                <button type="button" onClick={onRemove} className="flex items-center gap-1.5 text-xs font-medium text-[#C4320A] hover:underline">
                  <Trash2 className="size-3.5" /> {t("removeFromArticle")}
                </button>
              )}
            </div>
            <div className="space-y-4">
              <Field label={t("altText")} hint={t("altTextHint")}>
                <input className={field} value={value.alt} maxLength={200} onChange={(e) => setValue({ ...value, alt: e.target.value })} />
              </Field>
              <Field label={`${t("caption")} ${t("optional")}`}>
                <input className={field} value={value.title} maxLength={200} placeholder={t("captionPlaceholder")} onChange={(e) => setValue({ ...value, title: e.target.value })} />
              </Field>

              <div className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex-1 text-sm font-medium text-ink">{t("replace")}</p>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
                    {busy === "upload" ? <LoaderCircle className="animate-spin" /> : <Upload />}
                    {busy === "upload" ? t("uploading") : t("upload")}
                  </Button>
                  {aiAvailable && (
                    <Button type="button" size="sm" variant={mode === "ai" ? "primary" : "outline"} disabled={busy !== null || aiRemaining <= 0} onClick={() => setMode(mode === "ai" ? "pick" : "ai")}>
                      <Sparkles /> {t("generate")}
                    </Button>
                  )}
                </div>
                {mode === "ai" && (
                  <div className="mt-3 space-y-2">
                    <textarea className="min-h-20 w-full rounded-control border border-control p-3 text-sm outline-none focus:border-ink/40" value={prompt} maxLength={600} onChange={(e) => setPrompt(e.target.value)} placeholder={t("aiPlaceholder")} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-ink-subtle">{t("aiLeft", { remaining: aiRemaining })}</span>
                      <Button type="button" size="sm" disabled={busy !== null || prompt.trim().length < 5} onClick={generate}>
                        {busy === "ai" && <LoaderCircle className="animate-spin" />}
                        {busy === "ai" ? t("generating") : t("generateButton")}
                      </Button>
                    </div>
                    {busy === "ai" && <p className="text-xs text-ink-secondary">{t("generatingHint")}</p>}
                  </div>
                )}
                {options.length > 0 && mode !== "ai" && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-ink-secondary">{t("suggested")}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {options.slice(0, 8).map((item) => (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => setValue({ ...value, src: item.url, alt: value.alt || item.altText })}
                          className="overflow-hidden rounded-lg border border-line hover:border-ink/40"
                          title={item.altText}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- suggested image */}
                          <img src={item.url} alt={item.altText} className="aspect-[3/2] w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-[#9A3412]">{error}</p>}
            </div>
          </div>
        )}

        {mode !== "review" && (
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="button" disabled={!value.src || busy !== null} onClick={() => onSave(value)}>
              <ImagePlus /> {initial ? t("saveChanges") : t("insert")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const dialogFieldClass = field;
