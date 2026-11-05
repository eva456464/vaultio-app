/** Fetching and parsing customer websites for the crawler agents. */

export const BOT_USER_AGENT = "Mozilla/5.0 (compatible; VaultioBot/1.0; +https://vaultio.co/bot)";
const MAX_BYTES = 3_000_000;

export type FetchedPage = { url: string; status: number; html: string; contentType: string; ms: number };

export async function fetchText(url: string, timeoutMs = 15_000): Promise<FetchedPage> {
  const started = Date.now();
  const response = await fetch(url, {
    headers: { "user-agent": BOT_USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml,text/plain,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const reader = response.body?.getReader();
  let received = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      received += value.byteLength;
      chunks.push(value);
      if (received > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
  }
  const html = new TextDecoder().decode(Buffer.concat(chunks));
  return {
    url: response.url || url,
    status: response.status,
    html,
    contentType: response.headers.get("content-type") ?? "",
    ms: Date.now() - started,
  };
}

export function normalizeSiteUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  const url = new URL(withProtocol);
  return `${url.protocol}//${url.host}`;
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function tags(html: string, tagName: string) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

function meta(html: string, key: string) {
  for (const tag of tags(html, "meta")) {
    const name = (attr(tag, "name") ?? attr(tag, "property") ?? "").toLowerCase();
    if (name === key) return attr(tag, "content");
  }
  return null;
}

/** Visible text of a page (scripts, styles and markup removed). */
export function textOf(fragment: string) {
  return decodeEntities(fragment.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export type PageFacts = {
  title: string | null;
  metaDescription: string | null;
  h1s: string[];
  lang: string | null;
  canonical: string | null;
  hasViewport: boolean;
  robotsMeta: string | null;
  imagesTotal: number;
  imagesMissingAlt: number;
  jsonLdTypes: string[];
  hasOpenGraph: boolean;
  wordCount: number;
  internalLinks: string[];
  siteName: string | null;
  ogImage: string | null;
  iconUrl: string | null;
  themeColor: string | null;
  platform: string | null;
  /** How many <title>, meta description and canonical tags the page has (more than one confuses search engines). */
  titleTags: number;
  descriptionTags: number;
  canonicals: string[];
  images: { src: string | null; alt: string | null }[];
  /** Every http(s) link in the body, absolute, without fragments. */
  links: string[];
  /** H2 and H3 headings. */
  headings: string[];
  /** The start of the visible text (for checking that the title and description match the page). */
  text: string;
};

export function parsePage(html: string, pageUrl: string): PageFacts {
  const resolve = (href: string | null) => {
    if (!href) return null;
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      return null;
    }
  };
  const origin = new URL(pageUrl).origin;
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;

  const links = tags(html, "link");
  const iconTag =
    links.find((tag) => /apple-touch-icon/i.test(attr(tag, "rel") ?? "")) ??
    links.find((tag) => /(^|\s)icon(\s|$)/i.test(attr(tag, "rel") ?? ""));
  const canonicalTag = links.find((tag) => (attr(tag, "rel") ?? "").toLowerCase() === "canonical");

  const images = tags(body, "img");
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? html.slice(0, html.search(/<body/i) > 0 ? html.search(/<body/i) : html.length);
  const allLinks = new Set<string>();
  for (const tag of tags(body, "a")) {
    const href = resolve(attr(tag, "href"));
    if (href && /^https?:/i.test(href)) allLinks.add(href.split("#")[0]!);
  }
  const jsonLdTypes: string[] = [];
  for (const block of html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    const json = block.replace(/^<script[^>]*>|<\/script>$/gi, "");
    try {
      const parsed = JSON.parse(json);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed];
      for (const item of items) if (item?.["@type"]) jsonLdTypes.push(String(item["@type"]));
    } catch {
      jsonLdTypes.push("invalid");
    }
  }

  const internalLinks = new Set<string>();
  for (const tag of tags(body, "a")) {
    const href = resolve(attr(tag, "href"));
    if (href && href.startsWith(origin)) internalLinks.add(href.split("#")[0]!);
  }

  let platform: string | null = null;
  if (/wp-content|wp-includes/i.test(html)) platform = "wordpress";
  else if (/cdn\.shopify\.com/i.test(html)) platform = "shopify";
  else if (/webflow/i.test(html)) platform = "webflow";
  else if (/wixstatic|wix\.com/i.test(html)) platform = "wix";
  else if (/framerusercontent|framer\.com/i.test(html)) platform = "framer";
  else if (/__NEXT_DATA__|\/_next\//.test(html)) platform = "nextjs";
  else if (/ghost\.io|content="Ghost/i.test(html)) platform = "ghost";
  else if (/squarespace/i.test(html)) platform = "squarespace";

  return {
    title: textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null,
    metaDescription: meta(html, "description"),
    h1s: (body.match(/<h1\b[\s\S]*?<\/h1>/gi) ?? []).map(textOf).filter(Boolean),
    lang: attr(tags(html, "html")[0] ?? "", "lang"),
    canonical: canonicalTag ? resolve(attr(canonicalTag, "href")) : null,
    hasViewport: Boolean(meta(html, "viewport")),
    robotsMeta: meta(html, "robots"),
    imagesTotal: images.length,
    imagesMissingAlt: images.filter((tag) => !(attr(tag, "alt") ?? "").trim()).length,
    jsonLdTypes,
    hasOpenGraph: Boolean(meta(html, "og:title")),
    wordCount: textOf(body).split(" ").filter(Boolean).length,
    internalLinks: [...internalLinks],
    siteName: meta(html, "og:site_name") ?? meta(html, "application-name"),
    ogImage: resolve(meta(html, "og:image")),
    iconUrl: resolve(iconTag ? attr(iconTag, "href") : null),
    themeColor: meta(html, "theme-color"),
    platform,
    titleTags: (head.match(/<title[\s>]/gi) ?? []).length,
    descriptionTags: tags(head, "meta").filter((tag) => (attr(tag, "name") ?? "").toLowerCase() === "description").length,
    canonicals: links.filter((tag) => (attr(tag, "rel") ?? "").toLowerCase() === "canonical").map((tag) => resolve(attr(tag, "href"))).filter((href): href is string => Boolean(href)),
    images: images.map((tag) => ({ src: resolve(attr(tag, "src") ?? attr(tag, "data-src")), alt: attr(tag, "alt") })),
    links: [...allLinks],
    headings: (body.match(/<h[23]\b[\s\S]*?<\/h[23]>/gi) ?? []).map(textOf).filter(Boolean),
    text: textOf(body).slice(0, 4000),
  };
}

/** URLs listed in a sitemap or sitemap index, following nested sitemaps. */
export async function readSitemapUrls(start: string[], limit = 5000) {
  const queue = [...start];
  const seen = new Set<string>();
  const urls = new Map<string, string | null>();
  while (queue.length && seen.size < 50 && urls.size < limit) {
    const sitemapUrl = queue.shift()!;
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    let xml: string;
    try {
      const page = await fetchText(sitemapUrl);
      if (page.status >= 400) continue;
      xml = page.html;
    } catch {
      continue;
    }
    const isIndex = /<sitemapindex/i.test(xml);
    for (const block of xml.match(/<(url|sitemap)>[\s\S]*?<\/\1>/gi) ?? []) {
      const loc = decodeEntities(block.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i)?.[1] ?? "").trim();
      if (!loc) continue;
      if (isIndex) queue.push(loc);
      else urls.set(loc, block.match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i)?.[1]?.trim() ?? null);
    }
  }
  return { urls, sitemapsRead: [...seen] };
}

export async function discoverSitemaps(origin: string) {
  const found: string[] = [];
  try {
    const robots = await fetchText(`${origin}/robots.txt`);
    if (robots.status < 400) {
      for (const line of robots.html.split(/\r?\n/)) {
        const match = line.match(/^\s*sitemap:\s*(\S+)/i);
        if (match) found.push(match[1]!);
      }
    }
  } catch {
    // No robots.txt; fall back to the conventional locations.
  }
  return found.length ? found : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
}
