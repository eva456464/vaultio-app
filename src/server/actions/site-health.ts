"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { geoAuditSelectedPages, sitePages } from "@/db/schema";
import { MAX_AUDIT_PAGES } from "@/lib/site-health";
import { getAppContext } from "../context";
import { validateIssue } from "../site-health/audit";

/** Saves the pages the weekly audit checks (the homepage is always included). */
export async function saveAuditPages(urls: string[]) {
  const context = await getAppContext();
  if (!context?.site) throw new Error("No site selected");
  const known = new Set(
    (await db.select({ url: sitePages.url }).from(sitePages).where(eq(sitePages.orgWebsiteId, context.site.id))).map((row) => row.url),
  );
  const chosen = [...new Set(urls)].filter((url) => known.has(url)).slice(0, MAX_AUDIT_PAGES);
  await db.transaction(async (tx) => {
    await tx.delete(geoAuditSelectedPages).where(eq(geoAuditSelectedPages.orgWebsiteId, context.site!.id));
    if (chosen.length) await tx.insert(geoAuditSelectedPages).values(chosen.map((url) => ({ orgWebsiteId: context.site!.id, url })));
  });
  revalidatePath("/[locale]/dashboard/geo-audit", "page");
  return { saved: chosen.length };
}

/** "Validate fix": checks one issue again on the live site (any member can ask). */
export async function validateIssueFix(issueId: number): Promise<{ fixed: boolean; description?: string } | { error: string }> {
  const context = await getAppContext();
  if (!context?.site) throw new Error("No site selected");
  try {
    const result = await validateIssue(context.site.id, issueId);
    revalidatePath("/[locale]/dashboard/geo-audit", "page");
    return result;
  } catch (error) {
    console.error("[site health] validate fix failed:", (error as Error).message);
    return { error: "failed" };
  }
}
