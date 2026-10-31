/**
 * End-to-end check of the Reddit and Quora agents with stand-in providers:
 *
 *   npx tsx --tsconfig tsconfig.json scripts/test-socials.ts <siteId> [--google]
 *
 * Without --google threads come from the (stand-in) Claude web search; with --google from
 * (stand-in) Google results via DataForSEO. If REDDIT_CLIENT_ID is set (e.g. pointing at
 * scripts/dev-fixtures/mock-reddit.py) Reddit thread details are fetched too.
 * All thread titles and URLs below are fake test data. Local development only.
 */
import "dotenv/config";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { communityKeywords, communityOpportunities, communityPosts, orgWebsites } from "@/db/schema";
import { siteDay } from "@/server/agents/schedule";
import { setAiProvider, type AiProvider } from "@/server/ai/claude";
import { quoraSearch, redditSearch } from "@/server/community/agent";
import { seoData, setSeoDataProvider } from "@/server/seo/dataforseo";

process.env.ANTHROPIC_API_KEY ||= "stand-in";
const useGoogle = process.argv.includes("--google");
if (useGoogle) {
  process.env.DATAFORSEO_LOGIN ||= "stand-in";
  process.env.DATAFORSEO_PASSWORD ||= "stand-in";
}

const REDDIT = [
  ["rf0001", "HomeImprovement", "How much should a roof replacement cost in Santa Barbara?"],
  ["rf0002", "RoofingHelp", "Leak around the chimney after the first rain, repair or replace flashing?"],
  ["rf0003", "SantaBarbara", "Any recommendations for a reliable roofer? Got three wildly different quotes"],
  ["rf0004", "RoofingHelp", "Is a metal roof worth it near the coast? (archived thread)"],
  ["rf0005", "jobs", "Hiring: roofing laborers needed in Ventura County"],
];
const QUORA = [
  ["How-long-does-a-roof-last-in-a-coastal-climate", "How long does a roof last in a coastal climate?"],
  ["What-should-I-ask-a-roofing-contractor-before-hiring-them", "What should I ask a roofing contractor before hiring them?"],
  ["Is-it-cheaper-to-repair-or-replace-an-old-roof", "Is it cheaper to repair or replace an old roof?"],
  ["What-is-the-best-pizza-in-New-York", "What is the best pizza in New York?"],
];

const redditUrl = ([id, sub]: string[]) => `https://www.reddit.com/r/${sub}/comments/${id}/test_thread/`;
const quoraUrl = ([slug]: string[]) => `https://www.quora.com/${slug}`;

const standInAi: AiProvider = {
  async generateObject(request) {
    if (request.system.includes("search phrases")) {
      return { keywords: ["roof replacement cost santa barbara", "best roofer in santa barbara", "roof leak repair advice", "metal roof vs shingles", "how to choose a roofing contractor", "roof inspection before buying a house", "flat roof leaking", "gutter guards worth it"] } as never;
    }
    if (request.system.includes("online discussions a business can genuinely help in")) {
      const threads = [...request.prompt.matchAll(/^\[(\d+)\] (.+)$/gm)].map((match) => {
        const off = /Hiring:|pizza/.test(match[2]!);
        return { index: Number(match[1]), relevance: off ? 10 : 70 + (Number(match[1]) % 4) * 7, reasoning: off ? "Not a question the business can help with." : "The person is asking for roofing advice the business gives every day." };
      });
      return { threads } as never;
    }
    throw new Error(`Stand-in has no answer for: ${request.system.slice(0, 60)}`);
  },
  async generateText(request) {
    if (!request.system.includes("replies for")) throw new Error("not used");
    const title = request.prompt.match(/(?:Post title|Question): (.+)/)?.[1] ?? "";
    return `Short answer for "${title.slice(0, 40)}": get two or three itemised quotes and ask each roofer what's included (tear-off, underlayment, flashing, permits). On the coast, ask about corrosion-resistant fasteners too. I work with Sunny Roofing, so I'm biased, but any good roofer should walk you through those line by line.`;
  },
  async research(request) {
    const reddit = request.allowedDomains?.some((domain) => domain.includes("reddit"));
    const sources = reddit ? REDDIT.map((row) => ({ url: redditUrl(row), title: `${row[2]} : r/${row[1]}` })) : QUORA.map((row) => ({ url: quoraUrl(row), title: `${row[1]} - Quora` }));
    return { notes: "Found threads.", sources: [...sources, { url: "https://www.reddit.com/user/someone/", title: "Not a thread" }] };
  },
  async answer() {
    throw new Error("not used");
  },
};

async function main() {
  const siteId = Number(process.argv[2]);
  if (!siteId) throw new Error("Usage: tsx scripts/test-socials.ts <siteId> [--google]");
  setAiProvider(standInAi);
  if (useGoogle) {
    setSeoDataProvider({
      ...seoData,
      async serp(keyword) {
        if (keyword.includes("site:quora.com")) return QUORA.map((row, index) => ({ url: `${quoraUrl(row)}/answer/Test-User-${index}`, domain: "quora.com", title: `${row[1]} - Quora`, position: index + 1, description: "Test snippet." }));
        return REDDIT.map((row, index) => ({ url: redditUrl(row), domain: "reddit.com", title: `${row[2]} : r/${row[1]}`, position: index + 2, description: "Test snippet from Google." }));
      },
    });
  }
  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!site) throw new Error("Site not found");
  const runDate = siteDay(new Date(), site.timeZone);

  console.log("reddit:", JSON.stringify(await redditSearch({ site, runDate })));
  console.log("quora:", JSON.stringify(await quoraSearch({ site, runDate })));
  console.log("reddit again (nothing due):", JSON.stringify(await redditSearch({ site, runDate })));

  const keywords = await db.select().from(communityKeywords).where(eq(communityKeywords.orgWebsiteId, siteId)).orderBy(communityKeywords.platform, communityKeywords.id);
  console.table(keywords.map((k) => ({ platform: k.platform, keyword: k.keyword, active: k.isActive, checked: Boolean(k.lastCheckedAt) })));
  const rows = await db
    .select({ o: communityOpportunities, p: communityPosts })
    .from(communityOpportunities)
    .innerJoin(communityPosts, eq(communityPosts.id, communityOpportunities.postId))
    .where(and(eq(communityOpportunities.orgWebsiteId, siteId)))
    .orderBy(desc(communityOpportunities.opportunityScore));
  console.table(rows.map(({ o, p }) => ({ id: o.id, platform: o.platform, sub: p.subreddit, title: p.title.slice(0, 50), url: p.url.slice(0, 60), score: o.opportunityScore, rel: o.relevanceScore, eng: o.engagementScore, rec: o.recencyScore, up: p.upvotes, src: o.source, reply: Boolean(o.suggestedComment) })));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
