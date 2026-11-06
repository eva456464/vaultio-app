import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { getAppContext, SELECTED_SITE_COOKIE } from "@/server/context";
import { decryptJson, encryptJson } from "@/server/crypto";
import { wpcomExchangeCode, wpcomSite, type WpcomConfig } from "@/server/publishing/platforms/wordpress-com";
import { wpcomRedirectUri } from "@/server/publishing/wpcom-oauth";

type State = { siteId: number; userId: string; locale: string; exp: number };

/** WordPress.com sends the admin back here after approving (or declining) access. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let state: State | null = null;
  try {
    state = decryptJson<State>(params.get("state") ?? "");
  } catch {
    state = null;
  }
  const back = (query: string) => {
    const response = NextResponse.redirect(new URL(`/${state?.locale ?? "en"}/dashboard/settings/publishing?${query}`, request.url));
    if (state) response.cookies.set(SELECTED_SITE_COOKIE, String(state.siteId), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
    return response;
  };
  if (!state || state.exp < Date.now()) return back("wpcom=expired");
  // Declining on WordPress.com connects nothing.
  if (params.get("error") || !params.get("code")) return back("wpcom=declined");
  const context = await getAppContext();
  const allowed = context && context.user.id === state.userId && context.member?.role === "admin" && context.sites.some((site) => site.id === state.siteId);
  if (!allowed) return back("wpcom=expired");

  const token = await wpcomExchangeCode(params.get("code")!, await wpcomRedirectUri());
  if (!token.ok) {
    console.error("[wordpress.com] code exchange failed:", token.error);
    return back("wpcom=failed");
  }
  const site = await wpcomSite(token.token, token.blogId);
  const where = and(eq(integrations.orgWebsiteId, state.siteId), eq(integrations.type, "wordpress_com"));
  const [existing] = await db.select().from(integrations).where(where);
  // Reconnecting keeps the publish setting.
  const config: WpcomConfig = { blogId: token.blogId, blogUrl: site?.url || token.blogUrl, blogName: site?.name || token.blogUrl, mode: (existing?.config as Partial<WpcomConfig> | undefined)?.mode ?? "publish" };
  await db
    .insert(integrations)
    .values({ orgWebsiteId: state.siteId, type: "wordpress_com", status: "connected", config, credentialsEncrypted: encryptJson({ token: token.token }), connectedAt: new Date() })
    .onConflictDoUpdate({ target: [integrations.orgWebsiteId, integrations.type], set: { status: "connected", config, credentialsEncrypted: encryptJson({ token: token.token }), lastError: null, updatedAt: new Date() } });
  return back("wpcom=connected");
}
