/** Reddit and Quora helpers shared by the agents and the Socials pages. */
import type { CommunityPlatform } from "@/db/schema";

/** Default number of monitored keywords per platform. */
export const DEFAULT_MAX_KEYWORDS = 5;
/** Each monitored keyword is searched again after this many days. */
export const SEARCH_EVERY_DAYS = 7;
/** Opportunities shown per page on the Socials page. */
export const OPPORTUNITIES_PER_PAGE = 10;

export const COMMUNITY_JOBS = { reddit: "redditSearch", quora: "quoraSearch" } as const satisfies Record<CommunityPlatform, string>;

export type ThreadRef = { platform: CommunityPlatform; externalId: string; url: string; subreddit: string | null };

const QUORA_RESERVED = new Set(["profile", "topic", "q", "search", "answer", "unanswered", "spaces", "about", "contact", "settings", "notifications", "messages", "careers", "press", "privacy", "partners"]);

/** A Reddit thread link (any reddit host, comment permalinks included) as its canonical thread URL. */
export function redditThread(raw: string): ThreadRef | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)reddit\.com$/.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/r\/([A-Za-z0-9_]{2,21})\/comments\/([a-z0-9]{4,12})(?:\/([^/]+))?/i);
  if (!match) return null;
  const [, subreddit, id, slug] = match;
  return {
    platform: "reddit",
    externalId: id!.toLowerCase(),
    subreddit: subreddit!,
    url: `https://www.reddit.com/r/${subreddit}/comments/${id!.toLowerCase()}/${slug ? `${slug}/` : ""}`,
  };
}

/** A Quora question link (answer links point back to their question). Spaces and profiles are not questions. */
export function quoraThread(raw: string, language = "en"): ThreadRef | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const allowed = host === "quora.com" || host === "www.quora.com" || (language !== "en" && host === `${language}.quora.com`);
  if (!allowed) return null;
  const slug = decodeURIComponent(url.pathname.split("/")[1] ?? "");
  if (!slug || slug.length < 8 || QUORA_RESERVED.has(slug.toLowerCase()) || !slug.includes("-")) return null;
  const origin = host === "quora.com" ? "https://www.quora.com" : `https://${host}`;
  return { platform: "quora", externalId: `${host === "quora.com" ? "www.quora.com" : host}/${slug.toLowerCase()}`, subreddit: null, url: `${origin}/${encodeURIComponent(slug)}` };
}

export const threadOf = (platform: CommunityPlatform, url: string, language?: string) => (platform === "reddit" ? redditThread(url) : quoraThread(url, language));

/** Search-result titles without the site suffix ("… : r/seo", "… - Reddit", "… - Quora"). */
export function cleanThreadTitle(title: string) {
  return title
    .replace(/\s*[-|–]\s*(Reddit|Quora)\s*$/i, "")
    .replace(/\s*[:|-]\s*r\/[A-Za-z0-9_]+\s*$/i, "")
    .trim();
}

/** "r/seo", "seo" or a subreddit link → "seo"; null when it isn't a valid subreddit name. */
export function normalizeSubreddit(input: string) {
  const name = input
    .trim()
    .replace(/^https?:\/\/(www\.|old\.)?reddit\.com/i, "")
    .replace(/^\/?r\//i, "")
    .replace(/\/.*$/, "");
  return /^[A-Za-z0-9_]{2,21}$/.test(name) ? name : null;
}

/** Keywords are compared and stored lower-case with single spaces. */
export const normalizeKeyword = (keyword: string) => keyword.trim().replace(/\s+/g, " ").toLowerCase();
