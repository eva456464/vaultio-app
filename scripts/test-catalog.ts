/**
 * End-to-end check of the product catalog agents with a stand-in AI provider:
 *
 *   npx tsx --tsconfig tsconfig.json scripts/test-catalog.ts <siteId>
 *
 * Needs products in the site's catalog (e.g. from scripts/dev-fixtures/mock-store.py through
 * Settings → Product catalog) and upcoming topics in its content plan. Runs product matching (as
 * Claude would, with a stand-in that picks products sharing a distinctive word with the topic),
 * then writes the first upcoming article that got products and checks they're linked, featured
 * and shown as a card. Local development only: it writes a real article for the site.
 */
import "dotenv/config";
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { articles, contentPlanItems, orgWebsites } from "@/db/schema";
import { productMatching } from "@/server/agents/jobs/catalog";
import { writeArticle } from "@/server/agents/jobs/writer";
import { siteDay } from "@/server/agents/schedule";
import { setAiProvider, type AiProvider } from "@/server/ai/claude";
import { tokens } from "@/server/catalog/matching";

process.env.ANTHROPIC_API_KEY ||= "stand-in";

const GENERIC = new Set(["roof", "roofing", "home", "homeowner", "guide", "cost", "new"]);

const standInAi: AiProvider = {
  async generateObject(request) {
    if (request.system.includes("You choose products")) {
      const articles = [...request.prompt.matchAll(/^\[(\d+)\] (.+)$/gm)].filter((match) => request.prompt.indexOf(match[0]) < request.prompt.indexOf("Products:"));
      const products = [...request.prompt.slice(request.prompt.indexOf("Products:")).matchAll(/^\[(\d+)\] (.+)$/gm)].map((match) => ({ id: Number(match[1]), words: new Set(tokens(match[2]!.split(" — ")[0]!)) }));
      return {
        articles: articles.map((article) => {
          const words = tokens(article[2]!).filter((word) => !GENERIC.has(word));
          return { id: Number(article[1]), products: products.filter((product) => words.some((word) => product.words.has(word))).slice(0, 3).map((product) => product.id) };
        }),
      } as never;
    }
    if (request.system.includes("SEO metadata")) {
      return { title: "Flat Roof Drainage Problems and Fixes", slug: "flat-roof-drainage-problems", metaDescription: "Why water ponds on flat roofs, how to spot drainage problems early, and the fixes that keep a low-slope roof dry for years.", faq: [{ question: "How long can water sit on a flat roof?", answer: "Water should drain within 48 hours." }], whyThisStructure: ["Problem first", "Fixes by cause", "When to call a roofer"], characteristics: ["Practical", "Local", "Clear"], semanticKeywords: ["ponding water", "roof drains", "scuppers"] } as never;
    }
    if (request.system.includes("product card")) return { pitch: "A reflective coating seals hairline cracks so water can't get under the membrane while you fix the drainage.", buttonLabel: "View product" } as never;
    throw new Error(`Stand-in has no answer for: ${request.system.slice(0, 60)}`);
  },
  async generateText(request) {
    // Writes like Claude would with the product brief: each listed product linked once, in context.
    const listed = [...request.prompt.matchAll(/^- (.+?) — (https?:\/\/\S+)/gm)].map((match) => ({ name: match[1]!, url: match[2]! }));
    const mentions = listed.map((product, index) => (index === 0 ? `A coat of [${product.name}](${product.url}) seals hairline cracks while you sort out the drains.` : `For the edges, [${product.name}](${product.url}) helps too.`));
    return [
      "Water that sits on a flat roof for more than two days shortens the membrane's life.",
      "",
      "## Why water ponds on flat roofs",
      "",
      "Clogged drains, sagging decking and missing tapered insulation are the usual causes.",
      "",
      "## How to fix drainage problems",
      "",
      `Clear the drains and scuppers first. ${mentions.join(" ")}`.trim(),
      "",
      "Add tapered insulation where water collects.",
      "",
      "## FAQ",
      "",
      "### How long can water sit on a flat roof?",
      "",
      "No more than 48 hours.",
    ].join("\n");
  },
  async research() {
    return { notes: "NRCA: flat roofs should drain within 48 hours (https://www.nrca.example/drainage).", sources: [{ url: "https://www.nrca.example/drainage", title: "NRCA drainage guide" }] };
  },
  async answer() {
    throw new Error("not used");
  },
};

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

async function main() {
  const siteId = Number(process.argv[2]);
  if (!siteId) throw new Error("Usage: tsx scripts/test-catalog.ts <siteId>");
  setAiProvider(standInAi);
  const [saved] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!saved) throw new Error("Site not found");
  const site = { ...saved, autoPublish: false };
  const today = siteDay(new Date(), site.timeZone);

  // Match from scratch.
  await db.update(contentPlanItems).set({ productsMatchedAt: null, proposedProductIds: [] }).where(and(eq(contentPlanItems.orgWebsiteId, siteId), eq(contentPlanItems.productsCustomized, false)));
  const matching = await productMatching({ site, runDate: today });
  console.log("matching:", JSON.stringify(matching));
  const upcoming = await db
    .select()
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.orgWebsiteId, siteId), gte(contentPlanItems.scheduledFor, today), isNull(contentPlanItems.articleId)))
    .orderBy(contentPlanItems.scheduledFor);
  for (const item of upcoming) if (item.proposedProductIds.length) console.log(`  ${item.scheduledFor} ${item.plannedTitle}: ${item.proposedProductIds.join(", ")}`);
  check(matching.matched > 0, "products matched to upcoming topics");
  check(upcoming.some((item) => !item.proposedProductIds.length), "topics without a fitting product get none");
  const again = await productMatching({ site, runDate: today });
  check(again.topics === 0, "nothing to match again while the catalog is unchanged");

  const target = upcoming.find((item) => item.proposedProductIds.length);
  if (!target) return;
  const outcome = (await writeArticle({ site, runDate: target.scheduledFor })) as { articleId?: number; products?: number };
  console.log("writer:", JSON.stringify(outcome));
  const [article] = await db.select().from(articles).where(eq(articles.id, outcome.articleId!));
  check(article!.featuredProducts.length === target.proposedProductIds.length, "every proposed product is linked and recorded as featured");
  check(article!.featuredProducts.every((product) => article!.content!.includes(`](${product.url})`)), "product links are in the article");
  const card = article!.blocks.find((block) => block.kind === "product");
  check(Boolean(card) && article!.htmlContent!.includes("vaultio-product"), "a product card is in the article");
  const cardAt = article!.content!.indexOf("<!-- vaultio:block");
  const linkAt = article!.content!.indexOf(`](${article!.featuredProducts[0]!.url})`);
  check(cardAt > linkAt && cardAt < article!.content!.indexOf("## FAQ"), "the card follows the paragraph that links the product, before the FAQ");
  console.log("article:", article!.id, article!.title);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
