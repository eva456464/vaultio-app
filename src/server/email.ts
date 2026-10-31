import { eq } from "drizzle-orm";
import { db } from "@/db";
import { whitelabelConfigs } from "@/db/schema";

/** Transactional email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). */
export async function sendEmail({ to, subject, html, from }: { to: string; subject: string; html: string; from?: string }) {
  const response = await fetch(`${(process.env.RESEND_API_BASE ?? "https://api.resend.com").replace(/\/$/, "")}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: from ?? process.env.REPORT_FROM_EMAIL, to: [to], subject, html }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Email not sent: ${body?.message ?? `HTTP ${response.status}`}`);
  }
}

/**
 * The "from" address for a workspace's emails: its white-label name and verified sending domain
 * when it has one, otherwise the platform's sender.
 */
export async function senderFor(organizationId: number | null | undefined) {
  const fallback = process.env.EMAIL_FROM || undefined;
  if (!organizationId) return fallback;
  const [config] = await db.select().from(whitelabelConfigs).where(eq(whitelabelConfigs.organizationId, organizationId));
  if (!config?.sendingDomain || config.emailDomainStatus !== "verified") return fallback;
  return `${config.brandName.replace(/[<>"]/g, "")} <notifications@${config.sendingDomain}>`;
}
