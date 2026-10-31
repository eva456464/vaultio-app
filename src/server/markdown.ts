import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/** Markdown to sanitized HTML for articles and AI answers. */
export function renderArticleHtml(markdown: string) {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "alt", "title"], "*": ["id"] },
  });
}
