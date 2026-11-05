/** The quality checks shown on the article page ("AI Search optimized"), recomputed after edits. */
import type { ArticleMedia, QualityCheck } from "@/db/schema";

export function linksIn(markdown: string) {
  return [...markdown.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1]!);
}

export function qualityChecks(input: {
  markdown: string;
  title: string;
  metaDescription: string;
  internal: number;
  external: number;
  keyword: string;
  semantic: string[];
  media: ArticleMedia[];
  /** Plagiarism check result; left out when no page could be compared. */
  originality?: { passed: boolean; share: number; checkedSources: number } | null;
}): QualityCheck[] {
  const firstParagraph = input.markdown.split(/\n\s*\n/).find((block) => block.trim() && !block.startsWith("#")) ?? "";
  const h2s = (input.markdown.match(/^## /gm) ?? []).length;
  const statistics = (input.markdown.match(/\d+(\.\d+)?\s?%|\$\s?\d|\b\d{2,}\b/g) ?? []).length;
  const body = input.markdown.toLowerCase();
  return [
    { key: "answerFirst", passed: firstParagraph.split(/\s+/).length <= 90 },
    { key: "credibleSources", passed: input.external >= 2, detail: `${input.external} source links` },
    { key: "optimalStructure", passed: h2s >= 4, detail: `${h2s} sections` },
    { key: "internalLinks", passed: input.internal >= 2, detail: `${input.internal} internal links` },
    { key: "statistics", passed: statistics >= 3 },
    { key: "semanticKeywords", passed: input.semantic.filter((term) => body.includes(term.toLowerCase())).length >= Math.min(5, input.semantic.length) },
    { key: "metaTags", passed: input.title.length <= 65 && input.metaDescription.length >= 70 && input.metaDescription.length <= 160 },
    ...(input.originality?.checkedSources
      ? [{ key: "plagiarism", passed: input.originality.passed, detail: `${Math.round(input.originality.share * 100)}% matching text across ${input.originality.checkedSources} pages` }]
      : []),
    { key: "jsonLd", passed: true },
    ...(input.media.length ? [{ key: "imageAltTexts", passed: input.media.every((item) => item.altText?.trim()), detail: `${input.media.length} images` }] : []),
  ];
}

