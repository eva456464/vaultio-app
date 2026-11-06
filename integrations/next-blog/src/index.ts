/**
 * Read client for the blog: published articles from the content API, cached with ISR (once a day
 * in production). Server-side only: the API key must never reach the browser.
 *
 *   BLOG_API_KEY  the key from Settings → Publishing → Next.js Blog (required)
 *   BLOG_API_URL  the API address shown in the same guide (required)
 */

export type BlogTag = { name: string; slug: string };

export type BlogArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  metaDescription: string | null;
  heroImageUrl: string | null;
  language: string;
  publishedAt: string | null;
  updatedAt: string;
  tags: BlogTag[];
};

export type BlogArticleFull = BlogArticle & {
  html: string;
  markdown: string;
  jsonLd: unknown;
  faqJsonLd: unknown;
};

type ApiSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string | null;
  hero_image_url: string | null;
  languageCode: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  tags?: string[];
};
type ApiFull = ApiSummary & { content_html: string; content_markdown: string; jsonLd: unknown; faqJsonLd: unknown };

export class BlogApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Seconds between refreshes: a day in production, a minute while developing. */
export const REVALIDATE = process.env.NODE_ENV === "production" ? 86_400 : 60;
const PAGE_SIZE = 50;
const MAX_ARTICLES = 1000;

export function tagSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function settings() {
  const apiKey = process.env.BLOG_API_KEY;
  const apiUrl = process.env.BLOG_API_URL?.replace(/\/+$/, "");
  if (!apiKey) throw new BlogApiError("BLOG_API_KEY is not set. Add it to .env.local (server-side only, no NEXT_PUBLIC_ prefix).", 401);
  if (!apiUrl) throw new BlogApiError("BLOG_API_URL is not set. Copy it from the Next.js Blog guide in Settings → Publishing.", 500);
  return { apiKey, apiUrl };
}

async function request<T>(path: string): Promise<T | null> {
  const { apiKey, apiUrl } = settings();
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { "x-api-key": apiKey, accept: "application/json" },
    // Next.js caches this response and refreshes it in the background (ISR).
    next: { revalidate: REVALIDATE, tags: ["blog"] },
  } as RequestInit);
  if (response.status === 404) return null;
  if (response.status === 401) throw new BlogApiError("The blog API key was refused. Check BLOG_API_KEY and restart the dev server.", 401);
  if (!response.ok) throw new BlogApiError(`The blog API answered HTTP ${response.status}.`, response.status);
  return (await response.json()) as T;
}

function toArticle(item: ApiSummary): BlogArticle {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    metaDescription: item.meta_description,
    heroImageUrl: item.hero_image_url,
    language: item.languageCode,
    publishedAt: item.published_at,
    updatedAt: item.updated_at,
    tags: (item.tags ?? []).map((name) => ({ name, slug: tagSlug(name) })).filter((tag) => tag.slug),
  };
}

/** Every published article, newest first. */
export async function getAllArticles(): Promise<BlogArticle[]> {
  const all: BlogArticle[] = [];
  for (let offset = 0; offset < MAX_ARTICLES; offset += PAGE_SIZE) {
    const page = (await request<ApiSummary[]>(`/articles?status=published&limit=${PAGE_SIZE}&offset=${offset}`)) ?? [];
    all.push(...page.filter((item) => item.published).map(toArticle));
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

export type ArticlePage = { articles: BlogArticle[]; page: number; totalPages: number; total: number; tag: BlogTag | null };

/** One page of the list, optionally for one tag. */
export async function getArticles({ page = 1, perPage = 12, tag }: { page?: number; perPage?: number; tag?: string } = {}): Promise<ArticlePage> {
  const all = await getAllArticles();
  const filtered = tag ? all.filter((article) => article.tags.some((entry) => entry.slug === tag)) : all;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const found = tag ? (all.flatMap((article) => article.tags).find((entry) => entry.slug === tag) ?? null) : null;
  return { articles: filtered.slice((current - 1) * perPage, current * perPage), page: current, totalPages, total: filtered.length, tag: found };
}

/** One published article by its slug, or null. */
export async function getArticle(slug: string): Promise<BlogArticleFull | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)) return null;
  const item = await request<ApiFull>(`/articles/${encodeURIComponent(slug)}`);
  if (!item || !item.published) return null;
  return { ...toArticle(item), html: item.content_html, markdown: item.content_markdown, jsonLd: item.jsonLd, faqJsonLd: item.faqJsonLd };
}

/** Tags with how many published articles use them, most used first. */
export async function getTags(): Promise<(BlogTag & { count: number })[]> {
  const counts = new Map<string, BlogTag & { count: number }>();
  for (const article of await getAllArticles()) {
    for (const tag of article.tags) counts.set(tag.slug, { ...tag, count: (counts.get(tag.slug)?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** The site's own address for absolute URLs (sitemap, canonical). */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
}
