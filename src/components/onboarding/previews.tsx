"use client";

import { BarChart3, Image as ImageIcon, LayoutTemplate, Search, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

function Browser({ address, children }: { address: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(16,24,40,0.35)]">
      <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#F87171]" />
        <span className="size-2.5 rounded-full bg-[#FBBF24]" />
        <span className="size-2.5 rounded-full bg-[#34D399]" />
        <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-1 text-xs text-ink-secondary">{address}</span>
      </div>
      {children}
    </div>
  );
}

/** Step 1: the address being typed, in a browser frame. */
export function SitePreview({ domain }: { domain: string }) {
  const t = useTranslations("onboarding.preview");
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <Browser address={domain || t("yourWebsite")}>
        <div className="space-y-3 p-6">
          <div className="h-4 w-2/3 rounded bg-canvas" />
          <div className="h-3 w-full rounded bg-canvas" />
          <div className="h-3 w-5/6 rounded bg-canvas" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-16 rounded-lg bg-canvas" />
            ))}
          </div>
        </div>
      </Browser>
      {domain && <p className="text-sm text-ink-secondary">{t.rich("thatsDomain", { domain, highlight: (chunks) => <span className="font-semibold text-ink">{chunks}</span> })}</p>}
    </div>
  );
}

/** Step 3: the owner's description and audiences, which the strategy is built from. */
export function BusinessPreview({ description, audiences }: { description: string; audiences: string[] }) {
  const t = useTranslations("onboarding.preview");
  return (
    <div className="w-full max-w-[460px]">
      <h2 className="text-xl font-semibold text-ink">{t("businessHeading")}</h2>
      <p className="mt-1 text-sm text-ink-secondary">{t("businessSub")}</p>
      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{t("yourBusiness")}</p>
          <p className="mt-1.5 line-clamp-4 text-sm text-ink">{description || "—"}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[1px] text-ink-subtle">
            <Users className="size-3.5" /> {t("yourAudience")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {audiences.length ? audiences.map((audience) => <span key={audience} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">{audience}</span>) : <span className="text-sm text-ink-subtle">—</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-ink">
          <Sparkles className="size-4 text-brand" /> {t("aiNote")}
        </div>
        <p className="text-center text-sm font-medium text-ink-secondary">{t("businessNote")}</p>
      </div>
    </div>
  );
}

/** Step 5: the brand colours applied to article visuals (illustrative layout, no real data). */
export function BrandPreview({ primary, secondary }: { primary: string; secondary: string }) {
  const t = useTranslations("onboarding.preview");
  const features = [
    { icon: ImageIcon, title: t("brandImages"), sub: t("brandImagesSub") },
    { icon: BarChart3, title: t("brandCharts"), sub: t("brandChartsSub") },
    { icon: LayoutTemplate, title: t("brandVisuals"), sub: t("brandVisualsSub") },
  ];
  return (
    <div className="w-full max-w-[460px]">
      <h2 className="text-xl font-semibold text-ink">{t("brandHeading")}</h2>
      <p className="mt-1 text-sm text-ink-secondary">{t("brandSub")}</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary || primary})` }}>
          <p className="text-xs font-semibold uppercase tracking-[1px] opacity-80">{t("guide")}</p>
          <p className="mt-2 text-lg font-semibold leading-snug">{t("guideTitle")}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          {[0.9, 0.6, 0.35].map((height, index) => (
            <div key={index} className="flex h-20 items-end rounded-lg bg-canvas p-2">
              <div className="w-full rounded" style={{ height: `${height * 100}%`, background: index === 1 && secondary ? secondary : primary }} />
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {features.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="rounded-xl border border-line bg-white p-3">
            <Icon className="size-4" style={{ color: primary }} />
            <p className="mt-1.5 text-xs font-semibold text-ink">{title}</p>
            <p className="text-[11px] text-ink-secondary">{sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Search Console step: what the connection is used for. */
export function SearchConsolePreview() {
  const t = useTranslations("onboarding.preview");
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Search className="size-4" /> {t("gscTitle")}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink-secondary">
        {[t("gscPerformance"), t("gscKeywords"), t("gscIndexing")].map((item) => (
          <li key={item} className="rounded-lg bg-canvas px-3 py-2">{item}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium text-ink">{t("gscNote")}</p>
    </div>
  );
}
