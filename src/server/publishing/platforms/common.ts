/** What every platform receives for one article, and what it returns. */
import type { articles } from "@/db/schema";

export type Article = typeof articles.$inferSelect;

export type PostInput = {
  title: string;
  slug: string;
  html: string;
  markdown: string;
  excerpt: string;
  heroUrl: string | null;
  heroAlt: string;
  faqJsonLd: unknown;
};

export const postInput = (article: Article): PostInput => ({
  title: article.title,
  slug: article.slug,
  html: article.htmlContent ?? "",
  markdown: article.content ?? "",
  excerpt: (article.metaDescription ?? "").slice(0, 300),
  heroUrl: article.heroImageUrl,
  heroAlt: article.media.find((item) => item.identifier === "hero_image")?.altText ?? article.title,
  faqJsonLd: article.faqJsonLd,
});

/** "Publish immediately" or "Save as draft", chosen when connecting. */
export type PublishMode = "publish" | "draft";

export type Delivered<T> = { ok: true; url: string | null; delivery: T } | { ok: false; error: string };

/** Fetch with a timeout that returns the parsed JSON body (or null) and the status. */
export async function call<T>(url: string, init: RequestInit = {}, timeoutMs = 60_000): Promise<{ status: number; body: T | null }> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text();
  let body: T | null = null;
  try {
    body = text ? (JSON.parse(text) as T) : null;
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

export const describeError = (error: unknown) => (error instanceof Error ? (error.name === "TimeoutError" ? "The platform didn't answer in time" : error.message) : String(error));
