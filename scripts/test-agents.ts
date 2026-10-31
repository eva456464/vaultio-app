/**
 * End-to-end check of the agent pipeline with stand-in AI and keyword providers
 * (no API keys or network needed beyond the site being crawled).
 *
 *   npx tsx scripts/test-agents.ts <siteId>
 *
 * Runs the remaining onboarding steps, then topic research and the article writer
 * for the next planned day, and prints what was stored. Local development only.
 */
import "dotenv/config";
import { addDays, formatISO } from "date-fns";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { agentJobRuns, articles, competitors, contentPlanItems, keywordClusters, llmAnswers, llmPrompts, orgWebsites } from "@/db/schema";
import { setAssistantProvider, type AssistantProvider } from "@/server/ai/assistants";
import { setAiProvider, type AiProvider } from "@/server/ai/claude";
import { setImageProvider, type ImageProvider } from "@/server/ai/images";
import { runOnboarding } from "@/server/agents/orchestrator";
import { runAgentJob } from "@/server/agents/runner";
import { siteDay } from "@/server/agents/schedule";
import { setSeoDataProvider, type SeoDataProvider } from "@/server/seo/dataforseo";

process.env.ANTHROPIC_API_KEY ||= "stand-in";
process.env.DATAFORSEO_LOGIN ||= "stand-in";
process.env.DATAFORSEO_PASSWORD ||= "stand-in";

const KEYWORDS = [
  ["how long does a roof last", 2400, 18], ["roof repair cost", 1900, 22], ["signs you need a new roof", 880, 9],
  ["metal roof vs shingles", 1300, 25], ["how to find a roof leak", 720, 12], ["best roofing material for hot climates", 260, 15],
  ["roof inspection checklist", 320, 8], ["what is roof flashing", 590, 6], ["cost of new roof", 1600, 30],
  ["tile roof repair", 390, 14], ["flat roof drainage problems", 170, 7], ["solar panels on old roof", 210, 11],
] as const;

const standInAi: AiProvider = {
  async generateObject(request) {
    const system = request.system;
    if (system.includes("brand profile")) {
      return {
        brandName: "Sunny Roofing", industry: "roofing", businessType: "Local Services",
        positioning: "Family-run roofer for Santa Barbara homeowners with free inspections and a 10-year workmanship warranty.",
        description: "Roof repair and replacement in Santa Barbara and Goleta.",
        targetAudience: ["Homeowners in Santa Barbara", "Property managers", "Real estate agents"],
        servicesOffered: [{ kind: "service", name: "Roof repair", amount: null, priceType: null, currency: null, period: null, sourceUrl: null }],
        brandVoice: { pacing_and_flow: "Short, practical paragraphs.", tone_and_emotion: "Reassuring.", figurative_language: "Rare.", perspective_and_voice: "We / you.", word_choice_and_vocabulary: "Plain words.", sentence_structure_and_complexity: "Simple.", formatting_and_structural_elements: "Lists and checklists.", level_of_formality_and_personalization: "Friendly." },
        seedTopics: ["roof repair", "roof replacement", "roof leak"], primaryCountryCode: "US",
      } as never;
    }
    if (system.includes("questions real customers ask")) {
      return { prompts: Array.from({ length: 10 }, (_, i) => ({ prompt: `Who is a reliable roofer in Santa Barbara? (${i + 1})`, intent: "buying" })) } as never;
    }
    if (system.includes("content strategist")) {
      const ids = [...request.prompt.matchAll(/^(\d+) \| ([^|]+) \|/gm)].map((m) => [Number(m[1]), m[2]!.trim()] as const);
      const count = Number(request.prompt.match(/Pick (\d+) topics/)?.[1] ?? 10);
      return { topics: ids.slice(0, count).map(([clusterId, keyword]) => ({ clusterId, title: `${keyword[0]!.toUpperCase()}${keyword.slice(1)}: a homeowner's guide`, articleType: "guide_explainer", whyThisTopic: ["Homeowners search this before hiring a roofer.", "It matches the roof repair service.", "Low difficulty for a local site."] })) } as never;
    }
    if (system.includes("list every company")) {
      const blocks = request.prompt.split(/--- Answer (\d+) ---/).slice(1);
      const answers = [];
      for (let i = 0; i < blocks.length; i += 2) {
        const text = blocks[i + 1] ?? "";
        const brands = ["Sunny Roofing", "Coastal Roofing", "Goleta Roofers"].filter((name) => text.includes(name));
        answers.push({ index: Number(blocks[i]), brands: brands.map((name) => ({ name, url: null, sentiment: name === "Sunny Roofing" ? 78 : 60 })) });
      }
      return { answers } as never;
    }
    if (system.includes("plan the pictures")) {
      return {
        cover: { scene: "A sunlit Santa Barbara house with a new terracotta tile roof", altText: "House with a new tile roof in Santa Barbara" },
        body: [
          { heading: "Roof lifespan by material", scene: "Samples of asphalt shingle, metal panel and clay tile side by side", altText: "Asphalt, metal and tile roofing samples" },
          { heading: "Signs you need a new roof", scene: "Close-up of curling, worn asphalt shingles", altText: "Curling asphalt shingles on an old roof" },
        ],
      } as never;
    }
    if (system.includes("call-to-action cards")) {
      return {
        link: { pageIndex: 0, title: "Not sure how long yours has left?", pitch: "Sunny Roofing inspects roofs across Santa Barbara for free and tells you honestly what it needs." },
        contact: { title: "Talk to a local roofer", pitch: "Questions about your roof? Call or message the Sunny Roofing team." },
        map: null,
      } as never;
    }
    if (system.includes("contextual links")) {
      // Links the gutter sentence to a partner page about gutters, if one is offered.
      const page = request.prompt.match(/^(\d+)\. .*gutter.* — (\S+)$/im);
      const sentence = "Clogged gutters let rainwater back up under the shingles and slowly rot the roof deck.";
      if (!page || !request.prompt.includes(sentence)) return { links: [] } as never;
      return { links: [{ page: Number(page[1]), original: sentence, rewritten: `[Clogged gutters](${page[2]}) let rainwater back up under the shingles and slowly rot the roof deck.`, reason: "Gutter maintenance is the fix for this cause." }] } as never;
    }
    if (system.includes("You design one infographic")) {
      const section = request.prompt.match(/\[(\d+)\] ## Roof lifespan by material/)?.[1];
      const empty = { steps: [], checklist: [], comparison: { columns: [], rows: [] }, stats: [] };
      return { ...empty, section: section ? Number(section) : -1, layout: "bars", title: "How long each roof lasts", subtitle: "Typical lifespan by material", illustration: "a house roof with shingles and metal panels", bars: [{ label: "Asphalt shingles", value: 25, display: "20–30 years" }, { label: "Metal", value: 55, display: "40–70 years" }] } as never;
    }
    if (system.includes("SEO metadata")) {
      return { title: "How Long Does a Roof Last? Lifespan by Material", slug: "how-long-does-a-roof-last", metaDescription: "Asphalt shingles last 20 to 30 years, tile and metal much longer. See lifespans by material and the signs a roof needs replacing.", faq: [{ question: "How long does a shingle roof last?", answer: "Usually 20 to 30 years." }], whyThisStructure: ["Answer first", "Material table", "FAQ"], characteristics: ["Cites sources", "Local angle", "Checklist"], semanticKeywords: ["asphalt shingles", "roof lifespan", "metal roof"] } as never;
    }
    throw new Error(`Stand-in has no answer for: ${system.slice(0, 60)}`);
  },
  async generateText(request) {
    const internal = request.prompt.match(/Internal pages you may link to:\n- (\S+)/)?.[1] ?? "/";
    return [
      "Most roofs last 20 to 30 years, but the material matters most [(InterNACHI)](https://www.nachi.org/life-expectancy.htm).",
      "", "**TL;DR:**", "- Asphalt shingles: 20–30 years", "- Metal: 40–70 years", "- Tile: 50+ years",
      "", "## Roof lifespan by material", "", "| Material | Lifespan |", "|---|---|", "| Asphalt | 20–30 years |", "| Metal | 40–70 years |",
      "", "## What shortens a roof's life", "", `Sun and poor ventilation are the usual causes; see our [roof repair service](${internal}).`,
      "", "Clogged gutters let rainwater back up under the shingles and slowly rot the roof deck.",
      "", "## Signs you need a new roof", "", "- Curling shingles\n- Daylight in the attic",
      "", "## Repair or replace?", "", "If more than 30% of the roof is damaged, replacement is usually cheaper over time [(NRCA)](https://www.nrca.net/).",
      "", "## FAQ", "", "### How long does a shingle roof last?", "", "Usually 20 to 30 years.",
    ].join("\n");
  },
  async answer(question) {
    return { ...(await standInAi.research({ system: "", prompt: question })), model: "stand-in" };
  },
  async research(request) {
    if (request.system.includes("YouTube video")) {
      return { notes: "https://www.youtube.com/watch?v=Ab3dEf5GhIj\nHow long does a roof last? Materials compared", sources: [{ url: "https://www.youtube.com/watch?v=Ab3dEf5GhIj", title: "How long does a roof last? Materials compared" }] };
    }
    return {
      notes: "Asphalt shingles last 20–30 years (https://www.nachi.org/life-expectancy.htm). NRCA guidance on repair vs replace (https://www.nrca.net/).",
      sources: [
        { url: "https://www.nachi.org/life-expectancy.htm", title: "InterNACHI life expectancy chart" },
        { url: "https://www.nrca.net/", title: "National Roofing Contractors Association" },
      ],
    };
  },
};

const standInSeo: SeoDataProvider = {
  async keywordIdeas() {
    return KEYWORDS.map(([keyword, searchVolume, difficulty]) => ({ keyword, searchVolume, cpc: 4.2, difficulty, intent: "informational" }));
  },
  async competitors() {
    return [{ domain: "sbroofing.example", intersections: 40, organicTraffic: 900 }, { domain: "yelp.com", intersections: 90, organicTraffic: 1e6 }];
  },
  async serp(keyword) {
    return [
      { url: "https://goletaroofers.example/blog", domain: "goletaroofers.example", title: `${keyword} — guide`, position: 1 },
      { url: "https://www.reddit.com/r/Roofing", domain: "reddit.com", title: "Reddit thread", position: 2 },
      { url: "https://coastalroof.example/", domain: "coastalroof.example", title: "Coastal Roofing", position: 3 },
    ];
  },
  async rankedKeywords() {
    return [];
  },
  async domainRating() {
    return 12;
  },
};

/** Draws a plain test picture (colour from the prompt) instead of calling an image model. */
const standInImages: ImageProvider = {
  available: () => true,
  async generate({ prompt, shape }) {
    const sharp = (await import("sharp")).default;
    const hue = [...prompt].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
    const [width, height] = shape === "wide" ? [1536, 864] : [1536, 1024];
    const label = (prompt.match(/title "([^"]+)"/)?.[1] ?? prompt.split("\n")[0]!.slice(0, 60)).replace(/[<&>]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${hue},45%,55%)"/><text x="50%" y="50%" font-size="44" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text></svg>`;
    return { bytes: await sharp(Buffer.from(svg)).png().toBuffer(), mimeType: "image/png", model: "stand-in" };
  },
};

const standInAssistants: AssistantProvider = {
  available: () => ["anthropic", "openai", "google"],
  async ask(id, question) {
    const n = question.length % 3;
    const answers = {
      anthropic: `For roof repair in Santa Barbara, many homeowners choose Sunny Roofing for its free inspections, or Coastal Roofing for larger jobs. See https://www.nrca.net/ for contractor tips.`,
      openai: `Well-reviewed options include Coastal Roofing and Goleta Roofers. Check reviews on https://www.yelp.com/search?find_desc=roofing before you hire.`,
      google: n === 0 ? `Sunny Roofing and Goleta Roofers are both local options with good reviews.` : `Goleta Roofers is a popular local choice.`,
    } as const;
    const sources = { anthropic: [{ url: "https://www.nrca.net/", title: "NRCA" }], openai: [{ url: "https://www.yelp.com/search?find_desc=roofing", title: "Yelp" }], google: [{ url: "https://goletaroofers.example/", title: "Goleta Roofers" }] } as const;
    return { provider: id, model: "stand-in", answer: answers[id], sources: [...sources[id]] };
  },
};

async function main() {
  const siteId = Number(process.argv[2]);
  if (!siteId) throw new Error("Usage: tsx scripts/test-agents.ts <siteId>");
  setAiProvider(standInAi);
  setSeoDataProvider(standInSeo);
  setAssistantProvider(standInAssistants);
  setImageProvider(standInImages);

  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!site) throw new Error("Site not found");
  const today = siteDay(new Date(), site.timeZone);
  const tomorrow = formatISO(addDays(new Date(`${today}T12:00:00Z`), 1), { representation: "date" });

  await runOnboarding(siteId, true);
  console.log("topicResearch:", JSON.stringify(await runAgentJob(siteId, "topicResearch", today)));
  // The first planned article is tomorrow; run the writer for that day.
  console.log("writeArticle:", JSON.stringify(await runAgentJob(siteId, "writeArticle", tomorrow)));
  console.log("domainRatingCheck:", JSON.stringify(await runAgentJob(siteId, "domainRatingCheck", today)));

  const runs = await db.select({ job: agentJobRuns.job, day: agentJobRuns.runDate, status: agentJobRuns.status, detail: agentJobRuns.detail }).from(agentJobRuns).where(eq(agentJobRuns.orgWebsiteId, siteId));
  console.table(runs);
  const [updated] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  console.log("profile:", { industry: updated!.industry, businessType: updated!.businessType, seedTopics: updated!.seedTopics, domainRating: updated!.domainRating });
  console.log("competitors:", (await db.select({ url: competitors.url }).from(competitors).where(eq(competitors.orgWebsiteId, siteId))).map((c) => c.url));
  console.log("clusters:", (await db.select().from(keywordClusters).where(eq(keywordClusters.orgWebsiteId, siteId))).length);
  console.log("prompts:", (await db.select().from(llmPrompts).where(eq(llmPrompts.orgWebsiteId, siteId))).length);
  console.log("ai answers:", (await db.select().from(llmAnswers).where(eq(llmAnswers.orgWebsiteId, siteId))).length);
  const plan = await db.select({ day: contentPlanItems.scheduledFor, title: contentPlanItems.plannedTitle, status: contentPlanItems.generationStatus }).from(contentPlanItems).where(and(eq(contentPlanItems.orgWebsiteId, siteId), gte(contentPlanItems.scheduledFor, today)));
  console.log(`plan: ${plan.length} items`, plan.slice(0, 3));
  const [article] = await db.select().from(articles).where(eq(articles.orgWebsiteId, siteId));
  console.log("article:", article && { id: article.id, title: article.title, words: article.wordCount, internal: article.internalLinksCount, external: article.externalLinksCount, checks: article.qualityChecks.filter((c) => c.passed).length + "/" + article.qualityChecks.length, sources: article.sources.length, images: article.media.length, blocks: article.blocks.map((b) => b.kind) });
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
