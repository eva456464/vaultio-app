"use client";

import { CircleAlert, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { restartOnboarding, wizardDescribeBusiness, wizardSaveBusiness } from "@/server/actions/onboarding";
import { BusinessPreview } from "./previews";
import { useAdvance } from "./use-advance";
import { Loading, StepActions, WizardFrame } from "./wizard-frame";

type Draft = { brandName: string; description: string; targetAudience: string[] };

/** Step 3: what the business does and for whom, written from the website and edited by the owner. */
export function BusinessStep({ brand, url, back, next }: { brand: { name: string; logoUrl: string | null }; url: string; back: string; next: string }) {
  const t = useTranslations("onboarding");
  const advance = useAdvance(next);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [problem, setProblem] = useState<"unreachable" | "failed" | null>(null);
  const [audience, setAudience] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [restarting, startRestart] = useTransition();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    wizardDescribeBusiness()
      .then((result) => {
        if (!live) return;
        if ("error" in result) setProblem(result.error);
        else setDraft({ brandName: result.brandName ?? "", description: result.description, targetAudience: result.targetAudience });
      })
      .catch(() => live && setProblem("failed"));
    return () => {
      live = false;
    };
  }, [attempt]);

  if (problem === "unreachable") {
    return (
      <WizardFrame brand={brand} title={t("business.unreachableTitle", { url })} description={t("business.unreachableHint")}>
        <div className="flex items-start gap-3 rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#912018]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {t("business.unreachableDetail")}
        </div>
        <StepActions>
          <Button size="lg" disabled={restarting} onClick={() => startRestart(async () => void (await restartOnboarding()))}>
            {t("business.restart")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setProblem(null);
              setAttempt((value) => value + 1);
            }}
          >
            {t("retry")}
          </Button>
        </StepActions>
      </WizardFrame>
    );
  }

  const addAudience = () => {
    const value = audience.trim();
    if (!value || !draft) return;
    if (draft.targetAudience.some((entry) => entry.toLowerCase() === value.toLowerCase())) return setError(t("business.exists"));
    setError(null);
    setDraft({ ...draft, targetAudience: [...draft.targetAudience, value] });
    setAudience("");
  };
  const save = () =>
    startSaving(async () => {
      if (!draft) return;
      setError(null);
      const result = await wizardSaveBusiness(draft);
      if ("error" in result) return setError(result.error === "audiences" ? t("business.needAudiences") : result.error === "description" ? t("business.needDescription") : t("failed"));
      await advance();
    });

  return (
    <WizardFrame
      brand={brand}
      step={t("stepOf", { step: 3, total: 5 })}
      title={t("business.title")}
      description={t("business.description")}
      preview={<BusinessPreview description={draft?.description ?? ""} audiences={draft?.targetAudience ?? []} />}
    >
      {problem === "failed" && !draft ? (
        <>
          <p className="text-sm text-ink-secondary">{t("business.failed")}</p>
          <StepActions>
            <Button size="lg" variant="outline" onClick={() => { setProblem(null); setAttempt((value) => value + 1); }}>
              {t("retry")}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => { setProblem(null); setDraft({ brandName: "", description: "", targetAudience: [] }); }}>
              {t("business.writeMyself")}
            </Button>
          </StepActions>
        </>
      ) : !draft ? (
        <Loading title={t("business.generating")} hint={t("business.generatingHint")} />
      ) : (
        <>
          <label className="block text-sm font-medium text-ink">
            {t("business.name")}
            <input value={draft.brandName} onChange={(event) => setDraft({ ...draft, brandName: event.target.value })} className="mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none focus:border-ink/40" />
          </label>
          <label className="mt-5 block text-sm font-medium text-ink">
            {t("business.what")}
            <textarea
              value={draft.description}
              rows={5}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder={t("business.whatPlaceholder")}
              className="mt-1.5 w-full rounded-control border border-control bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-ink/40"
            />
          </label>
          <div className="mt-5">
            <p className="text-sm font-medium text-ink">{t("business.audiences")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {draft.targetAudience.map((entry) => (
                <li key={entry} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-3 pr-1.5 text-sm text-ink">
                  {entry}
                  <button type="button" aria-label={t("remove", { name: entry })} onClick={() => setDraft({ ...draft, targetAudience: draft.targetAudience.filter((other) => other !== entry) })} className="grid size-5 place-items-center rounded-full text-ink-subtle hover:bg-canvas hover:text-ink">
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAudience();
                  }
                }}
                placeholder={t("business.audiencePlaceholder")}
                aria-label={t("business.audiencePlaceholder")}
                className="h-10 min-w-0 flex-1 rounded-control border border-control bg-white px-3 text-sm text-ink outline-none focus:border-ink/40"
              />
              <Button type="button" variant="outline" onClick={addAudience}>
                <Plus /> {t("add")}
              </Button>
            </div>
            <p className={draft.targetAudience.length >= 2 ? "mt-2 text-xs text-success" : "mt-2 text-xs text-ink-subtle"}>
              {draft.targetAudience.length >= 2 ? t("business.enough") : t("business.needAudiences")}
            </p>
          </div>
          {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
          <StepActions>
            <Button size="lg" onClick={save} disabled={saving || draft.targetAudience.length < 2 || draft.description.trim().length < 20}>
              {saving ? t("saving") : t("continue")}
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
