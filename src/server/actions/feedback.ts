"use server";

import { z } from "zod";
import { db } from "@/db";
import { featureRequests } from "@/db/schema";
import { getAppContext } from "../context";
import { sendEmail } from "../email";
import { emailConfigured } from "../invites";

const CATEGORIES = ["blogs", "backlinks", "analytics", "geo_audit", "integrations", "other"] as const;
const schema = z.object({ category: z.enum(CATEGORIES), description: z.string().trim().min(10).max(2000) });

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "Request a feature": saved for the platform owner and emailed to SUPPORT_EMAIL when set. */
export async function requestFeature(input: { category: string; description: string }): Promise<{ ok: true } | { error: "category" | "description" | "failed" }> {
  const context = await getAppContext();
  if (!context) return { error: "failed" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.path[0] === "category" ? "category" : "description" };
  await db.insert(featureRequests).values({ userId: context.user.id, organizationId: context.organization?.id ?? null, ...parsed.data });
  const to = process.env.SUPPORT_EMAIL;
  if (to && emailConfigured()) {
    await sendEmail({
      to,
      subject: `Feature request (${parsed.data.category}) from ${context.user.email}`,
      html: `<p><strong>${escape(context.user.name)}</strong> (${escape(context.user.email)}, workspace ${escape(context.organization?.name ?? "")})</p><p>${escape(parsed.data.description).replace(/\n/g, "<br>")}</p>`,
    }).catch((error) => console.error("[feature request] email failed:", (error as Error).message));
  }
  return { ok: true };
}
