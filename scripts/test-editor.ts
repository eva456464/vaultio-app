/**
 * Checks the article editor's conversions (no database or keys needed):
 *
 *   npx tsx --tsconfig tsconfig.json scripts/test-editor.ts
 *
 * Markdown → editor HTML → markdown keeps text, links, tables, images with captions, cards and
 * videos, and is stable on a second pass; editor-made HTML (TipTap tables, alignment, underline,
 * ordered lists, a card left inside a table cell) converts to markdown the renderer understands.
 */
import { editorHtmlToMarkdown, markdownToEditorHtml } from "@/server/articles/document";
import { renderArticleHtml } from "@/server/markdown";
import type { ArticleBlock } from "@/db/schema";

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

const blocks: ArticleBlock[] = [
  { kind: "link", title: "Free roof check", pitch: "We inspect for free.", buttonLabel: "Book", buttonUrl: "https://example.test/contact" },
  { kind: "video", title: "Roof tour", videoId: "dQw4w9WgXcQ" },
];
const markdown = `Most roofs last 20 to 30 years [(InterNACHI)](https://www.nachi.org/life-expectancy.htm).

**TL;DR:**

- Asphalt: 20–30 years
- Metal: 40–70 years

<!-- vaultio:block 0 -->
> **Free roof check**
<!-- /vaultio:block -->

## Lifespan by material

| Material | Lifespan |
| --- | --- |
| Asphalt | 20–30 years |

![Roofing samples](https://example.test/media/abcdefgh1234.webp "Common materials")

<!-- vaultio:block 1 -->
[▶ Roof tour](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
<!-- /vaultio:block -->

## FAQ

### How long does a shingle roof last?

Usually 20 to 30 years.
`;

const html = markdownToEditorHtml(markdown, blocks);
check(html.includes('data-vaultio-block="0"') && html.includes('data-vaultio-video="dQw4w9WgXcQ"'), "cards and videos become editor placeholders");
const back = editorHtmlToMarkdown(html, blocks);
check(back.blocks.length === 2 && back.blocks[0]!.kind === "link" && back.blocks[1]!.kind === "video", "both cards survive, in order");
check(back.markdown.includes("| Asphalt | 20–30 years |") && back.markdown.includes('"Common materials"') && back.markdown.includes("- Metal: 40–70 years"), "tables, captions and tight lists survive");
const again = editorHtmlToMarkdown(markdownToEditorHtml(back.markdown, back.blocks), back.blocks);
check(again.markdown === back.markdown, "a second round trip changes nothing");

const deleted = editorHtmlToMarkdown(html.replace('<div data-vaultio-block="0"></div>', ""), blocks);
check(deleted.blocks.length === 1 && deleted.markdown.includes("<!-- vaultio:block 0 -->") && deleted.markdown.includes("Roof tour"), "a deleted card is dropped and the rest renumbered");

const tiptap = `<p style="text-align: center">Centred <u>under</u></p><table><colgroup><col></colgroup><tbody><tr><th><p>Item</p></th><th><p>Price</p></th></tr><tr><td><p>Shingles</p><div data-vaultio-video="dQw4w9WgXcQ" data-title="Tour"></div></td><td><p>$5</p></td></tr></tbody></table><ol start="3"><li><p>Three</p></li><li><p>Four</p></li></ol>`;
const fromEditor = editorHtmlToMarkdown(tiptap, []);
check(fromEditor.markdown.includes('<p style="text-align: center">Centred <u>under</u></p>'), "alignment and underline kept as small HTML");
check(fromEditor.markdown.includes("| Item | Price |") && fromEditor.blocks.length === 0 && fromEditor.markdown.includes("[▶ Tour]"), "a card in a table cell becomes a plain link, the table stays valid");
check(/^3\. Three\n4\. Four$/m.test(fromEditor.markdown), "numbered lists keep their start and stay tight");
const rendered = renderArticleHtml(back.markdown, { blocks: back.blocks });
check(rendered.includes("<figcaption>Common materials</figcaption>") && rendered.includes("vaultio-cta") && rendered.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"), "the published HTML has the caption, the card and the video");
check(renderArticleHtml(fromEditor.markdown).includes('style="text-align:center"'), "alignment reaches the published HTML");
