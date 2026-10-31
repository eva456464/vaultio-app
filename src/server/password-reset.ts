/** Password reset emails, sent with the brand and domain the user signed in on (agency or platform). */
import { and, eq } from "drizzle-orm";
import { createTranslator } from "next-intl";
import { db } from "@/db";
import { organizationMembers, whitelabelConfigs } from "@/db/schema";
import en from "@/messages/en.json";
import { DEFAULT_BRAND_COLOR, DEFAULT_BRAND_NAME, safeColor } from "./brand";
import { senderFor, sendEmail } from "./email";
import { platformHosts } from "./whitelabel/domains";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function sendPasswordResetEmail({ user, token, request }: { user: { id: string; email: string; name: string }; token: string; request?: Request }) {
  // Only link back to hosts we serve: the platform's own, or an agency's registered domain.
  const host = request?.headers.get("x-forwarded-host") ?? request?.headers.get("host") ?? null;
  const hostname = host?.split(":")[0]?.toLowerCase() ?? null;
  const [agency] = hostname ? await db.select().from(whitelabelConfigs).where(eq(whitelabelConfigs.domain, hostname)) : [];
  const fallback = (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const trusted = hostname && (agency || platformHosts().has(hostname));
  const protocol = request?.headers.get("x-forwarded-proto") ?? (hostname === "localhost" ? "http" : "https");
  const origin = trusted ? `${protocol}://${host}` : fallback;
  const link = `${origin}/en/reset-password?token=${encodeURIComponent(token)}`;

  // The sender: the agency the user belongs to, when they reset on its domain.
  let from: string | undefined;
  if (agency) {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.organizationId, agency.organizationId)));
    if (membership) from = await senderFor(agency.organizationId);
  }
  from ??= await senderFor(null);

  const brand = agency?.brandName ?? DEFAULT_BRAND_NAME;
  const color = safeColor(agency?.primaryColor, DEFAULT_BRAND_COLOR);
  const t = createTranslator({ locale: "en", messages: en, namespace: "emails.reset" });
  await sendEmail({
    to: user.email,
    from,
    subject: t("subject", { brand }),
    html: `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
  <p style="font-size:18px;font-weight:600;margin:0 0 24px">${escapeHtml(brand)}</p>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(t("title"))}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 24px">${escapeHtml(t("body", { brand }))}</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:${escapeHtml(color)};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:999px">${escapeHtml(t("button"))}</a>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:24px 0 0">${escapeHtml(t("expires"))}</p>
  </div>
</div></body></html>`,
  });
}
