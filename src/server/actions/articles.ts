"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { images } from "../ai/images";
import { createArticleImages } from "../articles/visuals";
import { getAppContext } from "../context";
import { publishArticle } from "../publishing/publish";

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
