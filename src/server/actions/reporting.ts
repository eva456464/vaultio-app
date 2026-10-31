"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { agencyReportingSettings, REPORT_BLOCKS } from "@/db/schema";
import { getAppContext } from "../context";
import { KPI_METRICS } from "../reports/settings";

const schema = z.object({
  blocks: z.array(z.enum(REPORT_BLOCKS)),
  kpiMetrics: z.array(z.enum(KPI_METRICS as [string, ...string[]])).min(1, "Pick at least one search number"),
  autoSend: z.boolean(),
  recipientEmail: z.union([z.literal(""), z.email("Enter a valid email address")]),
});

export async function saveReportSettings(input: z.input<typeof schema>) {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") return { error: "Only workspace admins can change reporting" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  if (parsed.data.autoSend && !parsed.data.recipientEmail) return { error: "Add the email address the report goes to" };
  const blockToggles = Object.fromEntries(REPORT_BLOCKS.map((block) => [block, parsed.data.blocks.includes(block)]));
  const values = {
    autoSend: parsed.data.autoSend,
    recipientEmail: parsed.data.recipientEmail || null,
    kpiMetrics: parsed.data.kpiMetrics as ("clicks" | "impressions" | "position")[],
    blockToggles,
    updatedAt: new Date(),
  };
  await db
    .insert(agencyReportingSettings)
    .values({ orgWebsiteId: context.site.id, ...values })
    .onConflictDoUpdate({ target: agencyReportingSettings.orgWebsiteId, set: values });
  revalidatePath("/[locale]/dashboard/reporting", "page");
  return { ok: true as const };
}
