/**
 * The article editor works on HTML; articles are stored as markdown with card markers. These two
 * functions convert between them without losing cards, images, captions, tables or alignment.
 */
import { gfm } from "@joplin/turndown-plugin-gfm";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";
import type { ArticleBlock } from "@/db/schema";
import { youtubeId } from "@/lib/visuals";
import { blockMarkdown } from "./visuals";

const BLOCK_MARKER = /<!-- vaultio:block (\d+) -->[\s\S]*?<!-- \/vaultio:block -->/g;
const ALIGN = /^text-align:\s*(left|center|right)\s*;?$/i;

/** Markdown → the HTML the editor loads. Cards become placeholders the editor shows as fixed blocks. */
export function markdownToEditorHtml(markdown: string, blocks: ArticleBlock[]) {
  const prepared = markdown.replace(BLOCK_MARKER, (whole, index: string) => {
    const block = blocks[Number(index)];
    if (!block) return "";
    return block.kind === "video" ? `\n\n<div data-vaultio-video="${block.videoId}" data-title="${encodeURIComponent(block.title)}"></div>\n\n` : `\n\n<div data-vaultio-block="${index}"></div>\n\n`;
  });
  const html = marked.parse(prepared, { async: false, gfm: true }) as string;
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "h3", "h4"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
      div: ["data-vaultio-block", "data-vaultio-video", "data-title"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      th: ["align", "style"],
      td: ["align", "style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|center|right)$/] } },
  });
}

type Converted = { markdown: string; blocks: ArticleBlock[] };

/**
 * Editor HTML → markdown. Cards keep their data (re-numbered in their new order; deleted ones are
 * dropped), YouTube embeds become video cards, aligned paragraphs stay as small HTML paragraphs.
 */
export function editorHtmlToMarkdown(html: string, blocks: ArticleBlock[]): Converted {
  const kept: ArticleBlock[] = [];
  const cardMarkdown = (block: ArticleBlock) => {
    kept.push(block);
    return `\n\n${blockMarkdown(block, kept.length - 1).join("\n").trim()}\n\n`;
  };

  // Cards and videos are empty elements, which turndown hands to blankReplacement, not to rules.
  const inCell = (element: HTMLElement) => {
    for (let parent = element.parentNode; parent; parent = parent.parentNode) if (parent.nodeName === "TD" || parent.nodeName === "TH") return true;
    return false;
  };
  const card = (element: HTMLElement) => {
    // A table cell is one line of markdown: a card there is reduced to its link text.
    if (inCell(element)) {
      const videoId = element.getAttribute("data-vaultio-video");
      return videoId ? `[▶ ${decodeURIComponent(element.getAttribute("data-title") ?? "") || "YouTube"}](https://www.youtube.com/watch?v=${videoId})` : "";
    }
    if (element.hasAttribute("data-vaultio-block")) {
      const block = blocks[Number(element.getAttribute("data-vaultio-block"))];
      return block ? cardMarkdown(block) : "";
    }
    const videoId = youtubeId(`https://www.youtube.com/watch?v=${element.getAttribute("data-vaultio-video") ?? ""}`);
    if (!videoId) return "";
    const title = decodeURIComponent(element.getAttribute("data-title") ?? "") || "YouTube video";
    return cardMarkdown({ kind: "video", videoId, title: title.slice(0, 120) });
  };
  const isCard = (node: Node) => node.nodeName === "DIV" && ((node as HTMLElement).hasAttribute("data-vaultio-block") || (node as HTMLElement).hasAttribute("data-vaultio-video"));
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    hr: "---",
    blankReplacement: (_content, node) => (isCard(node) ? card(node as HTMLElement) : (node as { isBlock?: boolean }).isBlock ? "\n\n" : ""),
  });
  service.use(gfm);
  service.addRule("vaultioCard", { filter: (node) => isCard(node), replacement: (_content, node) => card(node as HTMLElement) });
  // "- item" and "1. item", as the writer formats lists.
  service.addRule("listItem", {
    filter: "li",
    replacement: (content, node) => {
      const parent = node.parentNode as HTMLElement;
      let prefix = "- ";
      if (parent.nodeName === "OL") {
        const start = Number(parent.getAttribute("start") ?? 1) || 1;
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      // The editor wraps every item in a paragraph; trimming keeps the list tight.
      const body = content.replace(/^\n+/, "").replace(/\s+$/, "").replace(/\n/gm, `\n${" ".repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling ? "\n" : "");
    },
  });
  // Markdown has no underline or alignment: keep them as the smallest possible inline HTML.
  service.addRule("underline", { filter: ["u"], replacement: (content) => (content.trim() ? `<u>${content}</u>` : content) });
  service.addRule("aligned", {
    filter: (node) => ["P", "H1", "H2", "H3", "H4"].includes(node.nodeName) && ALIGN.test((node as HTMLElement).getAttribute("style") ?? "") && !/^text-align:\s*left/i.test((node as HTMLElement).getAttribute("style") ?? ""),
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const align = (element.getAttribute("style") ?? "").match(ALIGN)![1]!.toLowerCase();
      const inner = sanitizeHtml(element.innerHTML, { allowedTags: ["a", "b", "strong", "i", "em", "u", "s", "br", "code"], allowedAttributes: { a: ["href", "title"] } });
      const tag = element.nodeName.toLowerCase();
      return `\n\n<${tag} style="text-align: ${align}">${inner}</${tag}>\n\n`;
    },
  });
  // The editor wraps table cells' text in paragraphs; a markdown cell is one line.
  service.addRule("cellParagraph", {
    filter: (node) => node.nodeName === "P" && ["TD", "TH"].includes(node.parentNode?.nodeName ?? ""),
    replacement: (content, node) => (node.previousSibling ? ` <br> ${content.trim()}` : content.trim()),
  });

  const markdown = service
    .turndown(html.replace(/<colgroup>[\s\S]*?<\/colgroup>/g, ""))
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { markdown: `${markdown}\n`, blocks: kept };
}
