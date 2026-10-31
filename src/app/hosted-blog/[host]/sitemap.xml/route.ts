import { allBlogArticles } from "@/server/hosted-blog";
import { requireBlog } from "@/server/hosted-blog-page";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(_request: Request, { params }: RouteContext<"/hosted-blog/[host]/sitemap.xml">) {
  const blog = await requireBlog((await params).host);
  const rows = await allBlogArticles(blog.site.id);
  const urls = [`<url><loc>${esc(blog.origin)}/</loc></url>`, ...rows.map((row) => `<url><loc>${esc(`${blog.origin}/${row.slug}`)}</loc><lastmod>${(row.updatedAt ?? row.publishedAt)!.toISOString()}</lastmod></url>`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}
