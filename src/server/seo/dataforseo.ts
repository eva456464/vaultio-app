/**
 * Keyword, SERP and authority data from DataForSEO (https://docs.dataforseo.com/v3/).
 * Swappable through `setSeoDataProvider` for tests.
 */

const API = "https://api.dataforseo.com/v3";

/** Default Google location per content language (DataForSEO location codes). */
export const DEFAULT_LOCATION: Record<string, number> = {
  en: 2840, // United States
  fr: 2250, // France
  de: 2276, // Germany
  es: 2724, // Spain
  it: 2380, // Italy
  nl: 2528, // Netherlands
  pt: 2620, // Portugal
};

export const COUNTRY_NAMES: Record<number, string> = {
  2840: "United States",
  2250: "France",
  2276: "Germany",
  2724: "Spain",
  2380: "Italy",
  2528: "Netherlands",
  2620: "Portugal",
  2826: "United Kingdom",
  2124: "Canada",
  2036: "Australia",
};

export type Market = { locationCode: number; languageCode: string };

export type KeywordIdea = {
  keyword: string;
  searchVolume: number;
  cpc: number | null;
  difficulty: number | null;
  intent: string | null;
};
export type CompetitorDomain = { domain: string; intersections: number; organicTraffic: number | null };
export type SerpResult = { url: string; domain: string; title: string; position: number; description?: string };
export type RankedKeyword = { keyword: string; position: number; url: string; searchVolume: number };

type Task = { status_code: number; status_message: string; result: unknown[] | null };

async function post(path: string, body: unknown[]): Promise<unknown[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DataForSEO credentials are not configured");
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`DataForSEO ${path} returned HTTP ${response.status}`);
  const json = (await response.json()) as { status_code: number; status_message: string; tasks?: Task[] };
  if (json.status_code !== 20000) throw new Error(`DataForSEO ${path}: ${json.status_message}`);
  const task = json.tasks?.[0];
  if (!task || task.status_code !== 20000) throw new Error(`DataForSEO ${path}: ${task?.status_message ?? "no task"}`);
  return task.result ?? [];
}

type Item = Record<string, unknown>;
const itemsOf = (result: unknown[]) => ((result[0] as Item | undefined)?.items as Item[] | undefined) ?? [];
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const get = (value: unknown, ...keys: string[]) =>
  keys.reduce<unknown>((current, key) => (current && typeof current === "object" ? (current as Item)[key] : undefined), value);

async function keywordIdeas(seeds: string[], market: Market, limit = 700): Promise<KeywordIdea[]> {
  const result = await post("/dataforseo_labs/google/keyword_ideas/live", [
    { keywords: seeds.slice(0, 20), location_code: market.locationCode, language_code: market.languageCode, limit, include_serp_info: false },
  ]);
  return itemsOf(result)
    .map((item) => ({
      keyword: String(item.keyword ?? ""),
      searchVolume: num(get(item, "keyword_info", "search_volume")) ?? 0,
      cpc: num(get(item, "keyword_info", "cpc")),
      difficulty: num(get(item, "keyword_properties", "keyword_difficulty")),
      intent: (get(item, "search_intent_info", "main_intent") as string | undefined) ?? null,
    }))
    .filter((idea) => idea.keyword);
}

async function competitors(domain: string, market: Market, limit = 20): Promise<CompetitorDomain[]> {
  const result = await post("/dataforseo_labs/google/competitors_domain/live", [
    { target: domain, location_code: market.locationCode, language_code: market.languageCode, limit, exclude_top_domains: true },
  ]);
  return itemsOf(result)
    .map((item) => ({
      domain: String(item.domain ?? ""),
      intersections: num(item.intersections) ?? 0,
      organicTraffic: num(get(item, "full_domain_metrics", "organic", "etv")),
    }))
    .filter((competitor) => competitor.domain && competitor.domain !== domain);
}

async function serp(keyword: string, market: Market, depth = 10): Promise<SerpResult[]> {
  const result = await post("/serp/google/organic/live/regular", [
    { keyword, location_code: market.locationCode, language_code: market.languageCode, depth },
  ]);
  return itemsOf(result)
    .filter((item) => item.type === "organic")
    .map((item) => ({
      url: String(item.url ?? ""),
      domain: String(item.domain ?? "").replace(/^www\./, ""),
      title: String(item.title ?? ""),
      position: num(item.rank_absolute) ?? 0,
      description: typeof item.description === "string" ? item.description : undefined,
    }));
}

async function rankedKeywords(domain: string, market: Market, limit = 500): Promise<RankedKeyword[]> {
  const result = await post("/dataforseo_labs/google/ranked_keywords/live", [
    { target: domain, location_code: market.locationCode, language_code: market.languageCode, limit },
  ]);
  return itemsOf(result).map((item) => ({
    keyword: String(get(item, "keyword_data", "keyword") ?? ""),
    searchVolume: num(get(item, "keyword_data", "keyword_info", "search_volume")) ?? 0,
    position: num(get(item, "ranked_serp_element", "serp_item", "rank_absolute")) ?? 100,
    url: String(get(item, "ranked_serp_element", "serp_item", "url") ?? ""),
  }));
}

/** Domain authority on a 0–100 scale (DataForSEO rank is 0–1000). */
async function domainRating(domain: string): Promise<number | null> {
  const result = await post("/backlinks/summary/live", [{ target: domain, internal_list_limit: 1, backlinks_status_type: "live" }]);
  const rank = num((result[0] as Item | undefined)?.rank);
  return rank === null ? null : Math.round(rank / 10);
}

export type SeoDataProvider = {
  keywordIdeas: typeof keywordIdeas;
  competitors: typeof competitors;
  serp: typeof serp;
  rankedKeywords: typeof rankedKeywords;
  domainRating: typeof domainRating;
};

export const seoData: SeoDataProvider = { keywordIdeas, competitors, serp, rankedKeywords, domainRating };

/** Replaces the provider (tests only). */
export function setSeoDataProvider(provider: SeoDataProvider) {
  Object.assign(seoData, provider);
}
