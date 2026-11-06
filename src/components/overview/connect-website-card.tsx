"use client";

import { Plug, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};
const readFlag = (key: string) => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/** "Setup pending": shown until the website has a way to receive articles (dismissable per browser). */
export function ConnectWebsiteCard({ siteId, platform }: { siteId: number; platform: string | null }) {
  const t = useTranslations("overview.connectWebsite");
  const storageKey = `connect-website-dismissed:${siteId}`;
  const dismissed = useSyncExternalStore(subscribe, () => readFlag(storageKey), () => true);
  const [closed, setClosed] = useState(false);
  if (dismissed || closed) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
        <Plug className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{t("title")}</p>
        <p className="text-sm text-ink-secondary">{platform ? t("descriptionDetected", { platform }) : t("description")}</p>
      </div>
      <Link href="/dashboard/settings/publishing" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/90">
        {platform ? t("buttonDetected", { platform }) : t("button")}
      </Link>
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={() => {
          try {
            window.localStorage.setItem(storageKey, "1");
          } catch {
            // Private mode: hide for this visit only.
          }
          setClosed(true);
        }}
        className="grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
