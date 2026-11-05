"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { articles, backlinkCreditLedger, contentPlanItems, keywordClusters, seedKeywords } from "@/db/schema";
import { siteDay } from "../agents/schedule";
import { rerunAgentJob } from "../agents/queue";
import { images } from "../ai/images";
import { createArticleImages } from "../articles/visuals";
import { getAppContext } from "../context";
import { publishArticle, unpublishArticle } from "../publishing/publish";

/** Cover regenerations allowed per article (each one is a paid image request). */
const MAX_COVER_REGENERATIONS = 5;

type Result = { ok: true; publishErrors: string[] } | { error: string };

/** Makes a new cover in the current Visuals style; a published article is updated on the client's site. */
export async function regenerateCover(articleId: number): Promise<Result> {
  const context = await getAppContext();
  const site = context?.site;
  if (!site || context.member?.role !== "admin") return { error: "Only workspace admins can change articles" };
  const [article] = await db.select().from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, site.id)));
  if (!article) return { error: "Article not found" };
  if (!images.available()) return { error: "No image provider is configured (OPENAI_API_KEY or GEMINI_API_KEY)" };
  if (article.aiImageRegenerationCount >= MAX_COVER_REGENERATIONS) return { error: `This cover was already regenerated ${MAX_COVER_REGENERATIONS} times` };

  const current = article.media.find((item) => item.identifier === "hero_image");
  const created = await createArticleImages(site, {
    title: article.title,
    articleId: article.id,
    plan: { cover: { scene: current?.scene ?? `the subject of the article "${article.title}"`, altText: current?.altText ?? article.title }, body: [] },
  });
  if (!created.hero) return { error: created.errors[0] ?? "The image could not be generated" };

  await db
    .update(articles)
    .set({
      heroImageUrl: created.hero.url,
      media: [created.hero, ...article.media.filter((item) => item.identifier !== "hero_image")],
      aiImageRegenerationCount: article.aiImageRegenerationCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, article.id));
  const published = article.publishedUrl ? await publishArticle(site.id, article.id, { update: true }) : null;
  revalidatePath("/[locale]/dashboard/articles/[id]", "page");
  return { ok: true, publishErrors: published?.errors ?? [] };
}

async function adminArticle(articleId: number) {
  const context = await getAppContext();
  const site = context?.site;
  if (!site || context.member?.role !== "admin") throw new Error("Only workspace admins can change articles");
  const [article] = await db.select().from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, site.id)));
  if (!article) throw new Error("Article not found");
  return { site, article };
}

const refreshArticle = () => {
  revalidatePath("/[locale]/dashboard/articles/[id]", "page");
  revalidatePath("/[locale]/dashboard/content-plan", "page");
};

type Simple = { ok: true } | { error: string };

/** "Are you happy with the article?": the first answer on an article earns a backlink credit. */
export async function sendArticleFeedback(articleId: number, input: { happy: boolean; comment?: string }): Promise<Simple & { credit?: boolean }> {
  try {
    const { site, article } = await adminArticle(articleId);
    const first = article.isHappyFeedback === null;
    await db
      .update(articles)
      .set({ isHappyFeedback: input.happy, feedbackComment: input.comment?.trim().slice(0, 2000) || null, updatedAt: new Date() })
      .where(eq(articles.id, article.id));
    if (first) await db.insert(backlinkCreditLedger).values({ orgWebsiteId: site.id, delta: 1, reason: "article_feedback" });
    refreshArticle();
    return { ok: true, credit: first };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Rewrites the article in the background: with the user's instructions, or on a new topic (one of the
 * plan's unused topics, or their own). The article keeps its address and platform posts.
 */
export async function regenerateArticle(articleId: number, input: { instructions?: string; clusterId?: number; topic?: string }): Promise<Simple> {
  try {
    const { site, article } = await adminArticle(articleId);
    const [item] = await db.select().from(contentPlanItems).where(and(eq(contentPlanItems.articleId, article.id), eq(contentPlanItems.orgWebsiteId, site.id)));
    if (!item) return { error: "This article isn't in the content plan, so it can't be regenerated" };
    if (item.regenerationRequest) return { error: "This article is already being regenerated" };
    const instructions = input.instructions?.trim().slice(0, 1000) || null;
    const topic = input.topic?.trim().toLowerCase().slice(0, 120);

    let clusterId: number | null = null;
    if (input.clusterId) {
      const [cluster] = await db
        .select({ id: keywordClusters.id })
        .from(keywordClusters)
        .where(and(eq(keywordClusters.id, input.clusterId), eq(keywordClusters.orgWebsiteId, site.id), eq(keywordClusters.isUsed, false)));
      if (!cluster) return { error: "That topic is no longer available" };
      clusterId = cluster.id;
    } else if (topic && topic.length >= 3) {
      const [seed] = await db.insert(seedKeywords).values({ value: topic, languageCode: site.selectedLanguage, articleType: "guide_explainer" }).returning();
      const [cluster] = await db.insert(keywordClusters).values({ orgWebsiteId: site.id, seedKeywordId: seed!.id, keywords: [{ keyword: topic }], creationSource: "user", isUsed: false }).returning();
      clusterId = cluster!.id;
    }

    await db.transaction(async (tx) => {
      if (clusterId) {
        if (item.keywordClusterId) await tx.update(keywordClusters).set({ isUsed: false }).where(eq(keywordClusters.id, item.keywordClusterId));
        await tx.update(keywordClusters).set({ isUsed: true }).where(eq(keywordClusters.id, clusterId));
        await tx.update(articles).set({ keywordClusterId: clusterId }).where(eq(articles.id, article.id));
      }
      await tx
        .update(contentPlanItems)
        .set({
          ...(clusterId ? { keywordClusterId: clusterId, plannedTitle: null, whyThisTopic: [], research: null } : {}),
          regenerationRequest: { articleId: article.id, instructions, reason: clusterId ? "topic" : "content", requestedAt: new Date().toISOString() },
          generationStatus: "generating",
          updatedAt: new Date(),
        })
        .where(eq(contentPlanItems.id, item.id));
    });
    await rerunAgentJob(site.id, "regenerateArticle", siteDay(new Date(), site.timeZone));
    refreshArticle();
    return { ok: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/** Takes the article off the hosted blog, API and feeds, and turns its platform posts into drafts. */
export async function unpublishArticleNow(articleId: number): Promise<Simple & { errors?: string[] }> {
  try {
    const { site, article } = await adminArticle(articleId);
    if (!article.publishedUrl) return { error: "This article isn't published" };
    const result = await unpublishArticle(site.id, article.id);
    refreshArticle();
    return { ok: true, errors: result.errors };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/** Sends the current version of a published article to every connected platform again. */
export async function republishArticle(articleId: number): Promise<Simple & { errors?: string[] }> {
  try {
    const { site, article } = await adminArticle(articleId);
    const result = await publishArticle(site.id, article.id, { update: Boolean(article.publishedUrl) });
    refreshArticle();
    return { ok: true, errors: result.errors };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

