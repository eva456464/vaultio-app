"use server";

import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { memberWebsiteAccess, organizationInvitations, organizationMembers, organizations, orgWebsites, user } from "@/db/schema";
import { getAppContext, getBrand, getSession, SELECTED_SITE_COOKIE } from "../context";
import { senderFor } from "../email";
import { workspaceBrand } from "../whitelabel/brand";
import { acceptInvitation, emailConfigured, inviteExpiry, InviteError, inviteLink, newInviteToken, requestOrigin, sendInviteEmail } from "../invites";

type Result = { ok: true } | { error: string };
type InviteResult = { ok: true; link: string; emailed: boolean; emailError?: string } | { error: string };

const refresh = () => revalidatePath("/[locale]/dashboard/settings", "layout");

async function requireAdmin() {
  const context = await getAppContext();
  if (!context?.organization || context.member?.role !== "admin") throw new Error("Only workspace admins can manage members");
  return context;
}

const nameSchema = z.string().trim().min(1, "Enter a workspace name").max(80, "Keep the name under 80 characters");

export async function renameWorkspace(name: string): Promise<Result> {
  const context = await requireAdmin();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  await db.update(organizations).set({ name: parsed.data, updatedAt: new Date() }).where(eq(organizations.id, context.organization!.id));
  refresh();
  return { ok: true };
}

/** Website ids that belong to the workspace (anything else is dropped). */
async function ownSiteIds(organizationId: number, ids: number[]) {
  if (!ids.length) return [];
  const rows = await db.select({ id: orgWebsites.id }).from(orgWebsites).where(and(eq(orgWebsites.organizationId, organizationId), inArray(orgWebsites.id, ids)));
  return rows.map((row) => row.id);
}

async function deliver(context: Awaited<ReturnType<typeof requireAdmin>>, email: string, token: string): Promise<InviteResult> {
  // An agency's invites carry its own name and link to its own domain once that is connected.
  const own = await workspaceBrand(context.organization!.id);
  const link = inviteLink(own?.origin ?? (await requestOrigin()), token);
  if (!emailConfigured()) return { ok: true, link, emailed: false };
  try {
    const brand = own ?? (await getBrand());
    await sendInviteEmail({ to: email, link, inviter: context.user.name || context.user.email, workspace: context.organization!.name, brand: brand.name, accentColor: brand.accentColor, from: await senderFor(context.organization!.id) });
    return { ok: true, link, emailed: true };
  } catch (error) {
    console.error("[team] invite email failed:", (error as Error).message);
    return { ok: true, link, emailed: false, emailError: "The invitation was saved but the email couldn't be sent. Copy the link and send it yourself." };
  }
}

const inviteSchema = z.object({
  email: z.email("Enter a valid email address").transform((value) => value.trim().toLowerCase()),
  role: z.enum(["admin", "member"]),
  websiteIds: z.array(z.number().int()).max(500),
});

/** Invites someone by email (or updates and resends a pending invitation for the same address). */
export async function inviteMember(input: z.input<typeof inviteSchema>): Promise<InviteResult> {
  const context = await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { email, role } = parsed.data;
  const organizationId = context.organization!.id;
  const websiteIds = role === "admin" ? [] : await ownSiteIds(organizationId, parsed.data.websiteIds);
  if (role === "member" && !websiteIds.length) return { error: "Choose at least one website this member can see" };

  const [existing] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(user, eq(user.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(user.email, email)));
  if (existing) return { error: "This person is already a member of the workspace" };

  const [pending] = await db
    .select()
    .from(organizationInvitations)
    .where(and(eq(organizationInvitations.organizationId, organizationId), eq(organizationInvitations.email, email), isNull(organizationInvitations.acceptedAt)));
  const token = pending?.token ?? newInviteToken();
  if (pending) {
    await db.update(organizationInvitations).set({ role, websiteIds, expiresAt: inviteExpiry(), invitedById: context.user.id, updatedAt: new Date() }).where(eq(organizationInvitations.id, pending.id));
  } else {
    await db.insert(organizationInvitations).values({ organizationId, email, role, websiteIds, token, invitedById: context.user.id, expiresAt: inviteExpiry() });
  }
  refresh();
  return deliver(context, email, token);
}

/** Sends a pending invitation again and extends it by another week. */
export async function resendInvite(id: number): Promise<InviteResult> {
  const context = await requireAdmin();
  const [invite] = await db
    .select()
    .from(organizationInvitations)
    .where(and(eq(organizationInvitations.id, id), eq(organizationInvitations.organizationId, context.organization!.id), isNull(organizationInvitations.acceptedAt)));
  if (!invite) return { error: "Invitation not found" };
  await db.update(organizationInvitations).set({ expiresAt: inviteExpiry(), updatedAt: new Date() }).where(eq(organizationInvitations.id, id));
  refresh();
  return deliver(context, invite.email, invite.token);
}

export async function cancelInvite(id: number): Promise<Result> {
  const context = await requireAdmin();
  await db.delete(organizationInvitations).where(and(eq(organizationInvitations.id, id), eq(organizationInvitations.organizationId, context.organization!.id), isNull(organizationInvitations.acceptedAt)));
  refresh();
  return { ok: true };
}

async function requireMember(id: number) {
  const context = await requireAdmin();
  const [member] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.id, id), eq(organizationMembers.organizationId, context.organization!.id)));
  if (!member) throw new Error("Member not found");
  return { context, member };
}

async function otherAdmins(organizationId: number, memberId: number) {
  const [row] = await db
    .select({ value: count() })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.role, "admin"), ne(organizationMembers.id, memberId)));
  return row!.value;
}

export async function updateMemberRole(id: number, role: "admin" | "member"): Promise<Result> {
  const { context, member } = await requireMember(id);
  if (member.role === "admin" && role === "member" && (await otherAdmins(context.organization!.id, id)) === 0) return { error: "The workspace needs at least one admin" };
  await db.transaction(async (tx) => {
    // A member who becomes an admin sees every website; one who stops being admin keeps them all until access is narrowed.
    await tx.update(organizationMembers).set({ role, allWebsites: role === "admin" ? true : member.allWebsites, updatedAt: new Date() }).where(eq(organizationMembers.id, id));
    if (role === "admin") await tx.delete(memberWebsiteAccess).where(eq(memberWebsiteAccess.memberId, id));
  });
  refresh();
  return { ok: true };
}

export async function updateMemberAccess(id: number, websiteIds: number[]): Promise<Result> {
  const { context, member } = await requireMember(id);
  if (member.role === "admin") return { error: "Admins have access to all websites" };
  const allowed = await ownSiteIds(context.organization!.id, websiteIds);
  if (!allowed.length) return { error: "Choose at least one website this member can see" };
  const all = await db.select({ id: orgWebsites.id }).from(orgWebsites).where(and(eq(orgWebsites.organizationId, context.organization!.id), eq(orgWebsites.isHidden, false)));
  const everything = all.every((site) => allowed.includes(site.id));
  await db.transaction(async (tx) => {
    await tx.update(organizationMembers).set({ allWebsites: everything, updatedAt: new Date() }).where(eq(organizationMembers.id, id));
    await tx.delete(memberWebsiteAccess).where(eq(memberWebsiteAccess.memberId, id));
    if (!everything) await tx.insert(memberWebsiteAccess).values(allowed.map((orgWebsiteId) => ({ memberId: id, orgWebsiteId })));
  });
  refresh();
  return { ok: true };
}

export async function removeMember(id: number): Promise<Result> {
  const { context, member } = await requireMember(id);
  if (member.userId === context.user.id) return { error: "You can't remove yourself" };
  if (member.role === "admin" && (await otherAdmins(context.organization!.id, id)) === 0) return { error: "The workspace needs at least one admin" };
  await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
  refresh();
  return { ok: true };
}

const INVITE_ERRORS: Record<InviteError["code"], string> = {
  invalid: "This invitation is no longer valid. Ask for a new one.",
  wrongEmail: "This invitation was sent to a different email address.",
  otherWorkspace: "This account already has its own workspace with websites or members. Sign in with the invited email address instead.",
};

/** Accepts an invitation for the signed-in user. */
export async function acceptInvite(token: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Sign in first" };
  try {
    const result = await acceptInvitation(token, { id: session.user.id, email: session.user.email });
    if (result.firstSiteId) (await cookies()).set(SELECTED_SITE_COOKIE, String(result.firstSiteId), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
    else (await cookies()).delete(SELECTED_SITE_COOKIE);
    return { ok: true };
  } catch (error) {
    if (error instanceof InviteError) return { error: INVITE_ERRORS[error.code] };
    throw error;
  }
}
