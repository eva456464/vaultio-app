import { allBlogArticles } from "@/server/hosted-blog";
import { blogTranslator, requireBlog } from "@/server/hosted-blog-page";
import { rssFeed } from "@/server/publishing/rss";

export async function GET(_request: Request, { params }: RouteContext<"/hosted-blog/[host]/rss.xml">) {
  const blog = await requireBlog((await params).host);
  const rows = (await allBlogArticles(blog.site.id)).slice(0, 50);
  const title = blogTranslator()("rssTitle", { name: blog.name });
  const xml = rssFeed(
    { title, link: `${blog.origin}/`, description: blog.site.description ?? title },
    rows.map((row) => ({ title: row.title, link: `${blog.origin}/${row.slug}`, publishedAt: row.publishedAt!, description: row.metaDescription })),
  );
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
