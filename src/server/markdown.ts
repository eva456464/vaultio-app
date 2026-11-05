import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type { ArticleBlock } from "@/db/schema";

const BLOCK_MARKER = /<!-- vaultio:block (\d+) -->[\s\S]*?<!-- \/vaultio:block -->/g;
const BLOCK_TOKEN = /<p>VAULTIOBLOCK(\d+)X<\/p>/g;
/** An image alone in its paragraph with a title (its caption from the editor) becomes a figure. */
const CAPTIONED_IMAGE = /<p><img((?:(?! title=)[^>])*) title="([^"]+)"([^>]*?)\s*\/?><\/p>/g;

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeHref = (url: string) => (/^(https?:|tel:|mailto:)/i.test(url) ? esc(url) : "#");

/**
 * Article cards with inline styles, so they look right on any client site and in the dashboard.
 * Built from Vaultio's own block data (text escaped), never from the article's markdown.
 */
function blockHtml(block: ArticleBlock, accent: string) {
  const card = `margin:2em 0;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#fff`;
  const button = `display:inline-block;background:${accent};color:#fff;padding:10px 18px;border-radius:10px;font-weight:600;text-decoration:none`;
  switch (block.kind) {
    case "link":
      return `<aside class="vaultio-cta vaultio-cta-link" style="${card}"><div style="background:${accent};color:#fff;padding:20px 24px"><p style="margin:0;font-size:1.2em;font-weight:700;line-height:1.3">${esc(block.title)}</p></div><div style="padding:16px 24px 20px"><p style="margin:0 0 14px">${esc(block.pitch)}</p><a href="${safeHref(block.buttonUrl)}" style="${button}">${esc(block.buttonLabel)} &rarr;</a></div></aside>`;
    case "contact": {
      const links = [
        block.phone && `<a href="tel:${esc(block.phone.replace(/[^\d+]/g, ""))}" style="${button}">${esc(block.phone)}</a>`,
        block.whatsapp && `<a href="https://wa.me/${esc(block.whatsapp.replace(/\D/g, ""))}" style="${button}">WhatsApp</a>`,
        block.email && `<a href="mailto:${esc(block.email)}" style="${button}">${esc(block.email)}</a>`,
      ].filter(Boolean);
      return `<aside class="vaultio-cta vaultio-cta-contact" style="${card};border-top:4px solid ${accent}"><div style="padding:20px 24px"><p style="margin:0 0 6px;font-size:1.15em;font-weight:700">${esc(block.title)}</p><p style="margin:0 0 14px">${esc(block.pitch)}</p><div style="display:flex;flex-wrap:wrap;gap:8px">${links.join("")}</div></div></aside>`;
    }
    case "map":
      return `<aside class="vaultio-cta vaultio-cta-map" style="${card}"><div style="padding:20px 24px;display:flex;gap:14px;align-items:flex-start"><span aria-hidden="true" style="flex:none;width:40px;height:40px;border-radius:12px;background:${accent};color:#fff;display:grid;place-items:center;font-size:20px">&#9906;</span><div><p style="margin:0 0 4px;font-size:1.15em;font-weight:700">${esc(block.title)}</p><p style="margin:0 0 12px">${esc(block.address)}</p><a href="${safeHref(block.mapsUrl)}" style="${button}">Google Maps &rarr;</a></div></div></aside>`;
    case "product": {
      const image = block.imageUrl && /^https?:\/\//i.test(block.imageUrl)
        ? `<a href="${safeHref(block.url)}" style="flex:none;display:block;width:140px;height:140px;border-radius:12px;overflow:hidden;background:#f3f4f6"><img src="${esc(block.imageUrl)}" alt="${esc(block.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" /></a>`
        : "";
      return `<aside class="vaultio-cta vaultio-product" style="${card}"><div style="padding:20px 24px;display:flex;flex-wrap:wrap;gap:20px;align-items:center">${image}<div style="flex:1;min-width:200px"><p style="margin:0 0 4px;font-size:1.15em;font-weight:700;line-height:1.3"><a href="${safeHref(block.url)}" style="color:inherit;text-decoration:none">${esc(block.name)}</a></p>${block.priceLabel ? `<p style="margin:0 0 8px;font-weight:600;color:${accent}">${esc(block.priceLabel)}</p>` : ""}<p style="margin:0 0 14px">${esc(block.pitch)}</p><a href="${safeHref(block.url)}" style="${button}">${esc(block.buttonLabel)} &rarr;</a></div></div></aside>`;
    }
    case "video":
      return `<figure class="vaultio-video" style="margin:2em 0"><div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/${esc(block.videoId)}" title="${esc(block.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><figcaption style="margin-top:8px;font-size:.9em;color:#6b7280">${esc(block.title)}</figcaption></figure>`;
  }
}

/**
 * Markdown to sanitized HTML for articles and AI answers. With `blocks`, the article's marked
 * CTA and video sections become cards; without them they render as plain markdown.
 */
/** "Table of contents" in the article's language (English when not listed). */
const TOC_TITLES: Record<string, string> = {
  en: "Table of contents", es: "Índice", fr: "Sommaire", de: "Inhaltsverzeichnis", nl: "Inhoudsopgave", pt: "Índice", it: "Indice", pl: "Spis treści",
  sv: "Innehåll", da: "Indhold", no: "Innhold", fi: "Sisällys", cs: "Obsah", sk: "Obsah", ro: "Cuprins", hu: "Tartalomjegyzék", tr: "İçindekiler",
  el: "Περιεχόμενα", ru: "Содержание", uk: "Зміст", ja: "目次", ko: "목차", zh: "目录", ar: "المحتويات", he: "תוכן העניינים", hi: "विषय-सूची",
};

/** Adds ids to the H2 headings and a linked list of them before the first one. */
function withTableOfContents(html: string, language: string) {
  const used = new Set<string>();
  const entries: { id: string; text: string }[] = [];
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_whole, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = text.toLowerCase().replace(/&[a-z#0-9]+;/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
    while (used.has(id)) id = `${id}-2`;
    used.add(id);
    entries.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  if (entries.length < 3) return html;
  const title = TOC_TITLES[language.split("-")[0]!.toLowerCase()] ?? TOC_TITLES.en;
  const nav = `<nav class="vaultio-toc" aria-label="${esc(title)}"><p><strong>${esc(title)}</strong></p><ol>${entries.map((entry) => `<li><a href="#${entry.id}">${entry.text}</a></li>`).join("")}</ol></nav>\n`;
  const first = out.indexOf('<h2 id="');
  return `${out.slice(0, first)}${nav}${out.slice(first)}`;
}

export function renderArticleHtml(markdown: string, options: { blocks?: ArticleBlock[]; accentColor?: string; toc?: string | null } = {}) {
  const blocks = options.blocks ?? [];
  const prepared = blocks.length ? markdown.replace(BLOCK_MARKER, (whole, index: string) => (blocks[Number(index)] ? `\n\nVAULTIOBLOCK${index}X\n\n` : whole)) : markdown;
  const html = marked.parse(prepared, { async: false, gfm: true }) as string;
  const clean = sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "alt", "title", "loading"], p: ["style"], h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], th: ["align"], td: ["align"], "*": ["id"] },
    // Only alignment survives from inline styles (set in the article editor).
    allowedStyles: { "*": { "text-align": [/^(left|center|right)$/] } },
    transformTags: { img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }) },
  }).replace(CAPTIONED_IMAGE, (_whole, before: string, caption: string, after: string) => `<figure><img${before}${after} /><figcaption>${caption}</figcaption></figure>`);
  const accent = options.accentColor && /^#[0-9a-f]{3,8}$/i.test(options.accentColor) ? options.accentColor : "#111827";
  const withCards = blocks.length ? clean.replace(BLOCK_TOKEN, (whole, index: string) => (blocks[Number(index)] ? blockHtml(blocks[Number(index)]!, accent) : whole)) : clean;
  return options.toc ? withTableOfContents(withCards, options.toc) : withCards;
}
