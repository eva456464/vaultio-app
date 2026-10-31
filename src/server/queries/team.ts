/** Read model for Settings → Members. */
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { memberWebsiteAccess, organizationInvitations, organizationMembers, orgWebsites, user } from "@/db/schema";
import type { AppContext } from "../context";
import { emailConfigured, inviteLink, requestOrigin } from "../invites";

export async function getTeam(context: AppContext) {
  const organization = context.organization!;
  const isAdmin = context.member?.role === "admin";
  const [members, access, invites, sites, origin] = await Promise.all([
    db
      .select({ member: organizationMembers, name: user.name, email: user.email })
      .from(organizationMembers)
      .innerJoin(user, eq(user.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, organization.id))
      .orderBy(asc(organizationMembers.createdAt)),
    db
      .select({ memberId: memberWebsiteAccess.memberId, siteId: memberWebsiteAccess.orgWebsiteId })
      .from(memberWebsiteAccess)
      .innerJoin(organizationMembers, eq(organizationMembers.id, memberWebsiteAccess.memberId))
      .where(eq(organizationMembers.organizationId, organization.id)),
    isAdmin
      ? db
          .select()
          .from(organizationInvitations)
          .where(and(eq(organizationInvitations.organizationId, organization.id), isNull(organizationInvitations.acceptedAt)))
          .orderBy(asc(organizationInvitations.createdAt))
      : Promise.resolve([]),
    db
      .select({ id: orgWebsites.id, url: orgWebsites.url, language: orgWebsites.selectedLanguage })
      .from(orgWebsites)
      .where(and(eq(orgWebsites.organizationId, organization.id), eq(orgWebsites.isHidden, false)))
      .orderBy(asc(orgWebsites.createdAt)),
    requestOrigin(),
  ]);
  const now = new Date();
  return {
    workspaceName: organization.name,
    isAdmin,
    emailEnabled: emailConfigured(),
    sites,
    members: members.map(({ member, name, email }) => ({
      id: member.id,
      name: name || email,
      email,
      role: member.role,
      allWebsites: member.role === "admin" || member.allWebsites,
      websiteIds: access.filter((row) => row.memberId === member.id).map((row) => row.siteId),
      isYou: member.userId === context.user.id,
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      websiteIds: invite.websiteIds,
      expired: invite.expiresAt < now,
      link: inviteLink(origin, invite.token),
    })),
  };
}

export type TeamData = Awaited<ReturnType<typeof getTeam>>;
