/**
 * Webflow (Data API v2, https://developers.webflow.com/data/reference): items in a CMS collection.
 * The collection's fields are mapped once when connecting (rich text body, summary, cover image).
 */
import { ARTICLE_PARTS, partsForType, type ArticlePart } from "@/lib/webflow-fields";
import { call, describeError, type Delivered, type PostInput, type PublishMode } from "./common";

export { ARTICLE_PARTS, type ArticlePart };

export type WebflowFieldMap = { body: string; summary?: string; image?: string };
/** Field slug → article part, for fields other than name and slug. */
export type WebflowMapping = Record<string, ArticlePart>;
export type WebflowFieldInfo = { slug: string; type: string; name: string; required: boolean };
export type WebflowConfig = {
  siteId: string;
  siteName: string;
  collectionId: string;
  collectionName: string;
  collectionSlug: string;
  baseUrl: string | null;
  fields: WebflowFieldMap;
  /** The owner's own mapping (newer connections); `fields` is the older automatic one. */
  mapping?: WebflowMapping;
  mode: PublishMode;
};
export type WebflowCredentials = { token: string };

const base = () => (process.env.WEBFLOW_API_BASE ?? "https://api.webflow.com/v2").replace(/\/$/, "");
const headers = (token: string) => ({ authorization: `Bearer ${token}`, accept: "application/json", "content-type": "application/json" });

type WebflowError = { message?: string; code?: string; details?: unknown[] };
type Site = { id: string; displayName?: string; shortName?: string; customDomains?: { url?: string }[] };
type Collection = { id: string; displayName?: string; slug?: string };
type Field = { slug: string; type: string; displayName?: string; isRequired?: boolean };

const errorOf = (body: WebflowError | null, status: number) =>
  status === 401 ? "Webflow rejected the API token" : status === 403 ? "The API token needs CMS read & write and Sites read permissions" : (body?.message ?? `Webflow returned HTTP ${status}`);

export type WebflowChoice = { sites: { id: string; name: string; baseUrl: string | null; collections: { id: string; name: string; slug: string }[] }[] };

/** Sites and collections the token can see, for the connect dialog. */
export async function listWebflow(token: string): Promise<{ ok: true; choice: WebflowChoice } | { ok: false; error: string }> {
  try {
    const sites = await call<{ sites?: Site[] } & WebflowError>(`${base()}/sites`, { headers: headers(token) });
    if (sites.status >= 400) return { ok: false, error: errorOf(sites.body, sites.status) };
    const result: WebflowChoice = { sites: [] };
    for (const site of sites.body?.sites ?? []) {
      const collections = await call<{ collections?: Collection[] } & WebflowError>(`${base()}/sites/${site.id}/collections`, { headers: headers(token) });
      const domain = site.customDomains?.[0]?.url;
      result.sites.push({
        id: site.id,
        name: site.displayName ?? site.shortName ?? site.id,
        baseUrl: domain ? `https://${domain.replace(/^https?:\/\//, "")}` : site.shortName ? `https://${site.shortName}.webflow.io` : null,
        collections: (collections.body?.collections ?? []).map((collection) => ({ id: collection.id, name: collection.displayName ?? collection.slug ?? collection.id, slug: collection.slug ?? "" })),
      });
    }
    if (!result.sites.length) return { ok: false, error: "This token can't see any Webflow site" };
    return { ok: true, choice: result };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/** Picks the collection fields for the body, summary and cover image. */
export async function mapWebflowFields(token: string, collectionId: string): Promise<{ ok: true; fields: WebflowFieldMap } | { ok: false; error: string }> {
  const collection = await call<{ fields?: Field[] } & WebflowError>(`${base()}/collections/${collectionId}`, { headers: headers(token) });
  if (collection.status >= 400) return { ok: false, error: errorOf(collection.body, collection.status) };
  const fields = collection.body?.fields ?? [];
  const pick = (type: string, preferred: RegExp) => fields.filter((field) => field.type === type).sort((a, b) => Number(preferred.test(b.slug)) - Number(preferred.test(a.slug)))[0]?.slug;
  const body = pick("RichText", /body|content|post|article/);
  if (!body) return { ok: false, error: "This collection has no Rich Text field for the article body" };
  const known = new Set(["name", "slug", body]);
  const blocking = fields.filter((field) => field.isRequired && !known.has(field.slug) && !["PlainText", "Image"].includes(field.type));
  if (blocking.length) return { ok: false, error: `Make these fields optional in Webflow first: ${blocking.map((field) => field.displayName ?? field.slug).join(", ")}` };
  return { ok: true, fields: { body, summary: pick("PlainText", /summary|excerpt|description|intro|meta/), image: pick("Image", /main|cover|hero|thumbnail|featured|image/) } };
}


/** The collection's fields with a suggested mapping (slug and name are always the article's slug and title). */
export async function webflowFields(token: string, collectionId: string): Promise<{ ok: true; fields: WebflowFieldInfo[]; suggested: WebflowMapping } | { ok: false; error: string }> {
  const collection = await call<{ fields?: Field[] } & WebflowError>(`${base()}/collections/${collectionId}`, { headers: headers(token) });
  if (collection.status >= 400) return { ok: false, error: errorOf(collection.body, collection.status) };
  const fields = (collection.body?.fields ?? []).filter((field) => !["name", "slug"].includes(field.slug)).map((field) => ({ slug: field.slug, type: field.type, name: field.displayName ?? field.slug, required: Boolean(field.isRequired) }));
  const automatic = await mapWebflowFields(token, collectionId);
  const suggested: WebflowMapping = {};
  if (automatic.ok) {
    suggested[automatic.fields.body] = "body";
    if (automatic.fields.summary) suggested[automatic.fields.summary] = "summary";
    if (automatic.fields.image) suggested[automatic.fields.image] = "image";
  }
  // Other fields are suggested by name; the owner can change any of them.
  const byName: [RegExp, ArticlePart][] = [
    [/author|writer|byline/, "author"],
    [/seo-?title|meta-?title|title-?tag/, "metaTitle"],
    [/meta|seo|description/, "metaDescription"],
    [/alt/, "imageAlt"],
    [/keyword|focus/, "keyword"],
    [/publish|date|posted/, "publishedAt"],
  ];
  const taken = new Set(Object.values(suggested));
  for (const field of fields) {
    if (suggested[field.slug]) continue;
    const part = byName.find(([pattern, candidate]) => pattern.test(field.slug) && !taken.has(candidate) && partsForType(field.type).includes(candidate))?.[1];
    if (part) {
      suggested[field.slug] = part;
      taken.add(part);
    }
  }
  return { ok: true, fields, suggested };
}

/** A field map is usable when one Rich Text field gets the body and every required field gets something. */
export function checkWebflowMapping(fields: WebflowFieldInfo[], mapping: WebflowMapping): string | null {
  const known = new Map(fields.map((field) => [field.slug, field]));
  for (const [slug, part] of Object.entries(mapping)) {
    const field = known.get(slug);
    if (!field || !partsForType(field.type).includes(part)) return `"${field?.name ?? slug}" can't receive that`;
  }
  if (!Object.values(mapping).includes("body")) return "Map a Rich Text field to the article body";
  const missing = fields.filter((field) => field.required && !mapping[field.slug]);
  if (missing.length) return `Map the required fields too: ${missing.map((field) => field.name).join(", ")}`;
  return null;
}

export async function deliverWebflow(config: WebflowConfig, credentials: WebflowCredentials, post: PostInput, previous?: { itemId: string }): Promise<Delivered<{ itemId: string }>> {
  try {
    const fieldData: Record<string, unknown> = { name: post.title, slug: post.slug };
    const mapping: WebflowMapping = config.mapping ?? {
      [config.fields.body]: "body",
      ...(config.fields.summary ? { [config.fields.summary]: "summary" as const } : {}),
      ...(config.fields.image ? { [config.fields.image]: "image" as const } : {}),
    };
    const values: Record<ArticlePart, unknown> = {
      body: post.html,
      summary: post.excerpt,
      image: post.heroUrl ? { url: post.heroUrl, alt: post.heroAlt } : undefined,
      imageAlt: post.heroUrl ? post.heroAlt : undefined,
      metaTitle: post.title,
      metaDescription: post.excerpt,
      // An update keeps the original date.
      publishedAt: previous?.itemId ? undefined : new Date().toISOString(),
      author: post.author ?? undefined,
      keyword: post.keyword ?? undefined,
    };
    for (const [slug, part] of Object.entries(mapping)) if (values[part] !== undefined) fieldData[slug] = values[part];
    const live = config.mode === "publish";
    const path = previous?.itemId ? `/collections/${config.collectionId}/items/${previous.itemId}${live ? "/live" : ""}` : `/collections/${config.collectionId}/items${live ? "/live" : ""}`;
    const result = await call<{ id?: string } & WebflowError>(`${base()}${path}`, {
      method: previous?.itemId ? "PATCH" : "POST",
      headers: headers(credentials.token),
      body: JSON.stringify({ isArchived: false, isDraft: !live, fieldData }),
    });
    if (result.status >= 400 || !result.body?.id) return { ok: false, error: errorOf(result.body, result.status) };
    const url = live && config.baseUrl && config.collectionSlug ? `${config.baseUrl}/${config.collectionSlug}/${post.slug}` : null;
    return { ok: true, url, delivery: { itemId: result.body.id } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
