/** RSS 2.0 feeds of articles: the hosted blog's and the private feed platforms like Duda import. */

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (value: string) => `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

export type FeedItem = { title: string; link: string; publishedAt: Date; description?: string | null; html?: string | null; imageUrl?: string | null; imageAlt?: string | null };

export function rssFeed(channel: { title: string; link: string; description: string; language?: string }, items: FeedItem[]) {
  const body = items
    .map((item) => {
      // Importers (Duda's blog import among them) take the first image as the post's cover.
      const cover = item.imageUrl ? `<p><img src="${esc(item.imageUrl)}" alt="${esc(item.imageAlt ?? item.title)}" /></p>` : "";
      return [
        "<item>",
        `<title>${esc(item.title)}</title>`,
        `<link>${esc(item.link)}</link>`,
        `<guid isPermaLink="true">${esc(item.link)}</guid>`,
        `<pubDate>${item.publishedAt.toUTCString()}</pubDate>`,
        item.description ? `<description>${esc(item.description)}</description>` : "",
        item.html !== undefined && item.html !== null ? `<content:encoded>${cdata(`${cover}${item.html}`)}</content:encoded>` : "",
        item.imageUrl ? `<media:content url="${esc(item.imageUrl)}" medium="image" /><enclosure url="${esc(item.imageUrl)}" type="image/webp" length="0" />` : "",
        "</item>",
      ].join("");
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${esc(channel.title)}</title><link>${esc(channel.link)}</link><description>${esc(channel.description)}</description>${channel.language ? `<language>${esc(channel.language)}</language>` : ""}${body}</channel></rss>`;
}
