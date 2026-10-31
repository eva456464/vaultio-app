/** Default branding, shared by the web app and the worker (no request context needed). */

const FALLBACK_COLOR = "#E94545";
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A hex colour safe to put into CSS; anything else (empty, unquoted `#` cut by dotenv, junk) falls back. */
export const safeColor = (value: string | null | undefined, fallback = FALLBACK_COLOR) => (value && HEX_COLOR.test(value.trim()) ? value.trim() : fallback);

export const DEFAULT_BRAND_NAME = process.env.DEFAULT_BRAND_NAME || "Vaultio";
export const DEFAULT_BRAND_COLOR = safeColor(process.env.DEFAULT_BRAND_COLOR);
