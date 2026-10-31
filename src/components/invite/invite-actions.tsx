"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { acceptInvite } from "@/server/actions/team";

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-6">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInvite(token);
            if ("error" in result) setError(result.error);
            else {
              router.replace("/");
              router.refresh();
            }
          })
        }
      >
        {pending ? t("accepting") : t("accept")}
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function SignOutButton() {
  const t = useTranslations("invite");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="lg"
      className="mt-6 w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.refresh();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
