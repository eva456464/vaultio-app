/**
 * Products in a new article: which ones it features, how the writer is told about them, which
 * ones it actually linked, and the product card placed after the paragraph that links the first.
 */
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { contentPlanItems, products, type ArticleBlock, type FeaturedProduct } from "@/db/schema";
import { formatPrice } from "@/lib/catalog";
import { ai } from "@/server/ai/claude";
import type { Site } from "../agents/jobs/types";
import { featurable } from "./catalog";
import { effectiveProductIds, matchTopics, staleTopics } from "./matching";

type Product = typeof products.$inferSelect;
type Plan = typeof contentPlanItems.$inferSelect;

/** The products to feature, matching the topic first if its proposal is out of date. */
export async function productsForArticle(site: Site, plan: Plan, runDate: string): Promise<Product[]> {
  let current = plan;
  if (!plan.productsCustomized) {
    const stale = (await staleTopics(site.id, runDate)).find((topic) => topic.id === plan.id);
    if (stale) {
      await matchTopics(site, [stale]);
      [current] = await db.select().from(contentPlanItems).where(eq(contentPlanItems.id, plan.id));
    }
  }
  const ids = effectiveProductIds(current ?? plan);
  if (!ids.length) return [];
  const rows = await db.select().from(products).where(and(featurable(site.id), inArray(products.id, ids)));
  return ids.flatMap((id) => rows.filter((row) => row.id === id));
}

export function productsBrief(featured: Product[]) {
  if (!featured.length) return "";
  return [
    "\nProducts from the business's own catalog to feature. Link each one at most once, using its name as the link text and its exact URL, in the section where it genuinely helps the reader. " +
      "Describe only what is written here: never invent features, prices, stock or discounts. Leave a product out if it doesn't fit the article.",
    ...featured.map((product) =>
      [
        `- ${product.name} — ${product.url}`,
        product.price ? `${product.price} ${product.currency ?? ""}`.trim() : null,
        product.brand,
        product.category,
        product.description ? product.description.slice(0, 240) : null,
      ]
        .filter(Boolean)
        .join(" — "),
    ),
  ].join("\n");
}

/** Products the article really links to, as they were when it was written. */
export function linkedProducts(markdown: string, featured: Product[]): FeaturedProduct[] {
  return featured
    .filter((product) => product.url && markdown.includes(`](${product.url})`))
    .map((product) => ({ id: product.id, name: product.name, url: product.url!, imageUrl: product.imageUrl, price: product.price, currency: product.currency }));
}

const CardSchema = z.object({ pitch: z.string(), buttonLabel: z.string() });

/** A card for the first product the article links: its photo, price, one sentence and a button. */
export async function productCard(site: Site, product: FeaturedProduct, input: { title: string; keyword: string }, description: string | null): Promise<ArticleBlock> {
  const card = await ai.generateObject({
    schema: CardSchema,
    effort: "low",
    maxTokens: 400,
    system:
      `You write a product card for a blog article, in the article's language (${site.selectedLanguage}). pitch: one sentence (max 25 words) on why this product helps a reader of the article, ` +
      "using only the facts given; no prices, discounts or claims that aren't given. buttonLabel: 2–4 words, e.g. \"View product\".",
    prompt: [`Article: ${input.title} (keyword: ${input.keyword})`, `Product: ${product.name}`, description ? `About it: ${description.slice(0, 500)}` : ""].join("\n"),
  });
  return {
    kind: "product",
    productId: product.id,
    name: product.name,
    url: product.url,
    imageUrl: product.imageUrl,
    priceLabel: formatPrice(product.price, product.currency, site.selectedLanguage),
    pitch: card.pitch.trim().slice(0, 240),
    buttonLabel: card.buttonLabel.trim().slice(0, 40) || "View product",
  };
}
