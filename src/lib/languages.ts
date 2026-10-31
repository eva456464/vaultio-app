/**
 * Languages articles can be written in (a website can have several: one "language site" each),
 * with the Google market each one targets by default. Names come from Intl, so they show in the
 * dashboard's own language. Separate from the dashboard's interface languages (src/i18n/routing).
 */

export type ContentLanguage = {
  code: string;
  /** Country (ISO 3166-1 alpha-2) of the default market, also used for the flag. */
  country: string;
  /** DataForSEO / Google Ads location code of that country (2000 + ISO numeric code). */
  location: number;
  /** Written right to left (infographics aren't drawn for these yet). */
  rtl?: boolean;
};

export const CONTENT_LANGUAGES: ContentLanguage[] = [
  { code: "en", country: "US", location: 2840 },
  { code: "es", country: "ES", location: 2724 },
  { code: "fr", country: "FR", location: 2250 },
  { code: "de", country: "DE", location: 2276 },
  { code: "it", country: "IT", location: 2380 },
  { code: "pt", country: "PT", location: 2620 },
  { code: "nl", country: "NL", location: 2528 },
  { code: "pl", country: "PL", location: 2616 },
  { code: "sv", country: "SE", location: 2752 },
  { code: "da", country: "DK", location: 2208 },
  { code: "no", country: "NO", location: 2578 },
  { code: "fi", country: "FI", location: 2246 },
  { code: "cs", country: "CZ", location: 2203 },
  { code: "sk", country: "SK", location: 2703 },
  { code: "hu", country: "HU", location: 2348 },
  { code: "ro", country: "RO", location: 2642 },
  { code: "bg", country: "BG", location: 2100 },
  { code: "hr", country: "HR", location: 2191 },
  { code: "sl", country: "SI", location: 2705 },
  { code: "el", country: "GR", location: 2300 },
  { code: "et", country: "EE", location: 2233 },
  { code: "lv", country: "LV", location: 2428 },
  { code: "lt", country: "LT", location: 2440 },
  { code: "uk", country: "UA", location: 2804 },
  { code: "tr", country: "TR", location: 2792 },
  { code: "ja", country: "JP", location: 2392 },
  { code: "ko", country: "KR", location: 2410 },
  { code: "zh-CN", country: "SG", location: 2702 },
  { code: "zh-TW", country: "TW", location: 2158 },
  { code: "hi", country: "IN", location: 2356 },
  { code: "th", country: "TH", location: 2764 },
  { code: "vi", country: "VN", location: 2704 },
  { code: "id", country: "ID", location: 2360 },
  { code: "ms", country: "MY", location: 2458 },
  { code: "ar", country: "SA", location: 2682, rtl: true },
  { code: "he", country: "IL", location: 2376, rtl: true },
];

export const CONTENT_LANGUAGE_CODES = CONTENT_LANGUAGES.map((language) => language.code) as [string, ...string[]];
export const contentLanguage = (code: string) => CONTENT_LANGUAGES.find((language) => language.code === code) ?? null;

/** "es" → "Spanish" (in the given dashboard language). */
export function languageName(code: string, locale: string) {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : code;
  } catch {
    return code;
  }
}

/** Flag emoji of a country ("ES" → 🇪🇸). */
export const countryFlag = (alpha2: string) => String.fromCodePoint(...[...alpha2.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));

/** Flag of a content language (by its default market). */
export const languageFlag = (code: string) => {
  const language = contentLanguage(code);
  return language ? countryFlag(language.country) : "🌐";
};

/** DataForSEO location code of an ISO alpha-2 country, for the countries content languages default to plus common English markets. */
export const LOCATION_OF_COUNTRY: Record<string, number> = {
  ...Object.fromEntries(CONTENT_LANGUAGES.map((language) => [language.country, language.location])),
  GB: 2826,
  CA: 2124,
  AU: 2036,
  IE: 2372,
  NZ: 2554,
  BR: 2076,
  MX: 2484,
  AR: 2032,
  CO: 2170,
  CL: 2152,
  BE: 2056,
  CH: 2756,
  AT: 2040,
  CN: 2156,
  HK: 2344,
  AE: 2784,
  EG: 2818,
  ZA: 2710,
  PH: 2608,
};
