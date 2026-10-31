/**
 * Matches catalog products to upcoming articles (up to 3 each). Products are shortlisted by the
 * distinctive words they share with the topic, then Claude picks the ones a reader of that article
 * would genuinely want, or none. Without Claude, a distinctive word of the product's name has to
 * be in the topic.
 * A topic whose products were chosen by hand is left alone.
 */
import { and, eq, gte, inArray, isNull, max } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { contentPlanItems, keywordClusters, products, seedKeywords } from "@/db/schema";
import { ai } from "@/server/ai/claude";
import type { Site } from "../agents/jobs/types";
import { catalogOwnerId, featurable } from "./catalog";

export const MAX_PRODUCTS_PER_ARTICLE = 3;
const ALL_PRODUCTS_UP_TO = 80;
const SHORTLIST = 15;
const BATCH = 10;

const STOPWORDS = new Set(
  "the and for with your you are how what why when which best top from that this into our out can does not have has was were will about more most than then them they their there these those also just only very much many some any each every other new get use using vs versus guide tips ideas".split(" "),
);

export function tokens(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .map((word) => (word.endsWith("ies") && word.length > 4 ? `${word.slice(0, -3)}y` : word.endsWith("es") && word.length > 4 ? word.slice(0, -2) : word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word));
}

type Candidate = { id: number; name: string; description: string | null; brand: string | null; category: string | null; price: string | null; currency: string | null };
type Topic = { id: number; text: string; title: string };

/**
 * Word weights for one catalog and set of topics: words in many product names or most topics
 * (like "roof" for a roofer) say nothing about fit and count for nothing; rare words count most.
 */
export function wordWeights(catalog: Candidate[], topicTexts: string[]) {
  const productWords = catalog.map((product) => new Set(tokens(`${product.name} ${product.category ?? ""} ${product.brand ?? ""}`)));
  const topicWords = topicTexts.map((text) => new Set(tokens(text)));
  const share = (sets: Set<string>[], word: string) => (sets.length ? sets.filter((set) => set.has(word)).length / sets.length : 0);
  const cache = new Map<string, number>();
  return (word: string) => {
    if (cache.has(word)) return cache.get(word)!;
    const inProducts = share(productWords, word);
    const common = (catalog.length >= 3 && inProducts > 0.34) || (topicTexts.length >= 5 && share(topicWords, word) > 0.4);
    const weight = common ? 0 : Math.log(1 + 1 / Math.max(inProducts, 1 / Math.max(catalog.length, 1)));
    cache.set(word, weight);
    return weight;
  };
}

/** How well a product's words fit a topic: its name counts most, then category and brand, then description. */
export function relevance(product: Candidate, topicWords: Set<string>, weight: (word: string) => number = () => 1) {
  const score = (text: string | null) => [...new Set(tokens(text ?? ""))].filter((word) => topicWords.has(word)).reduce((total, word) => total + weight(word), 0);
  const name = score(product.name);
  return { name, total: name * 3 + score(`${product.category ?? ""} ${product.brand ?? ""}`) * 2 + score((product.description ?? "").slice(0, 400)) };
}

const PickSchema = z.object({ articles: z.array(z.object({ id: z.number(), products: z.array(z.number()) })) });

async function pickWithClaude(site: Site, topics: Topic[], candidates: Candidate[]) {
  const result = await ai.generateObject({
    schema: PickSchema,
    effort: "low",
    maxTokens: 2000,
    system:
      `You choose products from a business's own catalog to feature in its upcoming blog articles. For each article, pick up to ${MAX_PRODUCTS_PER_ARTICLE} products ` +
      "a reader of that article would genuinely want to see or buy, best fit first, or none when nothing fits. Never pick a product just to have one, " +
      "and only use product ids from the list.",
    prompt: [
      `Business: ${site.brandName ?? site.url}`,
      `Articles:\n${topics.map((topic) => `[${topic.id}] ${topic.text}`).join("\n")}`,
      `Products:\n${candidates
        .map((product) =>
          `[${product.id}] ${product.name}${product.category ? ` — ${product.category}` : ""}${product.brand ? ` — ${product.brand}` : ""}${product.price ? ` — ${product.price} ${product.currency ?? ""}` : ""}${product.description ? ` — ${product.description.slice(0, 160)}` : ""}`,
        )
        .join("\n")}`,
    ].join("\n\n"),
  });
  const allowed = new Set(candidates.map((product) => product.id));
  return new Map(result.articles.map((article) => [article.id, [...new Set(article.products.filter((id) => allowed.has(id)))].slice(0, MAX_PRODUCTS_PER_ARTICLE)]));
}

/** Proposes products for the given topics; returns how many topics got at least one. */
export async function matchTopics(site: Site, topics: Topic[]) {
  if (!topics.length) return 0;
  const catalog: Candidate[] = await db
    .select({ id: products.id, name: products.name, description: products.description, brand: products.brand, category: products.category, price: products.price, currency: products.currency })
    .from(products)
    .where(featurable(catalogOwnerId(site)));
  const chosen = new Map<number, number[]>();
  if (catalog.length) {
    const weight = wordWeights(catalog, topics.map((topic) => topic.text));
    for (let index = 0; index < topics.length; index += BATCH) {
      const batch = topics.slice(index, index + BATCH);
      const scored = new Map(batch.map((topic) => {
        const words = new Set(tokens(topic.text));
        const ranked = catalog.map((product) => ({ product, ...relevance(product, words, weight) })).filter((entry) => entry.total > 0).sort((a, b) => b.total - a.total);
        return [topic.id, ranked];
      }));
      if (process.env.ANTHROPIC_API_KEY) {
        // Small catalogs go to Claude whole (it sees fits that share no words); big ones as shortlists.
        const candidates = catalog.length <= ALL_PRODUCTS_UP_TO ? catalog : [...new Map([...scored.values()].flatMap((list) => list.slice(0, SHORTLIST)).map((entry) => [entry.product.id, entry.product])).values()];
        if (candidates.length) for (const [id, picked] of await pickWithClaude(site, batch, candidates)) chosen.set(id, picked);
      } else {
        // Without Claude, only a distinctive word of the product's own name in the topic counts.
        for (const [id, list] of scored) chosen.set(id, list.filter((entry) => entry.name > 0).slice(0, MAX_PRODUCTS_PER_ARTICLE).map((entry) => entry.product.id));
      }
    }
  }
  const now = new Date();
  for (const topic of topics) {
    await db
      .update(contentPlanItems)
      .set({ proposedProductIds: chosen.get(topic.id) ?? [], productsMatchedAt: now, updatedAt: now })
      .where(and(eq(contentPlanItems.id, topic.id), eq(contentPlanItems.productsCustomized, false)));
  }
  return topics.filter((topic) => (chosen.get(topic.id) ?? []).length).length;
}

/** Upcoming topics (not written yet, products not chosen by hand) with their matching text. */
export async function upcomingTopics(siteId: number, fromDay: string, ids?: number[]) {
  const rows = await db
    .select({ plan: contentPlanItems, keyword: seedKeywords.value, cluster: keywordClusters.keywords })
    .from(contentPlanItems)
    .leftJoin(keywordClusters, eq(keywordClusters.id, contentPlanItems.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(contentPlanItems.orgWebsiteId, siteId), gte(contentPlanItems.scheduledFor, fromDay), isNull(contentPlanItems.articleId), eq(contentPlanItems.productsCustomized, false), ...(ids ? [inArray(contentPlanItems.id, ids)] : [])));
  return rows.map((row) => {
    const title = row.plan.plannedTitle ?? row.keyword ?? "";
    const related = (row.cluster ?? []).slice(0, 6).map((entry) => entry.keyword);
    return { id: row.plan.id, title, text: [title, row.keyword && row.keyword !== title ? `(keyword: ${row.keyword})` : "", related.length ? `related: ${related.join(", ")}` : ""].filter(Boolean).join(" "), plan: row.plan };
  });
}

/**
 * Topics whose proposals are out of date: never matched, matched before the catalog last changed,
 * or proposing a product that can no longer be featured.
 */
export async function staleTopics(site: { id: number; primaryOrgWebsiteId: number | null }, fromDay: string) {
  const topics = await upcomingTopics(site.id, fromDay);
  const owner = catalogOwnerId(site);
  const [latest] = await db.select({ at: max(products.updatedAt) }).from(products).where(featurable(owner));
  const usable = new Set((await db.select({ id: products.id }).from(products).where(featurable(owner))).map((row) => row.id));
  return topics.filter(({ plan }) => !plan.productsMatchedAt || (latest?.at && plan.productsMatchedAt < latest.at) || plan.proposedProductIds.some((id) => !usable.has(id)));
}

/** The products an article features: chosen by hand, or else the agent's proposal. */
export const effectiveProductIds = (plan: { productsCustomized: boolean; selectedProductIds: number[]; proposedProductIds: number[] }) =>
  plan.productsCustomized ? plan.selectedProductIds : plan.proposedProductIds;
