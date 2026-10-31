"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { llmPrompts } from "@/db/schema";
import { siteEntitlements } from "../billing/entitlements";
import { getAppContext } from "../context";

async function requireSite() {
  const context = await getAppContext();
  if (!context?.site) throw new Error("No site selected");
  return context.site;
}

async function activeCount(siteId: number) {
  const [row] = await db.select({ value: count() }).from(llmPrompts).where(and(eq(llmPrompts.orgWebsiteId, siteId), eq(llmPrompts.isActive, true)));
  return row?.value ?? 0;
}

const refresh = () => revalidatePath("/[locale]/dashboard/ai-visibility", "page");

const promptSchema = z.object({
  text: z.string().trim().min(8, "Write the question as a customer would ask it").max(300),
  intent: z.enum(["awareness", "research", "comparison", "learning", "buying", "other"]),
});

export async function addPrompt(input: { text: string; intent: string }) {
  const site = await requireSite();
  const parsed = promptSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  if ((await activeCount(site.id)) >= (await siteEntitlements(site.id)).prompts) return { error: "limit" as const };
  await db.insert(llmPrompts).values({ orgWebsiteId: site.id, prompt: parsed.data.text, intent: parsed.data.intent });
  refresh();
  return { ok: true };
}

export async function setPromptActive(promptId: number, active: boolean) {
  const site = await requireSite();
  if (active && (await activeCount(site.id)) >= (await siteEntitlements(site.id)).prompts) return { error: "limit" as const };
  await db.update(llmPrompts).set({ isActive: active, updatedAt: new Date() }).where(and(eq(llmPrompts.id, promptId), eq(llmPrompts.orgWebsiteId, site.id)));
  refresh();
  return { ok: true };
}

export async function deletePrompt(promptId: number) {
  const site = await requireSite();
  await db.delete(llmPrompts).where(and(eq(llmPrompts.id, promptId), eq(llmPrompts.orgWebsiteId, site.id)));
  refresh();
}
