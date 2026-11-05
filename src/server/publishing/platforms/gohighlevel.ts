/**
 * GoHighLevel (API v2, https://highlevel.stoplight.io/docs/integrations): blog posts in a
 * sub-account's blog, with a Private Integration token ("pit-…") that has the blog scopes.
 */
import { call, describeError, type Delivered, type PostInput, type PublishMode } from "./common";

export type GhlConfig = { locationId: string; blogId: string; blogName: string; authorId: string | null; categoryIds: string[]; mode: PublishMode };
export type GhlCredentials = { token: string };

/** Development only: GOHIGHLEVEL_API_BASE points at a local mock. */
const API = () => process.env.GOHIGHLEVEL_API_BASE?.replace(/\/$/, "") ?? "https://services.leadconnectorhq.com";
const headers = (token: string) => ({ authorization: `Bearer ${token.trim()}`, version: "2021-07-28", accept: "application/json", "content-type": "application/json" });

type GhlError = { message?: string | string[]; error?: string };
const errorOf = (body: GhlError | null, status: number) => {
  if (status === 401) return "GoHighLevel rejected the token. Check it's the Private Integration token (pit-…) of this sub-account.";
  if (status === 403) return "The Private Integration is missing a blog scope (it needs all seven blog scopes)";
  const message = Array.isArray(body?.message) ? body.message.join("; ") : body?.message;
  return message || body?.error || `GoHighLevel returned HTTP ${status}`;
};

type Named = { _id?: string; id?: string; name?: string; label?: string };
const idOf = (item: Named) => item._id ?? item.id ?? "";
/** List responses use different keys per endpoint; take the first array found. */
const listOf = (body: Record<string, unknown> | null) => (Object.values(body ?? {}).find(Array.isArray) as Named[] | undefined) ?? [];

export type GhlChoice = { blogs: { id: string; name: string }[]; authors: { id: string; name: string }[]; categories: { id: string; name: string }[] };

/** The sub-account's blogs, authors and categories (checks the token and Location ID too). */
export async function inspectGhl(locationId: string, token: string): Promise<{ ok: true; choice: GhlChoice } | { ok: false; error: string }> {
  try {
    const query = (extra: Record<string, string>) => new URLSearchParams({ locationId, limit: "50", ...extra });
    const blogs = await call<Record<string, unknown> & GhlError>(`${API()}/blogs/site/all?${query({ skip: "0" })}`, { headers: headers(token) });
    if (blogs.status >= 400) return { ok: false, error: errorOf(blogs.body, blogs.status) };
    const [authors, categories] = await Promise.all([
      call<Record<string, unknown>>(`${API()}/blogs/authors?${query({ offset: "0" })}`, { headers: headers(token) }),
      call<Record<string, unknown>>(`${API()}/blogs/categories?${query({ offset: "0" })}`, { headers: headers(token) }),
    ]);
    // Categories are named by `label`, blogs and authors by `name`.
    const named = (items: Named[]) => items.map((item) => ({ id: idOf(item), name: item.name ?? item.label ?? idOf(item) })).filter((item) => item.id);
    const choice = { blogs: named(listOf(blogs.body)), authors: authors.status < 400 ? named(listOf(authors.body)) : [], categories: categories.status < 400 ? named(listOf(categories.body)) : [] };
    if (!choice.blogs.length) return { ok: false, error: "This sub-account has no blog yet. Create one under Sites → Blogs, then try again." };
    return { ok: true, choice };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/** A slug the blog doesn't use yet (GoHighLevel refuses duplicates). */
async function freeSlug(config: GhlConfig, token: string, slug: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt ? `${slug}-${attempt + 1}` : slug;
    const check = await call<{ exists?: boolean }>(`${API()}/blogs/posts/url-slug-exists?${new URLSearchParams({ urlSlug: candidate, locationId: config.locationId })}`, { headers: headers(token) });
    if (check.status >= 400 || !check.body?.exists) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

type GhlPost = { _id?: string; id?: string; urlSlug?: string };

type GhlDelivery = { postId: string; slug: string; publishedAt?: string };

export async function deliverGhl(config: GhlConfig, credentials: GhlCredentials, post: PostInput, previous?: GhlDelivery): Promise<Delivered<GhlDelivery>> {
  try {
    const slug = previous?.slug ?? (await freeSlug(config, credentials.token, post.slug));
    // An update keeps the post's original date.
    const publishedAt = previous?.publishedAt ?? new Date().toISOString();
    const fields = {
      title: post.title,
      locationId: config.locationId,
      blogId: config.blogId,
      imageUrl: post.heroUrl ?? undefined,
      imageAltText: post.heroUrl ? post.heroAlt : undefined,
      description: post.excerpt,
      rawHTML: post.html,
      status: config.mode === "draft" ? "DRAFT" : "PUBLISHED",
      author: config.authorId ?? undefined,
      categories: config.categoryIds,
      tags: [],
      urlSlug: slug,
      publishedAt,
    };
    const result = previous?.postId
      ? await call<{ data?: GhlPost; blogPost?: GhlPost; updatedBlogPost?: GhlPost } & GhlPost & GhlError>(`${API()}/blogs/posts/${previous.postId}`, { method: "PUT", headers: headers(credentials.token), body: JSON.stringify(fields) })
      : await call<{ data?: GhlPost; blogPost?: GhlPost; updatedBlogPost?: GhlPost } & GhlPost & GhlError>(`${API()}/blogs/posts`, { method: "POST", headers: headers(credentials.token), body: JSON.stringify(fields) });
    if (result.status === 404 && previous?.postId) return deliverGhl(config, credentials, post);
    // Create answers with the post under "data" (or "blogPost"), update under "updatedBlogPost".
    const saved = result.body?.updatedBlogPost ?? result.body?.data ?? result.body?.blogPost ?? result.body;
    const postId = saved?._id ?? saved?.id ?? previous?.postId;
    if (result.status >= 400 || !postId) return { ok: false, error: errorOf(result.body, result.status) };
    // GoHighLevel doesn't return the post's public address (it depends on the funnel or website the blog is on).
    return { ok: true, url: null, delivery: { postId, slug, publishedAt } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
