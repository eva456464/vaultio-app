"use client";

import { LogOut, Trash2 } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { requestAccountDeletion, setAccountPassword, setDashboardLanguage } from "@/server/actions/account";
import { updateProfileName } from "@/server/actions/settings";
import { Field, inputClass, SettingsCard, useSave } from "../form-kit";

function LanguageCard() {
  const t = useTranslations("settings.account");
  const tLanguages = useTranslations("languages");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <SettingsCard title={t("language")} hint={t("languageHint")}>
      <select
        aria-label={t("language")}
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            await setDashboardLanguage(next);
            router.replace(pathname, { locale: next });
          });
        }}
        className={inputClass + " mt-0 max-w-xs"}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {tLanguages(code)}
          </option>
        ))}
      </select>
    </SettingsCard>
  );
}

function DangerZone() {
  const t = useTranslations("settings.account");
  const format = useFormatter();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="card overflow-hidden border-[#F3B4A9]">
      <div className="p-5 md:p-6">
        <h2 className="font-sans text-[16px] font-semibold text-[#C4320A]">{t("danger")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{t("dangerHint")}</p>
        <Button
          variant="outline"
          className="mt-4 border-[#F3B4A9] text-[#C4320A] hover:bg-[#FDECEA]"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(t("deleteConfirm"))) return;
            startTransition(async () => {
              const result = await requestAccountDeletion();
              if ("error" in result) {
                setError(result.error);
                return;
              }
              window.alert(t("deleteScheduled", { date: format.dateTime(new Date(result.deleteOn), { dateStyle: "long" }) }));
              await authClient.signOut();
              router.replace("/sign-in");
              router.refresh();
            });
          }}
        >
          <Trash2 />
          {t("delete")}
        </Button>
        {error && <p className="mt-2 text-sm text-[#9A3412]">{error}</p>}
      </div>
    </section>
  );
}

export function AccountForm({ name: initialName, email, hasPassword = true }: { name: string; email: string; hasPassword?: boolean }) {
  const t = useTranslations("settings.account");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const { button } = useSave(() => updateProfileName(name));
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordState, setPasswordState] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <SettingsCard title={t("personal")} footer={button()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")} htmlFor="name">
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("email")} htmlFor="email">
            <input id="email" value={email} disabled className={inputClass} />
          </Field>
        </div>
      </SettingsCard>
      <SettingsCard title={hasPassword ? t("password") : t("setPassword")} hint={hasPassword ? undefined : t("setPasswordHint")}>
        <form
          className={hasPassword ? "grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" : "grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"}
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              if (!hasPassword) {
                const result = await setAccountPassword(next);
                setPasswordState("error" in result ? { ok: false, text: result.error } : { ok: true, text: t("passwordSet") });
                if (!("error" in result)) {
                  setNext("");
                  router.refresh();
                }
                return;
              }
              const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
              setPasswordState(result.error ? { ok: false, text: t("passwordError") } : { ok: true, text: t("passwordChanged") });
              if (!result.error) {
                setCurrent("");
                setNext("");
              }
            });
          }}
        >
          {hasPassword && (
            <Field label={t("currentPassword")} htmlFor="current-password">
              <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} required />
            </Field>
          )}
          <Field label={t("newPassword")} htmlFor="new-password">
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} required />
          </Field>
          <Button type="submit" className="h-11" disabled={pending}>{hasPassword ? t("changePassword") : t("setPassword")}</Button>
        </form>
        {passwordState && <p className={passwordState.ok ? "text-sm text-success" : "text-sm text-[#9A3412]"}>{passwordState.text}</p>}
      </SettingsCard>
      <SettingsCard title={t("session")}>
        <Button
          variant="outline"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/sign-in");
            router.refresh();
          }}
        >
          <LogOut />
          {t("logout")}
        </Button>
      </SettingsCard>
      <LanguageCard />
      <DangerZone />
    </div>
  );
}
