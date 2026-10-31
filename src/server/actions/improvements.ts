"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { articleImprovements, type ImprovementChange } from "@/db/schema";
import { getAppContext } from "../context";
import { publishImprovement } from "../improvements/publish";

type Decision = ImprovementChange["status"];

async function requireImprovement(id: number) {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can review improvements");
  const [improvement] = await db.select().from(articleImprovements).where(and(eq(articleImprovements.id, id), eq(articleImprovements.orgWebsiteId, context.site.id)));
  if (!improvement) throw new Error("Improvement not found");
  return { site: context.site, improvement };
}

const refresh = () => revalidatePath("/[locale]/dashboard/content-plan/improvements", "layout");

/** Approves, rejects or resets one change (or all of them when changeId is null). */
export async function decideChanges(id: number, changeId: string | null, decision: Decision) {
  const { improvement } = await requireImprovement(id);
  if (improvement.status !== "pending_review") return { error: "This improvement is no longer waiting for review" };
  const changes = improvement.changes.map((change) => (changeId === null || change.id === changeId ? { ...change, status: decision } : change));
  await db.update(articleImprovements).set({ changes, updatedAt: new Date() }).where(eq(articleImprovements.id, id));
  refresh();
  return { ok: true as const };
}

/** Publishes the approved changes; with none approved, the improvement counts as rejected. */
export async function publishImprovementNow(id: number) {
  const { site, improvement } = await requireImprovement(id);
  if (improvement.status !== "pending_review") return { error: "This improvement is no longer waiting for review" };
  try {
    const result = await publishImprovement(site.id, id);
    refresh();
    return { ok: true as const, published: result.published, errors: result.errors };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function rejectImprovement(id: number) {
  const { improvement } = await requireImprovement(id);
  if (improvement.status !== "pending_review") return { error: "This improvement is no longer waiting for review" };
  await db
    .update(articleImprovements)
    .set({ status: "rejected", changes: improvement.changes.map((change) => ({ ...change, status: "rejected" as const })), decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(articleImprovements.id, id));
  refresh();
  return { ok: true as const };
}

/** A queued opportunity the user doesn't want: never suggested again. */
export async function discardCandidate(id: number) {
  const { improvement } = await requireImprovement(id);
  if (improvement.status !== "candidate") return { error: "Only queued opportunities can be discarded" };
  await db.update(articleImprovements).set({ status: "dismissed", decidedAt: new Date(), updatedAt: new Date() }).where(eq(articleImprovements.id, id));
  refresh();
  return { ok: true as const };
}
