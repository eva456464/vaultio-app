"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys, articles, integrations, orgWebsites } from "@/db/schema";
import { getAppContext } from "../context";
import { decryptJson, encryptJson, newApiKey } from "../crypto";
import { deliverWebhook, publishArticle, webhookPayload, type DeliveryResult } from "../publishing/publish";

async function requireAdminSite() {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can change publishing");
  return context.site;
}

const refresh = () => revalidatePath("/[locale]/dashboard/settings/publishing", "page");

/** Who a content-API key is for: the API card itself, or a platform that reads through it. */
const KEY_SOURCES = ["api", "framer", "lovable"] as const;
export type ApiKeySource = (typeof KEY_SOURCES)[number];
const activeKeys = (siteId: number, source: ApiKeySource) => and(eq(apiKeys.orgWebsiteId, siteId), eq(apiKeys.source, source), isNull(apiKeys.revokedAt));

/** A new key for one source (its previous key stops working). The key is shown once. */
export async function generateApiKey(source: ApiKeySource = "api") {
  const site = await requireAdminSite();
  if (!KEY_SOURCES.includes(source)) throw new Error("Unknown key");
  const key = newApiKey();
  await db.transaction(async (tx) => {
    await tx.update(apiKeys).set({ revokedAt: new Date() }).where(activeKeys(site.id, source));
    await tx.insert(apiKeys).values({ orgWebsiteId: site.id, keyHash: key.hash, keyPrefix: key.prefix, source });
  });
  refresh();
  return { key: key.raw };
}

export async function revokeApiKey(source: ApiKeySource = "api") {
  const site = await requireAdminSite();
  if (!KEY_SOURCES.includes(source)) throw new Error("Unknown key");
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(activeKeys(site.id, source));
  refresh();
}

const isLocal = (url: URL) => ["localhost", "127.0.0.1"].includes(url.hostname) || url.hostname.endsWith(".test");
const endpoint = z.string().trim().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && isLocal(url));
  } catch {
    return false;
  }
}, "Use an https:// URL");

const webhookSchema = z.object({ url: endpoint, token: z.string().min(8, "The token needs at least 8 characters") });

export async function saveWebhook(input: { url: string; token: string }) {
  const site = await requireAdminSite();
  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  await db
    .insert(integrations)
    .values({ orgWebsiteId: site.id, type: "webhook", status: "pending", config: { url: parsed.data.url }, credentialsEncrypted: encryptJson({ token: parsed.data.token }) })
    .onConflictDoUpdate({
      target: [integrations.orgWebsiteId, integrations.type],
      set: { status: "pending", config: { url: parsed.data.url }, credentialsEncrypted: encryptJson({ token: parsed.data.token }), lastError: null, updatedAt: new Date() },
    });
  refresh();
  return { ok: true };
}

/** Sends the latest article (or a sample) to the webhook without marking anything as published. */
export async function testWebhook(): Promise<DeliveryResult> {
  const site = await requireAdminSite();
  const [connection] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "webhook")));
  if (!connection?.credentialsEncrypted) return { ok: false, error: "Save the webhook first" };
  const [latest] = await db.select().from(articles).where(eq(articles.orgWebsiteId, site.id)).orderBy(desc(articles.createdAt)).limit(1);
  const payload = latest
    ? webhookPayload(latest, site)
    : { id: 0, title: "Test article from Vaultio", slug: "test-article-from-vaultio", content_html: "<p>Webhook test.</p>", content_markdown: "Webhook test.", languageCode: site.selectedLanguage, createdAt: new Date().toISOString() };
  const result = await deliverWebhook((connection.config as { url: string }).url, decryptJson(connection.credentialsEncrypted), payload);
  await db
    .update(integrations)
    .set(result.ok ? { status: "connected", lastError: null, connectedAt: new Date(), updatedAt: new Date() } : { status: "error", lastError: result.error, updatedAt: new Date() })
    .where(eq(integrations.id, connection.id));
  refresh();
  return result;
}

const wordpressSchema = z.object({
  siteUrl: endpoint,
  username: z.string().trim().min(1, "Enter the WordPress username"),
  appPassword: z.string().trim().min(16, "Paste the application password from your WordPress profile"),
});

/** Checks the credentials against the WordPress REST API, then stores them encrypted. */
export async function saveWordpress(input: { siteUrl: string; username: string; appPassword: string }) {
  const site = await requireAdminSite();
  const parsed = wordpressSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { siteUrl, username, appPassword } = parsed.data;
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { authorization: `Basic ${Buffer.from(`${username}:${appPassword.replace(/\s+/g, "")}`).toString("base64")}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 401 || response.status === 403) return { error: "WordPress rejected the username or application password" };
    if (!response.ok) return { error: `WordPress returned HTTP ${response.status}. Check the site URL and that the REST API is enabled.` };
  } catch (error) {
    return { error: `Could not reach WordPress: ${(error as Error).message}` };
  }
  const credentials = encryptJson({ username, appPassword });
  await db
    .insert(integrations)
    .values({ orgWebsiteId: site.id, type: "wordpress", status: "pending", config: { siteUrl }, credentialsEncrypted: credentials })
    .onConflictDoUpdate({
      target: [integrations.orgWebsiteId, integrations.type],
      set: { status: "pending", config: { siteUrl }, credentialsEncrypted: credentials, lastError: null, updatedAt: new Date() },
    });
  refresh();
  return { ok: true };
}

const DISCONNECTABLE = ["webhook", "wordpress", "ghost", "webflow", "shopify", "wix", "bigcommerce", "gohighlevel", "duda", "hosted_blog"] as const;

export async function disconnectIntegration(type: (typeof DISCONNECTABLE)[number]) {
  const site = await requireAdminSite();
  if (!DISCONNECTABLE.includes(type)) throw new Error("Unknown integration");
  await db.delete(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, type)));
  refresh();
}

export async function setAutoPublish(enabled: boolean) {
  const site = await requireAdminSite();
  await db.update(orgWebsites).set({ autoPublish: enabled, updatedAt: new Date() }).where(eq(orgWebsites.id, site.id));
  refresh();
}

/** "Publish now" on an article that is written but not live yet. */
export async function publishNow(articleId: number) {
  const site = await requireAdminSite();
  const result = await publishArticle(site.id, articleId);
  revalidatePath("/[locale]/dashboard/articles/[id]", "page");
  revalidatePath("/[locale]/dashboard/content-plan", "page");
  return result;
}
