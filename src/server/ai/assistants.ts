/**
 * The AI assistants whose answers we track for AI visibility. Claude is always
 * available when the Anthropic key is set; ChatGPT, Gemini and Perplexity join when
 * their keys are configured. Swappable for tests.
 */
import { ai } from "./claude";

export type AssistantId = "anthropic" | "openai" | "google" | "perplexity";
export type AssistantAnswer = { provider: AssistantId; model: string; answer: string; sources: { url: string; title: string }[] };

const URL_PATTERN = /https?:\/\/[^\s)\]>"']+/g;
const urlsIn = (text: string) => [...new Set(text.match(URL_PATTERN) ?? [])].map((url) => ({ url: url.replace(/[.,;:]+$/, ""), title: "" }));

async function askClaude(question: string): Promise<AssistantAnswer> {
  const result = await ai.answer(question);
  return { provider: "anthropic", model: result.model, answer: result.notes, sources: result.sources };
}

/**
 * ChatGPT with web search, as people use it: the Responses API with the web_search tool. Sources are
 * the url_citation annotations on the answer (plus the searched pages when listed).
 */
async function askChatGPT(question: string): Promise<AssistantAnswer> {
  const model = process.env.OPENAI_VISIBILITY_MODEL ?? "gpt-5.4-mini";
  const base = (process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${base}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, input: question, tools: [{ type: "web_search" }], include: ["web_search_call.action.sources"] }),
    signal: AbortSignal.timeout(180_000),
  });
  const json = (await response.json().catch(() => ({}))) as {
    output?: { type?: string; content?: { type?: string; text?: string; annotations?: { type?: string; url?: string; title?: string }[] }[]; action?: { sources?: { url?: string; title?: string }[] } }[];
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`OpenAI: ${json.error?.message ?? `HTTP ${response.status}`}`);
  const parts = (json.output ?? []).flatMap((item) => (item.type === "message" ? (item.content ?? []) : [])).filter((part) => part.type === "output_text");
  const answer = parts.map((part) => part.text ?? "").join("\n");
  const cited = parts.flatMap((part) => part.annotations ?? []).filter((note) => note.type === "url_citation" && note.url).map((note) => ({ url: note.url!, title: note.title ?? "" }));
  const searched = (json.output ?? []).flatMap((item) => item.action?.sources ?? []).filter((source) => source.url).map((source) => ({ url: source.url!, title: source.title ?? "" }));
  const sources = [...cited, ...searched].filter((source, index, all) => all.findIndex((other) => other.url === source.url) === index);
  return { provider: "openai", model, answer, sources: sources.length ? sources : urlsIn(answer) };
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

/** Perplexity (Sonar API, OpenAI-style chat completions): it always searches; sources are its citations. */
async function askPerplexity(question: string): Promise<AssistantAnswer> {
  const model = process.env.PERPLEXITY_VISIBILITY_MODEL ?? "sonar";
  const base = (process.env.PERPLEXITY_API_BASE ?? "https://api.perplexity.ai").replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: question }] }),
    signal: AbortSignal.timeout(120_000),
  });
  const json = (await response.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
    search_results?: { url?: string; title?: string }[];
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`Perplexity: ${json.error?.message ?? `HTTP ${response.status}`}`);
  const answer = json.choices?.[0]?.message?.content ?? "";
  const results = (json.search_results ?? []).filter((item) => item.url).map((item) => ({ url: item.url!, title: item.title ?? "" }));
  const cited = (json.citations ?? []).filter((url) => !results.some((item) => item.url === url)).map((url) => ({ url, title: "" }));
  const sources = [...results, ...cited];
  return { provider: "perplexity", model, answer, sources: sources.length ? sources : urlsIn(answer) };
}

export type AssistantProvider = { available: () => AssistantId[]; ask: (id: AssistantId, question: string) => Promise<AssistantAnswer> };

export const assistants: AssistantProvider = {
  available: () =>
    [
      process.env.ANTHROPIC_API_KEY ? "anthropic" : null,
      process.env.OPENAI_API_KEY ? "openai" : null,
      process.env.GEMINI_API_KEY ? "google" : null,
      process.env.PERPLEXITY_API_KEY ? "perplexity" : null,
    ].filter((id): id is AssistantId => id !== null),
  ask: (id, question) =>
    id === "anthropic" ? askClaude(question) : id === "openai" ? askChatGPT(question) : id === "google" ? askGemini(question) : askPerplexity(question),
};

/** Replaces the provider (tests only). */
export function setAssistantProvider(provider: AssistantProvider) {
  Object.assign(assistants, provider);
}
