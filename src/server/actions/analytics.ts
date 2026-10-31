"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ga4AiSourceDaily, ga4ChannelDaily, ga4RangeMetrics, gscDailyMetrics, gscDimensionMetrics, integrations } from "@/db/schema";
import { rerunAgentJob } from "../agents/queue";
import { siteDay } from "../agents/schedule";
import { getAppContext } from "../context";
import { getGa4Property, GOOGLE_PRODUCTS, GOOGLE_SYNC_JOBS, listGa4Properties, listGscSites, revokeAccess, type GoogleProduct } from "../google/client";

async function requireAdmin(product: GoogleProduct) {
  if (!GOOGLE_PRODUCTS.includes(product)) throw new Error("Unknown data source");
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can change analytics");
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, context.site.id), eq(integrations.type, product)));
  return { site: context.site, row };
}

const refresh = () => revalidatePath("/[locale]/dashboard", "layout");

type PropertyOption = { id: string; name: string; account: string };
export type PropertyList = { ok: true; items: PropertyOption[]; selected: string | null } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

/** The GA4 properties or Search Console sites the connected Google account can read. */
export async function listGoogleProperties(product: GoogleProduct): Promise<PropertyList> {
  const { row } = await requireAdmin(product);
  if (!row) return { ok: false, error: "Google is not connected" };
  try {
    const items = product === "ga4" ? await listGa4Properties(row) : await listGscSites(row);
    return { ok: true, items, selected: (row.config.propertyId as string | undefined) ?? null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Uses this property for the site and starts syncing it now. */
export async function selectGoogleProperty(product: GoogleProduct, propertyId: string): Promise<Result> {
  const { site, row } = await requireAdmin(product);
  if (!row) return { ok: false, error: "Google is not connected" };
  let options: PropertyOption[];
  try {
    options = product === "ga4" ? await listGa4Properties(row) : await listGscSites(row);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const option = options.find((item) => item.id === propertyId);
  if (!option) return { ok: false, error: "This property is no longer available to the connected Google account" };

  const changed = row.config.propertyId !== propertyId;
  const extra = product === "ga4" ? { propertyCreatedAt: (await getGa4Property(row, propertyId).catch(() => null))?.createTime ?? null } : {};
  await db.transaction(async (tx) => {
    // A different property means different numbers: clear what was synced from the old one.
    if (changed && product === "ga4") {
      await tx.delete(ga4ChannelDaily).where(eq(ga4ChannelDaily.orgWebsiteId, site.id));
      await tx.delete(ga4AiSourceDaily).where(eq(ga4AiSourceDaily.orgWebsiteId, site.id));
      await tx.delete(ga4RangeMetrics).where(eq(ga4RangeMetrics.orgWebsiteId, site.id));
    }
    if (changed && product === "gsc") {
      await tx.delete(gscDailyMetrics).where(eq(gscDailyMetrics.orgWebsiteId, site.id));
      await tx.delete(gscDimensionMetrics).where(eq(gscDimensionMetrics.orgWebsiteId, site.id));
    }
    await tx
      .update(integrations)
      .set({
        status: "connected",
        config: { ...row.config, ...extra, propertyId, propertyName: option.name, ...(changed ? { lastSyncedAt: null } : {}) },
        lastError: null,
        connectedAt: row.connectedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, row.id));
  });

  const today = siteDay(new Date(), site.timeZone);
  for (const job of GOOGLE_SYNC_JOBS[product]) await rerunAgentJob(site.id, job, today);
  refresh();
  return { ok: true };
}

/**
 * Stops syncing and removes Vaultio's access to the Google account. Synced numbers and the chosen
 * property are kept, so reconnecting the same property carries on without downloading history again.
 */
export async function disconnectGoogle(product: GoogleProduct): Promise<Result> {
  const { row } = await requireAdmin(product);
  if (!row) return { ok: true };
  await revokeAccess(row);
  const config = { ...row.config };
  delete config.account;
  await db
    .update(integrations)
    .set({ status: "disconnected", credentialsEncrypted: null, config, lastError: null, updatedAt: new Date() })
    .where(eq(integrations.id, row.id));
  refresh();
  return { ok: true };
}
