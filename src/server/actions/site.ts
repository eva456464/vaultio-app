"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAppContext, SELECTED_SITE_COOKIE } from "../context";

/** Switches the site shown in the dashboard and opens its overview. */
export async function selectSite(siteId: number, locale: string) {
  const context = await getAppContext();
  if (!context?.sites.some((site) => site.id === siteId)) throw new Error("Site not found");
  (await cookies()).set(SELECTED_SITE_COOKIE, String(siteId), {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(`/${locale}/dashboard/overview`);
}
