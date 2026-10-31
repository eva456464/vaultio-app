"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const inputClass =
  "h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

export function AuthForm({ mode, brandName, googleEnabled }: { mode: Mode; brandName: string; googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setPending(true);
    setError(null);
    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get("name")) });
    setPending(false);
    if (result.error) {
      setError(mode === "sign-in" ? t("invalidCredentials") : (result.error.message ?? t("genericError")));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-page-title font-semibold tracking-[-0.025em] text-ink">
        {mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}
      </h1>
      <p className="mt-1 text-sm text-ink-secondary">
        {mode === "sign-in" ? t("signInSubtitle", { brand: brandName }) : t("signUpSubtitle", { brand: brandName })}
      </p>

      {googleEnabled && (
        <>
          <Button
            variant="outline"
            size="lg"
            className="mt-6 w-full"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
          >
            {t("continueWithGoogle")}
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-subtle">
            <span className="h-px flex-1 bg-line" />
            {t("or")}
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={googleEnabled ? "space-y-3" : "mt-6 space-y-3"}>
        {mode === "sign-up" && (
          <input name="name" required autoComplete="name" placeholder={t("name")} className={inputClass} />
        )}
        <input name="email" type="email" required autoComplete="email" placeholder={t("email")} className={inputClass} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          placeholder={t("password")}
          className={inputClass}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {mode === "sign-in" ? t("signIn") : t("signUp")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-secondary">
        {mode === "sign-in" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"} className="font-medium text-ink hover:underline">
          {mode === "sign-in" ? t("signUpLink") : t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
