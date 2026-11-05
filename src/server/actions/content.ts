"use server";

import { addDays, formatISO } from "date-fns";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contentPlanItems, keywordClusters, seedKeywords } from "@/db/schema";
import { siteDay } from "../agents/schedule";
import { getAppContext } from "../context";

async function requireSite() {
  const context = await getAppContext();
  if (!context?.site) throw new Error("No site selected");
  return context.site;
}

/** Only topics that have not been written (or started) yet can be changed. */
async function editablePlanItem(siteId: number, planItemId: number) {
  const [item] = await db
    .select()
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.id, planItemId), eq(contentPlanItems.orgWebsiteId, siteId), isNull(contentPlanItems.articleId)));
  if (!item) throw new Error("This topic can no longer be changed");
  if (["researching", "generating"].includes(item.generationStatus)) throw new Error("This article is already being generated, so it can no longer be changed.");
  return item;
}

const refresh = () => revalidatePath("/[locale]/dashboard/content-plan", "page");

/** A topic the user typed: a new keyword cluster of its own. */
async function ownTopicCluster(site: { id: number; selectedLanguage: string }, topic: string) {
  const keyword = topic.trim().toLowerCase().slice(0, 120);
  if (keyword.length < 3) throw new Error("Type a topic of at least 3 characters");
  const [seed] = await db.insert(seedKeywords).values({ value: keyword, languageCode: site.selectedLanguage, articleType: "guide_explainer" }).returning();
  const [cluster] = await db.insert(keywordClusters).values({ orgWebsiteId: site.id, seedKeywordId: seed!.id, keywords: [{ keyword }], creationSource: "user", isUsed: false }).returning();
  return cluster!.id;
}

export async function changeTopic(planItemId: number, choice: number | { topic: string }) {
  const site = await requireSite();
  const item = await editablePlanItem(site.id, planItemId);
  const clusterId = typeof choice === "number" ? choice : await ownTopicCluster(site, choice.topic);
  const [cluster] = await db
    .select({ id: keywordClusters.id, type: seedKeywords.articleType })
    .from(keywordClusters)
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(keywordClusters.id, clusterId), eq(keywordClusters.orgWebsiteId, site.id), eq(keywordClusters.isUsed, false)));
  if (!cluster) throw new Error("Topic not available");

  await db.transaction(async (tx) => {
    if (item.keywordClusterId) await tx.update(keywordClusters).set({ isUsed: false }).where(eq(keywordClusters.id, item.keywordClusterId));
    await tx.update(keywordClusters).set({ isUsed: true }).where(eq(keywordClusters.id, cluster.id));
    await tx
      .update(contentPlanItems)
      .set({ keywordClusterId: cluster.id, plannedTitle: null, articleType: cluster.type, whyThisTopic: [], research: null, generationStatus: "queued", updatedAt: new Date() })
      .where(eq(contentPlanItems.id, item.id));
  });
  refresh();
}

const instructionSchema = z.object({
  instruction: z.string().max(1000),
  supportUrl: z.union([z.literal(""), z.url()]),
});

export async function setTopicInstructions(planItemId: number, input: { instruction: string; supportUrl: string }) {
  const site = await requireSite();
  const item = await editablePlanItem(site.id, planItemId);
  const parsed = instructionSchema.parse(input);
  await db
    .update(contentPlanItems)
    .set({ userInstruction: parsed.instruction.trim() || null, supportUrl: parsed.supportUrl || null, updatedAt: new Date() })
    .where(eq(contentPlanItems.id, item.id));
  refresh();
}

export async function deleteTopic(planItemId: number) {
  const site = await requireSite();
  const item = await editablePlanItem(site.id, planItemId);
  await db.transaction(async (tx) => {
    if (item.keywordClusterId) await tx.update(keywordClusters).set({ isUsed: false }).where(eq(keywordClusters.id, item.keywordClusterId));
    await tx.delete(contentPlanItems).where(eq(contentPlanItems.id, item.id));
  });
  refresh();
}

/** Adds the user's own keywords as topics, scheduled after the current plan. */
export async function addKeywords(text: string) {
  const site = await requireSite();
  const keywords = [...new Set(text.split(/[\n,]/).map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 3 && k.length <= 120))].slice(0, 50);
  if (!keywords.length) return { added: 0 };

  const today = siteDay(new Date(), site.timeZone);
  const tomorrow = formatISO(addDays(new Date(`${today}T12:00:00Z`), 1), { representation: "date" });
  const [last] = await db
    .select({ day: contentPlanItems.scheduledFor })
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.orgWebsiteId, site.id), gte(contentPlanItems.scheduledFor, tomorrow)))
    .orderBy(desc(contentPlanItems.scheduledFor))
    .limit(1);
  let cursor = new Date(`${last?.day ?? today}T12:00:00Z`);
  const nextSlot = () => {
    do cursor = addDays(cursor, 1);
    while (site.articleScheduleWeekdays.length && !site.articleScheduleWeekdays.includes(cursor.getUTCDay()));
    return formatISO(cursor, { representation: "date" });
  };

  await db.transaction(async (tx) => {
    for (const keyword of keywords) {
      const [seed] = await tx.insert(seedKeywords).values({ value: keyword, languageCode: site.selectedLanguage, articleType: "guide_explainer" }).returning();
      const [cluster] = await tx
        .insert(keywordClusters)
        .values({ orgWebsiteId: site.id, seedKeywordId: seed!.id, keywords: [{ keyword }], creationSource: "user", isUsed: true })
        .returning();
      await tx.insert(contentPlanItems).values({ orgWebsiteId: site.id, scheduledFor: nextSlot(), keywordClusterId: cluster!.id, articleType: "guide_explainer", generationStatus: "queued" });
    }
  });
  refresh();
  return { added: keywords.length };
}

/** Drag to reschedule: moves a topic that isn't written yet to a future day (swapping with that day's topic). */
export async function moveTopic(planItemId: number, day: string) {
  const site = await requireSite();
  const item = await editablePlanItem(site.id, planItemId);
  const today = siteDay(new Date(), site.timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day <= today) return { error: "You can move posts only to future dates" };
  if (day === item.scheduledFor) return { ok: true };
  const [occupant] = await db.select().from(contentPlanItems).where(and(eq(contentPlanItems.orgWebsiteId, site.id), eq(contentPlanItems.scheduledFor, day)));
  if (occupant?.articleId) return { error: "That day already has a written article" };
  await db.transaction(async (tx) => {
    if (occupant) await tx.update(contentPlanItems).set({ scheduledFor: item.scheduledFor, updatedAt: new Date() }).where(eq(contentPlanItems.id, occupant.id));
    // Research done for the old day is redone the day before the new one.
    await tx.update(contentPlanItems).set({ scheduledFor: day, research: null, updatedAt: new Date() }).where(eq(contentPlanItems.id, item.id));
  });
  refresh();
  return { ok: true };
}

/** "Choose topic" on an empty future day: one of the unused topics, or the user's own. */
export async function planTopicOn(day: string, choice: number | { topic: string }) {
  const site = await requireSite();
  const today = siteDay(new Date(), site.timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day <= today) return { error: "You can plan topics only for future dates" };
  const [taken] = await db.select({ id: contentPlanItems.id }).from(contentPlanItems).where(and(eq(contentPlanItems.orgWebsiteId, site.id), eq(contentPlanItems.scheduledFor, day)));
  if (taken) return { error: "That day already has a topic" };
  const clusterId = typeof choice === "number" ? choice : await ownTopicCluster(site, choice.topic);
  const [cluster] = await db
    .select({ id: keywordClusters.id, type: seedKeywords.articleType })
    .from(keywordClusters)
    .innerJoin(seedKeywords, eq(seedKeywords.id, keywordClusters.seedKeywordId))
    .where(and(eq(keywordClusters.id, clusterId), eq(keywordClusters.orgWebsiteId, site.id), eq(keywordClusters.isUsed, false)));
  if (!cluster) return { error: "Topic not available" };
  await db.transaction(async (tx) => {
    await tx.update(keywordClusters).set({ isUsed: true }).where(eq(keywordClusters.id, cluster.id));
    await tx.insert(contentPlanItems).values({ orgWebsiteId: site.id, scheduledFor: day, keywordClusterId: cluster.id, articleType: cluster.type, generationStatus: "queued" });
  });
  refresh();
  return { ok: true };
}
