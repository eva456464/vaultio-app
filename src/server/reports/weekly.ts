/**
 * The weekly progress email (one per website, every Monday): what the agents did in the last seven
 * days and what's planned next. Only sections with real data are included.
 */
import { addDays, formatISO } from "date-fns";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  backlinks,
  contentPlanItems,
  emailPreferences,
  geoAudits,
  gscDailyMetrics,
  llmAnswers,
  memberWebsiteAccess,
  organizationMembers,
  user,
} from "@/db/schema";
import type { Site } from "../agents/jobs/types";
import { siteDay } from "../agents/schedule";

const iso = (date: Date) => formatISO(date, { representation: "date" });

export type WeeklySummary = {
  start: string;
  end: string;
  published: { title: string; url: string | null }[];
  newBacklinks: { domain: string; rating: number | null }[];
  search: { clicks: number; impressions: number; previousClicks: number } | null;
  ai: { answers: number; mentions: number } | null;
  healthScore: number | null;
  upcoming: { day: string; title: string }[];
};

export async function weeklySummary(site: Site, now = new Date()): Promise<WeeklySummary> {
  const today = siteDay(now, site.timeZone);
  const endDay = new Date(`${today}T00:00:00Z`);
  const startDay = addDays(endDay, -7);
  const start = iso(startDay);
  const end = iso(addDays(endDay, -1));

  const published = await db
    .select({ title: articles.title, url: articles.publishedUrl })
    .from(articles)
    .where(and(eq(articles.orgWebsiteId, site.id), isNotNull(articles.publishedAt), gte(articles.publishedAt, startDay), lt(articles.publishedAt, endDay)))
    .orderBy(asc(articles.publishedAt));

  const newBacklinks = await db
    .select({ domain: backlinks.sourceDomain, rating: backlinks.linkPower })
    .from(backlinks)
    .where(and(eq(backlinks.targetOrgWebsiteId, site.id), eq(backlinks.isBacklinkPresent, true), gte(backlinks.becameOnlineAt, startDay), lt(backlinks.becameOnlineAt, endDay)));

  const days = await db
    .select({ date: gscDailyMetrics.date, clicks: gscDailyMetrics.clicks, impressions: gscDailyMetrics.impressions })
    .from(gscDailyMetrics)
    .where(and(eq(gscDailyMetrics.orgWebsiteId, site.id), gte(gscDailyMetrics.date, iso(addDays(startDay, -7))), lte(gscDailyMetrics.date, end)));
  const thisWeek = days.filter((row) => row.date >= start);
  const search = days.length
    ? {
        clicks: thisWeek.reduce((sum, row) => sum + row.clicks, 0),
        impressions: thisWeek.reduce((sum, row) => sum + row.impressions, 0),
        previousClicks: days.filter((row) => row.date < start).reduce((sum, row) => sum + row.clicks, 0),
      }
    : null;

  const answers = await db
    .select({ mentioned: llmAnswers.orgWebsiteMentioned })
    .from(llmAnswers)
    .where(and(eq(llmAnswers.orgWebsiteId, site.id), gte(llmAnswers.checkedAt, startDay), lt(llmAnswers.checkedAt, endDay)));

  const [audit] = await db
    .select({ score: geoAudits.overallScore })
    .from(geoAudits)
    .where(and(eq(geoAudits.orgWebsiteId, site.id), eq(geoAudits.status, "completed")))
    .orderBy(desc(geoAudits.completedAt))
    .limit(1);

  const upcoming = await db
    .select({ day: contentPlanItems.scheduledFor, title: contentPlanItems.plannedTitle })
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.orgWebsiteId, site.id), gte(contentPlanItems.scheduledFor, today), lte(contentPlanItems.scheduledFor, iso(addDays(endDay, 6)))))
    .orderBy(asc(contentPlanItems.scheduledFor))
    .limit(7);

  return {
    start,
    end,
    published,
    newBacklinks,
    search,
    ai: answers.length ? { answers: answers.length, mentions: answers.filter((answer) => answer.mentioned).length } : null,
    healthScore: audit?.score ?? null,
    upcoming: upcoming.filter((item): item is { day: string; title: string } => Boolean(item.title)),
  };
}

/** Members who can see the website and haven't turned its weekly email off. */
export async function weeklyRecipients(site: Site) {
  const members = await db
    .select({ userId: user.id, email: user.email, name: user.name, allWebsites: organizationMembers.allWebsites, memberId: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(user, eq(user.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, site.organizationId));
  if (!members.length) return [];
  const access = await db
    .select({ memberId: memberWebsiteAccess.memberId })
    .from(memberWebsiteAccess)
    .where(and(eq(memberWebsiteAccess.orgWebsiteId, site.primaryOrgWebsiteId ?? site.id), inArray(memberWebsiteAccess.memberId, members.map((member) => member.memberId))));
  const allowed = new Set(access.map((row) => row.memberId));
  const optedOut = new Set(
    (
      await db
        .select({ userId: emailPreferences.userId })
        .from(emailPreferences)
        .where(and(eq(emailPreferences.orgWebsiteId, site.id), eq(emailPreferences.weeklyProgress, false), or(...members.map((member) => eq(emailPreferences.userId, member.userId)))))
    ).map((row) => row.userId),
  );
  return members.filter((member) => (member.allWebsites || allowed.has(member.memberId)) && !optedOut.has(member.userId));
}
