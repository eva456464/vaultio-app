/** Workspace invitations: links, emails and acceptance. */
import "server-only";
import { randomBytes } from "node:crypto";
import { and, count, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { createTranslator } from "next-intl";
import { db } from "@/db";
import { memberWebsiteAccess, organizationInvitations, organizationMembers, organizations, orgWebsites } from "@/db/schema";
import en from "@/messages/en.json";
import { sendEmail } from "./email";

export const INVITE_DAYS = 7;

export const newInviteToken = () => randomBytes(24).toString("base64url");
export const inviteExpiry = () => new Date(Date.now() + INVITE_DAYS * 86_400_000);

/** True when invitation emails can be sent (Resend key and a sender address). */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.REPORT_FROM_EMAIL));

/** Origin of the current request, so invites made on an agency's domain link back to it. */
export async function requestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}

export const inviteLink = (origin: string, token: string, locale = "en") => `${origin}/${locale}/invite/${token}`;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Sends the invitation email (text from the `emails.invite` namespace). */
export async function sendInviteEmail({ to, link, inviter, workspace, brand, accentColor }: { to: string; link: string; inviter: string; workspace: string; brand: string; accentColor: string }) {
  const t = createTranslator({ locale: "en", messages: en, namespace: "emails.invite" });
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
  <p style="font-size:18px;font-weight:600;margin:0 0 24px">${escapeHtml(brand)}</p>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(t("title", { workspace }))}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 24px">${escapeHtml(t("body", { inviter, workspace, brand }))}</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:${escapeHtml(accentColor)};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:999px">${escapeHtml(t("button"))}</a>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:24px 0 0">${escapeHtml(t("expires", { days: INVITE_DAYS }))}</p>
  </div>
  <p style="font-size:12px;color:#9ca3af;margin:16px 0 0">${escapeHtml(t("ignore"))}</p>
</div></body></html>`;
  await sendEmail({ to, subject: t("subject", { workspace, brand }), html, from: process.env.EMAIL_FROM || undefined });
}

export type InvitationState =
  | { kind: "missing" }
  | { kind: "expired" | "accepted"; workspace: string }
  | { kind: "open"; id: number; email: string; role: "admin" | "member"; workspace: string; organizationId: number; websiteIds: number[] };

export async function findInvitation(token: string): Promise<InvitationState> {
  const [row] = await db
    .select({ invite: organizationInvitations, workspace: organizations.name })
    .from(organizationInvitations)
    .innerJoin(organizations, eq(organizations.id, organizationInvitations.organizationId))
    .where(eq(organizationInvitations.token, token));
  if (!row) return { kind: "missing" };
  if (row.invite.acceptedAt) return { kind: "accepted", workspace: row.workspace };
  if (row.invite.expiresAt < new Date()) return { kind: "expired", workspace: row.workspace };
  return { kind: "open", id: row.invite.id, email: row.invite.email, role: row.invite.role, workspace: row.workspace, organizationId: row.invite.organizationId, websiteIds: row.invite.websiteIds };
}

export class InviteError extends Error {
  constructor(public code: "invalid" | "wrongEmail" | "otherWorkspace") {
    super(code);
  }
}

/**
 * Adds the user to the inviting workspace. The empty workspace created automatically at sign-up is
 * removed; a user who already runs a workspace with websites or other members can't join another one.
 */
export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const invite = await findInvitation(token);
  if (invite.kind !== "open") throw new InviteError("invalid");
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) throw new InviteError("wrongEmail");

  return db.transaction(async (tx) => {
    const memberships = await tx.select().from(organizationMembers).where(eq(organizationMembers.userId, user.id));
    for (const membership of memberships) {
      if (membership.organizationId === invite.organizationId) continue;
      const [[sites], [members]] = await Promise.all([
        tx.select({ value: count() }).from(orgWebsites).where(eq(orgWebsites.organizationId, membership.organizationId)),
        tx.select({ value: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, membership.organizationId)),
      ]);
      if (sites!.value > 0 || members!.value > 1) throw new InviteError("otherWorkspace");
      await tx.delete(organizations).where(eq(organizations.id, membership.organizationId));
    }

    // Only websites that still belong to the workspace.
    const siteIds = invite.websiteIds.length
      ? (
          await tx
            .select({ id: orgWebsites.id })
            .from(orgWebsites)
            .where(and(eq(orgWebsites.organizationId, invite.organizationId), inArray(orgWebsites.id, invite.websiteIds)))
        ).map((row) => row.id)
      : [];
    const allWebsites = invite.role === "admin";
    const [member] = await tx
      .insert(organizationMembers)
      .values({ organizationId: invite.organizationId, userId: user.id, role: invite.role, allWebsites })
      .onConflictDoUpdate({ target: [organizationMembers.organizationId, organizationMembers.userId], set: { role: invite.role, allWebsites, updatedAt: new Date() } })
      .returning();
    await tx.delete(memberWebsiteAccess).where(eq(memberWebsiteAccess.memberId, member!.id));
    if (!allWebsites && siteIds.length) await tx.insert(memberWebsiteAccess).values(siteIds.map((orgWebsiteId) => ({ memberId: member!.id, orgWebsiteId })));
    await tx.update(organizationInvitations).set({ acceptedAt: new Date(), updatedAt: new Date() }).where(eq(organizationInvitations.id, invite.id));
    return { organizationId: invite.organizationId, firstSiteId: allWebsites ? null : (siteIds[0] ?? null) };
  });
}
