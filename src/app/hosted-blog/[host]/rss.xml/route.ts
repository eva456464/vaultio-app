import { allBlogArticles } from "@/server/hosted-blog";
import { blogTranslator, requireBlog } from "@/server/hosted-blog-page";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_request: Request, { params }: RouteContext<"/hosted-blog/[host]/rss.xml">) {
  const blog = await requireBlog((await params).host);
  const rows = (await allBlogArticles(blog.site.id)).slice(0, 50);
  const items = rows
    .map((row) => `<item><title>${esc(row.title)}</title><link>${esc(`${blog.origin}/${row.slug}`)}</link><guid>${esc(`${blog.origin}/${row.slug}`)}</guid><pubDate>${row.publishedAt!.toUTCString()}</pubDate>${row.metaDescription ? `<description>${esc(row.metaDescription)}</description>` : ""}</item>`)
    .join("");
  const title = blogTranslator()("rssTitle", { name: blog.name });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(title)}</title><link>${esc(blog.origin)}/</link><description>${esc(blog.site.description ?? title)}</description>${items}</channel></rss>`, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}
