/**
 * Background worker: runs client onboarding and every scheduled agent job.
 *   npm run worker
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import { runOnboarding, schedulerTick } from "@/server/agents/orchestrator";
import { ensureQueues, QUEUES, type AgentJobData } from "@/server/agents/queue";
import { runAgentJob } from "@/server/agents/runner";

async function main() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  boss.on("error", (error) => console.error("[pg-boss]", error));
  await boss.start();
  await ensureQueues(boss);

  await boss.work<{ siteId: number }>(QUEUES.onboarding, async ([job]) => {
    console.log(`[onboarding] site ${job!.data.siteId}`);
    await runOnboarding(job!.data.siteId);
  });

  await boss.work<AgentJobData>(QUEUES.agentJob, { localConcurrency: 4 }, async ([job]) => {
    const { siteId, job: name, runDate } = job!.data;
    const outcome = await runAgentJob(siteId, name, runDate);
    console.log(`[agent] site ${siteId} ${name} ${runDate}: ${outcome.status}${outcome.detail ? ` (${outcome.detail})` : ""}`);
  });

  await boss.work(QUEUES.schedulerTick, async () => {
    const result = await schedulerTick(boss);
    console.log(`[scheduler] ${result.sites} sites, ${result.enqueued} jobs enqueued`);
  });

  await boss.schedule(QUEUES.schedulerTick, "*/15 * * * *");
  await boss.send(QUEUES.schedulerTick, {});
  console.log("Worker started");

  const shutdown = async () => {
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
