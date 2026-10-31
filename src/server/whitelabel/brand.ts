/** A workspace's own white-label brand, for emails and links sent on its behalf. */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { whitelabelConfigs } from "@/db/schema";
import { DEFAULT_BRAND_COLOR, safeColor } from "../brand";

export async function workspaceBrand(organizationId: number) {
  const [config] = await db.select().from(whitelabelConfigs).where(eq(whitelabelConfigs.organizationId, organizationId));
  if (!config) return null;
  return {
    name: config.brandName,
    accentColor: safeColor(config.primaryColor, DEFAULT_BRAND_COLOR),
    /** The agency's domain once it is connected; clients should sign in there. */
    origin: config.domain && config.domainVerified ? `https://${config.domain}` : null,
  };
}
