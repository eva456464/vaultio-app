/**
 * Workspace seats: members plus pending invitations. Grow includes one seat (the owner); a website on
 * Scale makes them unlimited. Agencies, unbilled and billing-exempt workspaces have no limit.
 */
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { organizationInvitations, organizationMembers, subscriptions } from "@/db/schema";
import { LIVE_STATUSES, PLAN_SEATS, planOfLookupKey } from "@/lib/billing";
import { billingEnabled } from "./stripe";

type Workspace = { id: number; billingExempt: boolean; isAgency: boolean };

export async function seatLimit(organization: Workspace): Promise<number | null> {
  if (!billingEnabled() || organization.billingExempt || organization.isAgency) return null;
  const plans = await db
    .select({ plan: subscriptions.plan, lookupKey: subscriptions.priceLookupKey, status: subscriptions.status, pausedAt: subscriptions.pausedAt })
    .from(subscriptions)
    .where(and(eq(subscriptions.organizationId, organization.id), eq(subscriptions.type, "main")));
  const live = plans.filter((row) => LIVE_STATUSES.has(row.status) && !row.pausedAt).map((row) => planOfLookupKey(row.lookupKey)?.plan ?? row.plan ?? "grow");
  if (live.some((plan) => PLAN_SEATS[plan] === null)) return null;
  return PLAN_SEATS.grow;
}

export async function seatsUsed(organizationId: number) {
  const [[members], [invites]] = await Promise.all([
    db.select({ n: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId)),
    db
      .select({ n: count() })
      .from(organizationInvitations)
      .where(and(eq(organizationInvitations.organizationId, organizationId), isNull(organizationInvitations.acceptedAt), gt(organizationInvitations.expiresAt, new Date()))),
  ]);
  return (members?.n ?? 0) + (invites?.n ?? 0);
}

export async function workspaceSeats(organization: Workspace) {
  const [limit, used] = await Promise.all([seatLimit(organization), seatsUsed(organization.id)]);
  return { limit, used, full: limit !== null && used >= limit };
}
