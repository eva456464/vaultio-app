/**
 * Image generation for article covers and body images. Uses OpenAI's image model when
 * OPENAI_API_KEY is set (best at lettering, which the "with title" styles need), otherwise
 * Google's Gemini image model with GEMINI_API_KEY. IMAGE_PROVIDER=openai|google forces one.
 * Swappable for tests.
 */

export type ImageShape = "wide" | "landscape";
export type GeneratedImage = { bytes: Buffer; mimeType: string; model: string };
export type ImageProvider = { available: () => boolean; generate: (input: { prompt: string; shape: ImageShape }) => Promise<GeneratedImage> };

const OPENAI_SIZE: Record<ImageShape, string> = { wide: "1536x1024", landscape: "1536x1024" };
const GEMINI_ASPECT: Record<ImageShape, string> = { wide: "16:9", landscape: "3:2" };

function chosen(): "openai" | "google" | null {
  const forced = process.env.IMAGE_PROVIDER;
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "google" && process.env.GEMINI_API_KEY) return "google";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "google";
  return null;
}

/**
 * gpt-image-1 was shut down on 23 October 2026; OpenAI's SDK names gpt-image-2.5-sunburst and
 * gpt-image-2.5-flare as its replacements. OPENAI_IMAGE_MODEL picks one; otherwise each is tried in turn.
 */
const OPENAI_IMAGE_MODELS = () => [...new Set([process.env.OPENAI_IMAGE_MODEL, "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].filter((model): model is string => Boolean(model)))];

async function generateWithOpenAI(prompt: string, shape: ImageShape): Promise<GeneratedImage> {
  let lastError = "";
  for (const model of OPENAI_IMAGE_MODELS()) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, size: OPENAI_SIZE[shape], quality: process.env.OPENAI_IMAGE_QUALITY ?? "medium", n: 1, output_format: "png" }),
      signal: AbortSignal.timeout(180_000),
    });
    const json = (await response.json().catch(() => ({}))) as { data?: { b64_json?: string }[]; error?: { message?: string; code?: string } };
    // An unknown or retired model: try the next one.
    if (!response.ok && (response.status === 404 || json.error?.code === "model_not_found" || /model/i.test(json.error?.message ?? ""))) {
      lastError = json.error?.message ?? `HTTP ${response.status}`;
      continue;
    }
    if (!response.ok) throw new Error(`OpenAI image: ${json.error?.message ?? `HTTP ${response.status}`}`);
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI image: no image returned");
    return { bytes: Buffer.from(b64, "base64"), mimeType: "image/png", model };
  }
  throw new Error(`OpenAI image: no available model (${lastError})`);
}

async function generateWithGemini(prompt: string, shape: ImageShape): Promise<GeneratedImage> {
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: GEMINI_ASPECT[shape] } },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  type Part = { inlineData?: { mimeType?: string; data?: string } };
  const json = (await response.json().catch(() => ({}))) as { candidates?: { content?: { parts?: Part[] } }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(`Gemini image: ${json.error?.message ?? `HTTP ${response.status}`}`);
  const image = json.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
  if (!image?.data) throw new Error("Gemini image: no image returned");
  return { bytes: Buffer.from(image.data, "base64"), mimeType: image.mimeType ?? "image/png", model };
}

export const images: ImageProvider = {
  available: () => chosen() !== null,
  generate: ({ prompt, shape }) => {
    const provider = chosen();
    if (provider === "openai") return generateWithOpenAI(prompt, shape);
    if (provider === "google") return generateWithGemini(prompt, shape);
    throw new Error("No image provider is configured (OPENAI_API_KEY or GEMINI_API_KEY)");
  },
};

/** Replaces the provider (tests only). */
export function setImageProvider(provider: ImageProvider) {
  Object.assign(images, provider);
}
