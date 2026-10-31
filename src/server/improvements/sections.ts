/**
 * Article text as sections (introduction + one per "##" heading). Improvements propose edits per
 * section; the improved article is the original with only the approved edits applied.
 */
import type { ImprovementChange } from "@/db/schema";

export type Section = { heading: string; body: string };
export type SplitArticle = { intro: string; sections: Section[] };

export function splitSections(markdown: string): SplitArticle {
  const intro: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) sections.push({ heading: heading[1]!, lines: [] });
    else (sections.at(-1)?.lines ?? intro).push(line);
  }
  return { intro: intro.join("\n").trim(), sections: sections.map((s) => ({ heading: s.heading, body: s.lines.join("\n").trim() })) };
}

export function joinSections(article: SplitArticle) {
  return `${[article.intro, ...article.sections.map((s) => `## ${s.heading}\n\n${s.body}`)].filter((part) => part.trim()).join("\n\n")}\n`;
}

/** Sections an improvement may not rewrite (they are generated from data, not prose). */
export const isProtected = (heading: string) => /^sources$/i.test(heading.trim());

// CTA and video blocks are swapped for tokens while Claude edits, then put back.
const BLOCK = /<!-- vaultio:block (\d+) -->[\s\S]*?<!-- \/vaultio:block -->/g;
export const protectBlocks = (text: string) => text.replace(BLOCK, (_, index: string) => `[[KEEP-${index}]]`);

function blockMap(original: string) {
  return new Map([...original.matchAll(BLOCK)].map((match) => [match[1]!, match[0]]));
}

/** Puts blocks back; any block the original section had but the edit dropped is appended. */
function restoreBlocks(edited: string, originalSection: string, blocks: Map<string, string>) {
  let out = edited.replace(/\[\[KEEP-(\d+)\]\]/g, (whole, index: string) => blocks.get(index) ?? "");
  for (const match of originalSection.matchAll(BLOCK)) if (!out.includes(match[0])) out = `${out.trim()}\n\n${match[0]}`;
  return out.trim();
}

export const linksIn = (markdown: string) => [...markdown.matchAll(/(?<!!)\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]!);
export const imagesIn = (markdown: string) => [...markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]!);

/** Unlinks a URL everywhere in the text, keeping the anchor text. */
export function unlink(markdown: string, url: string) {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.replace(new RegExp(`(?<!!)\\[([^\\]]*)\\]\\(${escaped}\\)`, "g"), "$1");
}

/**
 * The improved article: original text with the approved changes applied. `approved` decides
 * which changes count (by default those marked approved).
 */
export function applyChanges(original: string, changes: ImprovementChange[], approved: (change: ImprovementChange) => boolean = (change) => change.status === "approved") {
  const article = splitSections(original);
  const blocks = blockMap(original);
  const items: Section[] = [{ heading: "", body: article.intro }, ...article.sections];
  const originals = items.map((item) => item.body);
  const accepted = changes.filter(approved);

  for (const change of accepted.filter((c) => c.kind === "rewrite" && c.sectionIndex !== undefined)) {
    const index = change.sectionIndex!;
    if (!items[index]) continue;
    items[index] = { heading: index === 0 ? "" : change.heading?.trim() || items[index]!.heading, body: restoreBlocks(change.suggested, originals[index]!, blocks) };
  }
  // New sections go after their anchor, in the order proposed.
  const additions = new Map<number, Section[]>();
  for (const change of accepted.filter((c) => c.kind === "add" && c.sectionIndex !== undefined)) {
    const list = additions.get(change.sectionIndex!) ?? [];
    list.push({ heading: change.heading?.trim() || "", body: change.suggested.replace(/\[\[KEEP-\d+\]\]/g, "").trim() });
    additions.set(change.sectionIndex!, list);
  }
  const ordered: Section[] = [];
  items.forEach((item, index) => {
    if (index > 0) ordered.push(item);
    ordered.push(...(additions.get(index) ?? []).filter((section) => section.heading));
  });

  let markdown = joinSections({ intro: items[0]!.body, sections: ordered });
  for (const change of accepted.filter((c) => c.kind === "removeLink" && c.linkUrl)) markdown = unlink(markdown, change.linkUrl!);
  return {
    markdown,
    title: accepted.find((c) => c.kind === "title")?.suggested ?? null,
    metaDescription: accepted.find((c) => c.kind === "meta")?.suggested ?? null,
  };
}

/** FAQ question/answer pairs from the "## FAQ" section ("### question" + answer). */
export function extractFaq(markdown: string) {
  const faq = splitSections(markdown).sections.find((section) => /^(faq|frequently asked)/i.test(section.heading));
  if (!faq) return null;
  return [...`\n${faq.body.replace(BLOCK, "").trim()}`.matchAll(/\n###\s+(.+?)\s*\n+([\s\S]*?)(?=\n###\s|$)/g)]
    .map((match) => ({ question: match[1]!.trim(), answer: match[2]!.replace(/\s+/g, " ").replace(/[*_`]/g, "").trim() }))
    .filter((entry) => entry.answer);
}
