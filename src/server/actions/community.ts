"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { COMMUNITY_PLATFORMS, communityKeywords, communityOpportunities, communitySettings, type CommunityPlatform } from "@/db/schema";
import { COMMUNITY_JOBS, normalizeKeyword, normalizeSubreddit } from "@/lib/community";
import { availableRequirements } from "../agents/capabilities";
import { rerunAgentJob } from "../agents/queue";
import { siteDay } from "../agents/schedule";
import { draftReply, ensureCommunitySettings, keywordLimit } from "../community/agent";
import { getAppContext } from "../context";

type Result = { ok: true } | { error: string };

const platformSchema = z.enum(COMMUNITY_PLATFORMS);
const refresh = () => revalidatePath("/[locale]/dashboard", "layout");

async function requireSite(admin: boolean) {
  const context = await getAppContext();
  if (!context?.site) throw new Error("No website selected");
  if (admin && context.member?.role !== "admin") throw new Error("Only workspace admins can change these settings");
  return context.site;
}

async function activeCount(siteId: number, platform: CommunityPlatform) {
  const [row] = await db
    .select({ value: count() })
    .from(communityKeywords)
    .where(and(eq(communityKeywords.orgWebsiteId, siteId), eq(communityKeywords.platform, platform), eq(communityKeywords.isActive, true)));
  return row!.value;
}

/** Searches newly monitored keywords today instead of waiting for tomorrow's run. */
async function searchSoon(siteId: number, timeZone: string, platform: CommunityPlatform) {
  if (!(await availableRequirements(siteId)).has("llm")) return;
  await rerunAgentJob(siteId, COMMUNITY_JOBS[platform], siteDay(new Date(), timeZone)).catch((error) =>
    console.error(`[socials] could not queue the ${platform} search:`, (error as Error).message),
  );
}

const keywordSchema = z.string().trim().min(3, "Enter at least 3 characters").max(80, "Keep keywords under 80 characters");

/** Adds a custom keyword and starts monitoring it (within the keyword limit). */
export async function addCommunityKeyword(platform: CommunityPlatform, input: string): Promise<Result> {
  const site = await requireSite(true);
  const parsedPlatform = platformSchema.parse(platform);
  const parsed = keywordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  await ensureCommunitySettings(site.id, parsedPlatform);
  const limit = await keywordLimit(site.id, parsedPlatform);
  if ((await activeCount(site.id, parsedPlatform)) >= limit) return { error: `You can monitor up to ${limit} keywords` };
  const keyword = normalizeKeyword(parsed.data);
  await db
    .insert(communityKeywords)
    .values({ orgWebsiteId: site.id, platform: parsedPlatform, keyword, isActive: true })
    .onConflictDoUpdate({ target: [communityKeywords.orgWebsiteId, communityKeywords.platform, communityKeywords.keyword], set: { isActive: true, updatedAt: new Date() } });
  await searchSoon(site.id, site.timeZone, parsedPlatform);
  refresh();
  return { ok: true };
}

/** Starts monitoring a suggested keyword, or stops monitoring one (it moves back to the suggestions). */
export async function setCommunityKeywordActive(id: number, active: boolean): Promise<Result> {
  const site = await requireSite(true);
  const [keyword] = await db.select().from(communityKeywords).where(and(eq(communityKeywords.id, id), eq(communityKeywords.orgWebsiteId, site.id)));
  if (!keyword) return { error: "Keyword not found" };
  if (active && !keyword.isActive) {
    const limit = await keywordLimit(site.id, keyword.platform);
    if ((await activeCount(site.id, keyword.platform)) >= limit) return { error: `You can monitor up to ${limit} keywords` };
  }
  await db.update(communityKeywords).set({ isActive: active, updatedAt: new Date() }).where(eq(communityKeywords.id, id));
  if (active && !keyword.lastCheckedAt) await searchSoon(site.id, site.timeZone, keyword.platform);
  refresh();
  return { ok: true };
}

/** Removes a suggestion. Opportunities already found for it stay. */
export async function deleteCommunityKeyword(id: number): Promise<Result> {
  const site = await requireSite(true);
  await db.delete(communityKeywords).where(and(eq(communityKeywords.id, id), eq(communityKeywords.orgWebsiteId, site.id), eq(communityKeywords.isActive, false)));
  refresh();
  return { ok: true };
}

const preferencesSchema = z.object({
  subreddits: z.array(z.string()).max(25, "Choose up to 25 subreddits"),
  replyInstructions: z.string().trim().max(1500, "Keep the instructions under 1,500 characters"),
});

/** Saves the subreddits to monitor (Reddit only) and how replies are written. */
export async function updateCommunityPreferences(platform: CommunityPlatform, input: z.input<typeof preferencesSchema>): Promise<Result | { error: string; invalid: string[] }> {
  const site = await requireSite(true);
  const parsedPlatform = platformSchema.parse(platform);
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const invalid = parsed.data.subreddits.filter((name) => !normalizeSubreddit(name));
  if (invalid.length) return { error: "Some subreddit names aren't valid", invalid };
  const subreddits = parsedPlatform === "reddit" ? [...new Set(parsed.data.subreddits.map((name) => normalizeSubreddit(name)!))] : [];
  await ensureCommunitySettings(site.id, parsedPlatform);
  await db
    .update(communitySettings)
    .set({ subreddits, replyInstructions: parsed.data.replyInstructions || null, updatedAt: new Date() })
    .where(and(eq(communitySettings.orgWebsiteId, site.id), eq(communitySettings.platform, parsedPlatform)));
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ Opportunities

async function requireOpportunity(id: number) {
  const site = await requireSite(false);
  const [opportunity] = await db.select().from(communityOpportunities).where(and(eq(communityOpportunities.id, id), eq(communityOpportunities.orgWebsiteId, site.id)));
  if (!opportunity) throw new Error("Opportunity not found");
  return { site, opportunity };
}

/** Drafts (or redrafts) the suggested reply with Claude. */
export async function draftCommunityReply(id: number): Promise<{ ok: true; reply: string } | { error: string }> {
  const { site } = await requireOpportunity(id);
  if (!(await availableRequirements(site.id)).has("llm")) return { error: "Reply drafting needs the AI writing provider (ANTHROPIC_API_KEY)" };
  try {
    const reply = await draftReply(site, id);
    refresh();
    return { ok: true, reply };
  } catch (error) {
    console.error("[socials] drafting failed:", (error as Error).message);
    return { error: "The reply couldn't be drafted. Please try again." };
  }
}

/** Saves an edited reply. */
export async function saveCommunityReply(id: number, text: string): Promise<Result> {
  await requireOpportunity(id);
  const reply = text.trim();
  if (reply.length > 10_000) return { error: "Keep the reply under 10,000 characters" };
  await db.update(communityOpportunities).set({ suggestedComment: reply || null, updatedAt: new Date() }).where(eq(communityOpportunities.id, id));
  refresh();
  return { ok: true };
}

/** Moves an opportunity to "Replied" (or back to "To reply"). */
export async function markCommunityReplied(id: number, replied: boolean): Promise<Result> {
  await requireOpportunity(id);
  await db.update(communityOpportunities).set({ markedAsRepliedAt: replied ? new Date() : null, updatedAt: new Date() }).where(eq(communityOpportunities.id, id));
  refresh();
  return { ok: true };
}

/** Hides an opportunity ("Not relevant"); it won't be suggested again. */
export async function discardCommunityOpportunity(id: number, discarded = true): Promise<Result> {
  await requireOpportunity(id);
  await db.update(communityOpportunities).set({ discardedAt: discarded ? new Date() : null, updatedAt: new Date() }).where(eq(communityOpportunities.id, id));
  refresh();
  return { ok: true };
}
