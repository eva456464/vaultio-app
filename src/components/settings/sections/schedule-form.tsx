"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { updateSchedule } from "@/server/actions/settings";
import { SettingsCard, useSave } from "../form-kit";

export function ScheduleForm({ canEdit, weekdays }: { canEdit: boolean; weekdays: number[] }) {
  const t = useTranslations("settings.schedule");
  const names = t.raw("days") as string[];
  const [selected, setSelected] = useState(new Set(weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6]));
  const { button } = useSave(() => updateSchedule([...selected]));
  const label = selected.size === 7 ? t("everyDay") : [...selected].sort().map((day) => names[day]).join(", ");
  return (
    <SettingsCard title={t("subtitle")} hint={t("hint")} footer={canEdit ? button(selected.size === 0) : undefined}>
      <div className="flex flex-wrap gap-2">
        {names.map((name, day) => {
          const on = selected.has(day);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              disabled={!canEdit}
              onClick={() => {
                const next = new Set(selected);
                if (on) next.delete(day);
                else next.add(day);
                setSelected(next);
              }}
              className={cn("rounded-full border px-4 py-2 text-sm font-medium", on ? "border-ink bg-ink text-white" : "border-control bg-white text-ink-secondary hover:text-ink")}
            >
              {name}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-ink-secondary">{t("selected", { days: label || "—" })}</p>
    </SettingsCard>
  );
}
