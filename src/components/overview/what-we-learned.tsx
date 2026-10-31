"use client";

import { ArrowUpRight, ChevronDown, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/ui/site-logo";
import { Link } from "@/i18n/navigation";
import { displayDomain } from "@/lib/utils";
import { confirmBusinessProfile } from "@/server/actions/overview";
import type { getBusinessProfile } from "@/server/queries/overview";

type Profile = Awaited<ReturnType<typeof getBusinessProfile>>;
const CHIP_LIMIT = 3;

function Chips({ items }: { items: string[] }) {
  const t = useTranslations("overview.learned");
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, CHIP_LIMIT);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {shown.map((item) => (
        <span key={item} className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm text-ink">
          {item}
        </span>
      ))}
      {!all && items.length > CHIP_LIMIT && (
        <button type="button" onClick={() => setAll(true)} className="rounded-full px-2 py-1.5 text-sm font-medium text-ink-secondary hover:text-ink">
          {t("more", { count: items.length - CHIP_LIMIT })}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-ink-secondary">{label}</p>
      {children}
    </div>
  );
}

export function WhatWeLearned({ profile, languageName }: { profile: Profile; languageName: string }) {
  const t = useTranslations("overview.learned");
  const [expanded, setExpanded] = useState(false);
  const [confirmed, setConfirmed] = useState(profile.confirmed);
  const [, startTransition] = useTransition();
  const brand = profile.brandName ?? displayDomain(profile.url);
  const subtitle = [profile.industry, profile.businessType].filter(Boolean).join(" · ");
  const offers = profile.offers.map((offer) =>
    offer.amount ? `${offer.name} · ${offer.priceType === "from" ? "from " : ""}${offer.currency ?? ""} ${offer.amount}${offer.period ? ` / ${offer.period}` : ""}` : offer.name,
  );
  const where = profile.countries.length ? profile.countries.map((country) => `${country} · ${languageName}`) : [languageName];

  return (
    <section className="card p-5 md:p-7">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h2 className="mt-2 text-[22px] font-semibold leading-8 tracking-[-0.44px] text-ink">{t("title", { brand })}</h2>
      <p className="mt-1 text-[15px] text-ink-secondary">{t("subtitle")}</p>

      <div className="mt-6 flex items-center gap-3">
        <SiteLogo url={profile.logoUrl} className="size-11" />
        <div>
          <p className="text-[15px] font-medium text-ink">{displayDomain(profile.url)}</p>
          {subtitle && <p className="text-sm text-ink-secondary">{subtitle}</p>}
        </div>
      </div>

      <div className={expanded ? "" : "relative max-h-[190px] overflow-hidden"}>
        {profile.whatYouDo && (
          <div className="mt-6">
            <Field label={t("whatYouDo")}>
              <p className="mt-2 text-[15px] leading-7 text-ink">{profile.whatYouDo}</p>
            </Field>
          </div>
        )}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {offers.length > 0 && <Field label={t("whatYouOffer")}><Chips items={offers} /></Field>}
          {profile.audience.length > 0 && <Field label={t("whoYouServe")}><Chips items={profile.audience} /></Field>}
          <Field label={t("whereYouSell")}><Chips items={where} /></Field>
          {profile.brandColors.length > 0 && (
            <Field label={t("brandColors")}>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.brandColors.map((color) => (
                  <span key={color} className="flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-sm text-ink">
                    <span className="size-3.5 rounded-full border border-black/10" style={{ background: color }} />
                    {color.toUpperCase()}
                  </span>
                ))}
              </div>
            </Field>
          )}
          {profile.competitors.length > 0 && <Field label={t("competitors")}><Chips items={profile.competitors.map(displayDomain)} /></Field>}
        </div>
        {!expanded && <span aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[15px] font-medium text-brand">
          {expanded ? t("showLess") : t("showEverything")}
          <ChevronDown className={expanded ? "size-4 rotate-180" : "size-4"} />
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings/business">
              {t("notQuiteRight")}
              <ArrowUpRight />
            </Link>
          </Button>
          <Button
            disabled={confirmed}
            onClick={() => {
              setConfirmed(true);
              startTransition(() => confirmBusinessProfile());
            }}
          >
            {confirmed && <Check />}
            {t("looksGood")}
          </Button>
        </div>
      </div>
    </section>
  );
}
