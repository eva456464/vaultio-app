/**
 * End-to-end check of article improvements with a stand-in AI provider:
 *
 *   npx tsx --tsconfig tsconfig.json scripts/test-improvements.ts <siteId> [--publish]
 *
 * Needs Search Console data for the site (e.g. from scripts/dev-fixtures/mock-google.py) and a
 * published Vaultio article. Runs the scan and the improve agent as if improvements were on with
 * tomorrow as an improvement day (the site's saved settings are not changed); with --publish it
 * approves every change and publishes. Local development only.
 */
import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleImprovements, orgWebsites } from "@/db/schema";
import { shiftDay } from "@/lib/traffic";
import { improveArticle, improvementScan } from "@/server/agents/jobs/improvements";
import { siteDay } from "@/server/agents/schedule";
import { setAiProvider, type AiProvider } from "@/server/ai/claude";
import { publishImprovement } from "@/server/improvements/publish";

process.env.ANTHROPIC_API_KEY ||= "stand-in";

const standInAi: AiProvider = {
  async generateObject(request) {
    if (!request.system.includes("improving a published article")) throw new Error(`Stand-in has no answer for: ${request.system.slice(0, 60)}`);
    const sections = [...request.prompt.matchAll(/\[(\d+)\] ## (.+)/g)].map((m) => ({ index: Number(m[1]), heading: m[2]! }));
    const first = sections.find((s) => !/sources|faq/i.test(s.heading));
    return {
      title: "How Long Does a Roof Last? Lifespans by Material (2026)",
      metaDescription: "Asphalt shingles last 20–30 years, metal 40–70 and tile 50+. See what shortens a roof's life on the coast and when to repair or replace.",
      rewrites: first
        ? [{ section: first.index, heading: first.heading, markdown: "| Material | Typical lifespan |\n|---|---|\n| Asphalt shingles | 20–30 years |\n| Metal | 40–70 years |\n| Clay or concrete tile | 50+ years |\n\nCoastal salt air and strong sun sit at the short end of each range [(InterNACHI)](https://www.nachi.org/life-expectancy.htm).", reason: "Adds tile and the coastal angle searchers ask about." }]
        : [],
      additions: [{ after: first ? first.index : 0, heading: "How long does a roof last in Santa Barbara?", markdown: "Sun and salt air age roofs faster on the coast, so plan for the lower end of each material's range and inspect every two years.", reason: "Covers the local searches this page gets." }],
    } as never;
  },
  async generateText() {
    throw new Error("not used");
  },
  async research() {
    return { notes: "InterNACHI lists asphalt shingles at 20–30 years (https://www.nachi.org/life-expectancy.htm).", sources: [{ url: "https://www.nachi.org/life-expectancy.htm", title: "InterNACHI life expectancy chart" }] };
  },
  async answer() {
    throw new Error("not used");
  },
};

async function main() {
  const siteId = Number(process.argv[2]);
  if (!siteId) throw new Error("Usage: tsx scripts/test-improvements.ts <siteId> [--publish]");
  setAiProvider(standInAi);
  const [saved] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!saved) throw new Error("Site not found");
  const today = siteDay(new Date(), saved.timeZone);
  const tomorrowWeekday = new Date(`${shiftDay(today, 1)}T12:00:00Z`).getUTCDay();
  const site = { ...saved, improvementsEnabled: true, improvementWeekdays: [tomorrowWeekday], improvementsAutoPublish: false };

  console.log("scan:", JSON.stringify(await improvementScan({ site, runDate: today })));
  console.log("improve:", JSON.stringify(await improveArticle({ site, runDate: today })));
  const [latest] = await db.select().from(articleImprovements).where(eq(articleImprovements.orgWebsiteId, siteId)).orderBy(desc(articleImprovements.updatedAt)).limit(1);
  if (!latest) return console.log("no improvement");
  console.log("improvement:", { id: latest.id, status: latest.status, opportunity: latest.opportunity, scheduledFor: latest.scheduledFor, evidence: latest.gscSnapshot, queries: latest.queries.length, error: latest.error });
  console.table(latest.changes.map((c) => ({ id: c.id, kind: c.kind, section: c.sectionIndex, heading: c.heading, link: c.linkUrl, reason: c.reason?.slice(0, 50) })));
  console.log("safety flags:", latest.safetyFlags);
  if (process.argv.includes("--publish") && latest.status === "pending_review") console.log("publish:", JSON.stringify(await publishImprovement(siteId, latest.id, { approveAll: true })));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
