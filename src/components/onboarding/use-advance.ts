"use client";

import { useRouter } from "@/i18n/navigation";
import { finishOnboarding } from "@/server/actions/onboarding";

/** Moves to the next wizard step, or ends the wizard ("finish") and opens the dashboard. */
export function useAdvance(next: string) {
  const router = useRouter();
  return async () => {
    if (next === "finish") await finishOnboarding();
    else router.push(next);
  };
}
