"use client";

import { Globe, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { wizardSaveCompetitors, wizardSuggestCompetitors } from "@/server/actions/onboarding";
import { useAdvance } from "./use-advance";
import { Loading, StepActions, WizardFrame } from "./wizard-frame";

const MAX = 10;
const domainOf = (value: string) => {
  try {
    const host = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`).hostname.replace(/^www\./, "").toLowerCase();
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
  } catch {
    return null;
  }
};

/** Step 4 (optional): competitors found from keyword data, which the owner can change. */
export function CompetitorsStep({ brand, back, next }: { brand: { name: string; logoUrl: string | null }; back: string; next: string }) {
  const t = useTranslations("onboarding");
  const advance = useAdvance(next);
  const [list, setList] = useState<string[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let live = true;
    wizardSuggestCompetitors()
      .then((result) => {
        if (!live) return;
        if ("error" in result) {
          setLoadFailed(true);
          setList([]);
        } else {
          setAvailable(result.available);
          setList(result.domains);
        }
      })
      .catch(() => {
        if (!live) return;
        setLoadFailed(true);
        setList([]);
      });
    return () => {
      live = false;
    };
  }, []);

  const add = () => {
    if (!list) return;
    const domain = domainOf(draft);
    if (!domain) return setError(t("competitors.invalid"));
    if (list.includes(domain)) return setError(t("competitors.already"));
    if (list.length >= MAX) return setError(t("competitors.max", { max: MAX }));
    setError(null);
    setList([...list, domain]);
    setDraft("");
  };
  const save = (domains: string[] | null) =>
    startSaving(async () => {
      const result = await wizardSaveCompetitors(domains);
      if ("error" in result) return setError(result.error === "max" ? t("competitors.max", { max: MAX }) : t("competitors.invalid"));
      await advance();
    });

  const found = Boolean(list?.length) && available && !loadFailed;
  return (
    <WizardFrame
      brand={brand}
      step={t("stepOf", { step: 4, total: 5 })}
      badge={<span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-secondary ring-1 ring-line">{t("optional")}</span>}
      title={list === null ? t("competitors.searching") : found ? t("competitors.found") : t("competitors.title")}
      description={list === null ? t("competitors.searchingHint") : found ? t("competitors.foundHint") : available ? t("competitors.description") : t("competitors.manualHint")}
      preview={
        <div className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-ink">{t("competitors.whyTitle")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
            <li>{t("competitors.why1")}</li>
            <li>{t("competitors.why2")}</li>
          </ul>
          <p className="mt-4 text-xs text-ink-subtle">{t("competitors.later")}</p>
        </div>
      }
    >
      {list === null ? (
        <Loading title={t("competitors.searching")} hint={t("competitors.loadingHint")} />
      ) : (
        <>
          {loadFailed && <p className="mb-3 text-sm text-ink-secondary">{t("competitors.loadFailed")}</p>}
          {list.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {list.map((domain) => (
                <li key={domain} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink">
                  <Globe className="size-4 text-ink-subtle" />
                  <span className="flex-1">{domain}</span>
                  <button type="button" aria-label={t("remove", { name: domain })} onClick={() => setList(list.filter((entry) => entry !== domain))} className="grid size-6 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={t("competitors.placeholder")}
              aria-label={t("competitors.placeholder")}
              className="h-10 min-w-0 flex-1 rounded-control border border-control bg-white px-3 text-sm text-ink outline-none focus:border-ink/40"
            />
            <Button type="button" variant="outline" onClick={add}>
              <Plus /> {t("add")}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-[#B42318]">{error}</p>}
          <StepActions>
            <Button size="lg" onClick={() => save(list)} disabled={saving || list.length === 0}>
              {found ? t("competitors.useThese") : t("continue")}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => save(null)} disabled={saving}>
              {t("skip")}
            </Button>
            <Link href={back} className="text-sm font-medium text-ink-secondary hover:text-ink">
              {t("back")}
            </Link>
          </StepActions>
        </>
      )}
    </WizardFrame>
  );
}
