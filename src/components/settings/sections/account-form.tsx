"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { updateProfileName } from "@/server/actions/settings";
import { Field, inputClass, SettingsCard, useSave } from "../form-kit";

export function AccountForm({ name: initialName, email }: { name: string; email: string }) {
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
      <SettingsCard title={t("password")}>
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
              setPasswordState(result.error ? { ok: false, text: t("passwordError") } : { ok: true, text: t("passwordChanged") });
              if (!result.error) {
                setCurrent("");
                setNext("");
              }
            });
          }}
        >
          <Field label={t("currentPassword")} htmlFor="current-password">
            <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} required />
          </Field>
          <Field label={t("newPassword")} htmlFor="new-password">
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} required />
          </Field>
          <Button type="submit" className="h-11" disabled={pending}>{t("changePassword")}</Button>
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
    </div>
  );
}
