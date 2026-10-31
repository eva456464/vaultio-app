import { requireBlog } from "@/server/hosted-blog-page";

export async function GET(_request: Request, { params }: RouteContext<"/hosted-blog/[host]/robots.txt">) {
  const blog = await requireBlog((await params).host);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${blog.origin}/sitemap.xml\n`, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
