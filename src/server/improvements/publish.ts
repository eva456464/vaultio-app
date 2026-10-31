/** Applies an improvement's approved changes to the article and updates it on the client's site. */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleImprovements, articles, orgWebsites } from "@/db/schema";
import { logActivity } from "../agents/activity";
import { safeColor } from "../brand";
import { renderArticleHtml } from "../markdown";
import { publishArticle } from "../publishing/publish";
import { applyChanges, extractFaq, linksIn } from "./sections";

export async function publishImprovement(siteId: number, improvementId: number, options: { approveAll?: boolean } = {}) {
  const [improvement] = await db
    .select()
    .from(articleImprovements)
    .where(and(eq(articleImprovements.id, improvementId), eq(articleImprovements.orgWebsiteId, siteId)));
  if (!improvement || improvement.status !== "pending_review") throw new Error("This improvement is not waiting for review");
  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  const [article] = improvement.articleId ? await db.select().from(articles).where(eq(articles.id, improvement.articleId)) : [];
  if (!site || !article || !improvement.originalContent) throw new Error("The article for this improvement no longer exists");

  const changes = improvement.changes.map((change) => (options.approveAll && change.status === "pending" ? { ...change, status: "approved" as const } : change));
  if (!changes.some((change) => change.status === "approved")) {
    await db.update(articleImprovements).set({ changes, status: "rejected", decidedAt: new Date(), updatedAt: new Date() }).where(eq(articleImprovements.id, improvement.id));
    return { published: false, errors: [] as string[] };
  }

  const applied = applyChanges(improvement.originalContent, changes);
  const title = applied.title ?? article.title;
  const metaDescription = applied.metaDescription ?? article.metaDescription;
  const markdown = applied.markdown;
  const origin = new URL(site.url).origin;
  const links = linksIn(markdown);
  const internal = links.filter((url) => url.startsWith(origin)).length;
  const faq = extractFaq(markdown) ?? article.faq;
  const jsonLd = article.jsonLd && typeof article.jsonLd === "object" ? { ...(article.jsonLd as Record<string, unknown>), headline: title, description: metaDescription, dateModified: new Date().toISOString() } : article.jsonLd;
  const faqJsonLd = article.faqJsonLd && faq.length
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((entry) => ({ "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.answer } })) }
    : article.faqJsonLd;

  await db
    .update(articles)
    .set({
      title,
      metaDescription,
      content: markdown,
      htmlContent: renderArticleHtml(markdown, { blocks: article.blocks, accentColor: safeColor(site.brandColor) }),
      outline: (markdown.match(/^## .+$/gm) ?? []).map((heading) => heading.slice(3)),
      faq,
      jsonLd,
      faqJsonLd,
      wordCount: markdown.replace(/<!--[\s\S]*?-->/g, " ").replace(/[#*_>`|[\]()-]/g, " ").split(/\s+/).filter(Boolean).length,
      internalLinksCount: internal,
      externalLinksCount: links.length - internal,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, article.id));
  const result = await publishArticle(siteId, article.id, { update: true });
  await db
    .update(articleImprovements)
    .set({ changes, status: "published", improvedContent: markdown, publishedAt: new Date(), decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(articleImprovements.id, improvement.id));
  await logActivity(siteId, "articleImproved", { title, articleId: article.id, publishedUrl: article.publishedUrl ?? undefined });
  return { published: true, errors: result.errors };
}
