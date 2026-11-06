"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { emailPreferences, userSettings } from "@/db/schema";
import { locales } from "@/i18n/routing";
import { cancelDeletion, DeletionBlocked, requestDeletion } from "../account";
import { getAppContext, getSession } from "../context";

type Result = { ok: true } | { error: string };

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Sign in first");
  return session.user;
}

/** Schedules the account for deletion in 14 days (the caller signs the user out). */
export async function requestAccountDeletion(): Promise<{ ok: true; deleteOn: string } | { error: string }> {
  const user = await requireUser();
  try {
    const deleteOn = await requestDeletion(user.id);
    return { ok: true, deleteOn: deleteOn.toISOString() };
  } catch (error) {
    if (error instanceof DeletionBlocked) return { error: error.message };
    throw error;
  }
}

export async function cancelAccountDeletion(): Promise<Result> {
  const user = await requireUser();
  await cancelDeletion(user.id);
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

/** Saves the dashboard language; the client then switches to that locale. */
export async function setDashboardLanguage(locale: string): Promise<Result> {
  const user = await requireUser();
  if (!(locales as readonly string[]).includes(locale)) return { error: "Unknown language" };
  await db
    .insert(userSettings)
    .values({ userId: user.id, platformLanguage: locale })
    .onConflictDoUpdate({ target: userSettings.userId, set: { platformLanguage: locale, updatedAt: new Date() } });
  return { ok: true };
}

/** Settings → Account → Notifications: the weekly progress email for one website. */
export async function setWeeklyEmail(siteId: number, enabled: boolean) {
  const context = await getAppContext();
  if (!context) throw new Error("Not signed in");
  if (!context.sites.some((site) => site.id === siteId)) throw new Error("Website not found");
  await db
    .insert(emailPreferences)
    .values({ userId: context.user.id, orgWebsiteId: siteId, weeklyProgress: enabled })
    .onConflictDoUpdate({ target: [emailPreferences.userId, emailPreferences.orgWebsiteId], set: { weeklyProgress: enabled, updatedAt: new Date() } });
  revalidatePath("/[locale]/dashboard/settings/account", "page");
  return { ok: true as const };
}
