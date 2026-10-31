
export const ASSISTANT_NAMES: Record<string, string> = { anthropic: "Claude", openai: "ChatGPT", google: "Gemini" };

export const PROMPT_INTENTS = ["awareness", "research", "comparison", "learning", "buying", "other"] as const;

export function scoreTier(score: number) {
  if (score === 0) return "start";
  if (score < 20) return "emerging";
  if (score < 50) return "growing";
  return "strong";
}
