"use client";

import { Check, ChevronDown, CloudOff, LoaderCircle, RefreshCw, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { republishArticle, unpublishArticleNow } from "@/server/actions/articles";
import { publishNow } from "@/server/actions/publishing";

/** "Publish now" for a written article; for a published one, re-publish or unpublish (each confirmed). */
export function PublishButton({ articleId, published, canEdit = true }: { articleId: number; published: boolean; canEdit?: boolean }) {
  const t = useTranslations("article");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"republish" | "unpublish" | null>(null);
  const [pending, startTransition] = useTransition();

  const done = (errors: string[] | undefined, ok: string) => {
    if (errors?.length) setError(t("publishFailed", { error: errors.join("; ") }));
    else {
      setError(null);
      setMessage(ok);
    }
    setConfirm(null);
    router.refresh();
  };

  if (published) {
    return (
      <div className="contents">
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={pending} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#22A06B] text-sm font-medium text-white disabled:opacity-60">
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                {t("statusPublished")}
                <ChevronDown className="size-3.5 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setConfirm("republish")}>
                <RefreshCw className="size-4" /> {t("republish")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirm("unpublish")} className="text-[#C4320A]">
                <CloudOff className="size-4" /> {t("unpublish")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#22A06B] text-sm font-medium text-white">
            <Check className="size-4" />
            {t("statusPublished")}
          </span>
        )}
        {message && <p className="col-span-2 text-sm text-success">{message}</p>}
        {error && <p className="col-span-2 text-sm text-[#9A3412]">{error}</p>}
        <Dialog open={confirm !== null} onOpenChange={(next) => !next && setConfirm(null)}>
          <DialogContent className="max-w-md">
            <DialogTitle className="text-xl">{confirm === "unpublish" ? t("confirmUnpublish") : t("confirmRepublish")}</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-ink-secondary">{confirm === "unpublish" ? t("confirmUnpublishMessage") : t("confirmRepublishMessage")}</DialogDescription>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>{t("cancel")}</Button>
              <Button
                disabled={pending}
                className={confirm === "unpublish" ? "bg-[#C4320A] hover:bg-[#A82B08]" : undefined}
                onClick={() =>
                  startTransition(async () => {
                    if (confirm === "unpublish") {
                      const result = await unpublishArticleNow(articleId);
                      if ("error" in result) setError(result.error);
                      else done(result.errors, t("unpublished"));
                    } else {
                      const result = await republishArticle(articleId);
                      if ("error" in result) setError(result.error);
                      else done(result.errors, t("republished"));
                    }
                  })
                }
              >
                {pending && <LoaderCircle className="animate-spin" />}
                {t("yes")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  return (
    <div className="contents">
      <button
        type="button"
        disabled={pending || !canEdit}
        onClick={() =>
          startTransition(async () => {
            const result = await publishNow(articleId);
            if (result.published) {
              setError(null);
              router.refresh();
            } else setError(result.errors.length ? t("publishFailed", { error: result.errors.join("; ") }) : t("noPublishing"));
          })
        }
        className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-ink text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {t("publishNow")}
      </button>
      {error && <p className="col-span-2 text-sm text-[#9A3412]">{error}</p>}
    </div>
  );
}
