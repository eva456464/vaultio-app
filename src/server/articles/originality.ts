/**
 * Plagiarism check ("Plagiarism check passed" on the article page): the article's prose is compared
 * with the pages it was researched from and the pages ranking for its keyword. Any run of 8 words
 * that also appears on one of those pages counts as matching text.
 */
import { fetchText, textOf } from "../agents/web";

const SHINGLE = 8;
/** Share of the article's 8-word runs that may match one source (quotes, names, common phrases). */
export const MAX_MATCH_SHARE = 0.06;
const MAX_SOURCES = 15;

export type OriginalityResult = {
  passed: boolean;
  /** Share of the article's text found on the most similar page (0–1). */
  share: number;
  checkedSources: number;
  worst: { url: string; share: number } | null;
  /** Indexes of prose paragraphs (see `paragraphs`) that are mostly matching text. */
  copiedParagraphs: number[];
};

const words = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

function shingles(text: string) {
  const list = words(text);
  const result: string[] = [];
  for (let index = 0; index + SHINGLE <= list.length; index++) result.push(list.slice(index, index + SHINGLE).join(" "));
  return result;
}

/** The article's prose paragraphs: no headings, tables, images, cards, link lists or HTML blocks. */
export function paragraphs(markdown: string) {
  return markdown
    .replace(/<!-- vaultio:block \d+ -->[\s\S]*?<!-- \/vaultio:block -->/g, "\n\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(#|\||!\[|<|---|- \[)/.test(block));
}

const plain = (paragraph: string) => paragraph.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>]/g, " ");

export async function checkOriginality(markdown: string, urls: string[], fetchPage: (url: string) => Promise<string> = defaultFetch): Promise<OriginalityResult> {
  const prose = paragraphs(markdown).map(plain);
  const articleShingles = prose.map((paragraph) => shingles(paragraph));
  const total = articleShingles.reduce((sum, list) => sum + list.length, 0);
  const unique = [...new Set(urls)].slice(0, MAX_SOURCES);
  const pages = await Promise.all(unique.map(async (url) => ({ url, text: await fetchPage(url).catch(() => "") })));
  const usable = pages.filter((page) => page.text.length > 200);

  let worst: OriginalityResult["worst"] = null;
  const matched = new Set<string>();
  for (const page of usable) {
    const source = new Set(shingles(page.text));
    let hits = 0;
    for (const list of articleShingles) for (const shingle of list) if (source.has(shingle)) {
      hits += 1;
      matched.add(shingle);
    }
    const share = total ? hits / total : 0;
    if (!worst || share > worst.share) worst = { url: page.url, share };
  }
  const copiedParagraphs = articleShingles.flatMap((list, index) => (list.length >= 4 && list.filter((shingle) => matched.has(shingle)).length / list.length >= 0.3 ? [index] : []));
  const share = worst?.share ?? 0;
  return { passed: share <= MAX_MATCH_SHARE && copiedParagraphs.length === 0, share, checkedSources: usable.length, worst: worst && worst.share > 0 ? worst : null, copiedParagraphs };
}

/** Fetches each page once per run (the check runs again after a rewrite). */
export function cachedFetcher() {
  const pages = new Map<string, Promise<string>>();
  return (url: string) => {
    if (!pages.has(url)) pages.set(url, defaultFetch(url).catch(() => ""));
    return pages.get(url)!;
  };
}

async function defaultFetch(url: string) {
  const page = await fetchText(url, 10_000);
  if (page.status >= 400 || !/html|text\/plain/.test(page.contentType)) return "";
  return textOf(page.html.replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, " "));
}
