import { db } from "@/db";
import { agentActivities, type ActivityType } from "@/db/schema";

type ActivityFields = {
  day?: string;
  count?: number;
  total?: number;
  title?: string;
  articleId?: number;
  publishedUrl?: string;
  sourceUrl?: string;
  domainRating?: number;
  occurredAt?: Date;
};

/** Records something an agent did; the Overview feed reads these rows. */
export async function logActivity(siteId: number, type: ActivityType, fields: ActivityFields = {}) {
  const { occurredAt = new Date(), ...rest } = fields;
  await db.insert(agentActivities).values({ orgWebsiteId: siteId, type, occurredAt, ...rest });
}
