/**
 * End-to-end check of improvements for existing WordPress posts, with a stand-in AI provider and the
 * mock WordPress site (scripts/dev-fixtures/mock-wordpress.py on http://sunnyroofing.test):
 *
 *   npx tsx --tsconfig tsconfig.json scripts/test-wordpress-improvements.ts <siteId> [--publish]
 *
 * Needs Search Console data for the site (scripts/dev-fixtures/mock-google.py) and the site's
 * WordPress connection pointing at the mock. Runs the scan, prepares every WordPress candidate and
 * checks the results; with --publish it publishes the block-editor post (approving every change),
 * checks what WordPress received, and checks that a post edited in WordPress isn't overwritten.
 * Local development only: it changes the site's improvements.
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleImprovements, orgWebsites } from "@/db/schema";
import { improvementScan } from "@/server/agents/jobs/improvements";
import { siteDay } from "@/server/agents/schedule";
import { setAiProvider, type AiProvider } from "@/server/ai/claude";
import { generateImprovement } from "@/server/improvements/generate";
import { POST_CHANGED, publishImprovement } from "@/server/improvements/publish";
import { getPost, updatePost, wordpressConnection } from "@/server/improvements/wordpress/client";

process.env.ANTHROPIC_API_KEY ||= "stand-in";

/** Rewrites the first section that has text, keeping its tokens and links, and adds one section. */
const standInAi: AiProvider = {
  async generateObject(request) {
    if (!request.system.includes("improving a published article")) throw new Error(`Stand-in has no answer for: ${request.system.slice(0, 60)}`);
    const sections = [...request.prompt.matchAll(/\[(\d+)\] (?:## )?(.+?)(?: \((?:do not change|keep this heading)\))?\n([\s\S]*?)(?=\n\n\[\d+\] |\n\nElements \(|$)/g)].map((m) => ({ index: Number(m[1]), heading: m[2]!, body: m[3]! }));
    const target = sections.find((s) => s.index > 0 && !/faq|sources/i.test(s.heading) && /\w{4,}/.test(s.body.replace(/\[\[KEEP-\d+\]\]/g, "")));
    const rewrite = target && {
      section: target.index,
      heading: `${target.heading.replace(/\?$/, "")} in 2026?`.replace(/\?\?$/, "?"),
      markdown: target.body
        .split("\n\n")
        .map((part, i) => (i === 0 && !part.startsWith("[[KEEP") ? `**Updated October 2026.** ${part}` : part))
        .concat("Ask for a written quote that names the materials and the warranty, so you can compare roofers like for like.")
        .join("\n\n"),
      reason: "Refreshes the year and answers what searchers compare.",
    };
    return {
      title: "Metal Roof Cost in Santa Barbara: 2026 Prices",
      metaDescription: "A metal roof costs $14,000–$28,000 on a typical Santa Barbara home. Prices per panel type, what changes the cost and whether metal pays off.",
      rewrites: rewrite ? [rewrite] : [],
      additions: [{ after: target ? target.index : 0, heading: "How long does a quote take?", markdown: "Most roofers visit within a week and send a written quote two or three days later.", reason: "Covers a question searchers ask." }],
    } as never;
  },
  async generateText() {
    throw new Error("not used");
  },
  async research() {
    return { notes: "No new facts.", sources: [] };
  },
  async answer() {
    throw new Error("not used");
  },
};

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

async function main() {
  const siteId = Number(process.argv[2]);
  if (!siteId) throw new Error("Usage: tsx scripts/test-wordpress-improvements.ts <siteId> [--publish]");
  setAiProvider(standInAi);
  const [saved] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!saved) throw new Error("Site not found");
  const connection = await wordpressConnection(siteId);
  if (!connection?.siteUrl.includes("sunnyroofing.test")) throw new Error("Connect WordPress to http://sunnyroofing.test (the mock) first");
  const site = { ...saved, improvementsEnabled: true };
  const today = siteDay(new Date(), saved.timeZone);

  // Start from a clean slate for the mock's posts.
  await db.delete(articleImprovements).where(and(eq(articleImprovements.orgWebsiteId, siteId), eq(articleImprovements.source, "wordpress")));
  console.log("scan:", JSON.stringify(await improvementScan({ site, runDate: today })));
  const rows = await db.select().from(articleImprovements).where(and(eq(articleImprovements.orgWebsiteId, siteId), eq(articleImprovements.source, "wordpress")));
  const byPost = new Map(rows.map((row) => [row.wordpress!.postId, row]));
  check(byPost.has(101) && byPost.has(102) && byPost.has(103), "block, classic and Elementor posts are candidates");
  check(!byPost.has(104) && !byPost.has(99), "a post without Search Console data and Vaultio's own post are not");

  for (const row of rows) {
    const outcome = await generateImprovement(site, row.id);
    const [after] = await db.select().from(articleImprovements).where(eq(articleImprovements.id, row.id));
    console.log(`\npost ${row.wordpress!.postId} (${row.originalTitle}): ${after!.status}`, JSON.stringify(outcome));
    for (const change of after!.changes) console.log(`  ${change.id} ${change.kind}${change.heading ? ` "${change.heading}"` : ""}${change.linkUrl ? ` ${change.linkUrl}` : ""}`);
    for (const flag of after!.safetyFlags) console.log(`  flag ${flag.check}: ${flag.detail}`);
  }
  const prepared = new Map((await db.select().from(articleImprovements).where(and(eq(articleImprovements.orgWebsiteId, siteId), eq(articleImprovements.source, "wordpress")))).map((row) => [row.wordpress!.postId, row]));
  const elementor = prepared.get(103)!;
  check(elementor.status === "no_changes" && elementor.wordpress?.builder === "Elementor", "Elementor post is left alone");
  const classic = prepared.get(102)!;
  check(classic.wordpress?.titleWritable === false && classic.wordpress?.metaWritable === false, "classic post: SEO plugin title and description detected");
  check(!classic.changes.some((change) => change.kind === "title" || change.kind === "meta"), "classic post: no title or meta change proposed");
  const blocks = prepared.get(101)!;
  check(blocks.status === "pending_review" && blocks.changes.some((change) => change.kind === "title") && blocks.changes.some((change) => change.kind === "meta"), "block post: title and meta changes proposed");
  check(blocks.changes.some((change) => change.kind === "removeLink" && change.linkReason === "competitor"), "block post: competitor link proposed for removal");

  if (!process.argv.includes("--publish")) return;
  const before = blocks.originalContent!;
  await publishImprovement(siteId, blocks.id, { approveAll: true });
  const post = await getPost(connection, 101);
  const faq = before.slice(before.indexOf('<!-- wp:heading -->\n<h2 class="wp-block-heading">FAQ'));
  check(post.content.raw.endsWith(faq), "untouched FAQ section is byte for byte the same");
  check(post.content.raw.startsWith(before.slice(0, before.indexOf("<!-- wp:heading -->"))), "untouched introduction is byte for byte the same");
  for (const element of ["wp-image-42", "wp-block-table", "youtube.com/watch", "has-pale-cyan-blue-background-color", "yoast-seo/table-of-contents"]) check(post.content.raw.includes(element), `element kept: ${element}`);
  check(before.includes("coastalroofing.example") && !post.content.raw.includes("coastalroofing.example"), "competitor link removed (its text kept)");
  check(post.title.raw.startsWith("Metal Roof Cost") && post.excerpt.raw.startsWith("A metal roof costs"), "title and excerpt updated");
  const [published] = await db.select().from(articleImprovements).where(eq(articleImprovements.id, blocks.id));
  check(published!.status === "published", "improvement marked published");

  // The classic post is edited in WordPress after its improvement was prepared: publishing must stop.
  if (classic.status === "pending_review") {
    const current = await getPost(connection, 102);
    await updatePost(connection, 102, { content: `${current.content.raw}\n\nEdited by the owner.` });
    const error = await publishImprovement(siteId, classic.id, { approveAll: true }).then(
      () => null,
      (reason: Error) => reason.message,
    );
    const after = await getPost(connection, 102);
    const [row] = await db.select().from(articleImprovements).where(eq(articleImprovements.id, classic.id));
    check(error === POST_CHANGED && row!.status === "failed" && after.content.raw.endsWith("Edited by the owner."), "a post edited in WordPress is not overwritten");
  }
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
