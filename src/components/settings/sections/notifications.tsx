"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setWeeklyEmail } from "@/server/actions/account";
import { SettingsCard, Toggle } from "../form-kit";

/** Settings → Account → Notifications: the weekly progress email, per website. */
export function NotificationsCard({ sites }: { sites: { id: number; name: string; weekly: boolean; emailReady: boolean }[] }) {
  const t = useTranslations("settings.account.notifications");
  const [values, setValues] = useState(() => Object.fromEntries(sites.map((site) => [site.id, site.weekly])));
  const [, startTransition] = useTransition();
  if (!sites.length) return null;
  return (
    <SettingsCard title={t("title")} hint={t("hint")}>
      {!sites[0]!.emailReady && <p className="rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("noEmail")}</p>}
      {sites.map((site) => (
        <Toggle
          key={site.id}
          id={`weekly-${site.id}`}
          label={t("weekly", { site: site.name })}
          checked={values[site.id] ?? true}
          onChange={(value) => {
            setValues((current) => ({ ...current, [site.id]: value }));
            startTransition(() => void setWeeklyEmail(site.id, value));
          }}
        />
      ))}
    </SettingsCard>
  );
}
