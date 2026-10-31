/**
 * Turns an improvement candidate into a reviewable set of changes: Claude proposes edits for the
 * opportunity (with the page's real Google searches and fresh research), links are checked, and
 * safety checks run before the improvement is offered for review.
 */
import { lookup } from "node:dns/promises";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { articleImprovements, articles, competitors, type ImprovementChange, type Opportunity } from "@/db/schema";
import { shiftDay } from "@/lib/traffic";
import { ai } from "@/server/ai/claude";
import { writingSystemPrompt } from "../agents/jobs/writer";
import { connectedIntegration } from "../agents/jobs/traffic";
import type { Site } from "../agents/jobs/types";
import { queryGsc } from "../google/client";
import { safetyChecks } from "./safety";
import { isProtected, linksIn, protectBlocks, splitSections } from "./sections";

/** What each opportunity calls for; nothing else should change. */
const GUIDANCE: Record<Opportunity, string> = {
  LOW_CTR:
    "The page ranks well but few searchers click. Write a sharper title (max 60 characters) and meta description (120–155 characters) that match what people search for. " +
    "Rewrite the introduction only if it fails to answer the main search right away. Do not add sections.",
  ALMOST_PAGE_ONE:
    "The page ranks just below page one. Rewrite the 1–3 sections that matter most so they answer the top searches better, add at most 2 new sections for searches the article " +
    "doesn't cover, and improve the title and meta description only if they miss the main search.",
  DECLINING:
    "Clicks are falling. Refresh outdated facts and figures, rewrite sections that no longer answer the searches people use, and add at most one section for an uncovered search. " +
    "Keep the title unless it is clearly weaker than what the searches ask for.",
  THIN_CONTENT: "The article is shorter than what usually ranks. Expand the thinnest sections and add 2–4 new sections covering the searches and subtopics it misses.",
  STALE_CONTENT: "The article is over a year old. Refresh facts, figures and years in place, in the sections that contain them. Do not add new sections and do not change the title unless it contains an outdated year.",
};

const PlanSchema = z.object({
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  rewrites: z.array(z.object({ section: z.number(), heading: z.string(), markdown: z.string(), reason: z.string() })),
  additions: z.array(z.object({ after: z.number(), heading: z.string(), markdown: z.string(), reason: z.string() })),
});

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** Links that are certainly dead (404/410 or the domain no longer exists) or point at a competitor. */
async function linksToRemove(site: Site, markdown: string) {
  const own = hostOf(site.url);
  const rivals = new Set((await db.select({ url: competitors.url }).from(competitors).where(eq(competitors.orgWebsiteId, site.id))).map((c) => hostOf(c.url)).filter(Boolean));
  // Links in Vaultio's own cards (CTA, video) are not the article's sources.
  const external = [...new Set(linksIn(protectBlocks(markdown)))].filter((url) => hostOf(url) && hostOf(url) !== own).slice(0, 30);
  // A missing domain only proves a dead link when DNS works at all here.
  const dnsWorks = await lookup("www.google.com").then(
    () => true,
    () => false,
  );
  const results: { url: string; reason: "broken" | "competitor" }[] = [];
  await Promise.all(
    external.map(async (url) => {
      if (rivals.has(hostOf(url))) return results.push({ url, reason: "competitor" });
      if (!dnsWorks) return;
      try {
        let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
        if (response.status === 405 || response.status === 403) response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
        if (response.status === 404 || response.status === 410) results.push({ url, reason: "broken" });
      } catch (error) {
        // Only a missing domain counts; timeouts and blocks are not proof the page is gone.
        if ((error as { cause?: { code?: string } }).cause?.code === "ENOTFOUND") results.push({ url, reason: "broken" });
      }
    }),
  );
  return results;
}

async function pageQueries(site: Site, pageUrl: string) {
  try {
    const { row, propertyId } = await connectedIntegration(site.id, "gsc");
    const end = new Date().toISOString().slice(0, 10);
    const rows = await queryGsc(row, propertyId, { startDate: shiftDay(end, -92), endDate: end, dimensions: ["query"], page: pageUrl }, 1000);
    return rows
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25)
      .map((r) => ({ query: r.keys[0]!, clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10 }));
  } catch {
    return [];
  }
}

export async function generateImprovement(site: Site, improvementId: number) {
  const [improvement] = await db.select().from(articleImprovements).where(eq(articleImprovements.id, improvementId));
  const [article] = improvement?.articleId ? await db.select().from(articles).where(eq(articles.id, improvement.articleId)) : [];
  if (!improvement || !article?.content) throw new Error("Only articles written by Vaultio can be improved");
  const opportunity = improvement.opportunity ?? "DECLINING";
  await db.update(articleImprovements).set({ status: "generating", error: null, updatedAt: new Date() }).where(eq(articleImprovements.id, improvement.id));

  try {
    const original = article.content;
    const split = splitSections(original);
    const [queries, removals] = await Promise.all([pageQueries(site, improvement.pageUrl), linksToRemove(site, original)]);
    const research =
      opportunity === "LOW_CTR"
        ? null
        : await ai.research({
            effort: "low",
            maxSearches: 4,
            system: "You research current, verifiable facts for updating a published article. Report concise notes, each fact followed by its source URL, and list subtopics today's top-ranking pages cover.",
            prompt: `Article: "${article.title}" (${site.selectedLanguage}). Searches it gets from Google: ${queries.slice(0, 10).map((q) => q.query).join(", ") || "unknown"}.`,
          });

    const numbered = [
      `[0] Introduction\n${protectBlocks(split.intro)}`,
      ...split.sections.map((section, index) => `[${index + 1}] ## ${section.heading}${isProtected(section.heading) ? " (do not change)" : ""}\n${protectBlocks(section.body)}`),
    ].join("\n\n");
    const plan = await ai.generateObject({
      schema: PlanSchema,
      effort: "high",
      system: [
        writingSystemPrompt(site),
        "You are now improving a published article, not writing a new one. Change only what the opportunity calls for and leave everything else exactly as it is.",
        `Opportunity: ${GUIDANCE[opportunity]}`,
        "Return: title / metaDescription (null to keep them); rewrites: sections to replace, by their [number] (0 is the introduction), with the full new markdown body (no '##' heading line) and the heading to use; " +
          "additions: new sections, with the [number] of the section they go after. Give a one-sentence reason for each.",
        "Keep every [[KEEP-n]] token, image line and link of a section you rewrite, unless a link is dead. Only cite URLs from the research notes. Never invent statistics, quotes or offers. " +
          "Keep one FAQ section. Do not touch sections marked (do not change).",
      ].join("\n\n"),
      prompt: [
        `Title: ${article.title}`,
        `Meta description: ${article.metaDescription ?? ""}`,
        queries.length ? `Searches this page gets from Google (last 3 months):\n${queries.map((q) => `- ${q.query} — ${q.impressions} impressions, ${q.clicks} clicks, position ${q.position}`).join("\n")}` : "",
        research ? `Research notes:\n${research.notes}\n\nSources you may cite:\n${research.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}` : "",
        `\nArticle sections:\n${numbered}`,
      ].join("\n\n"),
    });

    const sectionCount = split.sections.length;
    const changes: ImprovementChange[] = [];
    const id = () => `c${changes.length + 1}`;
    if (plan.title && plan.title.trim() !== article.title) changes.push({ id: id(), kind: "title", status: "pending", original: article.title, suggested: plan.title.trim().slice(0, 70) });
    if (plan.metaDescription && plan.metaDescription.trim() !== (article.metaDescription ?? "")) changes.push({ id: id(), kind: "meta", status: "pending", original: article.metaDescription ?? "", suggested: plan.metaDescription.trim().slice(0, 160) });
    for (const rewrite of plan.rewrites) {
      const index = Math.round(rewrite.section);
      if (index < 0 || index > sectionCount || (index > 0 && isProtected(split.sections[index - 1]!.heading))) continue;
      const before = index === 0 ? split.intro : split.sections[index - 1]!.body;
      if (rewrite.markdown.trim() === protectBlocks(before).trim()) continue;
      changes.push({
        id: id(),
        kind: "rewrite",
        status: "pending",
        sectionIndex: index,
        heading: index === 0 ? undefined : rewrite.heading.replace(/^#+\s*/, "").trim() || split.sections[index - 1]!.heading,
        original: before,
        suggested: rewrite.markdown.trim(),
        reason: rewrite.reason,
      });
    }
    for (const addition of plan.additions) {
      const after = Math.min(Math.max(0, Math.round(addition.after)), sectionCount);
      if (!addition.heading.trim() || !addition.markdown.trim()) continue;
      changes.push({ id: id(), kind: "add", status: "pending", sectionIndex: after, heading: addition.heading.replace(/^#+\s*/, "").trim(), suggested: addition.markdown.trim(), reason: addition.reason });
    }
    for (const removal of removals) changes.push({ id: id(), kind: "removeLink", status: "pending", suggested: "", linkUrl: removal.url, linkReason: removal.reason });

    const flags = safetyChecks({ original, originalTitle: article.title, changes, queries });
    await db
      .update(articleImprovements)
      .set({
        status: changes.length ? "pending_review" : "no_changes",
        originalTitle: article.title,
        originalMeta: article.metaDescription,
        originalContent: original,
        changes,
        safetyFlags: flags,
        queries,
        decidedAt: changes.length ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(articleImprovements.id, improvement.id));
    return { changes: changes.length, flags: flags.length };
  } catch (error) {
    await db.update(articleImprovements).set({ status: "failed", error: (error as Error).message, updatedAt: new Date() }).where(eq(articleImprovements.id, improvement.id));
    throw error;
  }
}
