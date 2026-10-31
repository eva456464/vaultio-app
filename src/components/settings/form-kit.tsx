"use client";

import { Check, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const inputClass =
  "mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40 disabled:bg-canvas";

export function SettingsCard({ title, hint, children, footer }: { title: ReactNode; hint?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="p-5 md:p-6">
        <h2 className="font-sans text-[16px] font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-secondary">{hint}</p>}
        <div className="mt-5 space-y-4">{children}</div>
      </div>
      {footer && <div className="flex items-center justify-end gap-3 border-t border-line bg-canvas/60 px-5 py-3 md:px-6">{footer}</div>}
    </section>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

export function Toggle({ id, label, checked, onChange, disabled, extra }: { id: string; label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm text-ink">
      <label htmlFor={id} className="flex-1 cursor-pointer">{label}</label>
      {extra}
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[22px] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

/** Editable list of short strings (audience segments, rules...). */
export function ListInput({ id, items, onChange, placeholder, disabled }: { id: string; items: string[]; onChange: (items: string[]) => void; placeholder: string; disabled?: boolean }) {
  const t = useTranslations("settings.business");
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setDraft("");
  };
  return (
    <div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-1.5 rounded-full border border-line bg-canvas py-1 pl-3 pr-1.5 text-sm text-ink">
            {item}
            {!disabled && (
              <button type="button" aria-label={`${t("remove")} ${item}`} onClick={() => onChange(items.filter((other) => other !== item))} className="grid size-5 place-items-center rounded-full text-ink-subtle hover:bg-white hover:text-ink">
                <X className="size-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!disabled && (
        <div className="mt-2 flex gap-2">
          <input
            id={id}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className={cn(inputClass, "mt-0 flex-1")}
          />
          <Button type="button" variant="outline" className="h-11 rounded-control" onClick={add}>
            <Plus />
            {t("add")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Save button that calls a server action and shows the result inline. */
export function useSave(action: () => Promise<{ ok: true } | { error: string }>) {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const button = (disabled?: boolean) => (
    <>
      {state && <span className={cn("text-sm", state.ok ? "text-success" : "text-[#9A3412]")}>{state.ok ? <Check className="mr-1 inline size-4" /> : null}{state.message}</span>}
      <Button
        type="button"
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            setState("error" in result ? { ok: false, message: result.error } : { ok: true, message: t("saved") });
          })
        }
      >
        {pending ? t("saving") : t("save")}
      </Button>
    </>
  );
  return { button, pending };
}
