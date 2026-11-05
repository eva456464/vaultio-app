/**
 * Plagiarism check: matching 8-word runs against source pages, copied paragraphs, quality check entry.
 * Run: npx tsx scripts/test-originality.ts
 */
import { qualityChecks } from "../src/server/articles/checks";
import { checkOriginality, paragraphs } from "../src/server/articles/originality";

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` → ${JSON.stringify(detail)}`}`);
  if (!ok) failed += 1;
};

const source =
  "<html><body><nav>Home About</nav><article><p>Asphalt shingles usually last between twenty and thirty years when they are installed correctly and the attic is ventilated well, " +
  "while metal roofs can last fifty years or more with very little maintenance from the homeowner.</p><p>" +
  "Lorem ipsum filler text about gutters and downspouts that is long enough to count as a real page for the check to use it at all.".repeat(3) +
  "</p></article></body></html>";
const fetchPage = async (url: string) => (url === "https://source.test/a" ? source.replace(/<[^>]+>/g, " ") : url === "https://source.test/b" ? "x".repeat(300) : "");

const original = [
  "## How long does a roof last?",
  "",
  "Most roofs last a few decades, and the material you choose matters more than anything else. A roofer can tell you what to expect for your house.",
  "",
  "Regular inspections after storms catch small problems early, which keeps repair costs low and extends the life of the roof considerably over time.",
].join("\n");
const copied = [
  "## How long does a roof last?",
  "",
  "Asphalt shingles usually last between twenty and thirty years when they are installed correctly and the attic is ventilated well, while metal roofs can last fifty years or more.",
  "",
  "Regular inspections after storms catch small problems early, which keeps repair costs low and extends the life of the roof considerably over time.",
  "",
  "| Material | Lifespan |",
  "| --- | --- |",
  "| Asphalt | 20–30 years |",
].join("\n");

(async () => {
  check("prose paragraphs skip headings and tables", paragraphs(copied).length === 2, paragraphs(copied));
  const clean = await checkOriginality(original, ["https://source.test/a", "https://source.test/b", "https://source.test/missing"], fetchPage);
  check("original text passes", clean.passed && clean.share === 0 && clean.copiedParagraphs.length === 0, clean);
  check("pages that can't be read aren't counted", clean.checkedSources === 2, clean.checkedSources);
  const result = await checkOriginality(copied, ["https://source.test/a", "https://source.test/b"], fetchPage);
  check("copied text fails", !result.passed && result.share > 0.3, result);
  check("the copied paragraph is found", JSON.stringify(result.copiedParagraphs) === "[0]", result.copiedParagraphs);
  check("the most similar page is named", result.worst?.url === "https://source.test/a", result.worst);

  const base = { markdown: original, title: "t", metaDescription: "d".repeat(100), internal: 2, external: 2, keyword: "", semantic: [], media: [] };
  const withCheck = qualityChecks({ ...base, originality: result });
  const entry = withCheck.find((item) => item.key === "plagiarism");
  check("quality check shows the result", entry?.passed === false && /% matching text across 2 pages/.test(entry.detail ?? ""), entry);
  check("no check shown when nothing was compared", !qualityChecks({ ...base, originality: { passed: true, share: 0, checkedSources: 0 } }).some((item) => item.key === "plagiarism"));
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
