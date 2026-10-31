/** Account deletion: requested from Profile, carried out 14 days later by the scheduler. */
import { and, count, eq, inArray, isNotNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { organizationMembers, organizations, subscriptions, user, userSettings } from "@/db/schema";
import { LIVE_STATUSES } from "@/lib/billing";
import { billingEnabled, stripe } from "./billing/stripe";

export const DELETION_GRACE_DAYS = 14;

export class DeletionBlocked extends Error {}

/** Marks the account for deletion. A workspace's only admin must hand over admin rights first. */
export async function requestDeletion(userId: string) {
  const memberships = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  for (const membership of memberships) {
    if (membership.role !== "admin") continue;
    const [[others], [otherAdmins]] = await Promise.all([
      db.select({ value: count() }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, membership.organizationId), ne(organizationMembers.userId, userId))),
      db
        .select({ value: count() })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, membership.organizationId), ne(organizationMembers.userId, userId), eq(organizationMembers.role, "admin"))),
    ]);
    if (others!.value > 0 && otherAdmins!.value === 0) throw new DeletionBlocked("Make another member an admin first, so the workspace keeps an admin.");
  }
  const now = new Date();
  await db.insert(userSettings).values({ userId, deletionRequestedAt: now }).onConflictDoUpdate({ target: userSettings.userId, set: { deletionRequestedAt: now, updatedAt: now } });
  return new Date(now.getTime() + DELETION_GRACE_DAYS * 86_400_000);
}

export async function cancelDeletion(userId: string) {
  await db.update(userSettings).set({ deletionRequestedAt: null, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
}

/**
 * Deletes accounts whose grace period is over. A workspace the user ran alone is deleted with them
 * (websites and all their data); its Stripe subscriptions are cancelled first.
 */
export async function purgeDeletedAccounts(now = new Date()) {
  const cutoff = new Date(now.getTime() - DELETION_GRACE_DAYS * 86_400_000);
  const due = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(and(isNotNull(userSettings.deletionRequestedAt), lt(userSettings.deletionRequestedAt, cutoff)));
  for (const { userId } of due) {
    const memberships = await db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(eq(organizationMembers.userId, userId));
    for (const { organizationId } of memberships) {
      const [members] = await db.select({ value: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
      if (members!.value > 1) continue;
      if (billingEnabled()) {
        const live = await db
          .select({ id: subscriptions.stripeSubscriptionId })
          .from(subscriptions)
          .where(and(eq(subscriptions.organizationId, organizationId), inArray(subscriptions.status, [...LIVE_STATUSES, "past_due", "paused"] as ("active" | "trialing" | "past_due" | "paused")[])));
        for (const { id } of live) if (id) await stripe().subscriptions.cancel(id).catch((error) => console.error(`[account] could not cancel ${id}:`, (error as Error).message));
      }
      await db.delete(organizations).where(eq(organizations.id, organizationId));
    }
    await db.delete(user).where(eq(user.id, userId));
  }
  return due.length;
}
