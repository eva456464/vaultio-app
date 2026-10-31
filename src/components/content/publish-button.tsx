"use client";

import { Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { publishNow } from "@/server/actions/publishing";

export function PublishButton({ articleId, published }: { articleId: number; published: boolean }) {
  const t = useTranslations("article");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (published) {
    return (
      <span className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#22A06B] text-sm font-medium text-white">
        <Check className="size-4" />
        {t("statusPublished")}
      </span>
    );
  }
  return (
    <div className="contents">
      <button
        type="button"
        disabled={pending}
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
        <Send className="size-4" />
        {t("publishNow")}
      </button>
      {error && <p className="col-span-2 text-sm text-[#9A3412]">{error}</p>}
    </div>
  );
}
