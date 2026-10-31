import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencyReportingSettings, REPORT_BLOCKS, type ReportBlock } from "@/db/schema";

export type KpiMetric = "clicks" | "impressions" | "position";
export const KPI_METRICS: KpiMetric[] = ["clicks", "impressions", "position"];

export type ReportSettings = { autoSend: boolean; recipientEmail: string | null; kpiMetrics: KpiMetric[]; blocks: ReportBlock[] };

export async function getReportSettings(siteId: number): Promise<ReportSettings> {
  const [row] = await db.select().from(agencyReportingSettings).where(eq(agencyReportingSettings.orgWebsiteId, siteId));
  const toggles = row?.blockToggles ?? {};
  return {
    autoSend: row?.autoSend ?? false,
    recipientEmail: row?.recipientEmail ?? null,
    kpiMetrics: row?.kpiMetrics?.length ? row.kpiMetrics : KPI_METRICS,
    // Every section is on unless switched off.
    blocks: REPORT_BLOCKS.filter((block) => toggles[block] !== false),
  };
}

export function parseBlocks(value: string | null): ReportBlock[] | null {
  if (value === null) return null;
  return value.split(",").filter((block): block is ReportBlock => (REPORT_BLOCKS as readonly string[]).includes(block));
}

export function parseKpis(value: string | null): KpiMetric[] | null {
  if (value === null) return null;
  return value.split(",").filter((metric): metric is KpiMetric => (KPI_METRICS as string[]).includes(metric));
}
