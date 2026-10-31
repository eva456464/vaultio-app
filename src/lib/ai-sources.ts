/** Recognising visitors sent by AI assistants from the GA4 session source. */

const MODELS: [RegExp, string][] = [
  [/chatgpt\.com|chat\.openai\.com|(^|\.)openai\.com/i, "ChatGPT"],
  [/perplexity/i, "Perplexity"],
  [/gemini\.google|bard\.google/i, "Gemini"],
  [/copilot\.microsoft|copilot\.cloud\.microsoft/i, "Copilot"],
  [/claude\.ai/i, "Claude"],
  [/(^|\.)meta\.ai/i, "Meta AI"],
  [/(^|\.)you\.com/i, "You.com"],
  [/phind\.com/i, "Phind"],
  [/(^|\.)poe\.com/i, "Poe"],
  [/groq\.com/i, "Groq"],
  [/deepseek/i, "DeepSeek"],
  [/chat\.mistral\.ai/i, "Mistral"],
];

/** RE2-compatible pattern for GA4's dimension filter, matching the same sources. */
export const AI_SOURCE_PATTERN =
  "chatgpt\\.com|chat\\.openai\\.com|openai\\.com|perplexity|gemini\\.google|bard\\.google|copilot\\.microsoft|copilot\\.cloud\\.microsoft|claude\\.ai|meta\\.ai|you\\.com|phind\\.com|poe\\.com|groq\\.com|deepseek|chat\\.mistral\\.ai";

export function aiModelOf(source: string): string | null {
  return MODELS.find(([pattern]) => pattern.test(source))?.[1] ?? null;
}

/**
 * Chart series, in fixed legend order with a fixed colour per model (validated for colour-vision
 * separation of neighbours). Less common assistants share "Other AI" so the chart never needs a
 * ninth hue; tables still name them.
 */
export const AI_SERIES = [
  { key: "ChatGPT", color: "#1baf7a" },
  { key: "Gemini", color: "#2a78d6" },
  { key: "Claude", color: "#eb6834" },
  { key: "Copilot", color: "#6250d6" },
  { key: "Perplexity", color: "#eda100" },
  { key: "Meta AI", color: "#e87ba4" },
  { key: "Other AI", color: "#008300" },
] as const;
export type AiSeries = (typeof AI_SERIES)[number]["key"];

export const aiSeriesOf = (model: string): AiSeries => (AI_SERIES.some((series) => series.key === model) ? (model as AiSeries) : "Other AI");
