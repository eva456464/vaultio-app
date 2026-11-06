"use client";

import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { countryFlag } from "@/lib/languages";
import { searchTargetRegions, updateTargetLocation } from "@/server/actions/settings";
import { inputClass, SettingsCard, useSave } from "../form-kit";

type Region = { locationCode: number; name: string } | null;

/** Settings → Business → Target location: a country (or Global), optionally one region or city in it. */
export function TargetLocationCard({ canEdit, initial, countries }: { canEdit: boolean; initial: { country: string; region: Region }; countries: { code: string; name: string }[] }) {
  const t = useTranslations("settings.business.targetLocation");
  const [country, setCountry] = useState(initial.country);
  const [region, setRegion] = useState<Region>(initial.region);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ locationCode: number; name: string; type: string }[]>([]);
  const [available, setAvailable] = useState(true);
  const [searching, startSearch] = useTransition();
  const { button } = useSave(() => updateTargetLocation({ country, region }));

  const search = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2 || country === "global") return setResults([]);
    startSearch(async () => {
      const found = await searchTargetRegions(country, value);
      setAvailable(found.available);
      setResults(found.results);
    });
  };

  return (
    <SettingsCard title={t("title")} hint={t("description")} footer={canEdit ? button() : undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          {t("country")}
          <select
            value={country}
            disabled={!canEdit}
            onChange={(event) => {
              setCountry(event.target.value);
              setRegion(null);
              setResults([]);
              setQuery("");
            }}
            className={inputClass}
          >
            <option value="global">🌐 {t("global")}</option>
            {countries.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {countryFlag(entry.code)} {entry.name}
              </option>
            ))}
          </select>
        </label>
        {country !== "global" && (
          <div className="relative">
            <label className="block text-sm font-medium text-ink" htmlFor="region-search">
              {t("region")} <span className="font-normal text-ink-subtle">({t("optional")})</span>
            </label>
            {region ? (
              <div className="mt-1.5 flex h-11 items-center gap-2 rounded-control border border-control bg-white px-3.5 text-sm text-ink">
                <MapPin className="size-4 text-ink-subtle" />
                <span className="flex-1 truncate">{region.name}</span>
                {canEdit && (
                  <button type="button" aria-label={t("clearRegion")} onClick={() => setRegion(null)} className="text-ink-subtle hover:text-ink">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <input id="region-search" value={query} disabled={!canEdit} onChange={(event) => search(event.target.value)} placeholder={t("regionPlaceholder")} className={inputClass} autoComplete="off" />
                {query.trim().length >= 2 && (
                  <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-lg">
                    {!available ? (
                      <li className="px-3 py-2 text-sm text-ink-secondary">{t("needsData")}</li>
                    ) : searching && !results.length ? (
                      <li className="px-3 py-2 text-sm text-ink-secondary">{t("searching")}</li>
                    ) : results.length ? (
                      results.map((result) => (
                        <li key={result.locationCode}>
                          <button
                            type="button"
                            onClick={() => {
                              setRegion({ locationCode: result.locationCode, name: result.name });
                              setResults([]);
                              setQuery("");
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
                          >
                            <span className="truncate">{result.name}</span>
                            <span className="shrink-0 text-xs text-ink-subtle">{result.type}</span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-sm text-ink-secondary">{t("noResults")}</li>
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-ink-subtle">{t("effect")}</p>
    </SettingsCard>
  );
}
