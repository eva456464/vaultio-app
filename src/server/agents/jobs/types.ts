import type { orgWebsites } from "@/db/schema";

export type Site = typeof orgWebsites.$inferSelect;

export type JobContext = {
  site: Site;
  /** The site-local calendar day this run belongs to (YYYY-MM-DD). */
  runDate: string;
};

export type JobHandler = (context: JobContext) => Promise<unknown>;
