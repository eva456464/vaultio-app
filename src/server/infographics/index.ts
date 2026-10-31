/**
 * One infographic per article: Claude picks a section worth charting and writes the spec (numbers
 * checked against the article), Vaultio typesets it in the site's colours and logo, and the image
 * is placed at the end of that section.
 */
import type { ArticleMedia } from "@/db/schema";
import { asInfographicStyle } from "@/lib/visuals";
import { images } from "@/server/ai/images";
import type { Site } from "../agents/jobs/types";
import { DEFAULT_BRAND_COLOR, safeColor } from "../brand";
import { loadMedia, mediaBaseUrl, mediaIdFromUrl, storeImage } from "../media";
import { contentLanguage } from "@/lib/languages";
import { hasRightToLeft } from "./fonts";
import { renderInfographic, toDataUrl, type Art } from "./render";
import { describeSpec, planInfographic, type InfographicSpec } from "./spec";

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/** The site's logo as a small PNG data URL, or null if it can't be fetched. */
async function logoDataUrl(logoUrl: string | null) {
  if (!logoUrl) return null;
  try {
    const url = logoUrl.startsWith("/") ? `${mediaBaseUrl()}${logoUrl}` : logoUrl;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    return await toDataUrl(Buffer.from(await response.arrayBuffer()), { width: 96, height: 96 }, "png");
  } catch {
    return null;
  }
}

/** Editorial: a small illustration for the topic (needs an image provider). Classic: the cover as header. */
async function artFor(site: Site, spec: InfographicSpec, style: "editorial" | "classic", hero: ArticleMedia | null): Promise<Art> {
  if (style === "classic") {
    const id = hero?.url ? mediaIdFromUrl(hero.url) : null;
    const media = id ? await loadMedia(id) : null;
    return { header: media ? await toDataUrl(media.data, { width: 1200, height: 300 }) : null };
  }
  if (!images.available() || !spec.illustration) return {};
  const color = safeColor(site.brandColor, DEFAULT_BRAND_COLOR);
  const prompt = [
    `A small editorial spot illustration for a magazine infographic about: ${spec.illustration}.`,
    `Hand-drawn editorial style with clean confident lines and flat colour, on a plain warm off-white (#FBF7F2) background that fills the whole image.`,
    `Use ${color} as the accent colour, with charcoal and soft neutral tones.`,
    site.imageMood ? `Brand look: ${site.imageMood}.` : null,
    "No text, letters, numbers, logos or charts.",
  ]
    .filter(Boolean)
    .join(" ");
  const image = await images.generate({ prompt, shape: "landscape" });
  return { illustration: await toDataUrl(image.bytes, { width: 520, height: 400 }) };
}

/** Puts the image after the chosen section's content (before the next heading). */
export function placeInfographic(markdown: string, heading: string, url: string, alt: string) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.replace(/^##\s+/, "").trim() === heading.trim() && line.startsWith("## "));
  if (start < 0) return markdown;
  let end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  if (end < 0) end = lines.length;
  // Not inside a CTA/video block at the end of the section.
  while (end > start + 1 && /<!-- \/?vaultio:block/.test(lines[end - 1] ?? "")) end--;
  const image = `![${alt.replace(/[[\]]/g, "")}](${url})`;
  return [...lines.slice(0, end).join("\n").trimEnd().split("\n"), "", image, "", ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n");
}

export async function createInfographic(site: Site, input: { title: string; markdown: string; hero: ArticleMedia | null }) {
  // Right-to-left scripts can't be laid out by the renderer yet: no infographic rather than a wrong one.
  if (contentLanguage(site.selectedLanguage)?.rtl || hasRightToLeft(input.title)) return null;
  const spec = await planInfographic(site, { title: input.title, markdown: input.markdown });
  if (!spec) return null;
  const style = asInfographicStyle(site.infographicStyle);
  const errors: string[] = [];
  const art = await artFor(site, spec, style, input.hero).catch((error) => {
    errors.push(`illustration: ${(error as Error).message}`);
    return {} as Art;
  });
  const brand = { color: safeColor(site.brandColor, DEFAULT_BRAND_COLOR), name: site.brandName ?? hostOf(site.url), logo: await logoDataUrl(site.logoUrl), domain: hostOf(site.url) };
  const png = await renderInfographic(spec, style, brand, art, site.selectedLanguage);
  const stored = await storeImage({ siteId: site.id, kind: "infographic", bytes: png, prompt: JSON.stringify({ style, spec }), model: "vaultio-infographic" });
  const alt = describeSpec(spec);
  const media: ArticleMedia = { url: stored.url, type: "infographic", source: "vaultio", altText: alt, identifier: "infographic", scene: spec.heading };
  return { markdown: placeInfographic(input.markdown, spec.heading, stored.url, alt), media, mediaId: stored.id, errors };
}
