/**
 * Checks the writing options (no database or keys needed):
 *
 *   npx tsx --tsconfig tsconfig.json scripts/test-writing.ts
 */
import { allowedArticleType, formatInternalLinks } from "@/lib/writing";

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

const md = "See [repairs](https://example.com/services/repair) and [cost](https://www.example.com/cost?x=1#a), [pdf](https://example.com/guide.pdf), [home](https://example.com) and [other](https://other.com/page).";
const both = formatInternalLinks(md, "https://example.com", { www: true, trailingSlash: true });
check(both.includes("(https://www.example.com/services/repair/)") && both.includes("(https://www.example.com/cost/?x=1#a)"), "www and trailing slash added to page links, query kept");
check(both.includes("(https://www.example.com/guide.pdf)") && both.includes("(https://www.example.com/)"), "files get no slash; the home page gets one");
check(both.includes("(https://other.com/page)"), "other websites' links untouched");
const noWww = formatInternalLinks(md, "https://www.example.com", { www: false, trailingSlash: true });
check(noWww.includes("(https://example.com/cost/?x=1#a)"), "www removed when the setting is off");
check(formatInternalLinks(md, "https://example.com", { www: false, trailingSlash: false }) === md, "nothing changes with both settings off");

check(allowedArticleType("guide_how_to", []) === "guide_how_to", "no restriction keeps the planned type");
check(allowedArticleType("comparison", ["listicle_comparison"]) === "comparison", "comparison counts as a product listicle");
check(allowedArticleType("guide_how_to", ["guide_explainer", "listicle_educational"]) === "guide_explainer", "a disallowed type falls back to the closest allowed one");
check(allowedArticleType("listicle_comparison", ["guide_how_to"]) === "guide_how_to", "falls back to whatever is allowed");
