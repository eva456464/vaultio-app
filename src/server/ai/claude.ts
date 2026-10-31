/**
 * Claude access for the agents. All calls go through `ai` so tests can swap in
 * a stand-in provider (see scripts/test-agents.ts).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

// Server-side fallback: if a request is declined by a safety classifier, the API
// re-runs it on a suitable model inside the same call (routing chosen by Anthropic).
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

type Effort = "low" | "medium" | "high";

export class ClaudeOutputError extends Error {}

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic({ maxRetries: 3, timeout: 15 * 60 * 1000 });
  return client;
}

function checkStop(message: Anthropic.Beta.BetaMessage) {
  if (message.stop_reason === "refusal") {
    throw new ClaudeOutputError(`Claude declined the request (${message.stop_details?.category ?? "unspecified"})`);
  }
  if (message.stop_reason === "max_tokens") throw new ClaudeOutputError("Claude's answer was cut off (max_tokens)");
}

function textOf(message: Anthropic.Beta.BetaMessage) {
  return message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export type ObjectRequest<S extends z.ZodType> = {
  schema: S;
  /** Stable instructions; cached across calls. */
  system: string;
  prompt: string;
  effort?: Effort;
  maxTokens?: number;
};

async function generateObject<S extends z.ZodType>(request: ObjectRequest<S>): Promise<z.infer<S>> {
  const response = await anthropic().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: request.maxTokens ?? 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: request.prompt }],
    output_config: { effort: request.effort ?? "medium", format: betaZodOutputFormat(request.schema) },
  });
  checkStop(response);
  if (!response.parsed_output) throw new ClaudeOutputError("Claude's answer did not match the expected format");
  return response.parsed_output;
}

export type TextRequest = { system: string; prompt: string; effort?: Effort; maxTokens?: number };

/** Long-form text (articles). Streamed so long generations never hit HTTP timeouts. */
async function generateText(request: TextRequest): Promise<string> {
  const stream = anthropic().beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: request.maxTokens ?? 64000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: request.prompt }],
    output_config: { effort: request.effort ?? "high" },
  });
  const message = await stream.finalMessage();
  checkStop(message);
  return textOf(message);
}

export type ResearchSource = { url: string; title: string };
export type ResearchResult = { notes: string; sources: ResearchSource[] };

/** Researches a topic on the live web (Anthropic-hosted web search) and returns cited notes. */
async function research(request: TextRequest & { maxSearches?: number; allowedDomains?: string[] }): Promise<ResearchResult> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: request.prompt }];
  let message: Anthropic.Beta.BetaMessage | null = null;
  // Server-side search can pause long turns; resend to let the server continue.
  for (let continuation = 0; continuation < 4; continuation++) {
    const stream = anthropic().beta.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 32000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
      messages,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: request.maxSearches ?? 6,
          ...(request.allowedDomains?.length ? { allowed_domains: request.allowedDomains } : {}),
        },
      ],
      output_config: { effort: request.effort ?? "medium" },
    });
    message = await stream.finalMessage();
    if (message.stop_reason !== "pause_turn") break;
    messages.splice(1, messages.length - 1, { role: "assistant", content: message.content });
  }
  if (!message) throw new ClaudeOutputError("No research response");
  checkStop(message);

  const sources = new Map<string, ResearchSource>();
  for (const block of message.content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === "web_search_result") sources.set(result.url, { url: result.url, title: result.title });
      }
    }
    if (block.type === "text") {
      for (const citation of block.citations ?? []) {
        if (citation.type === "web_search_result_location") {
          sources.set(citation.url, { url: citation.url, title: citation.title ?? citation.url });
        }
      }
    }
  }
  return { notes: textOf(message), sources: [...sources.values()] };
}

/**
 * Answers a question the way the Claude assistant would for a member of the
 * public (with live web search), for AI visibility tracking.
 */
async function answer(question: string): Promise<ResearchResult & { model: string }> {
  const result = await research({
    system: "You are a helpful assistant. Answer the user's question directly and helpfully. When they ask for providers, products or services, recommend specific ones by name.",
    prompt: question,
    effort: "low",
    maxSearches: 3,
  });
  return { ...result, model: CLAUDE_MODEL };
}

export type AiProvider = {
  generateObject: typeof generateObject;
  generateText: typeof generateText;
  research: typeof research;
  answer: typeof answer;
};

export const ai: AiProvider = { generateObject, generateText, research, answer };

/** Replaces the provider (tests only). */
export function setAiProvider(provider: AiProvider) {
  Object.assign(ai, provider);
}
