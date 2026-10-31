import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agentJobRuns, orgWebsites } from "@/db/schema";
import { availableRequirements, REQUIREMENT_LABELS } from "./capabilities";
import { analyzeWebsite, siteHealthAudit, sitemapSync } from "./jobs/site-analysis";
import { computeMilestones } from "./jobs/milestones";
import {
  buildBrandProfile,
  competitorGapScan,
  domainRatingCheck,
  findCompetitors,
  generatePrompts,
  keywordResearch,
  planFirstMonth,
  topicResearch,
} from "./jobs/strategy";
import { monthlyReport } from "./jobs/reporting";
import { aiTrafficReport, analyticsSync, rankingsCheck } from "./jobs/traffic";
import { aiVisibilityCheck } from "./jobs/visibility";
import { writeArticle } from "./jobs/writer";
import type { JobHandler } from "./jobs/types";
import type { AgentJobName } from "./queue";
import type { Requirement } from "./schedule";

type Registration = { requires: Requirement[]; handler?: JobHandler };

/**
 * Every job an agent can run, with what it needs. Jobs without a handler are
 * recorded as skipped ("not available yet") so nothing fails silently.
 */
export const JOB_REGISTRY: Record<AgentJobName, Registration> = {
  analyzeWebsite: { requires: [], handler: analyzeWebsite },
  sitemapSync: { requires: [], handler: sitemapSync },
  siteHealthAudit: { requires: [], handler: siteHealthAudit },
  milestones: { requires: [], handler: computeMilestones },

  buildBrandProfile: { requires: ["llm"], handler: buildBrandProfile },
  findCompetitors: { requires: ["keywordData"], handler: findCompetitors },
  keywordResearch: { requires: ["keywordData"], handler: keywordResearch },
  generatePrompts: { requires: ["llm"], handler: generatePrompts },
  planFirstMonth: { requires: ["keywordData", "llm"], handler: planFirstMonth },
  topicResearch: { requires: ["llm"], handler: topicResearch },
  writeArticle: { requires: ["llm"], handler: writeArticle },
  competitorGapScan: { requires: ["keywordData"], handler: competitorGapScan },
  domainRatingCheck: { requires: ["authorityData"], handler: domainRatingCheck },
  monthlyReport: { requires: ["email"], handler: monthlyReport },

  analyticsSync: { requires: ["ga4"], handler: analyticsSync },
  aiTrafficReport: { requires: ["ga4"], handler: aiTrafficReport },
  rankingsCheck: { requires: ["gsc"], handler: rankingsCheck },
  aiVisibilityCheck: { requires: ["llm"], handler: aiVisibilityCheck },
  joinBacklinkExchange: { requires: [] },
};

export type RunOutcome = { status: "completed" | "skipped" | "already_done"; detail?: string; result?: unknown };

/** Runs one job for one site and day, at most once (safe to call repeatedly). */
export async function runAgentJob(siteId: number, job: AgentJobName, runDate: string): Promise<RunOutcome> {
  await db
    .insert(agentJobRuns)
    .values({ orgWebsiteId: siteId, job, runDate, status: "queued" })
    .onConflictDoNothing();
  const where = and(eq(agentJobRuns.orgWebsiteId, siteId), eq(agentJobRuns.job, job), eq(agentJobRuns.runDate, runDate));
  const [run] = await db.select().from(agentJobRuns).where(where);
  if (run?.status === "completed") return { status: "already_done" };

  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!site) throw new Error(`Site ${siteId} not found`);

  const registration = JOB_REGISTRY[job];
  const available = await availableRequirements(siteId);
  const missing = registration.requires.filter((requirement) => !available.has(requirement));
  const skipReason = missing.length
    ? missing.map((requirement) => REQUIREMENT_LABELS[requirement]).join("; ")
    : registration.handler
      ? null
      : "This agent is not available yet";
  if (skipReason) {
    await db.update(agentJobRuns).set({ status: "skipped", detail: skipReason, finishedAt: new Date(), updatedAt: new Date() }).where(where);
    return { status: "skipped", detail: skipReason };
  }

  await db
    .update(agentJobRuns)
    .set({ status: "running", attempts: (run?.attempts ?? 0) + 1, startedAt: new Date(), detail: null, updatedAt: new Date() })
    .where(where);
  try {
    const result = await registration.handler!({ site, runDate });
    await db
      .update(agentJobRuns)
      .set({ status: "completed", result: result ?? null, finishedAt: new Date(), updatedAt: new Date() })
      .where(where);
    return { status: "completed", result };
  } catch (error) {
    await db
      .update(agentJobRuns)
      .set({ status: "failed", detail: (error as Error).message, finishedAt: new Date(), updatedAt: new Date() })
      .where(where);
    throw error;
  }
}
