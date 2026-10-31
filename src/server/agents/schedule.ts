/**
 * When each agent runs for a site. This is the single source of truth for the
 * scheduler (what to enqueue today) and for the "Planned actions" popover on
 * the Overview page (what will happen over the next days).
 */
import { addDays, formatISO, getDate, getDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type Requirement = "ga4" | "gsc" | "llm" | "keywordData" | "authorityData";

export type Cadence =
  | { kind: "daily" }
  | { kind: "everyNDays"; days: number }
  | { kind: "weekly"; weekday: number } // 0 = Sunday
  | { kind: "monthly"; dayOfMonth: number };

export type ScheduledAgent = {
  job: AgentJob;
  cadence: Cadence;
  /** Integrations or providers the job needs; without them it is skipped. */
  requires: Requirement[];
};

export const AGENT_JOBS = [
  "sitemapSync",
  "analyticsSync",
  "aiTrafficReport",
  "rankingsCheck",
  "aiVisibilityCheck",
  "siteHealthAudit",
  "domainRatingCheck",
  "competitorGapScan",
  "topicResearch",
  "writeArticle",
  "milestones",
] as const;
export type AgentJob = (typeof AGENT_JOBS)[number];

export const AGENT_SCHEDULE: ScheduledAgent[] = [
  { job: "sitemapSync", cadence: { kind: "daily" }, requires: [] },
  { job: "analyticsSync", cadence: { kind: "daily" }, requires: ["ga4"] },
  { job: "aiTrafficReport", cadence: { kind: "daily" }, requires: ["ga4"] },
  { job: "rankingsCheck", cadence: { kind: "everyNDays", days: 3 }, requires: ["gsc"] },
  { job: "aiVisibilityCheck", cadence: { kind: "weekly", weekday: 1 }, requires: ["llm"] },
  { job: "siteHealthAudit", cadence: { kind: "weekly", weekday: 2 }, requires: [] },
  { job: "competitorGapScan", cadence: { kind: "weekly", weekday: 4 }, requires: ["keywordData"] },
  { job: "domainRatingCheck", cadence: { kind: "monthly", dayOfMonth: 1 }, requires: ["authorityData"] },
  // Researches tomorrow's topic and checks the site doesn't already rank for it.
  { job: "topicResearch", cadence: { kind: "daily" }, requires: ["llm"] },
  // Writes the article planned for the day, if any (shown via the content plan).
  { job: "writeArticle", cadence: { kind: "daily" }, requires: ["llm"] },
  { job: "milestones", cadence: { kind: "daily" }, requires: [] },
];

/** Calendar day (YYYY-MM-DD) in the site's time zone. */
export function siteDay(date: Date, timeZone: string) {
  return formatISO(toZonedTime(date, timeZone), { representation: "date" });
}

function dayNumber(isoDay: string) {
  return Math.floor(Date.parse(`${isoDay}T00:00:00Z`) / 86_400_000);
}

export function isDueOn(cadence: Cadence, isoDay: string, anchorDay: string) {
  const date = new Date(`${isoDay}T12:00:00Z`);
  switch (cadence.kind) {
    case "daily":
      return true;
    case "everyNDays":
      return (dayNumber(isoDay) - dayNumber(anchorDay)) % cadence.days === 0;
    case "weekly":
      return getDay(date) === cadence.weekday;
    case "monthly":
      return getDate(date) === cadence.dayOfMonth;
  }
}

export type PlannedAction = { day: string; job: AgentJob; title?: string };

/**
 * Agent runs planned for the next `days` days, starting tomorrow.
 * `articleDays` maps a day to the title of the article planned for it.
 */
export function plannedActions({
  now,
  timeZone,
  anchorDay,
  available,
  days,
  articleDays,
}: {
  now: Date;
  timeZone: string;
  anchorDay: string;
  available: Set<Requirement>;
  days: number;
  articleDays: Map<string, string>;
}): PlannedAction[] {
  const today = siteDay(now, timeZone);
  const actions: PlannedAction[] = [];
  for (let offset = 1; offset <= days; offset++) {
    const day = formatISO(addDays(new Date(`${today}T12:00:00Z`), offset), { representation: "date" });
    const title = articleDays.get(day);
    if (title) actions.push({ day, job: "writeArticle", title });
    for (const agent of AGENT_SCHEDULE) {
      if (agent.job === "milestones" || agent.job === "writeArticle") continue;
      if (!agent.requires.every((req) => available.has(req))) continue;
      if (isDueOn(agent.cadence, day, anchorDay)) actions.push({ day, job: agent.job });
    }
  }
  return actions;
}
