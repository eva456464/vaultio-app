/** Build-time branding (see .env.example), so each agency can publish its own copy. */
export const BRAND_NAME = import.meta.env.VITE_BRAND_NAME?.trim() || "Vaultio";
export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, "") || "";
