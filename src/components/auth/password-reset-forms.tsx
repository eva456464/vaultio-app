"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

export function ForgotPasswordForm({ emailEnabled }: { emailEnabled: boolean }) {
  const t = useTranslations("auth");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setPending(true);
    const result = await authClient.requestPasswordReset({ email });
    setPending(false);
    if (result.error) setError(t("genericError"));
    else setSentTo(email);
  }

  return (
    <div>
      <h1 className="text-page-title font-semibold tracking-[-0.025em] text-ink">{t("forgotTitle")}</h1>
      <p className="mt-1 text-sm text-ink-secondary">{t("forgotSubtitle")}</p>
      {!emailEnabled ? (
        <p className="mt-6 rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("emailUnavailable")}</p>
      ) : sentTo ? (
        <p role="status" className="mt-6 rounded-xl bg-success-bg p-3 text-sm text-success">{t("linkSent", { email: sentTo })}</p>
      ) : (
        <form method="post" onSubmit={onSubmit} className="mt-6 space-y-3">
          <input name="email" type="email" required autoComplete="email" placeholder={t("email")} aria-label={t("email")} className={inputClass} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {t("sendLink")}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/sign-in" className="font-medium text-ink hover:underline">{t("backToSignIn")}</Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations("auth");
  const [state, setState] = useState<"idle" | "done" | "invalid">(token ? "idle" : "invalid");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password"));
    setPending(true);
    const result = await authClient.resetPassword({ newPassword, token: token! });
    setPending(false);
    setState(result.error ? "invalid" : "done");
  }

  return (
    <div>
      <h1 className="text-page-title font-semibold tracking-[-0.025em] text-ink">{t("resetTitle")}</h1>
      {state === "idle" && <p className="mt-1 text-sm text-ink-secondary">{t("resetSubtitle")}</p>}
      {state === "done" && <p role="status" className="mt-6 rounded-xl bg-success-bg p-3 text-sm text-success">{t("resetDone")}</p>}
      {state === "invalid" && <p role="alert" className="mt-6 rounded-xl bg-[#FDECEA] p-3 text-sm text-[#9A3412]">{t("resetInvalid")}</p>}
      {state === "idle" && (
        <form method="post" onSubmit={onSubmit} className="mt-6 space-y-3">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t("newPassword")} aria-label={t("newPassword")} className={inputClass} />
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {t("savePassword")}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href={state === "invalid" ? "/forgot-password" : "/sign-in"} className="font-medium text-ink hover:underline">
          {state === "invalid" ? t("forgotTitle") : t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
