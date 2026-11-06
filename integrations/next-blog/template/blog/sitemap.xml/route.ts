import { getAllArticles, getTags, siteUrl } from "__PACKAGE__";

export const revalidate = 86400;

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** /blog/sitemap.xml — submit it in Google Search Console or link it from your main sitemap. */
export async function GET() {
  const base = siteUrl();
  const [articles, tags] = await Promise.all([getAllArticles(), getTags()]);
  const urls = [
    { loc: `${base}/blog`, lastmod: articles[0]?.updatedAt },
    ...articles.map((article) => ({ loc: `${base}/blog/${article.slug}`, lastmod: article.updatedAt })),
    ...tags.map((tag) => ({ loc: `${base}/blog/tag/${tag.slug}`, lastmod: undefined })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${escape(url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
