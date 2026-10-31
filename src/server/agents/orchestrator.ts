import { and, eq, inArray } from "drizzle-orm";
import type { PgBoss } from "pg-boss";
import { db } from "@/db";
import { agentJobRuns, orgWebsites } from "@/db/schema";
import { availableRequirements } from "./capabilities";
import { enqueueAgentJob, ONBOARDING_STEPS } from "./queue";
import { JOB_REGISTRY, runAgentJob } from "./runner";
import { AGENT_SCHEDULE, isDueOn, siteDay } from "./schedule";

/** Runs the one-time setup for a newly added client, step by step. */
export async function runOnboarding(siteId: number) {
  const [site] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, siteId));
  if (!site) throw new Error(`Site ${siteId} not found`);
  const today = siteDay(new Date(), site.timeZone);

  await db.update(orgWebsites).set({ onboardingStatus: "in_progress", updatedAt: new Date() }).where(eq(orgWebsites.id, siteId));
  for (const step of ONBOARDING_STEPS) {
    try {
      await runAgentJob(siteId, step, today);
    } catch (error) {
      // One failing step must not block the others; the scheduler retries it later.
      console.error(`[onboarding] site ${siteId} step ${step} failed:`, (error as Error).message);
    }
    await db.update(orgWebsites).set({ lastCompletedOnboardingStep: step }).where(eq(orgWebsites.id, siteId));
  }
  await db
    .update(orgWebsites)
    .set({ onboardingStatus: "completed", onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(orgWebsites.id, siteId));
  await runAgentJob(siteId, "milestones", today).catch(() => undefined);
}

/**
 * Enqueues everything due today for every active site, plus onboarding steps
 * that were skipped or failed earlier and can run now (e.g. after an API key or
 * Google account was connected). Safe to run as often as needed.
 */
export async function schedulerTick(boss: PgBoss, now = new Date()) {
  const sites = await db
    .select({ id: orgWebsites.id, timeZone: orgWebsites.timeZone, createdAt: orgWebsites.createdAt })
    .from(orgWebsites)
    .where(and(eq(orgWebsites.onboardingStatus, "completed"), eq(orgWebsites.isHidden, false)));

  let enqueued = 0;
  for (const site of sites) {
    const today = siteDay(now, site.timeZone);
    const anchor = siteDay(site.createdAt, site.timeZone);
    const available = await availableRequirements(site.id);
    const ready = (requires: string[]) => requires.every((requirement) => available.has(requirement as never));

    for (const agent of AGENT_SCHEDULE) {
      if (!isDueOn(agent.cadence, today, anchor) || !ready(agent.requires)) continue;
      if (!JOB_REGISTRY[agent.job].handler) continue;
      if (await enqueueAgentJob(boss, { siteId: site.id, job: agent.job, runDate: today })) enqueued++;
    }

    const pending = await db
      .select({ job: agentJobRuns.job })
      .from(agentJobRuns)
      .where(
        and(
          eq(agentJobRuns.orgWebsiteId, site.id),
          inArray(agentJobRuns.job, [...ONBOARDING_STEPS]),
          inArray(agentJobRuns.status, ["skipped", "failed"]),
        ),
      );
    for (const { job } of pending) {
      const step = job as (typeof ONBOARDING_STEPS)[number];
      const registration = JOB_REGISTRY[step];
      if (!registration.handler || !ready(registration.requires)) continue;
      if (await enqueueAgentJob(boss, { siteId: site.id, job: step, runDate: today })) enqueued++;
    }
  }
  return { sites: sites.length, enqueued };
}
