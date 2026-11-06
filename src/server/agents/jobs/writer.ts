/** Article writer: researches today's planned topic and writes a cited, brand-voiced article. */
import { and, desc, eq, inArray, isNotNull, isNull, like, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import {
  articles,
  backlinks,
  contentPlanItems,
  keywordClusters,
  mediaAssets,
  seedKeywords,
  sitePages,
  type ArticleBlock,
  type ArticleMedia,
  type ArticleType,
} from "@/db/schema";
import { ai, type ResearchSource } from "@/server/ai/claude";
import { images } from "@/server/ai/images";
import { createArticleImages, findVideo, insertBodyImages, placeBlocks, planCtaBlocks, planImages } from "@/server/articles/visuals";
import { placeBacklinks, recordPlacements, type Placement } from "@/server/backlinks/exchange";
import { safeColor } from "@/server/brand";
import { linkedProducts, productCard, productsBrief, productsForArticle } from "@/server/catalog/articles";
import { createInfographic } from "@/server/infographics";
import { linksIn, qualityChecks } from "@/server/articles/checks";
import { cachedFetcher, checkOriginality, paragraphs } from "@/server/articles/originality";
import { allowedArticleType, asEnglishType, ENGLISH_NAMES, formatInternalLinks, LENGTH_RANGES, RECOMMENDED_TITLES } from "@/lib/writing";
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

export function writingSystemPrompt(site: Site) {
  const voice = Object.entries(site.brandVoice ?? {})
    .map(([key, value]) => `- ${key.replaceAll("_", " ")}: ${value}`)
    .join("\n");
  const rules = [
    `Write in ${site.selectedLanguage === "en" ? ENGLISH_NAMES[asEnglishType(site.englishType)] : `the language with code "${site.selectedLanguage}"`}.`,
    site.articleLength === "dynamic"
      ? "Length: whatever the search intent needs to be the most complete answer, matching or beating the depth of the pages that rank (usually 1,200–2,800 words)."
      : `Length: ${LENGTH_RANGES[site.articleLength].join("–")} words.`,
    "Answer first: the opening paragraph directly answers the main question in 2–3 sentences, then expands.",
    site.includeTldr
      ? site.summaryStyle === "key_takeaways"
        ? 'After the opening paragraph add "**Key takeaways:**" followed by 3–5 bullet points.'
        : 'After the opening paragraph add "**TL;DR:**" followed by 3–5 bullet points.'
      : null,
    "Structure with ## and ### headings (no # heading; the title is set separately). Use lists and a markdown table where they make the content easier to scan.",
    site.includeCitation
      ? "Every statistic, figure or factual claim that is not common knowledge must come from the research notes and be linked inline to its source URL with a markdown link. Never invent numbers, studies, quotes or sources."
      : "Base every statistic, figure or factual claim on the research notes, but don't link to external websites. Never invent numbers, studies, quotes or sources.",
    site.includeInternalLinks ? "Link naturally to up to 10 of the listed internal pages (aim for at least 5 when they fit) where they genuinely help the reader, using descriptive anchor text. Use only the listed URLs." : null,
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

const RephraseSchema = z.object({ paragraphs: z.array(z.object({ index: z.number().int(), text: z.string() })) });

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

const planRows = () =>
  db
    .select({ plan: contentPlanItems, keyword: seedKeywords.value, cluster: keywordClusters })
    .from(contentPlanItems)
    .innerJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId));
type PlanRow = Awaited<ReturnType<typeof planRows>>[number];
type Article = typeof articles.$inferSelect;
/** Rewriting an existing article (from the article page) instead of writing a new one. */
type Rewrite = { article: Article; instructions: string | null };

/** Up to three of the website's published articles closest to this topic (shared words in the title). */
async function recommendedReads(site: Site, input: { keyword: string; title: string; exclude?: number }) {
  const words = (text: string) => new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3));
  const topic = words(`${input.keyword} ${input.title}`);
  const published = await db
    .select({ id: articles.id, title: articles.title, url: articles.publishedUrl })
    .from(articles)
    .where(and(eq(articles.orgWebsiteId, site.id), isNotNull(articles.publishedUrl)))
    .orderBy(desc(articles.publishedAt))
    .limit(200);
  return published
    .filter((entry) => entry.id !== input.exclude && entry.url)
    .map((entry) => ({ title: entry.title, url: entry.url!, score: [...words(entry.title)].filter((word) => topic.has(word)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function writeArticle({ site, runDate }: JobContext) {
  const [item] = await planRows()
    .where(and(eq(contentPlanItems.orgWebsiteId, site.id), eq(contentPlanItems.scheduledFor, runDate), isNull(contentPlanItems.articleId)))
    .limit(1);
  if (!item) return { written: false, reason: "No article planned for today" };
  return writeFor(site, item, runDate);
}

/**
 * Rewrites articles the user asked to regenerate (with their instructions, or on a new topic). The
 * article keeps its id, address and platform posts; a published one is updated where it lives.
 */
export async function regenerateArticle({ site, runDate }: JobContext) {
  const results = [];
  // Requests made while this runs are picked up by the next pass.
  for (let pass = 0; pass < 5; pass++) {
    const [item] = await planRows()
      .where(and(eq(contentPlanItems.orgWebsiteId, site.id), isNotNull(contentPlanItems.regenerationRequest)))
      .limit(1);
    if (!item) break;
    const request = item.plan.regenerationRequest!;
    const [article] = await db.select().from(articles).where(and(eq(articles.id, request.articleId), eq(articles.orgWebsiteId, site.id)));
    await db.update(contentPlanItems).set({ regenerationRequest: null, updatedAt: new Date() }).where(eq(contentPlanItems.id, item.plan.id));
    if (!article) continue;
    try {
      results.push(await writeFor(site, item, runDate, { article, instructions: request.instructions }));
    } catch (error) {
      await db.update(contentPlanItems).set({ generationStatus: "generated", updatedAt: new Date() }).where(eq(contentPlanItems.id, item.plan.id));
      throw error;
    }
  }
  return results.length ? { regenerated: results } : { regenerated: [], reason: "Nothing to regenerate" };
}

async function writeFor(site: Site, item: PlanRow, runDate: string, rewrite?: Rewrite) {
  const keyword = item.keyword;
  const instructions = [item.plan.userInstruction, rewrite?.instructions ? `Changes requested for this new version of the article: ${rewrite.instructions}` : null].filter(Boolean).join("\n");
  const articleType = allowedArticleType((item.plan.articleType ?? "guide_explainer") as ArticleType, site.allowedArticleTypes);
  await db.update(contentPlanItems).set({ generationStatus: "generating", updatedAt: new Date() }).where(eq(contentPlanItems.id, item.plan.id));
  await db
    .update(keywordClusters)
    .set({ articleGenerationAttempts: sql`${keywordClusters.articleGenerationAttempts} + 1` })
    .where(eq(keywordClusters.id, item.cluster.id));

  // Products from the catalog to feature (matched to the topic, or chosen by hand).
  const visualErrors: string[] = [];
  const featured = await productsForArticle(site, item.plan, runDate).catch((error: Error) => {
    visualErrors.push(`products: ${error.message}`);
    return [];
  });

  // 1. Research on the live web
  const competingPages = (item.plan.research?.serp ?? []).slice(0, 10).map((r) => `${r.position}. ${r.title} — ${r.url}`).join("\n");
  const research = await ai.research({
    effort: "medium",
    maxSearches: 10,
    system:
      "You research topics for a business blog. Find authoritative, recent sources (official bodies, standards organisations, industry associations, " +
      "peer-reviewed or reputable publications) and concrete facts and statistics. Report what you found as concise notes, each fact followed by its source URL. " +
      "Also list the subtopics and questions the best existing articles cover.",
    prompt: [
      `Topic / target keyword: "${keyword}" (${site.selectedLanguage})`,
      `Planned title: ${item.plan.plannedTitle ?? keyword}`,
      `Business context: ${site.brandName ?? site.url} — ${site.positioning ?? site.description ?? ""}`,
      instructions ? `Instructions from the business: ${instructions}` : "",
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
  let markdownBody = await ai.generateText({
    effort: "high",
    system: writingSystemPrompt(site),
    prompt: [
      `Write ${ARTICLE_TYPE_GUIDE[articleType]} targeting the keyword "${keyword}".`,
      `Working title: ${item.plan.plannedTitle ?? keyword}`,
      item.cluster.keywords.length > 1 ? `Related searches to cover naturally: ${item.cluster.keywords.slice(1, 12).map((k) => k.keyword).join(", ")}` : "",
      instructions ? `Instructions for this article: ${instructions}` : "",
      `\nResearch notes:\n${research.notes}`,
      `\nSources you may cite (use these URLs only):\n${research.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}`,
      site.includeInternalLinks && linkable.length ? `\nInternal pages you may link to:\n${linkable.map((p) => `- ${p.url}${p.title ? ` (${p.title})` : ""}`).join("\n")}` : "",
      productsBrief(featured),
    ].join("\n"),
  });

  // 2b. Plagiarism check against the research sources and the pages ranking for the keyword; copied
  // paragraphs are rewritten in the article's own words once, then checked again.
  const siteOrigin = new URL(site.url).origin;
  const compareWith = [...research.sources.map((source) => source.url), ...(item.plan.research?.serp ?? []).map((result) => result.url)].filter(
    (url) => /^https?:\/\//.test(url) && !url.startsWith(siteOrigin),
  );
  const fetchPage = cachedFetcher();
  let originality = compareWith.length ? await checkOriginality(markdownBody, compareWith, fetchPage).catch(() => null) : null;
  if (originality?.copiedParagraphs.length) {
    try {
      const prose = paragraphs(markdownBody);
      const rewritten = await ai.generateObject({
        schema: RephraseSchema,
        effort: "low",
        system:
          "These paragraphs from a blog article match text on other websites too closely. Rewrite each one in your own words, in the same language and tone, at a similar length. " +
          "Keep every fact, number and markdown link exactly as it is. Return each paragraph with its number.",
        prompt: originality.copiedParagraphs.map((index) => `[${index}] ${prose[index]}`).join("\n\n"),
      });
      for (const paragraph of rewritten.paragraphs) {
        const original = prose[paragraph.index];
        if (original && paragraph.text.trim() && originality.copiedParagraphs.includes(paragraph.index)) markdownBody = markdownBody.replace(original, paragraph.text.trim());
      }
      originality = await checkOriginality(markdownBody, compareWith, fetchPage).catch(() => originality);
    } catch (error) {
      visualErrors.push(`originality: ${(error as Error).message}`);
    }
  }
  const featuredProducts = linkedProducts(markdownBody, featured);

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

  // 4. Exchange links to partner sites, images, CTA cards and video (each optional; a failure here never stops the article)
  let body = markdownBody.trim();
  let placements: Placement[] = [];
  try {
    const placed = await placeBacklinks(site, body, { title: meta.title, keyword });
    body = placed.markdown;
    placements = placed.placements;
  } catch (error) {
    visualErrors.push(`backlinks: ${(error as Error).message}`);
  }
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
  if (site.includeInfographic) {
    try {
      const infographic = await createInfographic(site, { title: meta.title, markdown: body, hero });
      if (infographic) {
        body = infographic.markdown;
        media.push(infographic.media);
        mediaIds.push(infographic.mediaId);
        visualErrors.push(...infographic.errors);
      }
    } catch (error) {
      visualErrors.push(`infographic: ${(error as Error).message}`);
    }
  }
  const blocks: ArticleBlock[] = [];
  try {
    blocks.push(...(await planCtaBlocks(site, { title: meta.title, keyword })));
  } catch (error) {
    visualErrors.push(`cta: ${(error as Error).message}`);
  }
  if (featuredProducts[0]) {
    try {
      const first = featured.find((product) => product.id === featuredProducts[0]!.id);
      blocks.push(await productCard(site, featuredProducts[0], { title: meta.title, keyword }, first?.description ?? null));
    } catch (error) {
      visualErrors.push(`product card: ${(error as Error).message}`);
    }
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

  // 5. Assemble: Sources just before the FAQ, then recommended reads and the disclaimer at the end.
  const origin = new URL(site.url).origin;
  body = formatInternalLinks(body, site.url, { www: site.useWwwInLinks, trailingSlash: site.useTrailingSlashInLinks });
  const citedSources: ResearchSource[] = site.includeCitation ? research.sources.filter((source) => markdownBody.includes(source.url)) : [];
  if (site.includeSourcesSection && citedSources.length) {
    const sources = `## Sources\n\n${citedSources.map((s) => `- [${s.title}](${s.url})`).join("\n")}\n\n`;
    const faq = body.search(/^##\s+(faq|frequently asked)/im);
    body = faq >= 0 ? `${body.slice(0, faq)}${sources}${body.slice(faq)}` : `${body}\n\n${sources.trim()}`;
  }
  const recommended = site.includeRecommendedReads ? await recommendedReads(site, { keyword, title: meta.title, exclude: rewrite?.article.id }) : [];
  const appendix = [
    recommended.length
      ? `\n\n## ${RECOMMENDED_TITLES[site.selectedLanguage.split("-")[0]!] ?? RECOMMENDED_TITLES.en}\n\n${recommended.map((entry) => `- [${entry.title}](${entry.url})`).join("\n")}`
      : "",
    site.articleDisclaimer ? `\n\n---\n\n*${site.articleDisclaimer}*` : "",
  ].join("");
  const markdown = `${body.trim()}${appendix}\n`;
  const links = linksIn(markdownBody);
  const internal = links.filter((url) => url.startsWith(origin)).length;
  const external = links.length - internal;
  const wordCount = markdown.replace(/[#*_>`|[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  // Each article on a site needs its own address: "-2", "-3"… when the slug is taken.
  const baseSlug = slugify(meta.slug || keyword);
  const taken = new Set(
    (await db.select({ slug: articles.slug }).from(articles).where(and(eq(articles.orgWebsiteId, site.id), like(articles.slug, `${baseSlug}%`), rewrite ? ne(articles.id, rewrite.article.id) : undefined))).map((row) => row.slug),
  );
  let slug = baseSlug;
  for (let suffix = 2; taken.has(slug); suffix++) slug = `${baseSlug}-${suffix}`;
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

  const values = {
      orgWebsiteId: site.id,
      keywordClusterId: item.cluster.id,
      title: meta.title,
      slug,
      metaDescription: meta.metaDescription.slice(0, 160),
      languageCode: site.selectedLanguage,
      articleType,
      content: markdown,
      htmlContent: renderArticleHtml(markdown, { blocks, accentColor: safeColor(site.brandColor), toc: site.includeToc ? site.selectedLanguage : null }),
      heroImageUrl: hero?.url ?? null,
      media,
      blocks,
      featuredProducts,
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
      qualityChecks: qualityChecks({ markdown, title: meta.title, metaDescription: meta.metaDescription, internal, external, keyword, semantic: meta.semanticKeywords, media, originality }),
    };

  if (rewrite) {
    // Same row, address and platform posts; a published article keeps its slug so links don't break.
    const previous = rewrite.article;
    const { orgWebsiteId: _site, ...fields } = values;
    void _site;
    await db
      .update(articles)
      .set({ ...fields, slug: previous.publishedUrl ? previous.slug : values.slug, aiImageRegenerationCount: 0, updatedAt: new Date() })
      .where(eq(articles.id, previous.id));
    if (mediaIds.length) await db.update(mediaAssets).set({ articleId: previous.id }).where(inArray(mediaAssets.id, mediaIds));
    // Exchange links that never went live are replaced; live ones stay (the daily check follows them).
    await db.delete(backlinks).where(and(eq(backlinks.articleId, previous.id), isNull(backlinks.becameOnlineAt)));
    await recordPlacements(site, previous.id, placements);
    await db.update(contentPlanItems).set({ articleId: previous.id, generationStatus: "generated", updatedAt: new Date() }).where(eq(contentPlanItems.id, item.plan.id));
    const result = previous.publishedUrl ? await publishArticle(site.id, previous.id, { update: true }) : null;
    await logActivity(site.id, "articleRegenerated", { title: meta.title, articleId: previous.id, publishedUrl: previous.publishedUrl ?? undefined });
    return { articleId: previous.id, words: wordCount, regenerated: true, publishErrors: result?.errors ?? [] };
  }

  const [article] = await db.insert(articles).values(values).returning();

  if (mediaIds.length) await db.update(mediaAssets).set({ articleId: article!.id }).where(inArray(mediaAssets.id, mediaIds));
  await recordPlacements(site, article!.id, placements);
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
  return { articleId: article!.id, words: wordCount, sources: citedSources.length, images: media.length, blocks: blocks.map((block) => block.kind), backlinks: placements.length, products: featuredProducts.length, published };
}
