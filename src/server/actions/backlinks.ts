"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orgWebsites } from "@/db/schema";
import { siteDay } from "../agents/schedule";
import { joinBacklinkExchange } from "../backlinks/exchange";
import { getAppContext } from "../context";

/** Switches the exchange on or off for the selected site; switching on joins it the first time. */
export async function setExchangeEnabled(enabled: boolean) {
  const context = await getAppContext();
  const site = context?.site;
  if (!site || context.member?.role !== "admin") return { error: "Only workspace admins can change the backlink exchange" };
  await db.update(orgWebsites).set({ backlinksEnabled: enabled, updatedAt: new Date() }).where(eq(orgWebsites.id, site.id));
  if (enabled) await joinBacklinkExchange({ site: { ...site, backlinksEnabled: true }, runDate: siteDay(new Date(), site.timeZone) });
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true as const };
}
