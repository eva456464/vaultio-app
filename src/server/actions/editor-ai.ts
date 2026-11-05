"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { z } from "zod/v4";
import { db } from "@/db";
import { articleAssistantMessages, articles, keywordClusters, seedKeywords, sitePages, type AssistantProposal } from "@/db/schema";
import { asEnglishType, ENGLISH_NAMES } from "@/lib/writing";
import { ai } from "../ai/claude";
import { getAppContext } from "../context";

/** What Claude may return for a piece of the article (the same tags the article renderer keeps). */
const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "a", "blockquote", "br", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  }).trim();

async function articleForAi(articleId: number) {
  const context = await getAppContext();
  const site = context?.site;
  if (!site || context.member?.role !== "admin") throw new Error("Only workspace admins can edit articles");
  const [row] = await db
    .select({ article: articles, keyword: seedKeywords.value })
    .from(articles)
    .leftJoin(keywordClusters, eq(keywordClusters.id, articles.keywordClusterId))
    .leftJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, site.id)));
  if (!row) throw new Error("Article not found");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("AI editing needs the Claude key (ANTHROPIC_API_KEY)");
  return { site, article: row.article, keyword: row.keyword };
}

type Loaded = Awaited<ReturnType<typeof articleForAi>>;

function editorSystem({ site, article, keyword }: Loaded) {
  const semantic = (article.generationSettings as { semanticKeywords?: string[] } | null)?.semanticKeywords ?? [];
  const voice = Object.entries(site.brandVoice ?? {})
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`)
    .join("; ");
  return [
    `You edit a blog article for ${site.brandName ?? new URL(site.url).hostname} (${site.url}).`,
    `Article: "${article.title}". Language code: ${article.languageCode}${site.selectedLanguage === "en" ? ` (${ENGLISH_NAMES[asEnglishType(site.englishType)]})` : ""}.`,
    keyword ? `Target keyword: ${keyword}.${semantic.length ? ` Related terms: ${semantic.join(", ")}.` : ""}` : null,
    voice ? `Brand voice: ${voice}.` : null,
    site.articleInstructions ? `Writing rules from the client:\n${site.articleInstructions}` : null,
    "Keep every fact, number, link and source that is in the text unless the request is to remove it. Never invent statistics, studies, quotes, prices or sources.",
    "Answer with HTML using only these tags: p, h2, h3, h4, ul, ol, li, strong, em, u, s, a (href only), blockquote, br, table, thead, tbody, tr, th, td. No other markup, no markdown, no code fences.",
  ]
    .filter(Boolean)
    .join("\n");
}

const ACTIONS = {
  rewrite: "Rewrite it in different words with the same meaning and about the same length.",
  improve_writing: "Improve clarity, flow and readability without changing the meaning.",
  make_longer: "Expand it with useful, concrete detail for the reader (about 50–100% longer). Add no new facts that need a source.",
  shorten: "Make it about half as long, keeping the key points.",
  simplify: "Make it easier to read: simpler words and shorter sentences.",
  fix_grammar: "Fix spelling, grammar and punctuation only. Change nothing else.",
  convert_to_list: "Turn it into a clear bulleted list (ul), with a short lead-in sentence only if it helps.",
  create_table: "Turn it into a well-structured HTML table with a header row (thead), keeping all the information.",
  add_keyword: "Work the target keyword (or a close variant) into it naturally, once. Don't stuff it.",
  add_internal_link: "Add one link to the most relevant page from the list of the site's pages, on a natural anchor phrase. Use only a listed URL; if none fits, return the text unchanged.",
  custom: "Apply the user's instruction.",
} as const;
export type AiAction = keyof typeof ACTIONS;

const EditSchema = z.object({ html: z.string(), changed: z.boolean() });

type EditResult = { ok: true; html: string } | { ok: true; unchanged: true } | { error: string };

/** One AI edit of the selected part of the article. Nothing is changed until the user accepts it. */
export async function aiEditSelection(articleId: number, input: { action: AiAction; html: string; before: string; after: string; instruction?: string; inline: boolean }): Promise<EditResult> {
  try {
    const loaded = await articleForAi(articleId);
    if (!(input.action in ACTIONS)) return { error: "Unknown edit" };
    if (!input.html.trim() || input.html.length > 20000) return { error: "Select some text first (up to a few paragraphs)." };
    if (input.action === "custom" && !input.instruction?.trim()) return { error: "Describe the change you want" };
    const pages =
      input.action === "add_internal_link"
        ? await db.select({ url: sitePages.url, title: sitePages.metaTitle }).from(sitePages).where(eq(sitePages.orgWebsiteId, loaded.site.id)).orderBy(desc(sitePages.isSaved)).limit(150)
        : [];
    const result = await ai.generateObject({
      schema: EditSchema,
      effort: "low",
      maxTokens: 8000,
      system: editorSystem(loaded),
      prompt: [
        `Task: ${ACTIONS[input.action]}`,
        input.instruction ? `User's instruction: ${input.instruction.slice(0, 1000)}` : null,
        input.inline && !["convert_to_list", "create_table"].includes(input.action) ? "The selection is part of a sentence or paragraph: answer with inline HTML only (no p or other block tags), so it fits back into the sentence." : null,
        pages.length ? `The site's pages:\n${pages.map((page) => `- ${page.url}${page.title ? ` (${page.title})` : ""}`).join("\n")}` : null,
        `Text before the selection (context only, don't return it): ${input.before.slice(-800)}`,
        `Text after the selection (context only): ${input.after.slice(0, 800)}`,
        `Selected HTML to edit:\n${input.html}`,
        'Return the edited HTML in "html", and "changed": false if no meaningful change is needed.',
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const html = clean(result.html);
    if (!result.changed || !html || html === clean(input.html)) return { ok: true, unchanged: true };
    return { ok: true, html };
  } catch (error) {
    return { error: (error as Error).message || "The AI edit failed. Please try again." };
  }
}

/** Builds (or rebuilds) a table from part of the article, for review before it's applied. */
export async function aiTable(articleId: number, input: { html: string; instruction?: string; mode: "create" | "edit" }): Promise<EditResult> {
  try {
    const loaded = await articleForAi(articleId);
    if (!input.html.trim()) return { error: "Select the text to turn into a table" };
    const result = await ai.generateObject({
      schema: EditSchema,
      effort: "low",
      maxTokens: 8000,
      system: editorSystem(loaded),
      prompt: [
        input.mode === "edit" ? "Improve this table: clearer columns and concise cells, keeping every fact." : "Turn this content into one clear comparison or summary table with a header row, keeping every fact.",
        input.instruction ? `User's instruction: ${input.instruction.slice(0, 1000)}` : null,
        `Content:\n${input.html.slice(0, 20000)}`,
        'Return only the <table> in "html" (with thead and tbody) and "changed": true.',
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const html = clean(result.html);
    if (!/<table[\s>]/.test(html)) return { error: "The table could not be generated. Please try again." };
    return { ok: true, html };
  } catch (error) {
    return { error: (error as Error).message || "The table could not be generated. Please try again." };
  }
}

// ------------------------------------------------------------------ Assistant

export type AssistantMessage = { id: number; role: "user" | "assistant"; content: string; proposals: AssistantProposal[] };

export async function assistantHistory(articleId: number): Promise<AssistantMessage[] | { error: string }> {
  try {
    const { article } = await articleForAi(articleId).catch(async (error: Error) => {
      // History can be read without the Claude key.
      if (!/ANTHROPIC/.test(error.message)) throw error;
      const context = await getAppContext();
      const [row] = await db.select().from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, context!.site!.id)));
      return { article: row! };
    });
    const rows = await db.select().from(articleAssistantMessages).where(eq(articleAssistantMessages.articleId, article.id)).orderBy(asc(articleAssistantMessages.createdAt), asc(articleAssistantMessages.id));
    return rows.map(({ id, role, content, proposals }) => ({ id, role, content, proposals }));
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const AssistantSchema = z.object({
  answer: z.string(),
  proposals: z.array(z.object({ blockIndex: z.number().int(), html: z.string(), reason: z.string() })).max(8),
});

/**
 * Answers a question about the article and may propose targeted changes, each replacing one block
 * (paragraph, heading, list or table) of the document the editor sent.
 */
export async function askAssistant(articleId: number, question: string, blocks: { text: string; html: string }[]): Promise<{ ok: true; messages: AssistantMessage[] } | { error: string }> {
  try {
    const loaded = await articleForAi(articleId);
    const asked = question.trim().slice(0, 2000);
    if (!asked) return { error: "Ask a question first" };
    const history = await db
      .select()
      .from(articleAssistantMessages)
      .where(eq(articleAssistantMessages.articleId, loaded.article.id))
      .orderBy(desc(articleAssistantMessages.createdAt))
      .limit(10);
    const result = await ai.generateObject({
      schema: AssistantSchema,
      effort: "medium",
      maxTokens: 16000,
      system: `${editorSystem(loaded)}\n\nYou are the article's editing assistant inside the dashboard. Answer questions about the article, its structure, SEO and AI-search readiness in a few short paragraphs (plain text, no HTML). When a concrete improvement helps, propose it as replacements of numbered blocks: give the block number and the full new HTML for that block. Only propose safe, targeted changes; keep facts and links. Propose nothing when the question only needs an answer.`,
      prompt: [
        history.length
          ? `Earlier conversation:\n${history
              .reverse()
              .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
              .join("\n")}`
          : null,
        `The article, block by block:\n${blocks
          .slice(0, 400)
          .map((block, index) => `[${index}] ${block.html.slice(0, 3000)}`)
          .join("\n")}`,
        `User: ${asked}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const proposals: AssistantProposal[] = result.proposals
      .filter((proposal) => blocks[proposal.blockIndex])
      .map((proposal) => ({ blockIndex: proposal.blockIndex, originalText: blocks[proposal.blockIndex]!.text, html: clean(proposal.html), reason: proposal.reason.slice(0, 300) }))
      .filter((proposal) => proposal.html);
    await db.insert(articleAssistantMessages).values([
      { articleId: loaded.article.id, role: "user", content: asked },
      { articleId: loaded.article.id, role: "assistant", content: result.answer.trim() || (proposals.length ? "Here are some suggested changes." : "No safe targeted changes were proposed."), proposals },
    ]);
    const all = await assistantHistory(articleId);
    return Array.isArray(all) ? { ok: true, messages: all } : all;
  } catch (error) {
    return { error: (error as Error).message || "Could not generate article changes. Please try again." };
  }
}

/** Marks a proposal accepted or rejected (so the conversation shows what happened). */
export async function decideProposal(articleId: number, messageId: number, index: number, status: "accepted" | "rejected") {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") return;
  const [message] = await db
    .select({ id: articleAssistantMessages.id, proposals: articleAssistantMessages.proposals })
    .from(articleAssistantMessages)
    .innerJoin(articles, eq(articles.id, articleAssistantMessages.articleId))
    .where(and(eq(articleAssistantMessages.id, messageId), eq(articles.id, articleId), eq(articles.orgWebsiteId, context.site.id)));
  if (!message || !message.proposals[index]) return;
  const proposals = message.proposals.map((proposal, i) => (i === index ? { ...proposal, status } : proposal));
  await db.update(articleAssistantMessages).set({ proposals }).where(eq(articleAssistantMessages.id, message.id));
}

export async function clearAssistant(articleId: number) {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") return;
  const [article] = await db.select({ id: articles.id }).from(articles).where(and(eq(articles.id, articleId), eq(articles.orgWebsiteId, context.site.id)));
  if (article) await db.delete(articleAssistantMessages).where(eq(articleAssistantMessages.articleId, article.id));
}
