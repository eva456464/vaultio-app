/**
 * Checks a proposed improvement against the original article before anyone sees it. Flagged
 * improvements are never approved automatically.
 */
import type { ImprovementChange, SafetyFlag } from "@/db/schema";
import { applyChanges, imagesIn, linksIn, splitSections } from "./sections";

const PLACEHOLDER = /\[(?:insert|todo|tbd|placeholder|add|source)[^\]]*\]|lorem ipsum|\bTODO\b|\bXX+%|\{\{[^}]*\}\}/i;
const FAQ_HEADING = /^(faq|frequently asked)/i;
const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];

export function safetyChecks(input: {
  original: string;
  originalTitle: string;
  changes: ImprovementChange[];
  queries: { query: string; clicks: number }[];
}): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const sections = splitSections(input.original);
  const bodies = [sections.intro, ...sections.sections.map((section) => section.body)];
  const removed = new Set(input.changes.filter((c) => c.kind === "removeLink").map((c) => c.linkUrl));

  for (const change of input.changes) {
    if (PLACEHOLDER.test(change.suggested)) flags.push({ check: "placeholders", detail: change.suggested.match(PLACEHOLDER)![0], changeId: change.id });
    if (change.kind !== "rewrite" || change.sectionIndex === undefined) continue;
    const before = bodies[change.sectionIndex] ?? "";
    for (const url of linksIn(before)) if (!removed.has(url) && !change.suggested.includes(url)) flags.push({ check: "missingLinks", detail: url, changeId: change.id });
    for (const url of imagesIn(before)) if (!change.suggested.includes(url)) flags.push({ check: "missingImages", detail: url, changeId: change.id });
  }

  // Judged on the article as it would be with every change accepted.
  const full = applyChanges(input.original, input.changes, () => true);
  const faqSections = splitSections(full.markdown).sections.filter((section) => FAQ_HEADING.test(section.heading));
  if (faqSections.length > 1) flags.push({ check: "duplicateFaq", detail: faqSections.map((s) => s.heading).join(", "), changeId: input.changes.find((c) => c.kind === "add" && FAQ_HEADING.test(c.heading ?? ""))?.id });

  // Searches the page already wins that the old title covered but the new title/meta don't.
  const titleChange = input.changes.find((c) => c.kind === "title");
  if (titleChange) {
    const metaChange = input.changes.find((c) => c.kind === "meta");
    const oldWords = new Set(words(input.originalTitle));
    const newWords = new Set(words(`${titleChange.suggested} ${metaChange?.suggested ?? ""}`));
    const dropped = input.queries
      .filter((q) => q.clicks > 0)
      .slice(0, 5)
      .filter((q) => {
        const terms = words(q.query);
        return terms.length && terms.every((term) => oldWords.has(term)) && terms.some((term) => !newWords.has(term));
      })
      .map((q) => q.query);
    if (dropped.length) flags.push({ check: "topicDrift", detail: dropped.join(", "), changeId: titleChange.id });
  }

  // The same paragraph twice usually means a section was duplicated by mistake.
  const paragraphs = full.markdown.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 80 && !p.startsWith("<!--") && !p.startsWith(">"));
  const seen = new Set<string>();
  for (const paragraph of paragraphs) {
    if (seen.has(paragraph)) flags.push({ check: "duplicatedBlocks", detail: `${paragraph.slice(0, 80)}…` });
    seen.add(paragraph);
  }
  return flags;
}
