"use client";

import { Check, Copy, ExternalLink, Info, ListChecks, Search, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { MAX_AUDIT_PAGES } from "@/lib/site-health";
import { saveAuditPages } from "@/server/actions/site-health";

type Page = { url: string; title: string | null };

export function SiteHealthActions({ pages, selected, shareUrl }: { pages: Page[]; selected: string[]; shareUrl: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChoosePagesDialog pages={pages} selected={selected} />
      <WhatWeCheckDialog />
      {shareUrl && <ShareDialog url={shareUrl} />}
    </div>
  );
}

function ChoosePagesDialog({ pages, selected }: { pages: Page[]; selected: string[] }) {
  const t = useTranslations("siteHealth");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(new Set(selected));
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = pages.filter((page) => `${page.url} ${page.title ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ListChecks />
        {t("choosePages")}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{t("choose.title")}</DialogTitle>
        <DialogDescription>{t("choose.subtitle", { max: MAX_AUDIT_PAGES })}</DialogDescription>
        <div className="mt-5 flex items-center gap-3">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-control border border-control px-3">
            <Search className="size-4 text-ink-subtle" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("choose.search")} className="flex-1 bg-transparent text-sm outline-none" />
          </label>
          <span className="text-sm text-ink-secondary tabular-nums">{t("choose.selected", { count: chosen.size, max: MAX_AUDIT_PAGES })}</span>
        </div>
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {filtered.map((page) => {
            const checked = chosen.has(page.url);
            const disabled = !checked && chosen.size >= MAX_AUDIT_PAGES;
            return (
              <li key={page.url}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      const next = new Set(chosen);
                      if (checked) next.delete(page.url);
                      else next.add(page.url);
                      setChosen(next);
                    }}
                    className="size-4 accent-[#221F1F]"
                  />
                  <span className="min-w-0">
                    {page.title && <span className="block truncate font-medium text-ink">{page.title}</span>}
                    <span className="block truncate text-ink-secondary">{page.url}</span>
                  </span>
                </label>
              </li>
            );
          })}
          {pages.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-secondary">{t("choose.noPages")}</li>}
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">{tCommon("cancel")}</Button>
          </DialogClose>
          <Button size="lg" disabled={pending} onClick={() => startTransition(async () => {
            await saveAuditPages([...chosen]);
            setOpen(false);
          })}>
            {t("choose.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WhatWeCheckDialog() {
  const t = useTranslations("siteHealth");
  const [open, setOpen] = useState(false);
  const groups = (["crawler", "technical", "ai"] as const).map((key) => ({ key, items: t.raw(`checks.${key}`) as string[] }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Info />
        {t("whatWeCheck")}
      </Button>
      <DialogContent className="max-w-xl">
        <DialogTitle>{t("whatWeCheck")}</DialogTitle>
        <DialogDescription>{t("checks.intro")}</DialogDescription>
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="text-sm font-semibold text-ink">{t(`category.${group.key}`)}</p>
              <ul className="mt-2 grid gap-1.5 text-sm text-ink-secondary sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ url }: { url: string }) {
  const t = useTranslations("siteHealth");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        {t("share")}
      </Button>
      <DialogContent>
        <DialogTitle>{t("shareDialog.title")}</DialogTitle>
        <DialogDescription>{t("shareDialog.body")}</DialogDescription>
        <div className="mt-5 flex gap-2">
          <input readOnly value={url} className="h-11 min-w-0 flex-1 rounded-control border border-control bg-canvas px-3 text-sm text-ink" onFocus={(e) => e.currentTarget.select()} />
          <Button
            className="h-11 rounded-control"
            onClick={async () => {
              await navigator.clipboard.writeText(url).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink />
              {t("shareDialog.preview")}
            </a>
          </Button>
          <DialogClose asChild>
            <Button size="lg">{tCommon("close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
