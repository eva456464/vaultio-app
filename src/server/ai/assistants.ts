/**
 * The AI assistants whose answers we track for AI visibility. Claude is always
 * available when the Anthropic key is set; ChatGPT and Gemini join when their
 * keys are configured. Swappable for tests.
 */
import { ai } from "./claude";

export type AssistantId = "anthropic" | "openai" | "google";
export type AssistantAnswer = { provider: AssistantId; model: string; answer: string; sources: { url: string; title: string }[] };

const URL_PATTERN = /https?:\/\/[^\s)\]>"']+/g;
const urlsIn = (text: string) => [...new Set(text.match(URL_PATTERN) ?? [])].map((url) => ({ url: url.replace(/[.,;:]+$/, ""), title: "" }));

async function askClaude(question: string): Promise<AssistantAnswer> {
  const result = await ai.answer(question);
  return { provider: "anthropic", model: result.model, answer: result.notes, sources: result.sources };
}

async function askChatGPT(question: string): Promise<AssistantAnswer> {
  const model = process.env.OPENAI_VISIBILITY_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: question }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const answer = json.choices?.[0]?.message?.content ?? "";
  return { provider: "openai", model, answer, sources: urlsIn(answer) };
}

async function askGemini(question: string): Promise<AssistantAnswer> {
  const model = process.env.GEMINI_VISIBILITY_MODEL ?? "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: question }] }], tools: [{ google_search: {} }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
  type Part = { text?: string };
  type Chunk = { web?: { uri?: string; title?: string } };
  const json = (await response.json()) as { candidates?: { content?: { parts?: Part[] }; groundingMetadata?: { groundingChunks?: Chunk[] } }[] };
  const candidate = json.candidates?.[0];
  const answer = (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  const grounded = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => ({ url: chunk.web?.uri ?? "", title: chunk.web?.title ?? "" }))
    .filter((source) => source.url);
  return { provider: "google", model, answer, sources: grounded.length ? grounded : urlsIn(answer) };
}

export type AssistantProvider = { available: () => AssistantId[]; ask: (id: AssistantId, question: string) => Promise<AssistantAnswer> };

export const assistants: AssistantProvider = {
  available: () =>
    [
      process.env.ANTHROPIC_API_KEY ? "anthropic" : null,
      process.env.OPENAI_API_KEY ? "openai" : null,
      process.env.GEMINI_API_KEY ? "google" : null,
    ].filter((id): id is AssistantId => id !== null),
  ask: (id, question) => (id === "anthropic" ? askClaude(question) : id === "openai" ? askChatGPT(question) : askGemini(question)),
};

/** Replaces the provider (tests only). */
export function setAssistantProvider(provider: AssistantProvider) {
  Object.assign(assistants, provider);
}
