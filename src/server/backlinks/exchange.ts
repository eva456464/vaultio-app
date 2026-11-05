/**
 * The backlink exchange between sites on this Vaultio installation.
 *
 * - Joining gives 100 credits. Giving a live dofollow link earns the giver its domain rating
 *   (max 20, or 10 from a site on a platform address such as *.myshopify.com); receiving one spends
 *   the giver's domain rating. Balances may go negative; while a site's balance is not positive it
 *   receives no new links. Sites on a free trial receive none until their plan is paid.
 * - Niches: CBD, adult and gambling sites exchange only within their own category; illegal drugs,
 *   pharma/supplements and crypto don't take part (category set by the brand analysis).
 * - A site receives links from sites whose domain rating is at least its own minus 25 (or its
 *   minimum giver rating, if set), so links come from comparable or stronger sites.
 * - Links are placed by the article writer, only where Claude finds a partner page that genuinely
 *   helps the reader, and count once the daily check finds them live on the giver's page.
 */
import { and, desc, eq, gte, inArray, isNotNull, isNull, ne, or, sum } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { articles, backlinkCreditLedger, backlinks, orgWebsites, sitePages } from "@/db/schema";
import { pathOf } from "@/lib/paths";
import { ai } from "@/server/ai/claude";
import { logActivity } from "../agents/activity";
import type { JobContext, Site } from "../agents/jobs/types";
import { fetchText } from "../agents/web";
import { CREDIT_SUBSCRIBER_MIN_RATING } from "@/lib/billing";
import { creditSubscriberSiteIds, trialingSiteIds } from "../billing/entitlements";

export const STARTING_CREDITS = 100;
export const MAX_EARN_PER_LINK = 20;
/** Sites on a hosting platform's address (not their own domain) earn less per link. */
export const MAX_EARN_PLATFORM_HOST = 10;
const PLATFORM_HOSTS = [
  "myshopify.com", "wixsite.com", "webflow.io", "ghost.io", "wordpress.com", "blogspot.com", "squarespace.com", "framer.website", "framer.app", "framer.ai",
  "lovable.app", "netlify.app", "vercel.app", "github.io", "carrd.co", "weebly.com", "godaddysites.com", "mystrikingly.com", "square.site", "webnode.page", "hubspotpagebuilder.com",
];
export const onPlatformHost = (url: string) => {
  const host = hostOf(url);
  return PLATFORM_HOSTS.some((platform) => host === platform || host.endsWith(`.${platform}`));
};
const MATCH_BAND = 25;
const MAX_LINKS_PER_ARTICLE = 2;
const REPEAT_DAYS = 30;
const RECIPROCAL_DAYS = 90;

export const earnedFor = (giverRating: number | null, giverUrl?: string) =>
  Math.min(Math.max(giverRating ?? 0, 1), giverUrl && onPlatformHost(giverUrl) ? MAX_EARN_PLATFORM_HOST : MAX_EARN_PER_LINK);
export const spentFor = (giverRating: number | null) => Math.max(giverRating ?? 0, 1);
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Lowest giver domain rating a site accepts links from. */
export const matchFloor = (site: Pick<Site, "domainRating" | "minBacklinkGiverDomainRating">) =>
  Math.max(site.minBacklinkGiverDomainRating ?? 0, (site.domainRating ?? 0) - MATCH_BAND, 0);

export async function creditBalance(siteId: number) {
  const [row] = await db.select({ total: sum(backlinkCreditLedger.delta) }).from(backlinkCreditLedger).where(eq(backlinkCreditLedger.orgWebsiteId, siteId));
  return Number(row?.total ?? 0);
}

async function hasJoined(siteId: number) {
  const [row] = await db
    .select({ id: backlinkCreditLedger.id })
    .from(backlinkCreditLedger)
    .where(and(eq(backlinkCreditLedger.orgWebsiteId, siteId), eq(backlinkCreditLedger.reason, "signup_bonus")))
    .limit(1);
  return Boolean(row);
}

/** Onboarding step: joins the exchange with the starting credits (once). */
export async function joinBacklinkExchange({ site }: JobContext) {
  if (!site.backlinksEnabled) return { joined: false, reason: "The backlink exchange is switched off for this site" };
  if (await hasJoined(site.id)) return { joined: true, already: true };
  await db.insert(backlinkCreditLedger).values({ orgWebsiteId: site.id, delta: STARTING_CREDITS, reason: "signup_bonus" });
  await logActivity(site.id, "backlinkExchangeEnrolled");
  return { joined: true, credits: STARTING_CREDITS };
}

type TargetPage = { siteId: number; domain: string; url: string; title: string };

/** Partner pages this site may link to in a new article, best partners first. */
export async function partnerPages(site: Site): Promise<TargetPage[]> {
  if (!site.backlinksEnabled || site.exchangeCategory === "excluded" || !(await hasJoined(site.id))) return [];
  const giverRating = site.domainRating ?? 0;
  const partners = await db
    .select()
    .from(orgWebsites)
    .where(and(ne(orgWebsites.id, site.id), eq(orgWebsites.backlinksEnabled, true), eq(orgWebsites.isHidden, false), eq(orgWebsites.onboardingStatus, "completed")));
  const since = (days: number) => new Date(Date.now() - days * 86_400_000);
  const recent = await db
    .select({ source: backlinks.sourceOrgWebsiteId, target: backlinks.targetOrgWebsiteId, createdAt: backlinks.createdAt })
    .from(backlinks)
    .where(and(or(eq(backlinks.sourceOrgWebsiteId, site.id), eq(backlinks.targetOrgWebsiteId, site.id)), gte(backlinks.createdAt, since(RECIPROCAL_DAYS))));

  const subscribers = await creditSubscriberSiteIds();
  const trialing = await trialingSiteIds();
  const eligible: { site: typeof partners[number]; balance: number; received: number }[] = [];
  for (const partner of partners) {
    // Same niche only; excluded niches never take part.
    if (partner.exchangeCategory === "excluded" || partner.exchangeCategory !== site.exchangeCategory) continue;
    // No links to sites still on a free trial.
    if (trialing.has(partner.id)) continue;
    if (giverRating < matchFloor(partner)) continue;
    // Backlink credit subscribers only receive links from sites rated 20 or more.
    if (subscribers.has(partner.id) && giverRating < CREDIT_SUBSCRIBER_MIN_RATING) continue;
    // No repeats to the same site within 30 days, and no links back to a site that linked here within 90.
    if (recent.some((r) => r.source === site.id && r.target === partner.id && r.createdAt >= since(REPEAT_DAYS))) continue;
    if (recent.some((r) => r.source === partner.id && r.target === site.id)) continue;
    if (!(await hasJoined(partner.id))) continue;
    const balance = await creditBalance(partner.id);
    if (balance <= 0) continue;
    eligible.push({ site: partner, balance, received: recent.filter((r) => r.target === partner.id).length });
  }
  eligible.sort((a, b) => a.received - b.received || b.balance - a.balance);

  const pages: TargetPage[] = [];
  for (const { site: partner } of eligible.slice(0, 15)) {
    const domain = hostOf(partner.url);
    const published = await db
      .select({ url: articles.publishedUrl, title: articles.title })
      .from(articles)
      .where(and(eq(articles.orgWebsiteId, partner.id), isNotNull(articles.publishedUrl)))
      .orderBy(desc(articles.publishedAt))
      .limit(8);
    const known = await db
      .select({ url: sitePages.url, title: sitePages.metaTitle })
      .from(sitePages)
      .where(eq(sitePages.orgWebsiteId, partner.id))
      .limit(8);
    const seen = new Set<string>();
    for (const page of [...published, ...known]) {
      if (!page.url || seen.has(pathOf(page.url))) continue;
      seen.add(pathOf(page.url));
      pages.push({ siteId: partner.id, domain, url: page.url, title: page.title ?? partner.brandName ?? domain });
    }
  }
  return pages.slice(0, 60);
}

const PlacementSchema = z.object({
  links: z.array(z.object({ page: z.number(), original: z.string(), rewritten: z.string(), reason: z.string() })),
});

export type Placement = { target: TargetPage; anchor: string; reason: string };

/** Sections where links don't belong (summary, FAQ, sources) are excluded by line range. */
function linkableText(markdown: string) {
  let skipping = false;
  return markdown
    .split("\n")
    .filter((line) => {
      if (/^##\s/.test(line)) skipping = /^##\s+(faq|frequently asked|sources)/i.test(line);
      return !skipping && !/^#/.test(line) && !/^\s*[-*]\s/.test(line) && !line.startsWith("|") && !line.startsWith(">");
    })
    .join("\n");
}

/**
 * Adds up to two contextual links to partner pages. Claude picks a sentence and rewrites it with
 * the link; the edit is kept only if the sentence exists, carries exactly that link and keeps
 * its wording.
 */
export async function placeBacklinks(site: Site, markdown: string, input: { title: string; keyword: string }) {
  const pages = await partnerPages(site);
  if (!pages.length) return { markdown, placements: [] as Placement[] };
  const result = await ai.generateObject({
    schema: PlacementSchema,
    effort: "low",
    system:
      `You add at most ${MAX_LINKS_PER_ARTICLE} contextual links from an article to partner pages, only where a page genuinely helps the reader with that exact point. ` +
      "Choose from the numbered pages; never two pages from the same website. For each link, copy one sentence from the article exactly (original) and return it with a natural " +
      "markdown link [anchor](url) to the page added (rewritten). The anchor is 2–6 descriptive words from the sentence, never just a brand name or 'click here'; " +
      "keep the sentence's meaning and wording otherwise. Do not use sentences that already contain a link. Return an empty list if no page fits.",
    prompt: `Article: ${input.title} (keyword: ${input.keyword})\n\nPartner pages:\n${pages.map((page, index) => `${index}. ${page.title} — ${page.url}`).join("\n")}\n\nArticle text you may link from:\n${linkableText(markdown)}`,
  });

  let out = markdown;
  const placements: Placement[] = [];
  const usedSites = new Set<number>();
  for (const link of result.links.slice(0, MAX_LINKS_PER_ARTICLE)) {
    const target = pages[Math.round(link.page)];
    if (!target || usedSites.has(target.siteId)) continue;
    const original = link.original.trim();
    const anchorMatch = link.rewritten.match(new RegExp(`\\[([^\\]]{2,80})\\]\\(${target.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`));
    if (!anchorMatch || original.length < 20 || out.split(original).length !== 2 || /\]\(https?:/.test(original)) continue;
    // The sentence must read the same once the link markup is removed.
    const plain = link.rewritten.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
    if (plain.replace(/\W+/g, "").toLowerCase() !== original.replace(/\W+/g, "").toLowerCase()) continue;
    out = out.replace(original, link.rewritten.trim());
    usedSites.add(target.siteId);
    placements.push({ target, anchor: anchorMatch[1]!, reason: link.reason });
  }
  return { markdown: out, placements };
}

/** Records the links placed in a newly written article (they count once seen live). */
export async function recordPlacements(site: Site, articleId: number, placements: Placement[]) {
  if (!placements.length) return;
  await db.insert(backlinks).values(
    placements.map((placement) => ({
      sourceOrgWebsiteId: site.id,
      sourceDomain: hostOf(site.url),
      targetOrgWebsiteId: placement.target.siteId,
      targetUrl: placement.target.url,
      anchorText: placement.anchor,
      articleId,
      linkPower: site.domainRating ?? 0,
      explanation: placement.reason,
    })),
  );
}

const sameTarget = (href: string, target: string) => {
  try {
    const a = new URL(href);
    const b = new URL(target);
    return a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "") && pathOf(a.pathname) === pathOf(b.pathname);
  } catch {
    return false;
  }
};

/** How the giver's live page links to the target: dofollow, nofollow, or not at all. */
export function linkOnPage(html: string, target: string): "dofollow" | "nofollow" | null {
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || !sameTarget(href, target)) continue;
    return /\brel\s*=\s*["'][^"']*\b(nofollow|ugc|sponsored)\b/i.test(tag) ? "nofollow" : "dofollow";
  }
  return null;
}

/**
 * Daily, per giving site: fetch each published article that should carry exchange links and
 * update every link's state. Credits move only for live dofollow links, and move back if a
 * credited link disappears or turns nofollow.
 */
export async function backlinkCheck({ site }: JobContext) {
  const rows = await db
    .select({ link: backlinks, publishedUrl: articles.publishedUrl, title: articles.title })
    .from(backlinks)
    .innerJoin(articles, eq(articles.id, backlinks.articleId))
    .where(and(eq(backlinks.sourceOrgWebsiteId, site.id), isNull(backlinks.removedAt), isNotNull(articles.publishedUrl)));
  if (!rows.length) return { checked: 0 };

  // A link is currently credited when the giver's net credit for it is positive (reversals cancel out).
  const net = await db
    .select({ id: backlinkCreditLedger.backlinkId, total: sum(backlinkCreditLedger.delta) })
    .from(backlinkCreditLedger)
    .where(and(eq(backlinkCreditLedger.orgWebsiteId, site.id), inArray(backlinkCreditLedger.backlinkId, rows.map((r) => r.link.id))))
    .groupBy(backlinkCreditLedger.backlinkId);
  const credited = new Set(net.filter((entry) => Number(entry.total) > 0).map((entry) => entry.id));
  const pages = new Map<string, string | null>();
  let live = 0;
  let missing = 0;
  for (const { link, publishedUrl } of rows) {
    if (!pages.has(publishedUrl!)) {
      try {
        const page = await fetchText(publishedUrl!);
        pages.set(publishedUrl!, page.status < 400 ? page.html : null);
      } catch {
        pages.set(publishedUrl!, null);
      }
    }
    const html = pages.get(publishedUrl!);
    if (html === null || html === undefined) continue; // page unreachable today: try again tomorrow
    const state = linkOnPage(html, link.targetUrl ?? "");
    const now = new Date();
    const giverRating = link.linkPower ?? site.domainRating ?? 0;
    const isCredited = credited.has(link.id);

    if (state === "dofollow") {
      live++;
      await db.update(backlinks).set({ isBacklinkPresent: true, followType: "dofollow", url: publishedUrl, becameOnlineAt: link.becameOnlineAt ?? now, lastCrawledAt: now, updatedAt: now }).where(eq(backlinks.id, link.id));
      if (!isCredited) {
        await db.insert(backlinkCreditLedger).values([
          { orgWebsiteId: site.id, backlinkId: link.id, delta: earnedFor(giverRating, site.url), reason: "link_given" },
          { orgWebsiteId: link.targetOrgWebsiteId, backlinkId: link.id, delta: -spentFor(giverRating), reason: "link_received" },
        ]);
        // Announced once, the first time the link goes live (not again after a nofollow fix).
        if (!link.becameOnlineAt) await logActivity(link.targetOrgWebsiteId, "backlinkReceived", { sourceUrl: publishedUrl!, domainRating: giverRating });
      }
      continue;
    }
    // Missing or nofollow: no credit while it lasts; a credited link is reversed.
    if (isCredited) {
      await db.insert(backlinkCreditLedger).values([
        { orgWebsiteId: site.id, backlinkId: link.id, delta: -earnedFor(giverRating, site.url), reason: "adjustment" },
        { orgWebsiteId: link.targetOrgWebsiteId, backlinkId: link.id, delta: spentFor(giverRating), reason: "adjustment" },
      ]);
    }
    if (state === "nofollow") {
      await db.update(backlinks).set({ isBacklinkPresent: false, followType: "nofollow", url: publishedUrl, lastCrawledAt: now, updatedAt: now }).where(eq(backlinks.id, link.id));
    } else {
      missing++;
      await db
        .update(backlinks)
        .set({ isBacklinkPresent: false, lastCrawledAt: now, updatedAt: now, ...(link.becameOnlineAt ? { removedAt: now } : {}) })
        .where(eq(backlinks.id, link.id));
    }
  }
  return { checked: rows.length, live, missing };
}

/** Network sites (with a known domain rating) per 5-point rating bucket, for the pool chart. */
export async function exchangePool(site: Site) {
  const rows = await db
    .select({ rating: orgWebsites.domainRating })
    .from(orgWebsites)
    .where(and(eq(orgWebsites.backlinksEnabled, true), eq(orgWebsites.isHidden, false), isNotNull(orgWebsites.domainRating), ne(orgWebsites.id, site.id)));
  const floor = matchFloor(site);
  const buckets = Array.from({ length: 21 }, (_, index) => ({ from: index * 5, count: 0 }));
  for (const row of rows) buckets[Math.min(20, Math.floor((row.rating ?? 0) / 5))]!.count++;
  return { buckets, floor, inRange: rows.filter((row) => (row.rating ?? 0) >= floor).length, total: rows.length };
}
