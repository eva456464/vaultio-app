/**
 * WordPress REST API calls for improving posts Vaultio didn't write, through the site's WordPress
 * connection (Settings → Publishing): list the published posts, read one in its stored (raw)
 * form, update it, and look at the live page to see how its title and description are produced.
 */
import { and, eq, inArray } from "drizzle-orm";
import { decodeHTML } from "entities";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { decryptJson } from "../../crypto";
import { wordpressAuth, type WordpressCredentials } from "../../publishing/publish";
import { plainText } from "./blocks";

export type WordpressConnection = { siteUrl: string; api: string; authorization: string };

export async function wordpressConnection(siteId: number): Promise<WordpressConnection | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), eq(integrations.type, "wordpress"), inArray(integrations.status, ["connected", "pending", "error"])));
  const siteUrl = String((row?.config as { siteUrl?: string } | undefined)?.siteUrl ?? "").replace(/\/+$/, "");
  if (!row?.credentialsEncrypted || !siteUrl) return null;
  return { siteUrl, api: `${siteUrl}/wp-json/wp/v2`, authorization: wordpressAuth(decryptJson<WordpressCredentials>(row.credentialsEncrypted)) };
}

async function call<T>(connection: WordpressConnection, path: string, init: RequestInit = {}) {
  const response = await fetch(`${connection.api}${path}`, {
    ...init,
    headers: { authorization: connection.authorization, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok || body === null) throw new Error(`WordPress: ${body?.message ?? `HTTP ${response.status}`}`);
  return { body: body as T, headers: response.headers };
}

export type PostSummary = { id: number; link: string; title: string; modified: string };

/** Published posts, newest changes first (up to 2,000). */
export async function listPosts(connection: WordpressConnection, maxPages = 20): Promise<PostSummary[]> {
  const posts: PostSummary[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const query = new URLSearchParams({ per_page: "100", page: String(page), status: "publish", orderby: "modified", _fields: "id,link,modified_gmt,title" });
    const { body, headers } = await call<{ id: number; link: string; modified_gmt: string; title?: { rendered?: string } }[]>(connection, `/posts?${query}`);
    for (const post of body) posts.push({ id: post.id, link: post.link, title: plainText(post.title?.rendered ?? ""), modified: post.modified_gmt });
    if (page >= Number(headers.get("x-wp-totalpages") ?? 1) || body.length < 100) break;
  }
  return posts;
}

/** The stored content of several posts, by id. */
export async function postContents(connection: WordpressConnection, ids: number[]) {
  const contents = new Map<number, string>();
  for (let index = 0; index < ids.length; index += 20) {
    const batch = ids.slice(index, index + 20);
    const query = new URLSearchParams({ include: batch.join(","), per_page: String(batch.length), context: "edit", _fields: "id,content" });
    const { body } = await call<{ id: number; content?: { raw?: string } }[]>(connection, `/posts?${query}`);
    for (const post of body) contents.set(post.id, post.content?.raw ?? "");
  }
  return contents;
}

export type WordpressPost = {
  id: number;
  link: string;
  modified_gmt: string;
  title: { raw: string; rendered: string };
  excerpt: { raw: string; rendered: string };
  content: { raw: string };
  yoast_head_json?: { title?: string; description?: string };
};

export async function getPost(connection: WordpressConnection, id: number) {
  return (await call<WordpressPost>(connection, `/posts/${id}?context=edit`)).body;
}

/** Updates only the given fields; the post's status, slug, author and dates stay as they are. */
export async function updatePost(connection: WordpressConnection, id: number, fields: { content: string; title?: string; excerpt?: string }) {
  return (await call<WordpressPost>(connection, `/posts/${id}?context=edit`, { method: "POST", body: JSON.stringify(fields) })).body;
}

// Page builders keep their own copy of the content and show that instead of the post's content.
const BUILDER_SHORTCODES: [RegExp, string][] = [
  [/\[et_pb_/, "Divi"],
  [/\[vc_row/, "WPBakery"],
  [/\[fusion_builder/, "Avada"],
  [/\[cs_(section|content)/, "Cornerstone"],
  [/\[av_(section|one_full|textblock)/, "Enfold"],
];

export function builderInContent(raw: string) {
  return BUILDER_SHORTCODES.find(([pattern]) => pattern.test(raw))?.[1] ?? null;
}

function builderOnPage(html: string, postId: number) {
  if (new RegExp(`data-elementor-id=["']${postId}["']`).test(html)) return "Elementor";
  if (html.includes(`fl-builder-content-${postId}`)) return "Beaver Builder";
  if (/class=["'][^"']*\bbrxe-/.test(html)) return "Bricks";
  if (/class=["'][^"']*\bet_pb_section\b/.test(html)) return "Divi";
  if (/class=["'][^"']*\boxy-/.test(html) && /id=["']ct-/.test(html)) return "Oxygen";
  return null;
}

/** The live page's title, meta description and page builder (null when the page can't be read). */
export async function inspectLivePage(url: string, postId: number) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "Mozilla/5.0 (compatible; VaultioBot/1.0)" } });
    if (!response.ok) return null;
    const html = await response.text();
    const title = decodeHTML(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
    const metaTag = html.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0];
    const description = metaTag ? decodeHTML(metaTag.match(/\bcontent=(["'])([\s\S]*?)\1/i)?.[2] ?? "").trim() : null;
    return { title, description, builder: builderOnPage(html, postId) };
  } catch {
    return null;
  }
}

const normalize = (text: string) =>
  decodeHTML(text)
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/(\s*(\[…\]|\[\.\.\.\]|…|\.\.\.))+$/, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Whether changing the post's title and excerpt changes what search engines see. SEO plugins often
 * build the page title from the post title (then a new title shows), but a custom SEO title or
 * description set in the plugin can't be changed through WordPress's API, so those stay as they are.
 */
export function seoFields(post: WordpressPost, live: { title: string; description: string | null } | null) {
  const postTitle = normalize(plainText(post.title.rendered || post.title.raw));
  const pageTitle = live?.title ?? post.yoast_head_json?.title ?? null;
  const titleWritable = pageTitle === null || (postTitle.length > 0 && normalize(pageTitle).includes(postTitle));
  const description = live?.description ?? post.yoast_head_json?.description ?? null;
  const excerpt = normalize(plainText(post.excerpt.raw || ""));
  const metaWritable = Boolean(description && excerpt && normalize(description).length >= 50 && excerpt.startsWith(normalize(description)));
  return { titleWritable, metaWritable, description };
}
