import type { Ga4Channel } from "@/db/schema";

/** Channel series in fixed legend order with fixed colours, validated for colour-vision separation of neighbours. */
export const CHANNEL_SERIES: { channel: Ga4Channel; color: string }[] = [
  { channel: "Paid", color: "#22A06B" },
  { channel: "Organic search", color: "#3B82F6" },
  { channel: "Direct", color: "#F26B2A" },
  { channel: "LLM referrers", color: "#8B5CF6" },
  { channel: "Other", color: "#3FB8A6" },
];

export const CHANNEL_COLOR = Object.fromEntries(CHANNEL_SERIES.map((s) => [s.channel, s.color])) as Record<Ga4Channel, string>;
