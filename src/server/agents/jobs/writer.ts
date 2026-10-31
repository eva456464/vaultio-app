/** Article writer: researches today's planned topic and writes a cited, brand-voiced article. */
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import {
  articles,
  contentPlanItems,
  keywordClusters,
  mediaAssets,
  seedKeywords,
  sitePages,
  type ArticleBlock,
  type ArticleMedia,
  type ArticleType,
  type QualityCheck,
} from "@/db/schema";
import { ai, type ResearchSource } from "@/server/ai/claude";
import { images } from "@/server/ai/images";
import { createArticleImages, findVideo, insertBodyImages, placeBlocks, planCtaBlocks, planImages } from "@/server/articles/visuals";
import { safeColor } from "@/server/brand";
import { renderArticleHtml } from "@/server/markdown";
import { publishArticle } from "@/server/publishing/publish";
import { logActivity } from "../activity";
import type { JobContext, Site } from "./types";

const ARTICLE_TYPE_GUIDE: Record<ArticleType, string> = {
  guide_explainer: "an explainer that defines the topic and answers the reader's main questions",
  guide_how_to: "a step-by-step how-to guide",
  listicle_educational: "an educational list article",
  listicle_comparison: "a list comparing options",
  comparison: "a balanced comparison",
  case_study: "a case-study style article",
  opinion: "an expert opinion piece",
};

function writingSystemPrompt(site: Site) {
  const voice = Object.entries(site.brandVoice ?? {})
    .map(([key, value]) => `- ${key.replaceAll("_", " ")}: ${value}`)
    .join("\n");
  const rules = [
    `Write in ${site.selectedLanguage === "en" ? `${site.englishType === "british" ? "British" : "American"} English` : `the language with code "${site.selectedLanguage}"`}.`,
    `Target length: about ${site.articleLengthTarget} words.`,
    "Answer first: the opening paragraph directly answers the main question in 2–3 sentences, then expands.",
    site.includeTldr
      ? site.summaryStyle === "key_takeaways"
        ? 'After the opening paragraph add "**Key takeaways:**" followed by 3–5 bullet points.'
        : 'After the opening paragraph add "**TL;DR:**" followed by 3–5 bullet points.'
      : null,
    "Structure with ## and ### headings (no # heading; the title is set separately). Use lists and a markdown table where they make the content easier to scan.",
    "Every statistic, figure or factual claim that is not common knowledge must come from the research notes and be linked inline to its source URL with a markdown link. Never invent numbers, studies, quotes or sources.",
    site.includeInternalLinks ? "Link naturally to 3–6 of the listed internal pages where they genuinely help the reader, using descriptive anchor text. Use only the listed URLs." : null,
    site.includePerspective ? `Write from the perspective of ${site.brandName ?? "the business"} where it adds credibility, without turning the article into an advert.` : null,
    "Mention the business and its offers at most twice, where they are a natural next step for the reader.",
    site.mentionCompetitorsIfRelevant ? null : "Do not name competitors.",
    site.ctaSettings?.promo?.enabled
      ? `Just before the FAQ section, add one short paragraph (2–3 sentences, no heading) on how ${site.brandName ?? "the business"} helps with this topic. Keep it factual: no invented offers, prices or guarantees.`
      : null,
    'End with a "## FAQ" section of 4–6 questions people also ask, each as a ### heading followed by a concise answer.',
    site.articleInstructions ? `Instructions from the business:\n${site.articleInstructions}` : null,
    "Return only the article body in markdown.",
  ].filter(Boolean);

  return [
    `You are the senior content writer for ${site.brandName ?? site.url} (${site.url}).`,
    `About the business: ${site.positioning ?? site.description ?? ""}`,
    site.targetAudience.length ? `Audience: ${site.targetAudience.join("; ")}` : null,
    site.servicesOffered.length ? `Offers: ${site.servicesOffered.map((offer) => offer.name).join("; ")}` : null,
    voice ? `Brand voice:\n${voice}` : null,
    `Rules:\n${rules.map((rule) => `- ${rule}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const MetaSchema = z.object({
  title: z.string(),
  slug: z.string(),
  metaDescription: z.string(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  whyThisStructure: z.array(z.string()),
  characteristics: z.array(z.string()),
  semanticKeywords: z.array(z.string()),
});

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

function linksIn(markdown: string) {
  return [...markdown.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1]!);
}

function qualityChecks(input: { markdown: string; title: string; metaDescription: string; internal: number; external: number; keyword: string; semantic: string[]; media: ArticleMedia[] }): QualityCheck[] {
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
    { key: "jsonLd", passed: true },
    ...(input.media.length ? [{ key: "imageAltTexts", passed: input.media.every((item) => item.altText?.trim()), detail: `${input.media.length} images` }] : []),
  ];
}

export async function writeArticle({ site, runDate }: JobContext) {
  const [item] = await db
    .select({ plan: contentPlanItems, keyword: seedKeywords.value, cluster: keywordClusters })
    .from(contentPlanItems)
    .innerJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(contentPlanItems.orgWebsiteId, site.id), eq(contentPlanItems.scheduledFor, runDate), isNull(contentPlanItems.articleId)))
    .limit(1);
  if (!item) return { written: false, reason: "No article planned for today" };

  const keyword = item.keyword;
  const articleType = (item.plan.articleType ?? "guide_explainer") as ArticleType;
  await db.update(contentPlanItems).set({ generationStatus: "generating", updatedAt: new Date() }).where(eq(contentPlanItems.id, item.plan.id));
  await db
    .update(keywordClusters)
    .set({ articleGenerationAttempts: sql`${keywordClusters.articleGenerationAttempts} + 1` })
    .where(eq(keywordClusters.id, item.cluster.id));

  // 1. Research on the live web
  const competingPages = (item.plan.research?.serp ?? []).slice(0, 10).map((r) => `${r.position}. ${r.title} — ${r.url}`).join("\n");
  const research = await ai.research({
    effort: "medium",
    maxSearches: 6,
    system:
      "You research topics for a business blog. Find authoritative, recent sources (official bodies, standards organisations, industry associations, " +
      "peer-reviewed or reputable publications) and concrete facts and statistics. Report what you found as concise notes, each fact followed by its source URL. " +
      "Also list the subtopics and questions the best existing articles cover.",
    prompt: [
      `Topic / target keyword: "${keyword}" (${site.selectedLanguage})`,
      `Planned title: ${item.plan.plannedTitle ?? keyword}`,
      `Business context: ${site.brandName ?? site.url} — ${site.positioning ?? site.description ?? ""}`,
      item.plan.userInstruction ? `Instructions from the business: ${item.plan.userInstruction}` : "",
      item.plan.supportUrl ? `Reference URL from the business: ${item.plan.supportUrl}` : "",
      competingPages ? `Pages currently ranking on Google:\n${competingPages}` : "",
    ].join("\n"),
  });

  // 2. Write
  const linkable = await db
    .select({ url: sitePages.url, title: sitePages.metaTitle })
    .from(sitePages)
    .where(and(eq(sitePages.orgWebsiteId, site.id), ne(sitePages.url, `${new URL(site.url).origin}/`)))
    .limit(200);
  const markdownBody = await ai.generateText({
    effort: "high",
    system: writingSystemPrompt(site),
    prompt: [
      `Write ${ARTICLE_TYPE_GUIDE[articleType]} targeting the keyword "${keyword}".`,
      `Working title: ${item.plan.plannedTitle ?? keyword}`,
      item.cluster.keywords.length > 1 ? `Related searches to cover naturally: ${item.cluster.keywords.slice(1, 12).map((k) => k.keyword).join(", ")}` : "",
      item.plan.userInstruction ? `Instructions for this article: ${item.plan.userInstruction}` : "",
      `\nResearch notes:\n${research.notes}`,
      `\nSources you may cite (use these URLs only):\n${research.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}`,
      site.includeInternalLinks && linkable.length ? `\nInternal pages you may link to:\n${linkable.map((p) => `- ${p.url}${p.title ? ` (${p.title})` : ""}`).join("\n")}` : "",
    ].join("\n"),
  });

  // 3. Meta, FAQ and rationale
  const meta = await ai.generateObject({
    schema: MetaSchema,
    effort: "low",
    system:
      "You prepare SEO metadata for a finished article. title: at most 60 characters, includes the keyword naturally. slug: lowercase words joined by hyphens, based on the keyword. " +
      "metaDescription: 120–155 characters. faq: the question/answer pairs from the article's FAQ section, answers as plain text. " +
      "whyThisStructure and characteristics: three short bullet points each explaining the article's structure choices and what makes it useful. " +
      "semanticKeywords: 8–12 related terms the article covers.",
    prompt: `Keyword: ${keyword}\n\nArticle:\n${markdownBody}`,
  });

  // 4. Images, CTA cards and video (each optional; a failure here never stops the article)
  const visualErrors: string[] = [];
  let body = markdownBody.trim();
  let hero: ArticleMedia | null = null;
  let media: ArticleMedia[] = [];
  let mediaIds: string[] = [];
  if (images.available()) {
    try {
      const plan = await planImages(site, { title: meta.title, keyword, markdown: markdownBody });
      const created = await createArticleImages(site, { title: meta.title, plan });
      hero = created.hero;
      media = [...(created.hero ? [created.hero] : []), ...created.body.map((item) => ({ ...item, heading: undefined }))];
      mediaIds = created.mediaIds;
      body = insertBodyImages(body, created.body);
      visualErrors.push(...created.errors);
    } catch (error) {
      visualErrors.push(`images: ${(error as Error).message}`);
    }
  }
  const blocks: ArticleBlock[] = [];
  try {
    blocks.push(...(await planCtaBlocks(site, { title: meta.title, keyword })));
  } catch (error) {
    visualErrors.push(`cta: ${(error as Error).message}`);
  }
  if (site.includeYoutube) {
    try {
      const video = await findVideo(site, { title: meta.title, keyword });
      if (video) blocks.push(video);
    } catch (error) {
      visualErrors.push(`video: ${(error as Error).message}`);
    }
  }
  body = placeBlocks(body, blocks);

  // 5. Assemble
  const origin = new URL(site.url).origin;
  const citedSources: ResearchSource[] = research.sources.filter((source) => markdownBody.includes(source.url));
  const appendix = [
    site.includeSourcesSection && citedSources.length ? `\n\n## Sources\n\n${citedSources.map((s) => `- [${s.title}](${s.url})`).join("\n")}` : "",
    site.articleDisclaimer ? `\n\n---\n\n*${site.articleDisclaimer}*` : "",
  ].join("");
  const markdown = `${body}${appendix}\n`;
  const links = linksIn(markdownBody);
  const internal = links.filter((url) => url.startsWith(origin)).length;
  const external = links.length - internal;
  const wordCount = markdown.replace(/[#*_>`|[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  const slug = slugify(meta.slug || keyword);
  const publishedPath = `${origin}${site.blogPath.replace(/\/$/, "")}/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.metaDescription,
    inLanguage: site.selectedLanguage,
    mainEntityOfPage: publishedPath,
    author: { "@type": "Organization", name: site.authorName ?? site.brandName ?? new URL(site.url).hostname },
    publisher: { "@type": "Organization", name: site.brandName ?? new URL(site.url).hostname, url: origin },
    keywords: [keyword, ...meta.semanticKeywords].join(", "),
  };
  const faqJsonLd = meta.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: meta.faq.map((entry) => ({ "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.answer } })),
      }
    : null;

  const [article] = await db
    .insert(articles)
    .values({
      orgWebsiteId: site.id,
      keywordClusterId: item.cluster.id,
      title: meta.title,
      slug,
      metaDescription: meta.metaDescription.slice(0, 160),
      languageCode: site.selectedLanguage,
      articleType,
      content: markdown,
      htmlContent: renderArticleHtml(markdown, { blocks, accentColor: safeColor(site.brandColor) }),
      heroImageUrl: hero?.url ?? null,
      media,
      blocks,
      outline: (markdown.match(/^## .+$/gm) ?? []).map((heading) => heading.slice(3)),
      jsonLd: site.includeJsonLd ? jsonLd : null,
      faqJsonLd: site.includeFaqJsonLd ? faqJsonLd : null,
      faq: meta.faq,
      sources: citedSources,
      wordCount,
      internalLinksCount: internal,
      externalLinksCount: external,
      generationRationale: {
        whyThisTopic: item.plan.whyThisTopic,
        whyThisStructure: meta.whyThisStructure.slice(0, 3),
        characteristics: meta.characteristics.slice(0, 3),
      },
      generationSettings: {
        model: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
        semanticKeywords: meta.semanticKeywords,
        ...(visualErrors.length ? { visualErrors } : {}),
      },
      qualityChecks: qualityChecks({ markdown, title: meta.title, metaDescription: meta.metaDescription, internal, external, keyword, semantic: meta.semanticKeywords, media }),
    })
    .returning();

  if (mediaIds.length) await db.update(mediaAssets).set({ articleId: article!.id }).where(inArray(mediaAssets.id, mediaIds));
  await db
    .update(contentPlanItems)
    .set({ articleId: article!.id, generationStatus: "generated", updatedAt: new Date() })
    .where(eq(contentPlanItems.id, item.plan.id));
  let published = false;
  if (site.autoPublish) {
    const result = await publishArticle(site.id, article!.id);
    published = result.published;
  }
  if (!published) await logActivity(site.id, "articleWritten", { title: meta.title, articleId: article!.id });
  return { articleId: article!.id, words: wordCount, sources: citedSources.length, images: media.length, blocks: blocks.map((block) => block.kind), published };
}
