/** Image and CTA options shared by Settings → Visuals, its save action and the article writer. */

export const COVER_STYLES = ["realistic_with_title", "3d_illustration", "sketch_with_title", "sketch", "watercolor_with_title", "realistic"] as const;
export type CoverStyle = (typeof COVER_STYLES)[number];

export const BODY_STYLES = ["realistic", "sketch"] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

export const INFOGRAPHIC_STYLES = ["editorial", "classic"] as const;
export type InfographicStyle = (typeof INFOGRAPHIC_STYLES)[number];

/** Styles that design the article title into the cover image. */
export const hasTitle = (style: string) => style.endsWith("_with_title");

export const asCoverStyle = (value: string): CoverStyle => (COVER_STYLES.includes(value as CoverStyle) ? (value as CoverStyle) : "realistic_with_title");
export const asBodyStyle = (value: string): BodyStyle => (BODY_STYLES.includes(value as BodyStyle) ? (value as BodyStyle) : "realistic");
export const asInfographicStyle = (value: string): InfographicStyle => (INFOGRAPHIC_STYLES.includes(value as InfographicStyle) ? (value as InfographicStyle) : "editorial");

/** The 11-character id in a YouTube watch, share, shorts or embed URL. */
export function youtubeId(url: string) {
  return url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
}
