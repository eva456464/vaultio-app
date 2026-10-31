/** The app's content API: GET /v1/articles (summaries) and GET /v1/articles/:id (full article). */

export type ArticleSummary = {
  id: number;
  title: string;
  slug: string;
  hero_image_url: string | null;
  languageCode: string | null;
  meta_description: string | null;
  excerpt: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_url: string | null;
  seedKeyword: string | null;
};

export type Article = ArticleSummary & { content_html: string | null };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const PAGE = 50;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeApiBase(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  // Accept the app's address or the API address itself.
  return /\/api\/integrations$/.test(withProtocol) ? withProtocol : `${withProtocol}/api/integrations`;
}

async function get<T>(base: string, key: string, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { headers: { "X-API-Key": key, Accept: "application/json" } });
  } catch {
    throw new ApiError("Couldn't reach the API. Check the API address.", 0);
  }
  if (response.status === 401) throw new ApiError("The API key isn't valid. Create a new one in Settings → Publishing → Framer.", 401);
  if (!response.ok) throw new ApiError(`The API answered with an error (HTTP ${response.status}).`, response.status);
  return (await response.json()) as T;
}

/** Checks the key and address with the smallest request. */
export async function checkConnection(base: string, key: string) {
  await get<ArticleSummary[]>(base, key, "/v1/articles?status=published&limit=1");
}

/** Every published article, newest first. */
export async function listPublished(base: string, key: string) {
  const all: ArticleSummary[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await get<ArticleSummary[]>(base, key, `/v1/articles?status=published&limit=${PAGE}&offset=${offset}`);
    all.push(...page);
    if (page.length < PAGE) return all;
    await pause(250);
  }
}

/** One article with its HTML, or null when it was removed in the meantime. */
export async function getArticle(base: string, key: string, id: number) {
  try {
    return await get<Article>(base, key, `/v1/articles/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export { pause };
