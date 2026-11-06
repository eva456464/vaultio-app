"use client";

import { Check, ChevronRight, Plug, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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

type Item = { key: string; label: string; done: boolean; href: string; external?: boolean };

/**
 * "Get started": connecting the website is required; Google and the guides are optional. Hidden
 * once everything is done, or (when the website is connected) dismissed in this browser.
 */
export function SetupChecklist({
  siteId,
  website,
  detected,
  gsc,
  ga4,
  docsUrl,
  videoUrl,
}: {
  siteId: number;
  website: { done: boolean; platform: string | null };
  detected: string | null;
  gsc: boolean;
  ga4: boolean;
  docsUrl: string | null;
  videoUrl: string | null;
}) {
  const t = useTranslations("overview.setupChecklist");
  const storageKey = `setup-checklist-dismissed:${siteId}`;
  const dismissed = useSyncExternalStore(subscribe, () => readFlag(storageKey), () => true);
  const [closed, setClosed] = useState(false);
  const optional: Item[] = [
    { key: "gsc", label: t("items.connectGsc"), done: gsc, href: "/dashboard/settings/analytics" },
    { key: "ga4", label: t("items.connectGa4"), done: ga4, href: "/dashboard/settings/analytics" },
    ...(videoUrl ? [{ key: "video", label: t("items.watchWalkthrough"), done: false, href: videoUrl, external: true }] : []),
    ...(docsUrl ? [{ key: "docs", label: t("items.readDocs"), done: false, href: docsUrl, external: true }] : []),
  ];
  const allDone = website.done && gsc && ga4;
  if (allDone || ((dismissed || closed) && website.done)) return null;

  return (
    <section className="card p-5 md:p-6" aria-labelledby="setup-checklist">
      <div className="flex items-start justify-between gap-3">
        <h2 id="setup-checklist" className="text-[18px] font-semibold text-ink">
          {t("title")}
        </h2>
        {website.done && (
          <button
            type="button"
            aria-label={t("dismiss")}
            onClick={() => {
              try {
                window.localStorage.setItem(storageKey, "1");
              } catch {
                // Private mode: hide for this visit.
              }
              setClosed(true);
            }}
            className="grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className={cn("rounded-2xl border p-4", website.done ? "border-success-border bg-success-bg" : "border-line bg-canvas")}>
          <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{t("required")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", website.done ? "bg-white text-success" : "bg-brand/10 text-brand")}>
              {website.done ? <Check className="size-5" /> : <Plug className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {website.done ? t("connected.title", { platform: website.platform ? t.has(`platforms.${website.platform}`) ? t(`platforms.${website.platform}` as "platforms.api") : website.platform : t("connected.fallbackPlatform") }) : detected ? t("connectWebsite.titleDetected", { platform: detected }) : t("connectWebsite.title")}
              </p>
              {!website.done && <p className="text-sm text-ink-secondary">{t("connectWebsite.body")}</p>}
            </div>
            <Link href="/dashboard/settings/publishing" className={cn("inline-flex h-10 items-center rounded-full px-5 text-sm font-medium", website.done ? "border border-control bg-white text-ink hover:bg-canvas" : "bg-ink text-white hover:bg-ink/90")}>
              {website.done ? t("connected.manage") : detected ? t("connectWebsite.buttonDetected", { platform: detected }) : t("connectWebsite.button")}
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{t("optional")}</p>
          <ul className="mt-2 divide-y divide-line">
            {optional.map((item) => {
              const content = (
                <>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", item.done ? "border-success bg-success text-white" : "border-control")}>{item.done && <Check className="size-3" />}</span>
                  <span className={cn("flex-1 text-sm", item.done ? "text-ink-secondary line-through" : "text-ink")}>{item.label}</span>
                  {!item.done && <ChevronRight className="size-4 text-ink-subtle" />}
                </>
              );
              return (
                <li key={item.key}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5">
                      {content}
                    </a>
                  ) : (
                    <Link href={item.href} className="flex items-center gap-3 py-2.5">
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
