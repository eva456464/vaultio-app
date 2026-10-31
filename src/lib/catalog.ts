/** Product catalog helpers shared by the server and the browser. */

/** Currencies offered for products added by hand (ISO 4217). */
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "JPY", "CNY", "INR", "SGD", "HKD", "AED", "SAR", "ZAR", "BRL", "MXN", "ARS", "CLP", "COP", "TRY", "ILS", "KRW"] as const;

/** "29.99" + "USD" → "$29.99" in the given language (or the plain number when the currency is unknown). */
export function formatPrice(price: string | null, currency: string | null, locale: string) {
  if (!price) return null;
  try {
    return currency ? new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(price)) : new Intl.NumberFormat(locale).format(Number(price));
  } catch {
    return `${price}${currency ? ` ${currency}` : ""}`;
  }
}
