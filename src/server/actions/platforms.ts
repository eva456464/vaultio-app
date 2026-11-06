"use server";

import { randomBytes } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { integrations, whitelabelConfigs, type IntegrationType } from "@/db/schema";
import { getAppContext } from "../context";
import { storeImage } from "../media";
import type { BlogConfig } from "../hosted-blog";
import { encryptJson, sha256 } from "../crypto";
import { requestOrigin } from "../invites";
import { dudaFeedUrl } from "../publishing/feeds";
import { normalizeStoreHash, verifyBigCommerce, verifyWebdav } from "../publishing/platforms/bigcommerce";
import type { PublishMode } from "../publishing/platforms/common";
import { findGhostAuthor, verifyGhost } from "../publishing/platforms/ghost";
import { inspectGhl, type GhlChoice } from "../publishing/platforms/gohighlevel";
import { inspectShopify, normalizeShop, type ShopifyChoice, type ShopifyCredentials } from "../publishing/platforms/shopify";
import { ARTICLE_PARTS, checkWebflowMapping, listWebflow, mapWebflowFields, webflowFields, type WebflowChoice, type WebflowMapping } from "../publishing/platforms/webflow";
import { verifyWix } from "../publishing/platforms/wix";
import { checkHostingDomain, connectHostingDomain, disconnectHostingDomain, normalizeDomain, platformHosts } from "../whitelabel/domains";

type Result = { ok: true } | { error: string };
const PLATFORM_TYPES = ["ghost", "webflow", "shopify", "wix", "bigcommerce", "gohighlevel", "wordpress_com"] as const;
type PlatformType = (typeof PLATFORM_TYPES)[number];

async function requireAdminSite() {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can change publishing");
  return context.site;
}

const refresh = () => revalidatePath("/[locale]/dashboard/settings/publishing", "page");
const mode = z.enum(["publish", "draft"]);

async function store(siteId: number, type: IntegrationType, config: Record<string, unknown>, credentials: unknown) {
  const values = { status: "connected" as const, config, credentialsEncrypted: encryptJson(credentials), lastError: null, connectedAt: new Date(), updatedAt: new Date() };
  await db
    .insert(integrations)
    .values({ orgWebsiteId: siteId, type, ...values })
    .onConflictDoUpdate({ target: [integrations.orgWebsiteId, integrations.type], set: values });
  refresh();
}

const httpsUrl = z
  .string()
  .trim()
  .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname) || url.hostname.endsWith(".test");
    } catch {
      return false;
    }
  }, "Enter your site's address, e.g. https://blog.example.com")
  .transform((value) => new URL(value).origin);

// ------------------------------------------------------------------ Ghost

const ghostSchema = z.object({
  siteUrl: httpsUrl,
  adminKey: z.string().trim().regex(/^[0-9a-f]{12,}:[0-9a-f]{32,}$/i, "Paste the Admin API key (it looks like 6489…:a1b2…)"),
  authorEmail: z.union([z.literal(""), z.string().trim().email("Enter the email of a Ghost staff user")]).optional(),
  mode,
});

export async function connectGhost(input: z.input<typeof ghostSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = ghostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const check = await verifyGhost(parsed.data.siteUrl, parsed.data.adminKey);
  if (!check.ok) return { error: check.error };
  const author = parsed.data.authorEmail ? await findGhostAuthor(parsed.data.siteUrl, parsed.data.adminKey, parsed.data.authorEmail) : null;
  if (author && !author.ok) return { error: author.error };
  await store(
    site.id,
    "ghost",
    { siteUrl: parsed.data.siteUrl, mode: parsed.data.mode, siteTitle: check.siteTitle, authorId: author?.ok ? author.id : null, authorName: author?.ok ? author.name : null },
    { adminKey: parsed.data.adminKey },
  );
  return { ok: true };
}

// ------------------------------------------------------------------ Webflow

const tokenSchema = z.string().trim().min(20, "Paste the full API token");

export async function loadWebflowSites(token: string): Promise<{ ok: true; choice: WebflowChoice } | { error: string }> {
  await requireAdminSite();
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const result = await listWebflow(parsed.data);
  return result.ok ? result : { error: result.error };
}

/** The collection's fields and a suggested mapping, for the wizard's "Map your collection fields" step. */
export async function loadWebflowFields(token: string, collectionId: string) {
  await requireAdminSite();
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const result = await webflowFields(parsed.data, collectionId);
  return result.ok ? result : { error: result.error };
}

const webflowSchema = z.object({
  token: tokenSchema,
  siteId: z.string().min(1, "Choose a site"),
  collectionId: z.string().min(1, "Choose the blog collection"),
  mode,
  mapping: z.record(z.string(), z.enum(ARTICLE_PARTS)).optional(),
});

export async function connectWebflow(input: z.input<typeof webflowSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = webflowSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const sites = await listWebflow(parsed.data.token);
  if (!sites.ok) return { error: sites.error };
  const chosen = sites.choice.sites.find((entry) => entry.id === parsed.data.siteId);
  const collection = chosen?.collections.find((entry) => entry.id === parsed.data.collectionId);
  if (!chosen || !collection) return { error: "Choose a site and collection from the list" };
  // The owner's mapping when given (checked against the collection), else the automatic one.
  let mapping: WebflowMapping | undefined;
  if (parsed.data.mapping) {
    const available = await webflowFields(parsed.data.token, collection.id);
    if (!available.ok) return { error: available.error };
    const problem = checkWebflowMapping(available.fields, parsed.data.mapping);
    if (problem) return { error: problem };
    mapping = parsed.data.mapping;
  }
  const fields = await mapWebflowFields(parsed.data.token, collection.id);
  if (!fields.ok && !mapping) return { error: fields.error };
  const body = mapping ? Object.entries(mapping).find(([, part]) => part === "body")![0] : "";
  await store(
    site.id,
    "webflow",
    {
      siteId: chosen.id,
      siteName: chosen.name,
      baseUrl: chosen.baseUrl,
      collectionId: collection.id,
      collectionName: collection.name,
      collectionSlug: collection.slug,
      fields: fields.ok ? fields.fields : { body },
      ...(mapping ? { mapping } : {}),
      mode: parsed.data.mode,
    },
    { token: parsed.data.token },
  );
  return { ok: true };
}

// ------------------------------------------------------------------ Shopify

const shopifyCredentialsSchema = z
  .object({
    shop: z.string().transform((value, context) => {
      const shop = normalizeShop(value);
      if (!shop) context.addIssue({ code: "custom", message: "Enter your store's .myshopify.com address" });
      return shop ?? "";
    }),
    clientId: z.string().trim().optional(),
    clientSecret: z.string().trim().optional(),
    accessToken: z.string().trim().optional(),
  })
  .refine((value) => value.accessToken || (value.clientId && value.clientSecret), "Paste the app's Client ID and Client secret");

const shopifyCredentials = (input: z.output<typeof shopifyCredentialsSchema>): ShopifyCredentials =>
  input.accessToken ? { accessToken: input.accessToken } : { clientId: input.clientId, clientSecret: input.clientSecret };

export async function loadShopifyBlogs(input: z.input<typeof shopifyCredentialsSchema>): Promise<{ ok: true; choice: ShopifyChoice } | { error: string }> {
  await requireAdminSite();
  const parsed = shopifyCredentialsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const result = await inspectShopify(parsed.data.shop, shopifyCredentials(parsed.data));
  return result.ok ? result : { error: result.error };
}

const shopifySchema = z.object({ credentials: shopifyCredentialsSchema, blogId: z.string().min(1, "Choose a blog"), author: z.string().trim().max(60), mode });

export async function connectShopify(input: z.input<typeof shopifySchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = shopifySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const credentials = shopifyCredentials(parsed.data.credentials);
  const result = await inspectShopify(parsed.data.credentials.shop, credentials);
  if (!result.ok) return { error: result.error };
  const blog = result.choice.blogs.find((entry) => entry.id === parsed.data.blogId);
  if (!blog) return { error: "Choose a blog from the list" };
  await store(
    site.id,
    "shopify",
    { shop: parsed.data.credentials.shop, blogId: blog.id, blogTitle: blog.title, blogHandle: blog.handle, storeUrl: result.choice.storeUrl, author: parsed.data.author || result.choice.shopName, mode: parsed.data.mode },
    credentials,
  );
  return { ok: true };
}

// ------------------------------------------------------------------ Wix

const wixSchema = z.object({
  siteId: z.string().transform((value, context) => {
    // Accepts the bare ID or the whole dashboard URL it appears in.
    const id = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (!id) context.addIssue({ code: "custom", message: "Paste the Site ID from your Wix dashboard address" });
    return id?.toLowerCase() ?? "";
  }),
  apiKey: z.string().trim().min(20, "Paste the full API key"),
  mode,
});

export async function connectWix(input: z.input<typeof wixSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = wixSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const check = await verifyWix(parsed.data.siteId, { apiKey: parsed.data.apiKey });
  if (!check.ok) return { error: check.error };
  await store(site.id, "wix", { siteId: parsed.data.siteId, memberId: check.memberId, mode: parsed.data.mode }, { apiKey: parsed.data.apiKey });
  return { ok: true };
}

// ------------------------------------------------------------------ BigCommerce

const bigCommerceSchema = z.object({
  storeHash: z.string().transform((value, context) => {
    const hash = normalizeStoreHash(value);
    if (!hash) context.addIssue({ code: "custom", message: "Paste the store hash (the letters after /stores/ in the API path)" });
    return hash ?? "";
  }),
  accessToken: z.string().trim().min(20, "Paste the API account's access token"),
  author: z.string().trim().max(60),
  webdav: z
    .object({ url: z.string().trim(), username: z.string().trim(), password: z.string() })
    .optional()
    .transform((value) => (value?.url && value.username && value.password ? value : undefined)),
  mode,
});

export async function connectBigCommerce(input: z.input<typeof bigCommerceSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = bigCommerceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const check = await verifyBigCommerce(parsed.data.storeHash, parsed.data.accessToken);
  if (!check.ok) return { error: check.error };
  let webdav = parsed.data.webdav;
  if (webdav) {
    const url = httpsUrl.safeParse(webdav.url.replace(/\/dav\/?$/i, ""));
    if (!url.success) return { error: "Enter the WebDAV address shown in BigCommerce (Server Settings → File Access)" };
    webdav = { ...webdav, url: `${url.data}/dav` };
    const failed = await verifyWebdav(webdav);
    if (failed) return { error: failed };
  }
  await store(
    site.id,
    "bigcommerce",
    { storeHash: parsed.data.storeHash, storeUrl: check.storeUrl, storeName: check.storeName, author: parsed.data.author, mode: parsed.data.mode, coverImages: Boolean(webdav) },
    { accessToken: parsed.data.accessToken, webdav },
  );
  return { ok: true };
}

// ------------------------------------------------------------------ GoHighLevel

const ghlCredentialsSchema = z.object({
  locationId: z.string().trim().regex(/^[A-Za-z0-9]{10,40}$/, "Paste the sub-account's Location ID (Settings → Business Profile)"),
  token: z.string().trim().min(20, "Paste the Private Integration token"),
});

export async function loadGhlBlogs(input: z.input<typeof ghlCredentialsSchema>): Promise<{ ok: true; choice: GhlChoice } | { error: string }> {
  await requireAdminSite();
  const parsed = ghlCredentialsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const result = await inspectGhl(parsed.data.locationId, parsed.data.token);
  return result.ok ? result : { error: result.error };
}

const ghlSchema = z.object({
  credentials: ghlCredentialsSchema,
  blogId: z.string().min(1, "Choose a blog"),
  authorId: z.string().optional(),
  categoryIds: z.array(z.string()).max(10).default([]),
  mode,
});

export async function connectGhl(input: z.input<typeof ghlSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = ghlSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { locationId, token } = parsed.data.credentials;
  const result = await inspectGhl(locationId, token);
  if (!result.ok) return { error: result.error };
  const blog = result.choice.blogs.find((entry) => entry.id === parsed.data.blogId);
  if (!blog) return { error: "Choose a blog from the list" };
  const author = result.choice.authors.find((entry) => entry.id === parsed.data.authorId);
  const categories = result.choice.categories.filter((entry) => parsed.data.categoryIds.includes(entry.id));
  await store(
    site.id,
    "gohighlevel",
    { locationId, blogId: blog.id, blogName: blog.name, authorId: author?.id ?? null, authorName: author?.name ?? null, categoryIds: categories.map((entry) => entry.id), categoryNames: categories.map((entry) => entry.name), mode: parsed.data.mode },
    { token },
  );
  return { ok: true };
}

// ------------------------------------------------------------------ Duda (RSS feed Duda imports)

/** Creates the website's Duda feed, or replaces its key (the old address stops working). Returns the feed address once. */
export async function setupDudaFeed(): Promise<{ ok: true; feedUrl: string } | { error: string }> {
  const site = await requireAdminSite();
  const token = randomBytes(20).toString("hex");
  const origin = await requestOrigin();
  await store(site.id, "duda", { tokenHash: sha256(token), origin, createdAt: new Date().toISOString() }, { token });
  return { ok: true, feedUrl: dudaFeedUrl(origin, token) };
}

// ------------------------------------------------------------------ Shared

/** "Publish immediately" or "Save as draft" for a connected platform. */
export async function setPublishMode(type: PlatformType, next: PublishMode): Promise<Result> {
  const site = await requireAdminSite();
  if (!PLATFORM_TYPES.includes(type) || !mode.safeParse(next).success) return { error: "Unknown option" };
  const [connection] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, type)));
  if (!connection) return { error: "Connect the platform first" };
  await db
    .update(integrations)
    .set({ config: { ...(connection.config as Record<string, unknown>), mode: next }, updatedAt: new Date() })
    .where(eq(integrations.id, connection.id));
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ Hosted blog

const blogSchema = z.object({ domain: z.string(), displayName: z.string().trim().max(60, "Keep the name under 60 characters") });

async function checkBlogDomain(domain: string, connect: boolean) {
  try {
    const check = connect ? await connectHostingDomain(domain) : await checkHostingDomain(domain);
    return { verified: check.verified, records: check.records, error: check.error, checkedAt: new Date().toISOString() };
  } catch (error) {
    console.error("[hosted blog] domain check failed:", (error as Error).message);
    return { verified: false, records: [], error: "The domain couldn't be checked right now. Try again in a minute.", checkedAt: new Date().toISOString() };
  }
}

/** Sets up (or changes) the blog Vaultio hosts on the client's subdomain. */
export async function setupHostedBlog(input: z.input<typeof blogSchema>): Promise<Result> {
  const site = await requireAdminSite();
  const parsed = blogSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const domain = normalizeDomain(parsed.data.domain);
  if (!domain) return { error: "Enter the blog address as a name like blog.example.com" };
  if (platformHosts().has(domain)) return { error: "That domain belongs to the platform. Use one of your own." };
  const [agency] = await db.select({ id: whitelabelConfigs.id }).from(whitelabelConfigs).where(eq(whitelabelConfigs.domain, domain));
  const [other] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(and(eq(integrations.type, "hosted_blog"), sql`${integrations.config}->>'domain' = ${domain}`, ne(integrations.orgWebsiteId, site.id)));
  if (agency || other) return { error: "This domain is already used by another website or workspace." };

  const [current] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "hosted_blog")));
  const previous = current?.config as BlogConfig | undefined;
  if (previous?.domain && previous.domain !== domain) await disconnectHostingDomain(previous.domain);
  const status = previous?.domain === domain ? { verified: Boolean(previous.verified), records: previous.records ?? [], error: previous.error ?? null, checkedAt: previous.checkedAt ?? null } : await checkBlogDomain(domain, true);
  const config: BlogConfig = { domain, displayName: parsed.data.displayName || site.brandName || "", ...status };
  const values = { status: status.verified ? ("connected" as const) : ("pending" as const), config, lastError: null, connectedAt: status.verified ? new Date() : null, updatedAt: new Date() };
  await db.insert(integrations).values({ orgWebsiteId: site.id, type: "hosted_blog", ...values }).onConflictDoUpdate({ target: [integrations.orgWebsiteId, integrations.type], set: values });
  refresh();
  return { ok: true };
}

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** The hosted blog's logo (uploaded, or removed to use the website's). */
export async function updateHostedBlogLook(form: FormData): Promise<Result> {
  const site = await requireAdminSite();
  const [current] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "hosted_blog")));
  const config = current?.config as BlogConfig | undefined;
  if (!current || !config?.domain) return { error: "Set up the blog first" };
  let logoUrl = config.logoUrl ?? null;
  if (form.get("removeLogo") === "1") logoUrl = null;
  const file = form.get("logo");
  if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) return { error: "Use a PNG, JPEG or WebP image" };
    if (file.size > 2 * 1024 * 1024) return { error: "The logo must be smaller than 2 MB" };
    const stored = await storeImage({ siteId: site.id, kind: "upload", bytes: Buffer.from(await file.arrayBuffer()) });
    logoUrl = stored.url;
  }
  await db
    .update(integrations)
    .set({ config: { ...config, logoUrl }, updatedAt: new Date() })
    .where(eq(integrations.id, current.id));
  refresh();
  return { ok: true };
}

/** Checks the blog's DNS again. */
export async function checkHostedBlog(): Promise<Result> {
  const site = await requireAdminSite();
  const [current] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "hosted_blog")));
  const config = current?.config as BlogConfig | undefined;
  if (!current || !config?.domain) return { error: "Set up the blog first" };
  const status = await checkBlogDomain(config.domain, false);
  await db
    .update(integrations)
    .set({ status: status.verified ? "connected" : "pending", config: { ...config, ...status, records: status.records.length ? status.records : (config.records ?? []) }, connectedAt: status.verified ? (current.connectedAt ?? new Date()) : null, updatedAt: new Date() })
    .where(eq(integrations.id, current.id));
  refresh();
  return { ok: true };
}

/** Removes the hosted blog (and its domain from the hosting provider). */
export async function removeHostedBlog(): Promise<Result> {
  const site = await requireAdminSite();
  const [current] = await db.select().from(integrations).where(and(eq(integrations.orgWebsiteId, site.id), eq(integrations.type, "hosted_blog")));
  const config = current?.config as BlogConfig | undefined;
  if (config?.domain) await disconnectHostingDomain(config.domain);
  if (current) await db.delete(integrations).where(eq(integrations.id, current.id));
  refresh();
  return { ok: true };
}
