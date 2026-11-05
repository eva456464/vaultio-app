/**
 * Saves new content for an article (editor, improvements, AI edits) and recomputes everything that
 * depends on it: HTML, outline, FAQ and schema, word and link counts, image list and quality checks.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, type ArticleBlock, type ArticleMedia } from "@/db/schema";
import { safeColor } from "../brand";
import { extractFaq } from "../improvements/sections";
import { renderArticleHtml } from "../markdown";
import type { Site } from "../agents/jobs/types";
import { linksIn, qualityChecks } from "./checks";

type Article = typeof articles.$inferSelect;

export const countWords = (markdown: string) =>
  markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_>`|[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

/** Images in the markdown body (not inside cards), with their alt text. */
function bodyImages(markdown: string) {
  const outsideCards = markdown.replace(/<!-- vaultio:block \d+ -->[\s\S]*?<!-- \/vaultio:block -->/g, "");
  return [...outsideCards.matchAll(/!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g)].map((match) => ({ altText: match[1]!, url: match[2]! }));
}

/** The article's image list after an edit: removed images go, alt texts follow the text, new images are added. */
export function syncMedia(media: ArticleMedia[], markdown: string): ArticleMedia[] {
  const found = bodyImages(markdown);
  const hero = media.filter((item) => item.identifier === "hero_image");
  const body = found.map(({ url, altText }) => {
    const known = media.find((item) => item.url === url && item.identifier !== "hero_image");
    return known ? { ...known, altText } : { url, altText, type: "image" as const, source: "editor", identifier: `body_${url.slice(-12)}`, selected: true };
  });
  // Videos aren't in the markdown as images; keep them as they are.
  return [...hero, ...body, ...media.filter((item) => item.type === "video")];
}

export type ContentInput = { markdown: string; blocks?: ArticleBlock[]; title?: string; metaDescription?: string; slug?: string };

export function articleFields(site: Site, article: Article, input: ContentInput) {
  const title = input.title ?? article.title;
  const metaDescription = input.metaDescription ?? article.metaDescription ?? "";
  const blocks = input.blocks ?? article.blocks;
  const { markdown } = input;
  const origin = new URL(site.url).origin;
  const links = linksIn(markdown);
  const internal = links.filter((url) => url.startsWith(origin)).length;
  const external = links.length - internal;
  const faq = extractFaq(markdown) ?? article.faq;
  const media = syncMedia(article.media, markdown);
  const jsonLd =
    article.jsonLd && typeof article.jsonLd === "object" ? { ...(article.jsonLd as Record<string, unknown>), headline: title, description: metaDescription, dateModified: new Date().toISOString() } : article.jsonLd;
  const faqJsonLd =
    article.faqJsonLd && faq.length
      ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((entry) => ({ "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.answer } })) }
      : article.faqJsonLd;
  const semantic = (article.generationSettings as { semanticKeywords?: string[] } | null)?.semanticKeywords;
  const checks = qualityChecks({ markdown, title, metaDescription, internal, external, keyword: "", semantic: semantic ?? [], media: media.filter((item) => item.type !== "video") });
  // Without the writer's related terms, keep that check's earlier result; the plagiarism check (which
  // fetches the source pages) also keeps the writer's result.
  const previousSemantic = article.qualityChecks.find((check) => check.key === "semanticKeywords");
  const previousPlagiarism = article.qualityChecks.find((check) => check.key === "plagiarism");
  const kept = semantic ? checks : checks.map((check) => (check.key === "semanticKeywords" && previousSemantic ? previousSemantic : check));
  const jsonLdAt = kept.findIndex((check) => check.key === "jsonLd");
  const qualityChecksNow = previousPlagiarism ? [...kept.slice(0, jsonLdAt), previousPlagiarism, ...kept.slice(jsonLdAt)] : kept;
  return {
    title,
    metaDescription,
    ...(input.slug ? { slug: input.slug } : {}),
    content: markdown,
    blocks,
    htmlContent: renderArticleHtml(markdown, { blocks, accentColor: safeColor(site.brandColor), toc: site.includeToc ? article.languageCode : null }),
    outline: (markdown.match(/^## .+$/gm) ?? []).map((heading) => heading.slice(3).trim()),
    faq,
    jsonLd,
    faqJsonLd,
    media,
    wordCount: countWords(markdown),
    internalLinksCount: internal,
    externalLinksCount: external,
    qualityChecks: qualityChecksNow,
    updatedAt: new Date(),
  };
}

export async function saveArticleContent(site: Site, article: Article, input: ContentInput) {
  const [saved] = await db.update(articles).set(articleFields(site, article, input)).where(eq(articles.id, article.id)).returning();
  return saved!;
}
