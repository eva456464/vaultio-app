"use client";

import { Check, List, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { updateImprovements } from "@/server/actions/settings";
import { SettingsCard, Toggle, useSave } from "../form-kit";

const MAX_DAYS = 2;

export function ImprovementsForm({ canEdit, gscConnected, initial }: { canEdit: boolean; gscConnected: boolean; initial: { enabled: boolean; weekdays: number[]; autoPublish: boolean } }) {
  const t = useTranslations("settings.improvements");
  const names = useTranslations("settings.schedule").raw("days") as string[];
  const [form, setForm] = useState(initial);
  const { button } = useSave(() => updateImprovements(form));
  const full = form.weekdays.length >= MAX_DAYS;

  return (
    <div className="space-y-6">
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[15px] text-ink-secondary">{t("subtitle")}</p>
        <Link href="/dashboard/content-plan/improvements" className="inline-flex items-center gap-1.5 rounded-full border border-control bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
          <List className="size-4" />
          {t("view")}
        </Link>
      </div>
      {!gscConnected && (
        <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">
          {t("needsGsc")}{" "}
          <Link href="/dashboard/settings/analytics" className="font-medium underline">
            {t("connect")}
          </Link>
        </p>
      )}
      <SettingsCard title={t("enable")} hint={t("enableHint")} footer={canEdit ? button() : undefined}>
        <Toggle id="improvements-enabled" label={t("enable")} checked={form.enabled} onChange={(enabled) => setForm({ ...form, enabled })} disabled={!canEdit} />
        <div className={cn(!form.enabled && "pointer-events-none opacity-50")}>
          <p className="text-sm font-medium text-ink">{t("days")}</p>
          <p className="text-xs text-ink-subtle">{t("daysHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {names.map((name, day) => {
              const on = form.weekdays.includes(day);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  disabled={!canEdit || (!on && full)}
                  onClick={() => setForm({ ...form, weekdays: on ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day] })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
                    on ? "border-ink bg-ink text-white" : "border-control bg-white text-ink-secondary hover:text-ink",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  {name}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <Toggle id="improvements-auto" label={t("autoPublish")} checked={form.autoPublish} onChange={(autoPublish) => setForm({ ...form, autoPublish })} disabled={!canEdit} />
            <p className="text-xs text-ink-subtle">{t("autoPublishHint")}</p>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
