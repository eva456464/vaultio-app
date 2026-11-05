/**
 * Site health checks: page checks, duplicates, links and images, robots.txt rules, PageSpeed
 * parsing. Run: npx tsx --tsconfig tsconfig.json scripts/test-site-health.ts
 * (PAGESPEED_API_BASE=http://localhost:4800/pagespeed for the PageSpeed part, with the mock running).
 */
import { parsePage } from "../src/server/agents/web";
import { blocksWholeSite, crawlerIssues, duplicateIssues, isWeakAlt, pageIssues, resourceIssues, slowPageIssue, type Probe } from "../src/server/site-health/checks";
import { pageSpeed } from "../src/server/site-health/pagespeed";

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` → ${JSON.stringify(detail)}`}`);
  if (!ok) failed += 1;
};
const types = (issues: { issueType: string }[]) => issues.map((issue) => issue.issueType);

const body = "<p>" + "We repair and replace roofs for homeowners in Santa Barbara. ".repeat(40) + "</p>";
const page = (head: string, extra = "") =>
  `<!doctype html><html lang="en"><head>${head}<meta name="viewport" content="width=device-width"><meta property="og:title" content="x"><script type="application/ld+json">{"@type":"RoofingContractor"}</script></head><body><h1>Roof repair in Santa Barbara</h1><h2>How long does a roof repair take?</h2>${body}${extra}</body></html>`;
const url = "https://roofer.test/services/repair";

(async () => {
  const clean = parsePage(page(`<title>Roof Repair in Santa Barbara | Insured Local Roofers</title><meta name="description" content="${"Roof repair for homeowners in Santa Barbara: leaks, shingles and storm damage fixed fast by insured roofers with a 10-year workmanship warranty and free quotes."}"><link rel="canonical" href="${url}">`), url);
  const cleanIssues = types(pageIssues(clean, 200, 300, false, url));
  check("a good page has no title/description/canonical issues", !cleanIssues.some((type) => /title|description|canonical|questions|alt/.test(type)), cleanIssues);

  const messy = parsePage(
    page(
      `<title>Best Pizza Delivery in Naples Italy Tonight</title><title>Second</title><meta name="description" content="Order pizza and pasta online for delivery in Naples."><meta name="description" content="dup"><link rel="canonical" href="https://other-site.test/page"><link rel="canonical" href="https://roofer.test/x">`,
      `<img src="/a.jpg" alt="image"><img src="/IMG_2034.jpg" alt="IMG_2034.jpg"><img src="/roof.webp" alt="">`,
    ).replace("<h2>How long does a roof repair take?</h2>", "<h2>Our services</h2>"),
    url,
  );
  const messyIssues = types(pageIssues(messy, 200, 300, false, url));
  for (const type of ["multiple_titles", "title_mismatch", "multiple_meta_descriptions", "description_mismatch", "canonical_other_site", "multiple_canonicals", "weak_alt_text", "images_missing_alt", "unanswered_questions"]) {
    check(`detects ${type}`, messyIssues.includes(type), messyIssues);
  }
  check("weak alt: file names and generic words, not descriptions", isWeakAlt("photo", null) && isWeakAlt("roof-crew", "https://x.test/roof-crew.jpg") && !isWeakAlt("Crew replacing shingles on a two-story house", "https://x.test/a.jpg"));

  const dups = duplicateIssues([
    { url: "a", title: "Roof Repair", metaDescription: "Same" },
    { url: "b", title: "roof repair ", metaDescription: "Other" },
    { url: "c", title: "Gutters", metaDescription: "Same" },
  ]);
  check("same title on two pages", types(dups.get("a") ?? []).includes("duplicate_title") && types(dups.get("b") ?? []).includes("duplicate_title") && !types(dups.get("c") ?? []).includes("duplicate_title"));
  check("same description on two pages", types(dups.get("a") ?? []).includes("duplicate_meta_description") && types(dups.get("c") ?? []).includes("duplicate_meta_description"));

  const withResources = parsePage(page("<title>t</title>", `<a href="/gone">x</a><a href="https://ok.test/">y</a><a href="https://blocked.test/">z</a><img src="/big.jpg" alt="Big roof photo"><img src="/missing.png" alt="Missing roof photo"><img src="/weird" alt="Weird roof photo">`), url);
  const probes = new Map<string, Probe>([
    ["https://roofer.test/gone", { url: "", status: 404, bytes: null, type: "text/html" }],
    ["https://ok.test/", { url: "", status: 200, bytes: 1000, type: "text/html" }],
    ["https://blocked.test/", { url: "", status: 403, bytes: null, type: "text/html" }],
    ["https://roofer.test/big.jpg", { url: "", status: 200, bytes: 420_000, type: "image/jpeg" }],
    ["https://roofer.test/missing.png", { url: "", status: 404, bytes: null, type: "text/html" }],
    ["https://roofer.test/weird", { url: "", status: 200, bytes: 2000, type: "application/octet-stream" }],
  ]);
  const resources = resourceIssues(withResources, probes);
  const byType = Object.fromEntries(resources.map((issue) => [issue.issueType, issue.description]));
  check("broken links (404), not bot-blocked ones (403)", /1 links/.test(byType.broken_links ?? "") && /gone/.test(byType.broken_links ?? ""), byType);
  check("broken images", /missing\.png/.test(byType.broken_images ?? ""), byType);
  check("images over 100 KB, with size", /big\.jpg \(410 KB\)/.test(byType.large_images ?? ""), byType);
  check("unknown image format", /weird/.test(byType.unknown_image_format ?? ""), byType);

  check("robots: Disallow / for everyone blocks Google", blocksWholeSite("User-agent: *\nDisallow: /", "Googlebot"));
  check("robots: a Googlebot group overrides *", !blocksWholeSite("User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /", "Googlebot"));
  check("robots: blocking one folder isn't blocking the site", !blocksWholeSite("User-agent: *\nDisallow: /admin/", "Googlebot"));
  check("robots: grouped agents", blocksWholeSite("User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /", "ClaudeBot"));
  const crawler = types(crawlerIssues({ https: true, robots: "User-agent: *\nDisallow: /", sitemapsFound: 1, sitemapUrls: 0, llmsTxt: true }));
  check("crawler files: search blocked and unreadable sitemap", crawler.includes("robots_blocks_search") && crawler.includes("sitemap_unreadable") && !crawler.includes("missing_sitemap"), crawler);

  check("slow page below 50", slowPageIssue(41, 5200)?.issueType === "slow_page" && slowPageIssue(92, 1900) === null);
  if (process.env.PAGESPEED_API_BASE) {
    const home = await pageSpeed("http://sunnyroofing.test/");
    const inner = await pageSpeed("http://sunnyroofing.test/services/roof-repair");
    check("PageSpeed response parsed", home?.performance === 92 && home.lcpMs === 1900 && home.cls === 0.02 && inner?.performance === 41, { home, inner });
  }
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
