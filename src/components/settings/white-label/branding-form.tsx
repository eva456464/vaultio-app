"use client";

import { ImageIcon, Info, LoaderCircle, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { saveBranding } from "@/server/actions/white-label";
import type { WhiteLabelData } from "@/server/queries/white-label";
import { inputClass, useSave } from "../form-kit";

function Label({ text, hint, htmlFor }: { text: string; hint: string; htmlFor?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
      <label htmlFor={htmlFor}>{text}</label>
      <Tooltip content={hint}>
        <button type="button" aria-label={hint} className="text-ink-subtle hover:text-ink-secondary">
          <Info className="size-3.5" />
        </button>
      </Tooltip>
    </span>
  );
}

function ImageField({ kind, value, onChange, disabled }: { kind: "logo" | "favicon"; value: string | null; onChange: (path: string | null) => void; disabled: boolean }) {
  const t = useTranslations("settings.whiteLabel");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Label text={t(kind)} hint={t(`${kind}Hint`)} />
      <div className="mt-2 flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className={cn("object-contain", kind === "favicon" ? "size-8" : "size-12")} />
          ) : (
            <ImageIcon className="size-5 text-ink-subtle" aria-hidden />
          )}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          aria-label={kind === "logo" ? t("uploadLogo") : t("uploadFavicon")}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            const form = new FormData();
            form.append("kind", kind);
            form.append("file", file);
            const response = await fetch("/api/whitelabel/assets", { method: "POST", body: form });
            const body = (await response.json().catch(() => ({}))) as { path?: string; error?: string };
            setBusy(false);
            if (body.path) onChange(body.path);
            else setError(body.error ?? "Upload failed");
          }}
        />
        <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => input.current?.click()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
          {busy ? t("uploading") : kind === "logo" ? t("uploadLogo") : t("uploadFavicon")}
        </Button>
        {value && !disabled && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X />
            {t("remove")}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-[#9A3412]">{error}</p>}
    </div>
  );
}

function ColorField({ id, label, hint, value, onChange, disabled }: { id: string; label: string; hint: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [text, setText] = useState(value.replace("#", ""));
  const valid = /^[0-9a-f]{6}$/i.test(text);
  return (
    <div>
      <Label text={label} hint={hint} htmlFor={id} />
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={valid ? `#${text}` : value}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value.replace("#", "").toUpperCase());
            onChange(event.target.value.toUpperCase());
          }}
          className="size-11 cursor-pointer rounded-control border border-control bg-white p-1 disabled:cursor-not-allowed"
        />
        <span className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">#</span>
          <input
            id={id}
            value={text}
            maxLength={6}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value.replace(/[^0-9a-f]/gi, "").toUpperCase();
              setText(next);
              if (/^[0-9A-F]{6}$/.test(next)) onChange(`#${next}`);
            }}
            aria-invalid={!valid}
            className={cn(inputClass, "mt-0 w-32 pl-7 font-mono uppercase", !valid && "border-[#9A3412]")}
          />
        </span>
      </div>
    </div>
  );
}

export function BrandingForm({ data }: { data: WhiteLabelData }) {
  const t = useTranslations("settings.whiteLabel");
  const [form, setForm] = useState(data.brand);
  const { button } = useSave(() => saveBranding(form));
  const disabled = !data.canEdit;
  return (
    <section className="card overflow-hidden">
      <div className="space-y-6 p-5 md:p-6">
        <div>
          <Label text={t("agencyName")} hint={t("agencyNameHint")} htmlFor="agency-name" />
          <input id="agency-name" value={form.brandName} maxLength={60} disabled={disabled} onChange={(event) => setForm({ ...form, brandName: event.target.value })} className={inputClass} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ImageField kind="logo" value={form.logoUrl} disabled={disabled} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />
          <ImageField kind="favicon" value={form.faviconUrl} disabled={disabled} onChange={(faviconUrl) => setForm({ ...form, faviconUrl })} />
        </div>
        <div className="flex flex-wrap gap-8">
          <ColorField id="primary-color" label={t("primary")} hint={t("primaryHint")} value={form.primaryColor} disabled={disabled} onChange={(primaryColor) => setForm({ ...form, primaryColor })} />
          <ColorField id="accent-color" label={t("accent")} hint={t("accentHint")} value={form.secondaryColor} disabled={disabled} onChange={(secondaryColor) => setForm({ ...form, secondaryColor })} />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{t("preview")}</p>
          <p className="text-xs text-ink-subtle">{t("previewNote")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-canvas p-4">
            <span className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-sm">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="" className="size-8 rounded-lg object-contain" />
              ) : (
                <span className="grid size-8 place-items-center rounded-lg bg-ink text-sm font-bold text-white">{form.brandName.slice(0, 1).toUpperCase() || "?"}</span>
              )}
              <span className="font-heading font-semibold text-ink">{form.brandName || "—"}</span>
            </span>
            <span className="rounded-full px-4 py-2 text-sm font-medium text-white" style={{ background: form.primaryColor }}>
              {t("previewButton")}
            </span>
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: form.secondaryColor, background: `${form.secondaryColor}14` }}>
              {t("previewBadge")}
            </span>
          </div>
        </div>
      </div>
      {data.canEdit && <div className="flex items-center justify-end gap-3 border-t border-line bg-canvas/60 px-5 py-3 md:px-6">{button(!form.brandName.trim())}</div>}
    </section>
  );
}
