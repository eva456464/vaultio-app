/**
 * Site health checks (the reference product's list in "What we check"): crawler files for the whole
 * site, technical SEO and AI readiness for each page. Pure functions over parsed pages so they can
 * be tested and re-run for one issue ("Validate fix").
 */
import type { PageFacts } from "../agents/web";

export type Severity = "low" | "medium" | "high";
export type Issue = { issueType: string; severity: Severity; description: string; action: string };

export const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];
/** Images bigger than this slow pages down. */
export const MAX_IMAGE_BYTES = 100 * 1024;
const IMAGE_TYPES = /^image\/(jpeg|jpg|png|webp|gif|avif|svg\+xml|x-icon|vnd\.microsoft\.icon)$/i;

const STOPWORDS = new Set(
  "a an and are as at be by for from has have how in is it its of on or our that the this to was what when where which who why will with you your we us de la le les el los las der die das und et en un une y o du des".split(" "),
);
const words = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

/** Share of the words of `phrase` that also appear in `text` (0–1). */
export function overlap(phrase: string, text: string) {
  const wanted = [...new Set(words(phrase))];
  if (!wanted.length) return 1;
  const have = new Set(words(text));
  // Accept a shared stem ("roofing" / "roof", "repairs" / "repair").
  const found = wanted.filter((word) => have.has(word) || [...have].some((other) => other.length > 3 && (other.startsWith(word.slice(0, 5)) || word.startsWith(other.slice(0, 5)))));
  return found.length / wanted.length;
}

const GENERIC_ALT = /^(image|img|photo|picture|pic|graphic|logo|icon|banner|untitled|placeholder|thumbnail|screenshot|figure|\d+|[a-z]{1,2})$/i;
/** Alt text that doesn't describe the image: generic words or a file name. */
export function isWeakAlt(alt: string, src: string | null) {
  const value = alt.trim();
  if (!value) return false;
  if (GENERIC_ALT.test(value)) return true;
  if (/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(value) || /^(img|dsc|pxl|screenshot)[-_ ]?\d+/i.test(value)) return true;
  const file = src?.split("/").pop()?.split("?")[0]?.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").toLowerCase();
  return Boolean(file && file.length > 3 && value.toLowerCase().replace(/[-_]+/g, " ") === file);
}

const QUESTION = /\?\s*$|^(how|what|why|when|where|which|who|can|do|does|is|are|should|will)\b/i;

export function pageIssues(facts: PageFacts, status: number, ms: number, isHome: boolean, pageUrl: string): Issue[] {
  const issues: Issue[] = [];
  const add = (issueType: string, severity: Severity, description: string, action: string) => issues.push({ issueType, severity, description, action });

  if (status >= 400) {
    add("http_error", "high", `The page returns HTTP ${status}.`, "Fix the page or redirect it to a working URL.");
    return issues;
  }
  const pageText = `${facts.h1s.join(" ")} ${facts.headings.join(" ")} ${facts.text}`;
  // Titles of 45–60 characters and descriptions of 150–160 show in full and use the space well.
  if (!facts.title) add("missing_title", "high", "The page has no title tag.", "Add a unique, descriptive title of 45–60 characters.");
  else {
    if (facts.title.length > 60) add("long_title", "low", `The title is ${facts.title.length} characters and may be cut off in results.`, "Shorten the title to 45–60 characters.");
    else if (facts.title.length < 45) add("short_title", "low", `The title is only ${facts.title.length} characters.`, "Describe the page's topic in 45–60 characters.");
    if (facts.text.length > 200 && overlap(facts.title, pageText) < 0.34) add("title_mismatch", "medium", `The title "${facts.title}" doesn't match what the page is about.`, "Write a title that names the page's actual topic, using words from its heading and content.");
  }
  if (facts.titleTags > 1) add("multiple_titles", "medium", `The page has ${facts.titleTags} title tags.`, "Keep one <title> in the page's head.");
  if (!facts.metaDescription) add("missing_meta_description", "medium", "The page has no meta description.", "Add a 150–160 character summary of the page.");
  else {
    if (facts.metaDescription.length > 160) add("long_meta_description", "low", `The meta description is ${facts.metaDescription.length} characters, more than 160.`, "Trim the meta description to 150–160 characters.");
    else if (facts.metaDescription.length < 150) add("short_meta_description", "low", `The meta description is only ${facts.metaDescription.length} characters.`, "Expand the meta description to 150–160 characters.");
    if (facts.text.length > 200 && overlap(facts.metaDescription, pageText) < 0.3) add("description_mismatch", "low", "The meta description doesn't match what the page is about.", "Summarize what this page actually covers, in its own words.");
  }
  if (facts.descriptionTags > 1) add("multiple_meta_descriptions", "low", `The page has ${facts.descriptionTags} meta description tags.`, "Keep one meta description.");
  if (facts.h1s.length === 0) add("missing_h1", "medium", "The page has no H1 heading.", "Add one H1 that states the page's main topic.");
  else if (facts.h1s.length > 1) add("multiple_h1", "low", `The page has ${facts.h1s.length} H1 headings.`, "Keep a single H1 and use H2/H3 for sections.");
  if (!facts.canonical) add("missing_canonical", "low", "The page has no canonical URL.", "Add a rel=canonical link pointing to the preferred URL.");
  else {
    const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
    if (host(facts.canonical) !== host(pageUrl)) add("canonical_other_site", "high", `The canonical tag points to another site (${facts.canonical}).`, "Point the canonical tag to this page's own address, or remove it.");
  }
  if (facts.canonicals.length > 1 && new Set(facts.canonicals).size > 1) add("multiple_canonicals", "medium", `The page has ${facts.canonicals.length} different canonical tags.`, "Keep one canonical tag.");
  const missingAlt = facts.images.filter((image) => !(image.alt ?? "").trim()).length;
  if (missingAlt > 0) add("images_missing_alt", missingAlt > 3 ? "medium" : "low", `${missingAlt} of ${facts.images.length} images have no alt text.`, "Describe each meaningful image in its alt attribute.");
  const weak = facts.images.filter((image) => image.alt && isWeakAlt(image.alt, image.src));
  if (weak.length) add("weak_alt_text", "low", `${weak.length} images have alt text that doesn't describe them (e.g. "${weak[0]!.alt}").`, "Describe what each image shows, in a short sentence.");
  if (facts.jsonLdTypes.length === 0) add("missing_structured_data", "medium", "No JSON-LD structured data was found.", "Add schema.org markup (Organization, Article, FAQ...) so search engines and AI understand the page.");
  if (facts.jsonLdTypes.includes("invalid")) add("invalid_structured_data", "medium", "A JSON-LD block could not be parsed.", "Fix the JSON syntax of the structured data.");
  // AI assistants quote pages that answer questions directly.
  const answersQuestions = facts.jsonLdTypes.some((type) => /FAQPage|QAPage/i.test(type)) || facts.headings.some((heading) => QUESTION.test(heading.trim()));
  if (!answersQuestions && facts.wordCount >= 150) add("unanswered_questions", "low", "The page doesn't answer the questions customers ask (no question headings or FAQ).", "Add a short FAQ or question-style headings that answer what customers ask about this topic.");
  if (facts.robotsMeta && /noindex/i.test(facts.robotsMeta)) add("noindex", "high", "The page tells search engines not to index it.", "Remove noindex if this page should appear in search.");
  if (!facts.hasViewport) add("missing_viewport", "medium", "The page has no mobile viewport tag.", 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  if (!isHome && facts.wordCount < 300) add("thin_content", "medium", `The page has only about ${facts.wordCount} words.`, "Expand the content so it fully answers the visitor's question.");
  if (!facts.lang) add("missing_lang", "low", "The page does not declare its language.", "Add a lang attribute to the <html> tag.");
  if (!facts.hasOpenGraph) add("missing_open_graph", "low", "The page has no Open Graph tags.", "Add og:title, og:description and og:image for link previews.");
  if (ms > 3000) add("slow_response", "medium", `The server took ${(ms / 1000).toFixed(1)}s to respond.`, "Improve hosting or caching so pages respond in under a second.");
  return issues;
}

export type Probe = { url: string; status: number; bytes: number | null; type: string | null };

/** Broken links, broken / large / unreadable images, from probes of the page's links and images. */
export function resourceIssues(facts: PageFacts, probes: Map<string, Probe>): Issue[] {
  const issues: Issue[] = [];
  const broken = (probe: Probe | undefined) => Boolean(probe && (probe.status === 404 || probe.status === 410 || probe.status >= 500 || probe.status === -1));
  const list = (urls: string[]) => urls.slice(0, 5).join(", ") + (urls.length > 5 ? ` and ${urls.length - 5} more` : "");

  const brokenLinks = facts.links.filter((url) => broken(probes.get(url)));
  if (brokenLinks.length) issues.push({ issueType: "broken_links", severity: "medium", description: `${brokenLinks.length} links lead to pages that don't exist: ${list(brokenLinks)}.`, action: "Update or remove these links, or redirect the missing pages." });

  const sources = [...new Set(facts.images.map((image) => image.src).filter((src): src is string => Boolean(src && /^https?:/.test(src))))];
  const brokenImages = sources.filter((src) => broken(probes.get(src)));
  if (brokenImages.length) issues.push({ issueType: "broken_images", severity: "medium", description: `${brokenImages.length} images don't load: ${list(brokenImages)}.`, action: "Upload the missing images again or remove them from the page." });
  const large = sources.filter((src) => (probes.get(src)?.bytes ?? 0) > MAX_IMAGE_BYTES);
  if (large.length) {
    const sizes = large.slice(0, 3).map((src) => `${src.split("/").pop()} (${Math.round((probes.get(src)!.bytes ?? 0) / 1024)} KB)`);
    issues.push({ issueType: "large_images", severity: "low", description: `${large.length} images are over 100 KB: ${sizes.join(", ")}${large.length > 3 ? "…" : ""}.`, action: "Compress these images and serve them as WebP or AVIF at the size they're shown." });
  }
  const unknown = sources.filter((src) => {
    const probe = probes.get(src);
    return probe && probe.status < 400 && probe.status > 0 && probe.type && !IMAGE_TYPES.test(probe.type.split(";")[0]!.trim());
  });
  if (unknown.length) issues.push({ issueType: "unknown_image_format", severity: "low", description: `${unknown.length} images aren't served as a standard image type: ${list(unknown)}.`, action: "Serve images as JPEG, PNG, WebP, AVIF, GIF or SVG with the matching Content-Type." });
  return issues;
}

/** "Same title / description on other pages", once every page has been read. */
export function duplicateIssues(pages: { url: string; title: string | null; metaDescription: string | null }[]) {
  const result = new Map<string, Issue[]>();
  for (const [field, issueType, label, severity] of [
    ["title", "duplicate_title", "title", "medium"],
    ["metaDescription", "duplicate_meta_description", "meta description", "low"],
  ] as const) {
    const groups = new Map<string, string[]>();
    for (const page of pages) {
      const value = page[field]?.trim().toLowerCase();
      if (value) groups.set(value, [...(groups.get(value) ?? []), page.url]);
    }
    for (const urls of groups.values()) {
      if (urls.length < 2) continue;
      for (const url of urls) {
        const others = urls.filter((other) => other !== url);
        result.set(url, [
          ...(result.get(url) ?? []),
          { issueType, severity, description: `The same ${label} is used on ${others.length} other page${others.length > 1 ? "s" : ""}: ${others.slice(0, 3).join(", ")}${others.length > 3 ? "…" : ""}.`, action: `Give each page its own ${label} that describes what's on it.` },
        ]);
      }
    }
  }
  return result;
}

/** Groups of robots.txt rules (user agents and their Disallow lines). */
function robotsGroups(text: string) {
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const [, key, value] = match;
    if (key!.toLowerCase() === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], disallow: [], allow: [] }));
      current.agents.push(value!.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!current) continue;
      if (key!.toLowerCase() === "disallow") current.disallow.push(value!.trim());
      if (key!.toLowerCase() === "allow") current.allow.push(value!.trim());
    }
  }
  return groups;
}

/** True when the rules that apply to the given crawler block the whole site. */
export function blocksWholeSite(robots: string, agent: string) {
  const groups = robotsGroups(robots);
  const own = groups.filter((group) => group.agents.includes(agent.toLowerCase()));
  const rules = own.length ? own : groups.filter((group) => group.agents.includes("*"));
  return rules.some((group) => group.disallow.includes("/") && !group.allow.some((path) => path === "/" || path === "/$"));
}

export function crawlerIssues(input: { https: boolean; robots: string | null; sitemapsFound: number; sitemapUrls: number; llmsTxt: boolean }): Issue[] {
  const issues: Issue[] = [];
  if (!input.https) issues.push({ issueType: "not_https", severity: "high", description: "The site is not served over HTTPS.", action: "Install an SSL certificate and redirect all http:// URLs to https://." });
  if (input.robots === null) issues.push({ issueType: "missing_robots_txt", severity: "medium", description: "robots.txt was not found.", action: "Add a robots.txt that allows crawling and lists your sitemap." });
  else {
    if (blocksWholeSite(input.robots, "Googlebot")) issues.push({ issueType: "robots_blocks_search", severity: "high", description: "robots.txt blocks search engines from the whole site.", action: "Remove `Disallow: /` for Googlebot and other search engines in robots.txt." });
    const blocked = AI_CRAWLERS.filter((bot) => blocksWholeSite(input.robots!, bot));
    if (blocked.length) issues.push({ issueType: "ai_crawlers_blocked", severity: "high", description: `robots.txt blocks AI crawlers: ${blocked.join(", ")}.`, action: "Allow AI crawlers so ChatGPT, Claude and Perplexity can read and cite your site." });
  }
  if (input.sitemapUrls === 0) {
    if (input.sitemapsFound > 0) issues.push({ issueType: "sitemap_unreadable", severity: "high", description: "The sitemap was found but no page addresses could be read from it.", action: "Fix the sitemap so it is valid XML listing your pages in <url><loc> entries." });
    else issues.push({ issueType: "missing_sitemap", severity: "high", description: "No XML sitemap was found.", action: "Publish a sitemap.xml and reference it in robots.txt." });
  }
  if (!input.llmsTxt) issues.push({ issueType: "missing_llms_txt", severity: "low", description: "No llms.txt file was found.", action: "Add an llms.txt that summarises your site for AI assistants." });
  return issues;
}

export function slowPageIssue(performance: number, lcpMs: number | null): Issue | null {
  if (performance >= 50) return null;
  return {
    issueType: "slow_page",
    severity: performance < 30 ? "high" : "medium",
    description: `Page speed score ${performance}/100 on mobile${lcpMs ? `; the main content appears after ${(lcpMs / 1000).toFixed(1)}s` : ""}.`,
    action: "Compress images, defer scripts that aren't needed at first, and use caching so the page loads in under 2.5 seconds on mobile.",
  };
}

const PENALTY = { high: 20, medium: 8, low: 3 } as const;
export const scoreOf = (issues: { severity: Severity }[]) => Math.max(0, 100 - issues.reduce((sum, issue) => sum + PENALTY[issue.severity], 0));
