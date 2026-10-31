import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import en from "@/messages/en.json";

type Messages = Record<string, unknown>;

// Untranslated keys fall back to English so new locales can be filled in gradually.
function mergeMessages(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      value && typeof value === "object" && current && typeof current === "object"
        ? mergeMessages(current as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages: Messages = en;
  if (locale !== "en") {
    try {
      const localized = (await import(`@/messages/${locale}.json`)).default as Messages;
      messages = mergeMessages(en, localized);
    } catch {
      // No catalog for this locale yet.
    }
  }

  return { locale, messages };
});
