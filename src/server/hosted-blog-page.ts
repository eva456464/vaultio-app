/** Shared lookups for the hosted blog pages: the blog for this request, guarded by the Host header. */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import { blogForHost } from "./hosted-blog";

export const blogTranslator = () => createTranslator({ locale: "en", messages: en, namespace: "hostedBlog" });

/** The blog for the [host] segment; 404 unless the request really arrived on that host. */
export async function requireBlog(hostParam: string) {
  const host = decodeURIComponent(hostParam).toLowerCase();
  const requestHeaders = await headers();
  const requestHost = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").split(":")[0]!.toLowerCase();
  if (requestHost !== host) notFound();
  const blog = await blogForHost(host);
  if (!blog) notFound();
  const name = blog.config.displayName || blog.site.brandName || new URL(blog.site.url).hostname;
  return { ...blog, host, name, origin: `https://${host}`, accent: /^#[0-9a-f]{6}$/i.test(blog.site.brandColor ?? "") ? blog.site.brandColor! : "#111827" };
}
