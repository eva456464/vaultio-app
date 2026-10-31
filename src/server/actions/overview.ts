"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orgWebsites } from "@/db/schema";
import { getAppContext } from "../context";
import { markMilestonesSeen } from "../queries/overview";

export async function dismissAchievements() {
  const context = await getAppContext();
  if (!context?.site) return;
  await markMilestonesSeen(context.site.id);
  revalidatePath("/[locale]/dashboard/overview", "page");
}

/** "Looks good" on the business profile the agents built. */
export async function confirmBusinessProfile() {
  const context = await getAppContext();
  if (!context?.site) return;
  await db.update(orgWebsites).set({ profileConfirmedAt: new Date() }).where(eq(orgWebsites.id, context.site.id));
  revalidatePath("/[locale]/dashboard/overview", "page");
}
