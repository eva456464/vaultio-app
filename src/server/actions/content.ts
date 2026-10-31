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

/** Only topics that have not been written yet can be changed. */
async function editablePlanItem(siteId: number, planItemId: number) {
  const [item] = await db
    .select()
    .from(contentPlanItems)
    .where(and(eq(contentPlanItems.id, planItemId), eq(contentPlanItems.orgWebsiteId, siteId), isNull(contentPlanItems.articleId)));
  if (!item) throw new Error("This topic can no longer be changed");
  return item;
}

const refresh = () => revalidatePath("/[locale]/dashboard/content-plan", "page");

export async function changeTopic(planItemId: number, clusterId: number) {
  const site = await requireSite();
  const item = await editablePlanItem(site.id, planItemId);
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
