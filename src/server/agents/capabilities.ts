import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { integrations, orgWebsites, products } from "@/db/schema";
import { featurable } from "../catalog/catalog";
import type { Requirement } from "./schedule";

/** Which providers and integrations are available to a site's agents. */
export async function availableRequirements(siteId: number): Promise<Set<Requirement>> {
  const available = new Set<Requirement>();
  if (process.env.ANTHROPIC_API_KEY) available.add("llm");
  if (process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL) available.add("email");
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) {
    available.add("keywordData");
    available.add("authorityData");
  }
  const connected = await db
    .select({ type: integrations.type })
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), eq(integrations.status, "connected")));
  for (const row of connected) {
    if (row.type === "ga4") available.add("ga4");
    if (row.type === "gsc") available.add("gsc");
  }
  const [store] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(and(eq(integrations.orgWebsiteId, siteId), inArray(integrations.type, ["shopify_catalog", "woocommerce", "product_feed"]), inArray(integrations.status, ["connected", "error"])))
    .limit(1);
  if (store) available.add("catalog");
  // Language sites feature their primary website's catalog.
  const [site] = await db.select({ primaryId: orgWebsites.primaryOrgWebsiteId }).from(orgWebsites).where(eq(orgWebsites.id, siteId));
  const [product] = await db.select({ id: products.id }).from(products).where(featurable(site?.primaryId ?? siteId)).limit(1);
  if (product) available.add("products");
  return available;
}

export const REQUIREMENT_LABELS: Record<Requirement, string> = {
  ga4: "Google Analytics is not connected",
  gsc: "Google Search Console is not connected",
  llm: "AI writing provider is not configured (ANTHROPIC_API_KEY)",
  keywordData: "Keyword data provider is not configured (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)",
  authorityData: "Domain authority provider is not configured (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)",
  email: "Email sending is not configured (RESEND_API_KEY / REPORT_FROM_EMAIL)",
  catalog: "No store or product feed is connected (Settings → Product catalog)",
  products: "No products can be featured yet (Settings → Product catalog)",
};
