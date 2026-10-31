/**
 * What goes into an article besides the text: cover and body images (scenes planned by Claude,
 * pictures made by the image provider in the site's chosen styles), CTA cards and a YouTube video.
 * Blocks are marked in the markdown and turned into cards by renderArticleHtml.
 */
import { z } from "zod/v4";
import type { ArticleBlock, ArticleMedia } from "@/db/schema";
import { asBodyStyle, asCoverStyle, hasTitle, youtubeId, type BodyStyle, type CoverStyle } from "@/lib/visuals";
import { ai } from "@/server/ai/claude";
import { images } from "@/server/ai/images";
import { storeImage } from "@/server/media";
import type { Site } from "../agents/jobs/types";

const MAX_BODY_IMAGES = 2;

const COVER_LOOK: Record<CoverStyle, string> = {
  realistic_with_title: "A lifelike editorial photograph",
  "3d_illustration": "A stylized 3D illustration with depth, soft lighting and clean rounded shapes",
  sketch_with_title: "A hand-drawn pencil and ink sketch on off-white paper",
  sketch: "A hand-drawn pencil and ink sketch on off-white paper",
  watercolor_with_title: "A soft painted watercolor illustration on textured paper",
  realistic: "A lifelike editorial photograph",
};
const BODY_LOOK: Record<BodyStyle, string> = {
  realistic: "A natural, lifelike photograph",
  sketch: "A clear hand-drawn explanatory sketch in pencil and ink on off-white paper",
};

/** The prompt sent to the image model, built from the site's Visuals settings. */
export function imagePrompt(site: Site, input: { kind: "hero" | "body"; scene: string; title?: string }) {
  const cover = asCoverStyle(site.heroImageStyle);
  const look = input.kind === "hero" ? COVER_LOOK[cover] : BODY_LOOK[asBodyStyle(site.bodyImageStyle)];
  const palette = [site.brandColor, site.brandSecondaryColor].filter(Boolean).join(", ");
  const titled = input.kind === "hero" && hasTitle(cover) && input.title;
  return [
    `${look} of: ${input.scene}`,
    titled
      ? `Design the title "${input.title}" into the image ${
          cover === "realistic_with_title" ? "like a magazine cover, in large, bold, highly legible type" : `in the center${site.brandColor ? `, in the brand color ${site.brandColor}` : ""}`
        }. Spell it exactly as given. Keep all lettering well inside the frame, away from the edges. No other text.`
      : "No text, letters, numbers, logos or watermarks anywhere in the image.",
    palette ? `Where colors are a free choice, use the brand palette (${palette}).` : null,
    site.imageMood ? `Visual mood: ${site.imageMood}` : null,
    site.imageInstructions ? `Rules every image must follow:\n${site.imageInstructions}` : null,
    "Do not show real brands, trademarks or recognizable real people.",
  ]
    .filter(Boolean)
    .join("\n");
}

const ImagePlanSchema = z.object({
  cover: z.object({ scene: z.string(), altText: z.string() }),
  body: z.array(z.object({ heading: z.string(), scene: z.string(), altText: z.string() })),
});
export type ImagePlan = z.infer<typeof ImagePlanSchema>;

export function planImages(site: Site, input: { title: string; keyword: string; markdown: string }) {
  return ai.generateObject({
    schema: ImagePlanSchema,
    effort: "low",
    system:
      "You plan the pictures for a finished blog article. cover.scene: one or two sentences describing a concrete, visual scene that represents the article's subject " +
      "(objects, setting, action, light), never text or captions. body: up to two '##' sections where a picture genuinely helps the reader; copy each section's heading text " +
      "exactly and describe one concrete scene for it. Return an empty body list if no section needs a picture. altText: a short factual description of the picture for " +
      `screen readers and search engines, written in the language with code "${site.selectedLanguage}", naturally including the topic.` +
      (site.imageInstructions ? ` Every scene must respect these rules:\n${site.imageInstructions}` : ""),
    prompt: `Business: ${site.brandName ?? site.url} — ${site.positioning ?? site.description ?? ""}\nKeyword: ${input.keyword}\nTitle: ${input.title}\n\nArticle:\n${input.markdown}`,
  });
}

export type CreatedImages = { hero: ArticleMedia | null; body: (ArticleMedia & { heading: string })[]; mediaIds: string[]; errors: string[] };

/** Generates and stores the planned pictures; a failed picture is reported, not fatal. */
export async function createArticleImages(site: Site, input: { title: string; plan: ImagePlan; articleId?: number }): Promise<CreatedImages> {
  const jobs = [
    { kind: "hero" as const, identifier: "hero_image", heading: "", scene: input.plan.cover.scene, altText: input.plan.cover.altText },
    ...input.plan.body.slice(0, MAX_BODY_IMAGES).map((item, index) => ({ kind: "body" as const, identifier: `body_image_${index + 1}`, ...item })),
  ];
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const prompt = imagePrompt(site, { kind: job.kind, scene: job.scene, title: input.title });
      const image = await images.generate({ prompt, shape: job.kind === "hero" ? "wide" : "landscape" });
      const stored = await storeImage({ siteId: site.id, articleId: input.articleId, kind: job.kind, bytes: image.bytes, prompt, model: image.model });
      return { job, stored };
    }),
  );
  const out: CreatedImages = { hero: null, body: [], mediaIds: [], errors: [] };
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      out.errors.push(`${jobs[index]!.identifier}: ${(result.reason as Error).message}`);
      continue;
    }
    const { job, stored } = result.value;
    const media: ArticleMedia = { url: stored.url, type: "image", source: "AI", altText: job.altText, identifier: job.identifier, selected: true, scene: job.scene };
    out.mediaIds.push(stored.id);
    if (job.kind === "hero") out.hero = media;
    else out.body.push({ ...media, heading: job.heading });
  }
  return out;
}

const normalizeHeading = (text: string) => text.replace(/[*_`#]/g, "").trim().toLowerCase();

/** Index just after the first block (paragraph, list or table) that follows a line. */
function afterFirstBlock(lines: string[], from: number) {
  let i = from + 1;
  while (i < lines.length && !lines[i]!.trim()) i++;
  while (i < lines.length && lines[i]!.trim() && !/^#{1,6}\s/.test(lines[i]!)) i++;
  return i;
}

/** Puts each body image after the first paragraph of its section. */
export function insertBodyImages(markdown: string, items: { heading: string; url: string; altText?: string }[]) {
  const lines = markdown.split("\n");
  for (const item of items) {
    const index = lines.findIndex((line) => /^##\s/.test(line) && normalizeHeading(line.replace(/^##\s+/, "")) === normalizeHeading(item.heading));
    if (index < 0) continue;
    const alt = (item.altText ?? "").replace(/[[\]]/g, "");
    lines.splice(afterFirstBlock(lines, index), 0, "", `![${alt}](${item.url})`, "");
  }
  return lines.join("\n");
}

// ------------------------------------------------------------------ CTA cards and video

const CtaCopySchema = z.object({
  link: z.object({ pageIndex: z.number(), title: z.string(), pitch: z.string() }).nullable(),
  contact: z.object({ title: z.string(), pitch: z.string() }).nullable(),
  map: z.object({ title: z.string() }).nullable(),
});

const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** CTA cards for this article, worded for it by Claude; only the cards switched on in Visuals. */
export async function planCtaBlocks(site: Site, input: { title: string; keyword: string }): Promise<ArticleBlock[]> {
  const cta = site.ctaSettings ?? {};
  const origin = new URL(site.url).origin;
  const pages = cta.links?.enabled ? (cta.links.items.length ? cta.links.items : [{ label: "", url: `${origin}/` }]) : [];
  const contact = cta.contact?.enabled && (cta.contact.phone || cta.contact.whatsapp || cta.contact.email) ? cta.contact : null;
  const map = cta.map?.enabled && cta.map.address ? cta.map : null;
  if (!pages.length && !contact && !map) return [];

  const copy = await ai.generateObject({
    schema: CtaCopySchema,
    effort: "low",
    system:
      `You write short call-to-action cards placed inside a blog article by ${site.brandName ?? site.url}. Write in the language with code "${site.selectedLanguage}". ` +
      "title: at most 8 words; pitch: one sentence of at most 25 words that connects the article's topic to what the business offers. No exclamation marks, no invented offers or prices. " +
      "Return null for any card not requested. link.pageIndex: the number of the listed page that best fits the article.",
    prompt: [
      `Business: ${site.positioning ?? site.description ?? ""}`,
      `Article: ${input.title} (keyword: ${input.keyword})`,
      pages.length ? `Link card pages:\n${pages.map((page, index) => `${index}. ${page.label || "Homepage"} — ${page.url}`).join("\n")}` : "No link card.",
      contact ? "Contact card: invites readers to call, message or email." : "No contact card.",
      map ? `Map card: invites readers to visit ${cta.map?.address}.` : "No map card.",
    ].join("\n"),
  });

  const blocks: ArticleBlock[] = [];
  if (pages.length && copy.link) {
    const page = pages[Math.min(Math.max(0, Math.round(copy.link.pageIndex)), pages.length - 1)]!;
    blocks.push({ kind: "link", title: copy.link.title, pitch: copy.link.pitch, buttonLabel: page.label || site.brandName || new URL(page.url).hostname, buttonUrl: page.url });
  }
  if (map && copy.map) blocks.push({ kind: "map", title: copy.map.title, address: map.address!, mapsUrl: map.mapsUrl || mapsLink(map.address!) });
  if (contact && copy.contact) blocks.push({ kind: "contact", title: copy.contact.title, pitch: copy.contact.pitch, phone: contact.phone, whatsapp: contact.whatsapp, email: contact.email });
  return blocks;
}

/** One relevant YouTube video found with web search (only from the site's channel when one is set). */
export async function findVideo(site: Site, input: { title: string; keyword: string }): Promise<ArticleBlock | null> {
  const channel = site.youtubeChannel?.trim();
  const result = await ai.research({
    effort: "low",
    maxSearches: 3,
    system: "You find one YouTube video that genuinely helps a reader of a blog article. Answer with the video's full youtube.com URL on the first line and its title on the second. If nothing fits, answer NONE.",
    prompt: `Article: "${input.title}" (keyword: ${input.keyword}; language code ${site.selectedLanguage}).${channel ? ` Only choose a video published by the YouTube channel ${channel}.` : ""}`,
  });
  const candidates = [...(result.notes.match(/https?:\/\/[^\s)\]]+/g) ?? []), ...result.sources.map((source) => source.url)];
  const url = candidates.find((candidate) => youtubeId(candidate));
  if (!url) return null;
  const title = result.sources.find((source) => source.url === url)?.title || result.notes.split("\n").map((line) => line.trim()).find((line) => line && !line.includes("http")) || input.title;
  return { kind: "video", title: title.slice(0, 120), videoId: youtubeId(url)! };
}

/** Markdown for a block: readable on its own, and marked so renderArticleHtml can turn it into a card. */
function blockMarkdown(block: ArticleBlock, index: number) {
  const body = (() => {
    switch (block.kind) {
      case "link":
        return [`> **${block.title}**`, ">", `> ${block.pitch}`, ">", `> [${block.buttonLabel} →](${block.buttonUrl})`];
      case "contact":
        return [
          `> **${block.title}**`,
          ">",
          `> ${block.pitch}`,
          ">",
          `> ${[block.phone && `[${block.phone}](tel:${block.phone.replace(/[^\d+]/g, "")})`, block.whatsapp && `[WhatsApp](https://wa.me/${block.whatsapp.replace(/\D/g, "")})`, block.email && `[${block.email}](mailto:${block.email})`].filter(Boolean).join(" · ")}`,
        ];
      case "map":
        return [`> **${block.title}**`, ">", `> ${block.address}`, ">", `> [Google Maps →](${block.mapsUrl})`];
      case "video":
        return [`[▶ ${block.title}](https://www.youtube.com/watch?v=${block.videoId})`];
      case "product":
        return [
          ...(block.imageUrl ? [`> ![${block.name.replace(/[[\]]/g, "")}](${block.imageUrl})`, ">"] : []),
          `> **${block.name}**${block.priceLabel ? ` · ${block.priceLabel}` : ""}`,
          ">",
          `> ${block.pitch}`,
          ">",
          `> [${block.buttonLabel} →](${block.url})`,
        ];
    }
  })();
  return ["", `<!-- vaultio:block ${index} -->`, ...body, "<!-- /vaultio:block -->", ""];
}

/**
 * Places blocks: link card after the summary list, video after the second section's first
 * paragraph, map card before the FAQ, a product card after the paragraph that first links the
 * product (or before the FAQ), contact card at the end of the article body.
 */
export function placeBlocks(markdown: string, blocks: ArticleBlock[]) {
  let lines = markdown.split("\n");
  const insert = (at: number, block: ArticleBlock) => {
    const index = blocks.indexOf(block);
    lines = [...lines.slice(0, at), ...blockMarkdown(block, index), ...lines.slice(at)];
  };
  for (const block of blocks) {
    if (block.kind === "link") {
      const summary = lines.findIndex((line) => /^\*\*(TL;DR|Key takeaways)/i.test(line.trim()));
      const firstParagraph = lines.findIndex((line) => line.trim() && !/^#/.test(line));
      insert(summary >= 0 ? afterFirstBlock(lines, summary) : afterFirstBlock(lines, Math.max(0, firstParagraph) - 1), block);
    } else if (block.kind === "video") {
      const sections = lines.flatMap((line, index) => (/^##\s/.test(line) ? [index] : []));
      const target = sections[1] ?? sections[0];
      if (target !== undefined) insert(afterFirstBlock(lines, target), block);
    } else if (block.kind === "map") {
      const faq = lines.findIndex((line) => /^##\s+(FAQ|Frequently asked)/i.test(line));
      insert(faq >= 0 ? faq : lines.length, block);
    } else if (block.kind === "product") {
      // Not inside another card: only lines outside <!-- vaultio:block --> markers count.
      let inBlock = false;
      const linked = lines.findIndex((line) => {
        if (line.startsWith("<!-- vaultio:block")) inBlock = true;
        if (line.startsWith("<!-- /vaultio:block")) inBlock = false;
        return !inBlock && !/^#{1,6}\s/.test(line) && line.includes(`](${block.url})`);
      });
      const faq = lines.findIndex((line) => /^##\s+(FAQ|Frequently asked)/i.test(line));
      insert(linked >= 0 ? afterFirstBlock(lines, linked - 1) : faq >= 0 ? faq : lines.length, block);
    } else {
      insert(lines.length, block);
    }
  }
  return lines.join("\n");
}
