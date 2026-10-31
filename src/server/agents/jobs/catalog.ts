/**
 * Product catalog agents: catalogSync keeps products from the connected store (Shopify or
 * WooCommerce) and product feed up to date; productMatching proposes products for upcoming
 * articles whenever the catalog or the plan changed.
 */
import { syncCatalog } from "@/server/catalog/catalog";
import { matchTopics, staleTopics } from "@/server/catalog/matching";
import { logActivity } from "../activity";
import { rerunAgentJob } from "../queue";
import type { JobContext } from "./types";

const PLATFORM: Record<string, string> = { shopify: "Shopify", woocommerce: "WooCommerce", google_shopping: "Google Shopping feed", facebook: "Facebook feed" };

export async function catalogSync({ site, runDate }: JobContext) {
  const results = await syncCatalog(site.id);
  const synced = results.filter((result) => !result.error);
  if (synced.length) {
    await logActivity(site.id, "catalogSynced", { day: runDate, count: synced.reduce((total, result) => total + result.count, 0), title: synced.map((result) => PLATFORM[result.source]).join(", ") });
  }
  // New or changed products are matched to upcoming articles right away (as its own job, so it
  // follows the plan's rules: catalog sync runs without a plan, matching uses Claude).
  const changed = synced.some((result) => result.added || result.updated || result.removed);
  if (changed) await rerunAgentJob(site.id, "productMatching", runDate);
  const failed = results.filter((result) => result.error);
  if (failed.length && !synced.length) throw new Error(failed.map((result) => `${PLATFORM[result.source]}: ${result.error}`).join("; "));
  return { results, matchingQueued: changed };
}

export async function productMatching({ site, runDate }: JobContext) {
  const topics = await staleTopics(site.id, runDate);
  if (!topics.length) return { matched: 0, topics: 0 };
  const matched = await matchTopics(site, topics);
  if (matched) await logActivity(site.id, "productsMatched", { day: runDate, count: matched });
  return { matched, topics: topics.length };
}
