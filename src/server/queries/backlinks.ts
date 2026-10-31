/** Read model for the Backlinks page. */
import { and, asc, desc, eq, inArray, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { articles, backlinkCreditLedger, backlinks, orgWebsites, websiteMetricsHistory } from "@/db/schema";
import { backlinkValueUsd } from "../agents/jobs/milestones";
import { creditBalance, exchangePool, hostOf } from "../backlinks/exchange";

type Site = typeof orgWebsites.$inferSelect;
export type LinkState = "live" | "awaiting" | "nofollow" | "removed";

const stateOf = (link: typeof backlinks.$inferSelect): LinkState =>
  link.removedAt ? "removed" : link.isBacklinkPresent ? "live" : link.followType === "nofollow" ? "nofollow" : "awaiting";

export async function getBacklinksPage(site: Site) {
  const partner = alias(orgWebsites, "partner");
  const [balance, given, received, history, pool] = await Promise.all([
    creditBalance(site.id),
    db
      .select({ link: backlinks, title: articles.title, articleUrl: articles.publishedUrl, partnerUrl: partner.url })
      .from(backlinks)
      .leftJoin(articles, eq(articles.id, backlinks.articleId))
      .leftJoin(partner, eq(partner.id, backlinks.targetOrgWebsiteId))
      .where(eq(backlinks.sourceOrgWebsiteId, site.id))
      .orderBy(desc(backlinks.createdAt)),
    db
      .select({ link: backlinks, title: articles.title, articleUrl: articles.publishedUrl })
      .from(backlinks)
      .leftJoin(articles, eq(articles.id, backlinks.articleId))
      .where(eq(backlinks.targetOrgWebsiteId, site.id))
      .orderBy(desc(backlinks.createdAt)),
    db.select({ date: websiteMetricsHistory.date, rating: websiteMetricsHistory.domainRating }).from(websiteMetricsHistory).where(eq(websiteMetricsHistory.orgWebsiteId, site.id)).orderBy(asc(websiteMetricsHistory.date)),
    exchangePool(site),
  ]);

  // Credits spent per received link (net of any reversal).
  const spent = received.length
    ? await db
        .select({ id: backlinkCreditLedger.backlinkId, total: sum(backlinkCreditLedger.delta) })
        .from(backlinkCreditLedger)
        .where(and(eq(backlinkCreditLedger.orgWebsiteId, site.id), inArray(backlinkCreditLedger.backlinkId, received.map((r) => r.link.id))))
        .groupBy(backlinkCreditLedger.backlinkId)
    : [];
  const spentById = new Map(spent.map((row) => [row.id, Number(row.total)]));

  const liveReceived = received.filter((r) => r.link.isBacklinkPresent);
  const ratings = history.filter((point) => point.rating !== null) as { date: string; rating: number }[];
  return {
    enabled: site.backlinksEnabled,
    balance,
    domainRating: site.domainRating,
    ratingHistory: ratings,
    ratingChange: ratings.length > 1 ? { change: ratings.at(-1)!.rating - ratings[0]!.rating, since: ratings[0]!.date } : null,
    receivedCount: liveReceived.length,
    receivedValue: liveReceived.reduce((total, r) => total + backlinkValueUsd(r.link.linkPower), 0),
    givenCount: given.filter((g) => g.link.isBacklinkPresent).length,
    pool,
    given: given.map((g) => ({
      id: g.link.id,
      title: g.title ?? "",
      articleUrl: g.articleUrl,
      domain: g.partnerUrl ? hostOf(g.partnerUrl) : hostOf(g.link.targetUrl ?? ""),
      targetUrl: g.link.targetUrl,
      date: (g.link.becameOnlineAt ?? g.link.createdAt).toISOString(),
      state: stateOf(g.link),
    })),
    received: received.map((r) => ({
      id: r.link.id,
      title: r.title ?? r.link.url ?? "",
      articleUrl: r.link.url ?? r.articleUrl,
      domain: r.link.sourceDomain,
      date: (r.link.becameOnlineAt ?? r.link.createdAt).toISOString(),
      state: stateOf(r.link),
      credits: spentById.get(r.link.id) ?? 0,
    })),
  };
}
