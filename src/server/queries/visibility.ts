import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { llmAnswers, llmPrompts } from "@/db/schema";

type Answer = typeof llmAnswers.$inferSelect;
type Prompt = typeof llmPrompts.$inferSelect;

export type BrandRow = { name: string; url: string | null; answers: number; visibility: number; sentiment: number | null; isOwnBrand: boolean };
export type SourceRow = { domain: string; citations: number; share: number; urls: string[] };

/** Most recent answer per prompt and assistant: the "current" state of AI visibility. */
function latestAnswers(answers: Answer[]) {
  const latest = new Map<string, Answer>();
  for (const answer of answers) {
    const key = `${answer.promptId}:${answer.llmProvider}`;
    if (!latest.has(key)) latest.set(key, answer);
  }
  return [...latest.values()];
}

function brandsOf(answers: Answer[]): BrandRow[] {
  const brands = new Map<string, { name: string; url: string | null; answers: Set<number>; sentiments: number[]; own: boolean }>();
  for (const answer of answers) {
    for (const brand of answer.brands) {
      const key = brand.brandName.toLowerCase().trim();
      const entry = brands.get(key) ?? { name: brand.brandName, url: brand.brandUrl ?? null, answers: new Set<number>(), sentiments: [], own: false };
      entry.answers.add(answer.id);
      if (typeof brand.sentiment === "number") entry.sentiments.push(brand.sentiment);
      entry.own ||= Boolean(brand.isOwnBrand);
      entry.url ??= brand.brandUrl ?? null;
      brands.set(key, entry);
    }
  }
  return [...brands.values()]
    .map((entry) => ({
      name: entry.name,
      url: entry.url,
      answers: entry.answers.size,
      visibility: answers.length ? Math.round((entry.answers.size / answers.length) * 100) : 0,
      sentiment: entry.sentiments.length ? Math.round(entry.sentiments.reduce((a, b) => a + b, 0) / entry.sentiments.length) : null,
      isOwnBrand: entry.own,
    }))
    .sort((a, b) => b.answers - a.answers || a.name.localeCompare(b.name));
}

function sourcesOf(answers: Answer[]): SourceRow[] {
  const domains = new Map<string, { citations: number; urls: Set<string> }>();
  let total = 0;
  for (const answer of answers) {
    for (const source of answer.sources) {
      if (!source.domain) continue;
      const entry = domains.get(source.domain) ?? { citations: 0, urls: new Set<string>() };
      entry.citations++;
      entry.urls.add(source.url);
      domains.set(source.domain, entry);
      total++;
    }
  }
  return [...domains.entries()]
    .map(([domain, entry]) => ({ domain, citations: entry.citations, share: total ? Math.round((entry.citations / total) * 1000) / 10 : 0, urls: [...entry.urls] }))
    .sort((a, b) => b.citations - a.citations);
}

export async function getVisibility(siteId: number) {
  const [prompts, answers] = await Promise.all([
    db.select().from(llmPrompts).where(eq(llmPrompts.orgWebsiteId, siteId)).orderBy(asc(llmPrompts.createdAt)),
    db.select().from(llmAnswers).where(eq(llmAnswers.orgWebsiteId, siteId)).orderBy(desc(llmAnswers.checkedAt)),
  ]);
  const activeIds = new Set(prompts.filter((prompt) => prompt.isActive).map((prompt) => prompt.id));
  const current = latestAnswers(answers).filter((answer) => activeIds.has(answer.promptId));
  const mentions = current.filter((answer) => answer.orgWebsiteMentioned).length;
  const providers = [...new Set(current.map((answer) => answer.llmProvider))];

  // One point per check run (answers saved with the same timestamp belong to one run).
  const runs = new Map<string, { answers: number; mentions: number }>();
  for (const answer of answers) {
    const day = answer.checkedAt.toISOString().slice(0, 10);
    const run = runs.get(day) ?? { answers: 0, mentions: 0 };
    run.answers++;
    if (answer.orgWebsiteMentioned) run.mentions++;
    runs.set(day, run);
  }
  const history = [...runs.entries()]
    .map(([date, run]) => ({ date, score: Math.round((run.mentions / run.answers) * 100) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const brands = brandsOf(current);
  const sources = sourcesOf(current);
  const byPrompt = prompts.map((prompt) => {
    const promptAnswers = current.filter((answer) => answer.promptId === prompt.id);
    const own = promptAnswers.filter((answer) => answer.orgWebsiteMentioned);
    const sentiments = own.map((answer) => answer.sentiment).filter((value): value is number => typeof value === "number");
    return {
      prompt: { id: prompt.id, text: prompt.prompt, intent: prompt.intent, isActive: prompt.isActive, lastCheckedAt: prompt.lastCheckedAt?.toISOString() ?? null },
      mentionedIn: own.map((answer) => answer.llmProvider),
      sentiment: sentiments.length ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length) : null,
      brands: brandsOf(promptAnswers),
      sources: sourcesOf(promptAnswers),
    };
  });

  return {
    score: current.length ? Math.round((mentions / current.length) * 100) : 0,
    mentions,
    answers: current.length,
    activePrompts: activeIds.size,
    providers,
    history,
    brands,
    sources,
    byPrompt,
    hasData: current.length > 0,
  };
}

export async function getPromptDetail(siteId: number, promptId: number) {
  const [prompt] = await db.select().from(llmPrompts).where(eq(llmPrompts.id, promptId));
  if (!prompt || prompt.orgWebsiteId !== siteId) return null;
  const answers = latestAnswers(await db.select().from(llmAnswers).where(eq(llmAnswers.promptId, promptId)).orderBy(desc(llmAnswers.checkedAt)));
  return {
    prompt: prompt as Prompt,
    answers: answers.map((answer) => ({ provider: answer.llmProvider, model: answer.llmModel, answer: answer.answer, mentioned: answer.orgWebsiteMentioned, checkedAt: answer.checkedAt.toISOString() })),
    brands: brandsOf(answers),
    sources: sourcesOf(answers),
  };
}
