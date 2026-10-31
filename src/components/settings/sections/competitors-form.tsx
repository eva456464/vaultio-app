"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { displayDomain } from "@/lib/utils";
import { addCompetitor, removeCompetitor } from "@/server/actions/settings";
import { inputClass, SettingsCard } from "../form-kit";

export function CompetitorsForm({ canEdit, competitors }: { canEdit: boolean; competitors: { id: number; url: string }[] }) {
  const t = useTranslations("settings.competitors");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <SettingsCard title={t("subtitle")} hint={t("hint")}>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {competitors.map((competitor) => (
          <li key={competitor.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <a href={competitor.url} target="_blank" rel="noreferrer" className="text-ink hover:underline">{displayDomain(competitor.url)}</a>
            {canEdit && (
              <button type="button" aria-label={`Remove ${competitor.url}`} disabled={pending} onClick={() => startTransition(() => removeCompetitor(competitor.id))} className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-canvas hover:text-ink">
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
        {competitors.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-secondary">{t("empty")}</li>}
      </ul>
      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await addCompetitor(draft);
              if ("error" in result) setError(result.error);
              else {
                setError(null);
                setDraft("");
              }
            });
          }}
        >
          <input aria-label={t("placeholder")} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("placeholder")} className={`${inputClass} mt-0 flex-1`} />
          <Button type="submit" variant="outline" className="h-11 rounded-control" disabled={pending || !draft.trim()}>
            <Plus />
            {t("add")}
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
    </SettingsCard>
  );
}
