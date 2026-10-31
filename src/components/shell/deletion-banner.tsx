"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelAccountDeletion } from "@/server/actions/account";

/** Shown while an account deletion is pending, so it can be undone. */
export function DeletionBanner({ date }: { date: string }) {
  const t = useTranslations("settings.account");
  const [pending, startTransition] = useTransition();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3B4A9] bg-[#FDECEA] px-4 py-2.5 text-sm text-[#9A3412] md:px-6">
      {t("pendingDeletion", { date })}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => void (await cancelAccountDeletion()))}>
        {t("cancelDeletion")}
      </Button>
    </div>
  );
}
