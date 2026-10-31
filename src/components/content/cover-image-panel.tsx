"use client";

import { ImageIcon, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { regenerateCover } from "@/server/actions/articles";

export function CoverImagePanel({
  articleId,
  imageUrl,
  altText,
  remaining,
  canEdit,
  available,
  published,
}: {
  articleId: number;
  imageUrl: string | null;
  altText: string | null;
  remaining: number;
  canEdit: boolean;
  available: boolean;
  published: boolean;
}) {
  const t = useTranslations("article.cover");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <ImageIcon className="size-4 text-brand" />
        {t("title")}
      </p>
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={altText ?? ""} className="mt-3 aspect-[16/9] w-full rounded-xl object-cover" />
          {altText && <p className="mt-2 text-xs text-ink-secondary">{t("alt", { text: altText })}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-secondary">{available ? t("none") : t("noProvider")}</p>
      )}
      {available && canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pending || remaining <= 0}
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const result = await regenerateCover(articleId);
                if ("error" in result) setMessage({ ok: false, text: result.error });
                else setMessage({ ok: !result.publishErrors.length, text: result.publishErrors.length ? t("publishFailed", { errors: result.publishErrors.join("; ") }) : published ? t("updatedLive") : t("done") });
              })
            }
          >
            <RefreshCw className={pending ? "animate-spin" : undefined} />
            {pending ? t("working") : imageUrl ? t("regenerate") : t("generate")}
          </Button>
          <span className="text-xs text-ink-secondary">{t("remaining", { count: remaining })}</span>
        </div>
      )}
      {message && <p className={message.ok ? "mt-2 text-xs text-success" : "mt-2 text-xs text-[#9A3412]"}>{message.text}</p>}
      <Link href="/dashboard/settings/visual" className="mt-3 inline-block text-xs font-medium text-ink-secondary hover:text-ink hover:underline">
        {t("settings")}
      </Link>
    </section>
  );
}
