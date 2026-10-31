/** AI visibility agent: asks AI assistants the tracked questions and records who they mention and cite. */
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { llmAnswers, llmPrompts, type LlmBrandMention, type LlmSource } from "@/db/schema";
import { assistants, type AssistantAnswer } from "@/server/ai/assistants";
import { ai } from "@/server/ai/claude";
import { logActivity } from "../activity";
import type { JobContext, Site } from "./types";

const BrandsSchema = z.object({
  answers: z.array(
    z.object({
      index: z.number(),
      brands: z.array(z.object({ name: z.string(), url: z.string().nullable(), sentiment: z.number() })),
    }),
  ),
});

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function classifySource(url: string): string {
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (/\/(blog|news|article|guides?|learn|resources?)\//.test(path)) return "blog";
  if (/(reddit|quora|forum|community)/.test(url)) return "forum";
  if (/(yelp|g2|capterra|trustpilot|clutch|tripadvisor|angi|houzz)/.test(url)) return "review_site";
  if (path === "/" || path === "") return "homepage";
  return "page";
}

/** True when the answer names the brand or links to the site. */
function mentionsSite(site: Site, answer: AssistantAnswer) {
  const domain = host(site.url);
  const text = answer.answer.toLowerCase();
  const names = [site.brandName, domain, domain.split(".")[0]].filter((name): name is string => Boolean(name && name.length > 2)).map((name) => name.toLowerCase());
  return names.some((name) => text.includes(name)) || answer.sources.some((source) => host(source.url) === domain);
}

/** Extracts the brands each answer names, with a 0–100 sentiment, in one call per prompt. */
async function extractBrands(site: Site, question: string, answers: AssistantAnswer[]) {
  const result = await ai.generateObject({
    schema: BrandsSchema,
    effort: "low",
    system:
      "You read AI assistant answers and list every company, brand, product or service provider each answer names. " +
      "Use the name as written, its website if the answer gives one (else null), and how favourably the answer presents it from 0 (very negative) to 100 (very positive), 50 being neutral. " +
      "Skip generic categories and the AI assistants themselves.",
    prompt: [`Question: ${question}`, ...answers.map((a, index) => `\n--- Answer ${index} ---\n${a.answer.slice(0, 12_000)}`)].join("\n"),
  });
  const own = [site.brandName?.toLowerCase(), host(site.url)].filter(Boolean);
  return answers.map((_, index) => {
    const entry = result.answers.find((item) => item.index === index);
    return (entry?.brands ?? []).map((brand): LlmBrandMention => ({
      brandName: brand.name,
      brandUrl: brand.url ?? undefined,
      sentiment: Math.max(0, Math.min(100, Math.round(brand.sentiment))),
      isOwnBrand: own.some((name) => brand.name.toLowerCase().includes(name!) || (brand.url ? host(brand.url) === host(site.url) : false)),
    }));
  });
}

export async function aiVisibilityCheck({ site }: JobContext) {
  const prompts = await db.select().from(llmPrompts).where(and(eq(llmPrompts.orgWebsiteId, site.id), eq(llmPrompts.isActive, true)));
  const providers = assistants.available();
  if (!prompts.length) throw new Error("No AI prompts to check yet");
  if (!providers.length) throw new Error("No AI assistant is configured");

  const checkedAt = new Date();
  let answersStored = 0;
  let mentions = 0;
  for (const prompt of prompts) {
    const answers: AssistantAnswer[] = [];
    for (const provider of providers) {
      try {
        answers.push(await assistants.ask(provider, prompt.prompt));
      } catch (error) {
        console.error(`[visibility] ${provider} failed for prompt ${prompt.id}:`, (error as Error).message);
      }
    }
    if (!answers.length) continue;
    const brands = await extractBrands(site, prompt.prompt, answers);
    for (const [index, answer] of answers.entries()) {
      const mentioned = mentionsSite(site, answer) || brands[index]!.some((brand) => brand.isOwnBrand);
      const sources: LlmSource[] = answer.sources.map((source) => ({ url: source.url, domain: host(source.url), sourceType: classifySource(source.url) }));
      const ownSentiment = brands[index]!.find((brand) => brand.isOwnBrand)?.sentiment ?? null;
      await db.insert(llmAnswers).values({
        promptId: prompt.id,
        orgWebsiteId: site.id,
        llmProvider: answer.provider,
        llmModel: answer.model,
        answer: answer.answer,
        orgWebsiteMentioned: mentioned,
        sentiment: ownSentiment,
        sources,
        brands: brands[index]!,
        checkedAt,
      });
      answersStored++;
      if (mentioned) mentions++;
    }
    await db.update(llmPrompts).set({ lastCheckedAt: checkedAt, updatedAt: new Date() }).where(eq(llmPrompts.id, prompt.id));
  }

  await logActivity(site.id, "aiVisibilityCheck", { count: prompts.length, total: mentions });
  return { prompts: prompts.length, answers: answersStored, mentions };
}
