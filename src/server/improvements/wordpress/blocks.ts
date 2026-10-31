/**
 * WordPress post content (block editor or classic editor) as a document an improvement can edit
 * without disturbing anything it doesn't change.
 *
 * The post is cut into top-level pieces. Plain paragraphs, plain lists and plain sub-headings become
 * markdown Claude can rewrite. Everything else (images, embeds, tables, FAQ and other plugin blocks,
 * styled or anchored blocks, shortcodes, "more" markers) becomes a [[KEEP-n]] token that goes back
 * byte for byte. Sections are split at H2 headings, like Vaultio's own articles, and a section without
 * an approved rewrite is copied back exactly as it was.
 */
import { type ChildNode, isComment, isTag, isText } from "domhandler";
import { decodeHTML } from "entities";
import { parseDocument } from "htmlparser2";
import { marked, type Token, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import type { ImprovementChange, SafetyFlag } from "@/db/schema";
import type { SplitArticle } from "../sections";

export const ELEMENT_KINDS = ["image", "embed", "table", "quote", "html", "button", "faq", "toc", "separator", "code", "layout", "heading", "text", "more", "block"] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];
export type WordpressElement = { kind: ElementKind; text?: string };

type Piece = {
  raw: string;
  start: number;
  kind: "space" | "text" | "heading" | "element";
  /** text and headings: what Claude reads */
  markdown?: string;
  level?: number;
  /** a heading with an anchor, styling or a level Vaultio doesn't edit: kept exactly as it is */
  fixed?: boolean;
  element?: ElementKind;
  /** inline HTML inside a text piece that markdown can't express (styled spans, images…), kept verbatim */
  inline?: string[];
};

type Section = { start: number; end: number; heading: number | null; pieces: number[] };
export type WordpressDocument = { content: string; blocks: boolean; pieces: Piece[]; sections: Section[] };

const DELIMITER = /<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s+(?:(\{[\s\S]*?\})\s+)?(\/)?-->/g;
const TOKEN = /\[\[KEEP-(\d+)\]\]/g;

export const plainText = (html: string) =>
  decodeHTML(html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
const snippet = (html: string) => {
  const text = plainText(html);
  return text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text;
};

// ---------------------------------------------------------------------------------------------
// HTML → markdown (inline content of one paragraph, list item or heading)

const escapeText = (text: string) => text.replace(/[\\`*_[\]]/g, "\\$&").replace(/</g, "&lt;");

function wrap(marker: string, inner: string) {
  const match = inner.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return match[2] ? `${match[1]}${marker}${match[2]}${marker}${match[3]}` : inner;
}

/** Inline HTML as markdown; anything markdown can't express is kept as raw HTML and listed in `kept`. */
function inlineMarkdown(html: string, kept: string[]) {
  const source = parseDocument(html, { withStartIndices: true, withEndIndices: true });
  const raw = (node: ChildNode) => {
    const text = html.slice(node.startIndex!, node.endIndex! + 1);
    kept.push(text);
    return text;
  };
  const walk = (nodes: ChildNode[]): string =>
    nodes
      .map((node) => {
        if (isText(node)) return escapeText(node.data.replace(/\s+/g, " "));
        if (isComment(node)) return raw(node);
        if (!isTag(node)) return "";
        const plain = Object.keys(node.attribs).length === 0;
        switch (node.name) {
          case "strong":
          case "b":
            return plain ? wrap("**", walk(node.children)) : raw(node);
          case "em":
          case "i":
            return plain ? wrap("*", walk(node.children)) : raw(node);
          case "code":
            return plain && node.children.every(isText) ? `\`${node.children.map((child) => (child as { data: string }).data).join("")}\`` : raw(node);
          case "br":
            return "\n";
          case "a": {
            const href = node.attribs.href;
            if (!href || node.children.some((child) => isTag(child) && child.name === "img")) return raw(node);
            return `[${walk(node.children)}](${/[\s()]/.test(href) ? `<${href}>` : href})`;
          }
          default:
            return raw(node);
        }
      })
      .join("");
  return walk(source.children)
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim()
    .split("\n")
    // A line that would read as a heading, list or quote in markdown stays plain text.
    .map((line) => line.replace(/^(\d+)([.)] )/, "$1\\$2").replace(/^([-+] )/, "\\$1").replace(/^([#>])/, "\\$1"))
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// Parsing

function elementOfBlock(name: string): ElementKind {
  const short = name.replace(/^core\//, "");
  if (/faq/.test(name)) return "faq";
  if (/toc|table-of-contents/.test(name)) return "toc";
  if (["image", "gallery", "media-text", "cover"].includes(short)) return "image";
  if (["embed", "video", "audio", "file"].includes(short) || name.startsWith("core-embed/")) return "embed";
  if (short === "table") return "table";
  if (["quote", "pullquote"].includes(short)) return "quote";
  if (["html", "shortcode", "freeform"].includes(short)) return "html";
  if (["buttons", "button"].includes(short)) return "button";
  if (["separator", "spacer"].includes(short)) return "separator";
  if (["code", "preformatted", "verse"].includes(short)) return "code";
  if (["group", "columns", "column", "row", "stack", "details"].includes(short)) return "layout";
  if (short === "paragraph" || short === "list") return "text";
  if (short === "heading") return "heading";
  return "block";
}

const TAG_ELEMENT: Record<string, ElementKind> = {
  figure: "image",
  picture: "image",
  iframe: "embed",
  video: "embed",
  audio: "embed",
  object: "embed",
  embed: "embed",
  table: "table",
  blockquote: "quote",
  hr: "separator",
  pre: "code",
  div: "layout",
  section: "layout",
  aside: "layout",
  details: "layout",
  center: "layout",
  header: "layout",
  footer: "layout",
  nav: "layout",
  article: "layout",
  script: "html",
  style: "html",
  form: "html",
  noscript: "html",
  dl: "html",
  address: "html",
  canvas: "html",
};
const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", ...Object.keys(TAG_ELEMENT)]);

/** A plain list (no styling, no nesting) as markdown, or null when it has to stay as it is. */
function listMarkdown(html: string, kept: string[]) {
  const stripped = html.replace(/<!--\s+\/?wp:list-item(?:\s+\{[\s\S]*?\})?\s+\/?-->/g, "");
  const source = parseDocument(stripped, { withStartIndices: true, withEndIndices: true });
  const roots = source.children.filter((node) => !(isText(node) && !node.data.trim()));
  const root = roots[0];
  if (roots.length !== 1 || !root || !isTag(root) || !["ul", "ol"].includes(root.name)) return null;
  if (Object.entries(root.attribs).some(([key, value]) => !(key === "class" && value === "wp-block-list"))) return null;
  const items = root.children.filter((node) => !(isText(node) && !node.data.trim()) && !isComment(node));
  if (!items.length || items.some((item) => !isTag(item) || item.name !== "li" || Object.keys(item.attribs).length)) return null;
  const lines: string[] = [];
  for (const [index, item] of items.entries()) {
    if (!isTag(item) || item.children.some((child) => isTag(child) && ["ul", "ol", "p", "div"].includes(child.name))) return null;
    const inner = item.children.length ? stripped.slice(item.children[0]!.startIndex!, item.children.at(-1)!.endIndex! + 1) : "";
    const text = inlineMarkdown(inner, kept).replace(/\n/g, " ");
    lines.push(`${root.name === "ol" ? `${index + 1}.` : "-"} ${text}`);
  }
  return lines.join("\n");
}

function headingPiece(raw: string, start: number, level: number, inner: string, fixed: boolean): Piece {
  const kept: string[] = [];
  const markdown = fixed ? snippet(inner) : inlineMarkdown(inner, kept).replace(/\n/g, " ");
  if (!markdown) return { raw, start, kind: "space" };
  return { raw, start, kind: "heading", level, markdown, fixed: fixed || kept.length > 0 || level === 1 };
}

function blockPiece(name: string, attrs: Record<string, unknown> | null, raw: string, inner: string, start: number): Piece {
  const plain = attrs !== null && Object.keys(attrs).length === 0;
  if (name === "core/paragraph") {
    const p = inner.trim().match(/^<p>([\s\S]*)<\/p>$/);
    if (plain && p) {
      const kept: string[] = [];
      const markdown = inlineMarkdown(p[1]!, kept);
      return markdown ? { raw, start, kind: "text", markdown, inline: kept } : { raw, start, kind: "space" };
    }
    return plainText(inner) ? { raw, start, kind: "element", element: "text" } : { raw, start, kind: "space" };
  }
  if (name === "core/heading" && attrs !== null) {
    const h = inner.trim().match(/^<h([1-6])((?:\s+class="wp-block-heading")?)>([\s\S]*)<\/h\1>$/);
    const level = typeof attrs.level === "number" ? attrs.level : Number(h?.[1] ?? 2);
    const fixed = !h || Object.keys(attrs).some((key) => key !== "level");
    return headingPiece(raw, start, level, h?.[3] ?? inner, fixed);
  }
  if (name === "core/list" && attrs !== null && Object.keys(attrs).every((key) => key === "ordered")) {
    const kept: string[] = [];
    const markdown = listMarkdown(inner, kept);
    if (markdown) return { raw, start, kind: "text", markdown, inline: kept };
  }
  return { raw, start, kind: "element", element: elementOfBlock(name) };
}

/** A run of inline content in classic content: a paragraph, a shortcode or a lone image. */
function runPiece(raw: string, start: number): Piece {
  const text = raw.trim();
  if (/^\[(caption|wp_caption|gallery)\b/i.test(text)) return { raw, start, kind: "element", element: "image" };
  if (/^\[(embed|video|audio|playlist|youtube)\b/i.test(text)) return { raw, start, kind: "element", element: "embed" };
  if (/^\[[a-z][\w-]*[\s\]][\s\S]*\]$/i.test(text) && !/\s{2,}|\n/.test(text.replace(/\[[^\]]*\]/g, ""))) return { raw, start, kind: "element", element: "html" };
  if (/^(<a\b[^>]*>\s*)?<img\b[^>]*>(\s*<\/a>)?$/i.test(text)) return { raw, start, kind: "element", element: "image" };
  const kept: string[] = [];
  const markdown = inlineMarkdown(raw, kept);
  return markdown ? { raw, start, kind: "text", markdown, inline: kept } : { raw, start, kind: "space" };
}

/** Pieces of classic (freeform) HTML, as written in the classic editor or between blocks. */
function classicPieces(html: string, offset: number, out: Piece[]) {
  const source = parseDocument(html, { withStartIndices: true, withEndIndices: true });
  let runStart: number | null = null;
  let runEnd = 0;
  // Leading and trailing whitespace of a run become their own pieces, so nothing shifts.
  const pushRun = (from: number, to: number) => {
    const raw = html.slice(from, to);
    const lead = raw.match(/^\s*/)![0].length;
    const trail = raw.length - raw.trimEnd().length;
    if (lead === raw.length) {
      if (raw) out.push({ raw, start: offset + from, kind: "space" });
      return;
    }
    if (lead) out.push({ raw: raw.slice(0, lead), start: offset + from, kind: "space" });
    out.push(runPiece(raw.slice(lead, raw.length - trail), offset + from + lead));
    if (trail) out.push({ raw: raw.slice(raw.length - trail), start: offset + to - trail, kind: "space" });
  };
  const flush = () => {
    if (runStart !== null) pushRun(runStart, runEnd);
    runStart = null;
  };
  for (const node of source.children) {
    const from = node.startIndex!;
    const to = node.endIndex! + 1;
    if (isText(node)) {
      // A blank line ends a paragraph (WordPress adds the <p> tags when it shows the post).
      let cursor = from;
      for (const gap of html.slice(from, to).matchAll(/\n[ \t]*\n\s*/g)) {
        const at = from + gap.index!;
        if (at > cursor) {
          runStart ??= cursor;
          runEnd = at;
        }
        flush();
        out.push({ raw: gap[0], start: offset + at, kind: "space" });
        cursor = at + gap[0].length;
      }
      if (cursor < to) {
        runStart ??= cursor;
        runEnd = to;
      }
      continue;
    }
    if (isComment(node)) {
      flush();
      out.push({ raw: html.slice(from, to), start: offset + from, kind: "element", element: /^<!--\s*(more|nextpage)\b/.test(html.slice(from, to)) ? "more" : "html" });
      continue;
    }
    if (isTag(node) && BLOCK_TAGS.has(node.name)) {
      flush();
      const raw = html.slice(from, to);
      const inner = node.children.length ? html.slice(node.children[0]!.startIndex!, node.children.at(-1)!.endIndex! + 1) : "";
      const plain = Object.keys(node.attribs).length === 0;
      const heading = node.name.match(/^h([1-6])$/);
      if (heading) out.push(headingPiece(raw, offset + from, Number(heading[1]), inner, !plain));
      else if (node.name === "p" && plain) {
        const kept: string[] = [];
        const markdown = inlineMarkdown(inner, kept);
        out.push(markdown ? { raw, start: offset + from, kind: "text", markdown, inline: kept } : { raw, start: offset + from, kind: "space" });
      } else if (node.name === "ul" || node.name === "ol") {
        const kept: string[] = [];
        const markdown = listMarkdown(raw, kept);
        out.push(markdown ? { raw, start: offset + from, kind: "text", markdown, inline: kept } : { raw, start: offset + from, kind: "element", element: "text" });
      } else out.push({ raw, start: offset + from, kind: "element", element: node.name === "p" ? "text" : (TAG_ELEMENT[node.name] ?? "block") });
      continue;
    }
    runStart ??= from;
    runEnd = to;
  }
  flush();
}

function parseAttrs(json: string | undefined): Record<string, unknown> | null {
  if (!json) return {};
  try {
    const value = JSON.parse(json);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function parseWordpress(content: string): WordpressDocument {
  const pieces: Piece[] = [];
  const blocks = /<!--\s+wp:/.test(content);
  if (!blocks) classicPieces(content, 0, pieces);
  else {
    let depth = 0;
    let cursor = 0;
    let open: { start: number; innerStart: number; name: string; attrs: Record<string, unknown> | null } | null = null;
    for (const match of content.matchAll(DELIMITER)) {
      const [whole, closing, rawName, json, selfClosing] = match;
      const name = rawName!.includes("/") ? rawName! : `core/${rawName}`;
      const at = match.index!;
      if (depth === 0) {
        if (closing) continue;
        if (at > cursor) classicPieces(content.slice(cursor, at), cursor, pieces);
        if (selfClosing) {
          pieces.push(blockPiece(name, parseAttrs(json), whole, "", at));
          cursor = at + whole.length;
        } else {
          open = { start: at, innerStart: at + whole.length, name, attrs: parseAttrs(json) };
          depth = 1;
        }
        continue;
      }
      if (selfClosing) continue;
      if (!closing) {
        depth++;
        continue;
      }
      depth--;
      if (depth === 0 && open) {
        const end = at + whole.length;
        pieces.push(blockPiece(open.name, open.attrs, content.slice(open.start, end), content.slice(open.innerStart, at), open.start));
        cursor = end;
        open = null;
      }
    }
    if (open) {
      // An unclosed block: everything after it stays as it is.
      pieces.push({ raw: content.slice(open.start), start: open.start, kind: "element", element: "block" });
      cursor = content.length;
    }
    if (cursor < content.length) classicPieces(content.slice(cursor), cursor, pieces);
  }

  const sections: Section[] = [{ start: 0, end: content.length, heading: null, pieces: [] }];
  pieces.forEach((piece, index) => {
    if (piece.kind === "heading" && piece.level === 2) {
      sections.at(-1)!.end = piece.start;
      sections.push({ start: piece.start, end: content.length, heading: index, pieces: [] });
    }
    sections.at(-1)!.pieces.push(index);
  });
  return { content, blocks, pieces, sections };
}

// ---------------------------------------------------------------------------------------------
// The view Claude and the review page read

const tokenized = (piece: Piece) => piece.kind === "element" || (piece.kind === "heading" && (piece.fixed || piece.level !== undefined && piece.level < 3));

/** Elements of a section that a rewrite has to keep (as tokens), in order. */
function sectionTokens(doc: WordpressDocument, section: Section) {
  return section.pieces.filter((index) => index !== section.heading && tokenized(doc.pieces[index]!));
}

export function documentView(doc: WordpressDocument): { article: SplitArticle; elements: Record<number, WordpressElement> } {
  const elements: Record<number, WordpressElement> = {};
  const view = (index: number) => {
    const piece = doc.pieces[index]!;
    if (piece.kind === "space") return "";
    if (piece.kind === "text") return piece.markdown!;
    if (piece.kind === "heading" && !tokenized(piece)) return `${"#".repeat(piece.level!)} ${piece.markdown}`;
    elements[index] = piece.kind === "heading" ? { kind: "heading", text: piece.markdown } : { kind: piece.element!, ...(piece.element === "text" ? { text: snippet(piece.raw) } : {}) };
    return `[[KEEP-${index}]]`;
  };
  const body = (section: Section) =>
    section.pieces
      .filter((index) => index !== section.heading)
      .map(view)
      .filter(Boolean)
      .join("\n\n");
  const [intro, ...rest] = doc.sections;
  return { article: { intro: body(intro!), sections: rest.map((section) => ({ heading: doc.pieces[section.heading!]!.markdown!, body: body(section) })) }, elements };
}

/** Sections (1-based, like the view) whose H2 heading can't be renamed. */
export function fixedHeadings(doc: WordpressDocument) {
  return new Set(doc.sections.flatMap((section, index) => (section.heading !== null && doc.pieces[section.heading]!.fixed ? [index] : [])));
}

/** The legend that tells Claude what each token stands for. */
export function tokenLegend(elements: Record<number, WordpressElement>) {
  return Object.entries(elements)
    .map(([index, element]) => `[[KEEP-${index}]] = ${element.kind}${element.text ? ` ("${element.text}")` : ""}`)
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// Markdown → block markup

type MarkupStyle = { headingClass: boolean; listClass: boolean; listItems: boolean };

/** Writes new blocks the way the site's WordPress version already writes them. */
function markupStyle(content: string): MarkupStyle {
  return {
    headingClass: /<h[1-6] class="wp-block-heading"/.test(content),
    listClass: /<[ou]l class="wp-block-list"/.test(content),
    listItems: /<!-- wp:list-item/.test(content),
  };
}

type WriteContext = { blocks: boolean; style: MarkupStyle; keep: Map<number, string>; links: Map<string, string>; inline: string[] };

const INLINE_TAGS = ["strong", "b", "em", "i", "a", "code", "br", "span", "mark", "sup", "sub", "u", "s", "del", "ins", "small", "abbr", "kbd", "q", "cite"];
const sanitizeInline = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: INLINE_TAGS,
    allowedAttributes: { a: ["href", "title", "rel", "target"], abbr: ["title"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });

/** Opening <a> tags of the original, by URL, so rewritten links keep rel="nofollow", target and so on. */
function linkTags(raw: string) {
  const tags = new Map<string, string>();
  for (const match of raw.matchAll(/<a\b[^>]*?\bhref=(["'])(.*?)\1[^>]*>/gi)) tags.set(decodeHTML(match[2]!), match[0]);
  return tags;
}

function inlineHtml(markdown: string, context: WriteContext) {
  // Inline HTML that was already in the post is trusted and goes back untouched; Claude's own text is sanitized.
  let text = markdown;
  const placed: string[] = [];
  for (const snippet of [...new Set(context.inline)].sort((a, b) => b.length - a.length)) {
    if (!text.includes(snippet)) continue;
    text = text.split(snippet).join(`VAULTIOINLINE${placed.length}X`);
    placed.push(snippet);
  }
  const html = sanitizeInline(marked.parseInline(text, { gfm: true, breaks: true }) as string).trim();
  return html
    .replace(/<a href="([^"]*)"[^>]*>/g, (whole, href: string) => context.links.get(decodeHTML(href)) ?? whole)
    .replace(/VAULTIOINLINE(\d+)X/g, (_, index: string) => placed[Number(index)]!);
}

function paragraph(inner: string, context: WriteContext) {
  return context.blocks ? `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->` : `<p>${inner}</p>`;
}

function heading(level: number, inner: string, context: WriteContext) {
  if (!context.blocks) return `<h${level}>${inner}</h${level}>`;
  const tag = `<h${level}${context.style.headingClass ? ' class="wp-block-heading"' : ""}>${inner}</h${level}>`;
  return `<!-- wp:heading${level === 2 ? "" : ` {"level":${level}}`} -->\n${tag}\n<!-- /wp:heading -->`;
}

function list(token: Tokens.List, context: WriteContext): string {
  const tag = token.ordered ? "ol" : "ul";
  const start = token.ordered && typeof token.start === "number" && token.start !== 1 ? token.start : null;
  const itemBlocks = context.blocks && context.style.listItems;
  const items = token.items.map((item) => {
    const text = item.tokens
      .filter((child) => child.type === "text" || child.type === "paragraph")
      .map((child) => inlineHtml((child as Tokens.Text).text, context))
      .join("<br>");
    const nested = item.tokens
      .filter((child): child is Tokens.List => child.type === "list")
      .map((child) => list(child, context))
      .join("");
    const li = `<li>${text}${nested}</li>`;
    return itemBlocks ? `<!-- wp:list-item -->\n${li}\n<!-- /wp:list-item -->` : li;
  });
  const html = `<${tag}${context.blocks && context.style.listClass ? ' class="wp-block-list"' : ""}${start ? ` start="${start}"` : ""}>${items.join(itemBlocks ? "\n\n" : "")}</${tag}>`;
  if (!context.blocks) return html;
  const attrs = { ...(token.ordered ? { ordered: true } : {}), ...(start ? { start } : {}) };
  return `<!-- wp:list${Object.keys(attrs).length ? ` ${JSON.stringify(attrs)}` : ""} -->\n${html}\n<!-- /wp:list -->`;
}

function table(token: Tokens.Table, context: WriteContext) {
  const cell = (tag: string, value: Tokens.TableCell) => `<${tag}>${inlineHtml(value.text, context)}</${tag}>`;
  const html = `<table><thead><tr>${token.header.map((value) => cell("th", value)).join("")}</tr></thead><tbody>${token.rows.map((row) => `<tr>${row.map((value) => cell("td", value)).join("")}</tr>`).join("")}</tbody></table>`;
  return context.blocks ? `<!-- wp:table -->\n<figure class="wp-block-table">${html}</figure>\n<!-- /wp:table -->` : html;
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A rewritten section body (markdown with tokens) as WordPress markup. */
function toMarkup(markdown: string, context: WriteContext) {
  const used = new Set<number>();
  const prepared = markdown.replace(/[ \t]*\[\[KEEP-(\d+)\]\][ \t]*/g, "\n\n[[KEEP-$1]]\n\n");
  const parts: string[] = [];
  const write = (token: Token) => {
    switch (token.type) {
      case "paragraph":
      case "text": {
        const keep = token.text.trim().match(/^\[\[KEEP-(\d+)\]\]$/);
        if (keep) {
          const index = Number(keep[1]);
          const raw = context.keep.get(index);
          if (raw !== undefined && !used.has(index)) {
            used.add(index);
            parts.push(raw);
          }
          return;
        }
        const inner = inlineHtml(token.text, context);
        if (inner) parts.push(paragraph(inner, context));
        return;
      }
      case "heading":
        parts.push(heading(Math.max(3, token.depth), inlineHtml(token.text, context), context));
        return;
      case "list":
        parts.push(list(token as Tokens.List, context));
        return;
      case "table":
        parts.push(table(token as Tokens.Table, context));
        return;
      case "blockquote": {
        const inner = (token as Tokens.Blockquote).tokens
          .filter((child) => child.type === "paragraph")
          .map((child) => `<p>${inlineHtml((child as Tokens.Paragraph).text, context)}</p>`)
          .join("");
        parts.push(context.blocks ? `<!-- wp:quote -->\n<blockquote class="wp-block-quote">${inner}</blockquote>\n<!-- /wp:quote -->` : `<blockquote>${inner}</blockquote>`);
        return;
      }
      case "code": {
        const html = `<pre class="wp-block-code"><code>${escapeHtml(token.text)}</code></pre>`;
        parts.push(context.blocks ? `<!-- wp:code -->\n${html}\n<!-- /wp:code -->` : `<pre><code>${escapeHtml(token.text)}</code></pre>`);
        return;
      }
      case "hr":
        parts.push(context.blocks ? `<!-- wp:separator -->\n<hr class="wp-block-separator"/>\n<!-- /wp:separator -->` : "<hr />");
        return;
      case "html": {
        const clean = sanitizeHtml(token.text, { allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"], allowedAttributes: { a: ["href", "title", "rel", "target"], img: ["src", "alt", "title"] } }).trim();
        if (clean) parts.push(context.blocks ? `<!-- wp:html -->\n${clean}\n<!-- /wp:html -->` : clean);
        return;
      }
    }
  };
  for (const token of marked.lexer(prepared, { gfm: true, breaks: true })) write(token);
  return { markup: parts.join("\n\n"), used };
}

// ---------------------------------------------------------------------------------------------
// Applying an improvement

function writeContext(doc: WordpressDocument, section: Section | null): WriteContext {
  return {
    blocks: doc.blocks,
    style: markupStyle(doc.content),
    keep: new Map(section ? sectionTokens(doc, section).map((index) => [index, doc.pieces[index]!.raw]) : []),
    // A URL the post already links to keeps its original attributes wherever the rewrite uses it.
    links: linkTags(doc.content),
    inline: section ? section.pieces.flatMap((index) => doc.pieces[index]!.inline ?? []) : [],
  };
}

/** Removes a link everywhere in the post, keeping its text. */
function unlinkHtml(html: string, url: string) {
  const variants = [...new Set([url, url.replace(/&/g, "&amp;"), url.replace(/&/g, "&#038;")])].map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return html.replace(new RegExp(`<a\\b[^>]*?\\bhref=(["'])(?:${variants.join("|")})\\1[^>]*>([\\s\\S]*?)<\\/a>`, "gi"), "$2");
}

/**
 * The post with the approved changes applied. Sections without an approved rewrite are copied
 * byte for byte; a rewrite keeps the section's elements (any a rewrite left out go at its end).
 */
export function applyWordpressChanges(content: string, changes: ImprovementChange[], approved: (change: ImprovementChange) => boolean = (change) => change.status === "approved") {
  const doc = parseWordpress(content);
  const accepted = changes.filter(approved);
  const out: string[] = [];
  const separate = () => {
    const last = out.at(-1);
    if (last !== undefined && !/\n\s*$/.test(last)) out.push("\n\n");
  };
  doc.sections.forEach((section, index) => {
    const original = content.slice(section.start, section.end);
    const rewrite = accepted.find((change) => change.kind === "rewrite" && change.sectionIndex === index);
    if (!rewrite) out.push(original);
    else {
      const context = writeContext(doc, section);
      const { markup, used } = toMarkup(rewrite.suggested, context);
      const missing = [...context.keep.entries()].filter(([piece]) => !used.has(piece)).map(([, raw]) => raw);
      const headingPiece = section.heading === null ? null : doc.pieces[section.heading]!;
      const renamed = headingPiece && !headingPiece.fixed && rewrite.heading?.trim() && rewrite.heading.trim() !== headingPiece.markdown;
      const headingRaw = headingPiece ? (renamed ? heading(2, inlineHtml(rewrite.heading!.trim(), context), context) : headingPiece.raw) : "";
      const lead = original.match(/^\s*/)![0];
      const trail = original.slice(original.trimEnd().length) || (index < doc.sections.length - 1 ? "\n\n" : "");
      out.push(`${lead}${[headingRaw, markup, ...missing].filter(Boolean).join("\n\n")}${trail}`);
    }
    for (const addition of accepted.filter((change) => change.kind === "add" && change.sectionIndex === index && change.heading?.trim())) {
      const context = writeContext(doc, null);
      separate();
      out.push(`${heading(2, inlineHtml(addition.heading!.trim(), context), context)}\n\n${toMarkup(addition.suggested.replace(TOKEN, ""), context).markup}\n\n`);
    }
  });
  let result = out.join("");
  for (const change of accepted.filter((c) => c.kind === "removeLink" && c.linkUrl)) result = unlinkHtml(result, change.linkUrl!);
  return {
    content: result,
    title: accepted.find((change) => change.kind === "title")?.suggested ?? null,
    metaDescription: accepted.find((change) => change.kind === "meta")?.suggested ?? null,
  };
}

/**
 * Checks only an existing WordPress post needs: elements a rewrite left out, the post's own inline
 * styling lost in a rewrite, markdown that wouldn't turn into formatting, and a second FAQ.
 */
export function wordpressChecks(content: string, changes: ImprovementChange[]): SafetyFlag[] {
  const doc = parseWordpress(content);
  const { elements } = documentView(doc);
  const flags: SafetyFlag[] = [];
  for (const change of changes) {
    const section = change.sectionIndex === undefined ? null : doc.sections[change.sectionIndex];
    if (change.kind === "rewrite" && section) {
      const kept = new Set([...change.suggested.matchAll(TOKEN)].map((match) => Number(match[1])));
      for (const index of sectionTokens(doc, section)) if (!kept.has(index)) flags.push({ check: "lostElements", detail: elements[index]?.kind ?? "block", changeId: change.id });
      for (const snippet of new Set(section.pieces.flatMap((index) => doc.pieces[index]!.inline ?? []))) {
        if (!change.suggested.includes(snippet)) flags.push({ check: "lostMarkup", detail: plainText(snippet).slice(0, 80) || snippet.slice(0, 80), changeId: change.id });
      }
    }
    if (change.kind === "rewrite" || change.kind === "add") {
      const visible = plainText(toMarkup(change.suggested, writeContext(doc, section ?? null)).markup);
      const artifact = visible.match(/\*\*|__|\]\(|(?:^|\s)#{1,6}\s|\[\[KEEP/);
      if (artifact) flags.push({ check: "markdownArtifacts", detail: visible.slice(Math.max(0, artifact.index! - 30), artifact.index! + 40).trim(), changeId: change.id });
    }
    if (change.kind === "add" && /^(faq|frequently asked)/i.test(change.heading ?? "") && Object.values(elements).some((element) => element.kind === "faq")) {
      flags.push({ check: "duplicateFaq", detail: change.heading!, changeId: change.id });
    }
  }
  return flags;
}

/** Words a reader sees in a post's stored content, tables and plugin blocks included (shortcodes left out). */
export const wordCount = (content: string) => plainText(content.replace(/\[\/?[a-z][^\]]*\]/gi, " ")).split(" ").filter(Boolean).length;

/** Words and links of the post (for the review page). */
export function documentStats(content: string, siteUrl: string) {
  const { article } = documentView(parseWordpress(content));
  const text = [article.intro, ...article.sections.flatMap((section) => [section.heading, section.body])].join("\n");
  const links = [...text.matchAll(/(?<!!)\[[^\]]*\]\(<?(https?:\/\/[^)\s>]+)>?\)/g)].map((match) => match[1]!);
  const host = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };
  const internal = links.filter((url) => host(url) === host(siteUrl)).length;
  return { words: wordCount(content), internalLinks: internal, externalLinks: links.length - internal };
}
