"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { articles, integrations } from "@/db/schema";
import { images } from "../ai/images";
import { editorHtmlToMarkdown } from "../articles/document";
import { saveArticleContent } from "../articles/save";
import { imagePrompt } from "../articles/visuals";
import { getAppContext } from "../context";
import { storeImage } from "../media";
import { PUBLISHING_TYPES } from "../publishing/publish";

/** AI images per article, shared by cover regeneration and images made in the editor (each one is a paid request). */
const MAX_AI_IMAGES = 5;
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function editableArticle(articleId: number) {
  const context = await getAppContext();
  const site = context?.site;
  if (!site || context.member?.role !== "admin") throw new Error("Only workspace admins can edit articles");
  const [article] = await db.select().from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, site.id)));
  if (!article) throw new Error("Article not found");
  return { site, article };
}

const refresh = () => {
  revalidatePath("/[locale]/dashboard/articles/[id]", "page");
  revalidatePath("/[locale]/dashboard/content-plan", "page");
};

const saveSchema = z.object({
  title: z.string().trim().min(3, "Give the article a title").max(200, "Keep the title under 200 characters"),
  html: z.string().max(2_000_000),
  metaDescription: z.string().trim().max(300, "Keep the meta description under 300 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, "Keep the slug under 100 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes in the slug"),
});

type SaveResult = { ok: true; republish: boolean } | { error: string };

/** Saves the editor's content. A published article on a pushed platform needs "Re-Publish" to update there. */
export async function saveArticle(articleId: number, input: z.input<typeof saveSchema>): Promise<SaveResult> {
  try {
    const { site, article } = await editableArticle(articleId);
    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]!.message };
    const { title, html, metaDescription, slug } = parsed.data;
    if (slug !== article.slug) {
      const [taken] = await db.select({ id: articles.id }).from(articles).where(and(eq(articles.orgWebsiteId, site.id), eq(articles.slug, slug), ne(articles.id, article.id)));
      if (taken) return { error: "Another article already uses this slug" };
    }
    const converted = editorHtmlToMarkdown(html, article.blocks);
    if (converted.markdown.trim().length < 20) return { error: "The article is empty" };
    await saveArticleContent(site, article, { markdown: converted.markdown, blocks: converted.blocks, title, metaDescription, slug });
    refresh();
    // Hosted blog, API, Framer, Lovable and Duda read the saved article; other platforms need a re-publish.
    const pushed = article.publishedUrl
      ? await db
          .select({ type: integrations.type })
          .from(integrations)
          .where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.status, "connected")))
          .then((rows) => rows.some((row) => (PUBLISHING_TYPES as readonly string[]).includes(row.type) && !["hosted_blog", "duda"].includes(row.type)))
      : false;
    return { ok: true, republish: pushed };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

type ImageResult = { ok: true; url: string; altText: string; remaining?: number } | { error: string };

/** An image the user uploads into the article (JPEG, PNG or WebP up to 6 MB). */
export async function uploadArticleImage(articleId: number, form: FormData): Promise<ImageResult> {
  try {
    const { site, article } = await editableArticle(articleId);
    const file = form.get("file");
    if (!(file instanceof File)) return { error: "Choose an image" };
    if (!UPLOAD_TYPES.includes(file.type)) return { error: "Use a JPEG, PNG, or WebP image." };
    if (file.size > MAX_UPLOAD_BYTES) return { error: "Image exceeds the 6MB limit." };
    const stored = await storeImage({ siteId: site.id, articleId: article.id, kind: "upload", bytes: Buffer.from(await file.arrayBuffer()) });
    const altText = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim().slice(0, 120);
    return { ok: true, url: stored.url, altText };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/** A new AI image for the article, in the site's body-image style. Uses the article's AI image budget. */
export async function generateArticleImage(articleId: number, description: string): Promise<ImageResult> {
  try {
    const { site, article } = await editableArticle(articleId);
    const scene = description.trim().slice(0, 600);
    if (scene.length < 5) return { error: "Describe the image you want" };
    if (!images.available()) return { error: "No image provider is configured (OPENAI_API_KEY or GEMINI_API_KEY)" };
    if (article.aiImageRegenerationCount >= MAX_AI_IMAGES) return { error: `This article already used its ${MAX_AI_IMAGES} AI images` };
    const prompt = imagePrompt(site, { kind: "body", scene });
    const generated = await images.generate({ prompt, shape: "landscape" });
    const stored = await storeImage({ siteId: site.id, articleId: article.id, kind: "body", bytes: generated.bytes, prompt, model: generated.model });
    await db
      .update(articles)
      .set({ aiImageRegenerationCount: article.aiImageRegenerationCount + 1 })
      .where(eq(articles.id, article.id));
    const altText = scene.split(/(?<=[.!?])\s/)[0]!.replace(/[.!?]$/, "").slice(0, 125);
    return { ok: true, url: stored.url, altText, remaining: MAX_AI_IMAGES - article.aiImageRegenerationCount - 1 };
  } catch (error) {
    return { error: (error as Error).message || "The image could not be generated. Please try again." };
  }
}
