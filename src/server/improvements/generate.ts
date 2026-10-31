/**
 * Turns an improvement candidate into a reviewable set of changes: Claude proposes edits for the
 * opportunity (with the page's real Google searches and fresh research), links are checked, and
 * safety checks run before the improvement is offered for review.
 *
 * The article is either one Vaultio wrote (markdown we hold) or an existing WordPress post, read
 * fresh from the site and shown to Claude as markdown with its other elements as [[KEEP-n]] tokens.
 */
import { lookup } from "node:dns/promises";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { articleImprovements, articles, competitors, type ImprovementChange, type ImprovementWordpressPost, type Opportunity, type SafetyFlag } from "@/db/schema";
import { shiftDay } from "@/lib/traffic";
import { ai } from "@/server/ai/claude";
import { writingSystemPrompt } from "../agents/jobs/writer";
import { connectedIntegration } from "../agents/jobs/traffic";
import type { Site } from "../agents/jobs/types";
import { queryGsc } from "../google/client";
import { safetyChecks } from "./safety";
import { isProtected, joinSections, linksIn, protectBlocks, splitSections, type SplitArticle } from "./sections";
import { documentView, fixedHeadings, parseWordpress, tokenLegend, wordpressChecks } from "./wordpress/blocks";
import { builderInContent, getPost, inspectLivePage, seoFields, wordpressConnection } from "./wordpress/client";

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

/** What an improvement works on: the text Claude reads and how its changes are checked. */
type Source = {
  title: string;
  metaDescription: string | null;
  /** Stored as the improvement's original: Vaultio markdown, or the WordPress post's raw content. */
  original: string;
  /** Sections as Claude reads them (CTA cards and WordPress elements as [[KEEP-n]] tokens). */
  view: SplitArticle;
  /** The whole article as markdown, for link and safety checks. */
  viewMarkdown: string;
  /** A section's text as shown on the review page next to its rewrite. */
  sectionOriginal: (index: number) => string;
  legend: string | null;
  titleWritable: boolean;
  metaWritable: boolean;
  fixedHeadings: Set<number>;
  extraChecks: (changes: ImprovementChange[]) => SafetyFlag[];
  wordpress?: ImprovementWordpressPost;
};

function vaultioSource(article: typeof articles.$inferSelect): Source {
  const split = splitSections(article.content!);
  return {
    title: article.title,
    metaDescription: article.metaDescription,
    original: article.content!,
    view: { intro: protectBlocks(split.intro), sections: split.sections.map((section) => ({ heading: section.heading, body: protectBlocks(section.body) })) },
    viewMarkdown: article.content!,
    sectionOriginal: (index) => (index === 0 ? split.intro : split.sections[index - 1]!.body),
    legend: null,
    titleWritable: true,
    metaWritable: true,
    fixedHeadings: new Set(),
    extraChecks: () => [],
  };
}

/** The post as it is on WordPress now, or a reason it can't be improved. */
async function wordpressSource(site: Site, ref: ImprovementWordpressPost): Promise<Source | { skip: string }> {
  const connection = await wordpressConnection(site.id);
  if (!connection) throw new Error("WordPress is no longer connected (Settings → Publishing)");
  const post = await getPost(connection, ref.postId);
  const raw = post.content.raw ?? "";
  const live = await inspectLivePage(post.link, post.id);
  const builder = builderInContent(raw) ?? live?.builder ?? null;
  if (builder) return { skip: builder };
  const doc = parseWordpress(raw);
  const { article: view, elements } = documentView(doc);
  const seo = seoFields(post, live);
  return {
    title: post.title.raw,
    metaDescription: seo.description,
    original: raw,
    view,
    viewMarkdown: joinSections(view),
    sectionOriginal: (index) => (index === 0 ? view.intro : view.sections[index - 1]!.body),
    legend: tokenLegend(elements) || null,
    titleWritable: seo.titleWritable,
    metaWritable: seo.metaWritable,
    fixedHeadings: fixedHeadings(doc),
    extraChecks: (changes) => wordpressChecks(raw, changes),
    wordpress: { ...ref, link: post.link, editUrl: `${connection.siteUrl}/wp-admin/post.php?post=${post.id}&action=edit`, titleWritable: seo.titleWritable, metaWritable: seo.metaWritable, builder: undefined },
  };
}

export async function generateImprovement(site: Site, improvementId: number) {
  const [improvement] = await db.select().from(articleImprovements).where(eq(articleImprovements.id, improvementId));
  if (!improvement) throw new Error("Improvement not found");
  const [article] = improvement.articleId ? await db.select().from(articles).where(eq(articles.id, improvement.articleId)) : [];
  const wordpress = improvement.source === "wordpress" ? improvement.wordpress : null;
  if (!wordpress && !article?.content) throw new Error("The article for this improvement no longer exists");
  const opportunity = improvement.opportunity ?? "DECLINING";
  await db.update(articleImprovements).set({ status: "generating", error: null, updatedAt: new Date() }).where(eq(articleImprovements.id, improvement.id));

  try {
    const loaded = wordpress ? await wordpressSource(site, wordpress) : vaultioSource(article!);
    if ("skip" in loaded) {
      // Page builders show their own copy of the content: editing the post wouldn't change the page.
      await db
        .update(articleImprovements)
        .set({ status: "no_changes", reason: `builder:${loaded.skip}`, wordpress: { ...wordpress!, builder: loaded.skip }, decidedAt: new Date(), updatedAt: new Date() })
        .where(eq(articleImprovements.id, improvement.id));
      return { changes: 0, flags: 0 };
    }
    const source = loaded;
    const split = source.view;
    const [queries, removals] = await Promise.all([pageQueries(site, improvement.pageUrl), linksToRemove(site, source.viewMarkdown)]);
    const research =
      opportunity === "LOW_CTR"
        ? null
        : await ai.research({
            effort: "low",
            maxSearches: 4,
            system: "You research current, verifiable facts for updating a published article. Report concise notes, each fact followed by its source URL, and list subtopics today's top-ranking pages cover.",
            prompt: `Article: "${source.title}" (${site.selectedLanguage}). Searches it gets from Google: ${queries.slice(0, 10).map((q) => q.query).join(", ") || "unknown"}.`,
          });

    const numbered = [
      `[0] Introduction\n${split.intro}`,
      ...split.sections.map((section, index) => `[${index + 1}] ## ${section.heading}${isProtected(section.heading) ? " (do not change)" : source.fixedHeadings.has(index + 1) ? " (keep this heading)" : ""}\n${section.body}`),
    ].join("\n\n");
    const locked = [
      source.titleWritable ? null : "The title can't be changed for this page: return null for title.",
      source.metaWritable ? null : "The meta description can't be changed for this page: return null for metaDescription.",
    ].filter(Boolean);
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
        source.legend
          ? "This is an existing post on the client's WordPress site. Each [[KEEP-n]] token stands for an element that stays exactly as it is (an image, embed, table, styled block and so on, listed below): " +
            "keep every token of a section you rewrite on its own line, in a sensible place, and never move a token to another section. Keep inline HTML that is already in the text as it is."
          : null,
        ...locked,
      ]
        .filter(Boolean)
        .join("\n\n"),
      prompt: [
        `Title: ${source.title}`,
        `Meta description: ${source.metaDescription ?? ""}`,
        queries.length ? `Searches this page gets from Google (last 3 months):\n${queries.map((q) => `- ${q.query} — ${q.impressions} impressions, ${q.clicks} clicks, position ${q.position}`).join("\n")}` : "",
        research ? `Research notes:\n${research.notes}\n\nSources you may cite:\n${research.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}` : "",
        `\nArticle sections:\n${numbered}`,
        source.legend ? `Elements (stay as they are):\n${source.legend}` : "",
      ].join("\n\n"),
    });

    const sectionCount = split.sections.length;
    const changes: ImprovementChange[] = [];
    const id = () => `c${changes.length + 1}`;
    if (source.titleWritable && plan.title && plan.title.trim() !== source.title) changes.push({ id: id(), kind: "title", status: "pending", original: source.title, suggested: plan.title.trim().slice(0, 70) });
    if (source.metaWritable && plan.metaDescription && plan.metaDescription.trim() !== (source.metaDescription ?? "")) {
      changes.push({ id: id(), kind: "meta", status: "pending", original: source.metaDescription ?? "", suggested: plan.metaDescription.trim().slice(0, 160) });
    }
    for (const rewrite of plan.rewrites) {
      const index = Math.round(rewrite.section);
      if (index < 0 || index > sectionCount || (index > 0 && isProtected(split.sections[index - 1]!.heading))) continue;
      const shown = index === 0 ? split.intro : split.sections[index - 1]!.body;
      if (rewrite.markdown.trim() === shown.trim()) continue;
      const heading = index === 0 || source.fixedHeadings.has(index) ? undefined : rewrite.heading.replace(/^#+\s*/, "").trim();
      changes.push({
        id: id(),
        kind: "rewrite",
        status: "pending",
        sectionIndex: index,
        heading: index === 0 ? undefined : heading || split.sections[index - 1]!.heading,
        original: source.sectionOriginal(index),
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

    const flags = [...safetyChecks({ original: source.viewMarkdown, originalTitle: source.title, changes, queries }), ...source.extraChecks(changes)].filter(
      (flag, index, all) => all.findIndex((other) => other.check === flag.check && other.detail === flag.detail && other.changeId === flag.changeId) === index,
    );
    await db
      .update(articleImprovements)
      .set({
        status: changes.length ? "pending_review" : "no_changes",
        originalTitle: source.title,
        originalMeta: source.metaDescription,
        originalContent: source.original,
        changes,
        safetyFlags: flags,
        queries,
        ...(source.wordpress ? { wordpress: source.wordpress } : {}),
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
