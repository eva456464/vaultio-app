import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, orgWebsites } from "@/db/schema";
import { rerunAgentJob } from "@/server/agents/queue";
import { siteDay } from "@/server/agents/schedule";
import { getAppContext, SELECTED_SITE_COOKIE } from "@/server/context";
import { exchangeCode, GOOGLE_SYNC_JOBS, verifyState } from "@/server/google/client";

/**
 * Google sends the admin back here after the consent screen. The tokens are stored on the site's
 * GA4 or Search Console integration, then Settings → Analytics opens to pick the property.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const state = verifyState(params.get("state"));
  const back = (query: string) => {
    // The onboarding wizard's Search Console step comes back to the wizard to pick the property.
    const page = state?.returnTo === "onboarding" ? "onboarding/search-console" : "dashboard/settings/analytics";
    const response = NextResponse.redirect(new URL(`/${state?.locale ?? "en"}/${page}?${query}`, request.url));
    // Land on the site the connection was started for, even if another tab switched sites meanwhile.
    if (state) response.cookies.set(SELECTED_SITE_COOKIE, String(state.siteId), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
    return response;
  };

  if (!state) return back("error=state");
  if (params.get("error") || !params.get("code")) return back(`error=denied&product=${state.product}`);
  const context = await getAppContext();
  const allowed = context && context.user.id === state.userId && context.member?.role === "admin" && context.sites.some((site) => site.id === state.siteId);
  if (!allowed) return back("error=state");

  let connection: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    connection = await exchangeCode(params.get("code")!);
  } catch (error) {
    console.error("[google] code exchange failed", (error as Error).message);
    return back(`error=exchange&product=${state.product}`);
  }

  const where = and(eq(integrations.orgWebsiteId, state.siteId), eq(integrations.type, state.product));
  const [existing] = await db.select().from(integrations).where(where);
  // Reconnecting keeps the chosen property, so syncing carries on without another choice.
  const config: Record<string, unknown> = { ...(existing?.config ?? {}), account: connection.account };
  const status = config.propertyId ? "connected" : "pending";
  await db
    .insert(integrations)
    .values({ orgWebsiteId: state.siteId, type: state.product, status, config, credentialsEncrypted: connection.credentials, connectedAt: new Date() })
    .onConflictDoUpdate({
      target: [integrations.orgWebsiteId, integrations.type],
      set: { status, config, credentialsEncrypted: connection.credentials, lastError: null, updatedAt: new Date() },
    });
  if (status === "connected") {
    // Same property as before: catch up now instead of waiting for the next scheduled run.
    const [site] = await db.select({ timeZone: orgWebsites.timeZone }).from(orgWebsites).where(eq(orgWebsites.id, state.siteId));
    const today = siteDay(new Date(), site?.timeZone ?? "UTC");
    for (const job of GOOGLE_SYNC_JOBS[state.product]) await rerunAgentJob(state.siteId, job, today);
  }
  return back(`manage=${state.product}`);
}
