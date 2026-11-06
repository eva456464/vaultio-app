"use client";

import { Bell, Lightbulb } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { requestFeature } from "@/server/actions/feedback";

const CATEGORIES = ["blogs", "backlinks", "analytics", "geo_audit", "integrations", "other"] as const;

/** "Request a feature": a category and a short description, sent to the platform owner. */
function FeatureRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("productUpdates.featureRequest");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "category" | "description" | "failed">("idle");
  const [pending, startTransition] = useTransition();
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setCategory("");
      setDescription("");
      setState("idle");
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-xl">{t("title")}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("subtitle")}</DialogDescription>
        {state === "sent" ? (
          <>
            <p className="mt-5 rounded-xl bg-success-bg p-3 text-sm text-success">{t("success")}</p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => close(false)}>{t("close")}</Button>
            </div>
          </>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!category) return setState("category");
              if (description.trim().length < 10) return setState("description");
              startTransition(async () => {
                const result = await requestFeature({ category, description });
                setState("error" in result ? result.error : "sent");
              });
            }}
          >
            <label className="block text-sm font-medium text-ink">
              {t("categoryLabel")}
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3 text-sm">
                <option value="">{t("choose")}</option>
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`categories.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink">
              {t("descriptionLabel")}
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={2000} placeholder={t("descriptionPlaceholder")} className="mt-1.5 w-full rounded-control border border-control bg-white p-3 text-sm" />
            </label>
            {state !== "idle" && <p className="text-sm text-[#9A3412]">{t(`errors.${state}`)}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {t("submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type ProductUpdate = { id: number; title: string; body: string; launchedAt: string; linkUrl: string | null };

export function ProductUpdatesBell({ updates }: { updates: ProductUpdate[] }) {
  const t = useTranslations("productUpdates");
  const tHeader = useTranslations("header");
  const format = useFormatter();
  const [requesting, setRequesting] = useState(false);

  return (
    <>
    <FeatureRequestDialog open={requesting} onOpenChange={setRequesting} />
    <Popover>
      <PopoverTrigger
        aria-label={tHeader("productUpdates")}
        className="grid size-9 place-items-center rounded-full bg-[#F3F4F6] text-ink outline-none transition-colors hover:bg-[#E9EAEC]"
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="border-b border-line px-5 py-4">
          <p className="font-heading text-lg font-semibold text-ink">{t("title")}</p>
        </div>
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
          {updates.map((update) => (
            <li key={update.id} className="px-5 py-4">
              <p className="text-xs text-ink-secondary">
                <span className="mr-2 rounded-full bg-success-bg px-2 py-0.5 font-medium text-success">{t("launched")}</span>
                {format.dateTime(new Date(update.launchedAt), { dateStyle: "medium" })}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">{update.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{update.body}</p>
            </li>
          ))}
          {updates.length === 0 && <li className="px-5 py-6 text-sm text-ink-secondary">{t("empty")}</li>}
        </ul>
        <div className="border-t border-line px-5 py-4">
          <p className="text-sm font-semibold text-ink">{t("ideaTitle")}</p>
          <p className="text-sm text-ink-secondary">{t("ideaBody")}</p>
          <button type="button" onClick={() => setRequesting(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline">
            <Lightbulb className="size-4" /> {t("requestFeature")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
    </>
  );
}
