import { and, eq, ne } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import { db } from "@/db";
import { agentJobRuns } from "@/db/schema";
import type { AgentJob } from "./schedule";

export const QUEUES = {
  agentJob: "agent-job",
  onboarding: "onboarding",
  schedulerTick: "scheduler-tick",
} as const;

export type AgentJobName = AgentJob | OnboardingStep;
export type AgentJobData = { siteId: number; job: AgentJobName; runDate: string };

/** Steps run once when a client is added, in this order. */
export const ONBOARDING_STEPS = [
  "analyzeWebsite",
  "buildBrandProfile",
  "sitemapSync",
  "siteHealthAudit",
  "findCompetitors",
  "keywordResearch",
  "generatePrompts",
  "aiVisibilityCheck",
  "planFirstMonth",
  "joinBacklinkExchange",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const globalForBoss = globalThis as unknown as { boss?: Promise<PgBoss> };

/**
 * Producer-only client for the web app: it enqueues work but never runs
 * maintenance or jobs (the worker process does that).
 */
export function getProducer() {
  globalForBoss.boss ??= (async () => {
    const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, supervise: false, schedule: false });
    boss.on("error", (error) => console.error("[pg-boss]", error));
    await boss.start();
    return boss;
  })();
  return globalForBoss.boss;
}

export async function ensureQueues(boss: PgBoss) {
  await boss.createQueue(QUEUES.agentJob, { retryLimit: 3, retryDelay: 60, retryBackoff: true, expireInSeconds: 60 * 30 });
  await boss.createQueue(QUEUES.onboarding, { retryLimit: 2, retryDelay: 30, expireInSeconds: 60 * 60 });
  await boss.createQueue(QUEUES.schedulerTick, { expireInSeconds: 60 * 10 });
}

export async function enqueueAgentJob(boss: PgBoss, data: AgentJobData, startAfter?: Date) {
  return boss.send(QUEUES.agentJob, data, {
    singletonKey: `${data.siteId}:${data.job}:${data.runDate}`,
    startAfter,
  });
}

/** Runs a job again today even if it already ran (after a data source is connected or changed). */
export async function rerunAgentJob(siteId: number, job: AgentJobName, runDate: string) {
  await db
    .delete(agentJobRuns)
    .where(and(eq(agentJobRuns.orgWebsiteId, siteId), eq(agentJobRuns.job, job), eq(agentJobRuns.runDate, runDate), ne(agentJobRuns.status, "running")));
  return enqueueAgentJob(await getProducer(), { siteId, job, runDate });
}

export async function enqueueOnboarding(siteId: number) {
  const boss = await getProducer();
  return boss.send(QUEUES.onboarding, { siteId }, { singletonKey: `onboarding:${siteId}` });
}
