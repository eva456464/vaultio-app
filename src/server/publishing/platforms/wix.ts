/**
 * Wix Blog (REST, https://dev.wix.com/docs/rest/business-solutions/blog): draft posts created with
 * an account API key and the site ID, then published. Wix stores post bodies as Ricos JSON, so the
 * article's markdown is converted here. Posts need an author (a site member), which is why the key
 * needs the "Wix Contacts & Members" permission as well as "Wix Blog".
 * Written from Wix's documented API; not yet run against a live Wix site.
 */
import { randomBytes } from "node:crypto";
import { marked, type Token, type Tokens } from "marked";
import { call, describeError, type Delivered, type PostInput, type PublishMode } from "./common";

export type WixConfig = { siteId: string; memberId: string; mode: PublishMode };
export type WixCredentials = { apiKey: string };

const base = () => (process.env.WIX_API_BASE ?? "https://www.wixapis.com").replace(/\/$/, "");
const headers = (config: { siteId: string }, credentials: WixCredentials) => ({ authorization: credentials.apiKey, "wix-site-id": config.siteId, "content-type": "application/json" });

type WixError = { message?: string; details?: { applicationError?: { description?: string } } };
const errorOf = (body: WixError | null, status: number) =>
  status === 401 || status === 403 ? "Wix rejected the API key (it must be the site owner's, with Wix Blog and Wix Contacts & Members permissions)" : (body?.details?.applicationError?.description ?? body?.message ?? `Wix returned HTTP ${status}`);

// ------------------------------------------------------------------ Markdown → Ricos

type RicosNode = { type: string; id: string; nodes: RicosNode[]; [key: string]: unknown };
const nodeId = () => randomBytes(4).toString("hex");
type Decoration = { type: string; [key: string]: unknown };

function inline(tokens: Token[] | undefined, decorations: Decoration[] = []): RicosNode[] {
  const out: RicosNode[] = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case "strong":
        out.push(...inline((token as Tokens.Strong).tokens, [...decorations, { type: "BOLD", fontWeightValue: 700 }]));
        break;
      case "em":
        out.push(...inline((token as Tokens.Em).tokens, [...decorations, { type: "ITALIC", italicData: true }]));
        break;
      case "link":
        out.push(...inline((token as Tokens.Link).tokens, [...decorations, { type: "LINK", linkData: { link: { url: (token as Tokens.Link).href, target: "BLANK" } } }]));
        break;
      case "codespan":
        out.push({ type: "TEXT", id: "", nodes: [], textData: { text: (token as Tokens.Codespan).text, decorations } });
        break;
      case "br":
        out.push({ type: "TEXT", id: "", nodes: [], textData: { text: "\n", decorations } });
        break;
      case "image":
        break;
      default: {
        const text = "tokens" in token && token.tokens ? null : ((token as { text?: string }).text ?? token.raw);
        if (text === null) out.push(...inline((token as { tokens: Token[] }).tokens, decorations));
        else if (text) out.push({ type: "TEXT", id: "", nodes: [], textData: { text: text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"), decorations } });
      }
    }
  }
  return out;
}

const paragraph = (nodes: RicosNode[]): RicosNode => ({ type: "PARAGRAPH", id: nodeId(), nodes, paragraphData: {} });
const image = (url: string, alt: string): RicosNode => ({ type: "IMAGE", id: nodeId(), nodes: [], imageData: { image: { src: { url } }, altText: alt, containerData: { width: { size: "CONTENT" }, alignment: "CENTER" } } });

function blocks(tokens: Token[]): RicosNode[] {
  const out: RicosNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        out.push({ type: "HEADING", id: nodeId(), nodes: inline(heading.tokens), headingData: { level: Math.min(6, Math.max(2, heading.depth)) } });
        break;
      }
      case "paragraph": {
        const para = token as Tokens.Paragraph;
        // Images on their own line become image nodes.
        const images = (para.tokens ?? []).filter((item) => item.type === "image") as Tokens.Image[];
        const text = inline(para.tokens);
        if (text.some((node) => String((node.textData as { text: string }).text).trim())) out.push(paragraph(text));
        for (const item of images) out.push(image(item.href, item.text));
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        out.push({
          type: list.ordered ? "ORDERED_LIST" : "BULLETED_LIST",
          id: nodeId(),
          nodes: list.items.map((item) => ({ type: "LIST_ITEM", id: nodeId(), nodes: [paragraph(inline(item.tokens.flatMap((child) => ("tokens" in child && child.tokens ? child.tokens : [child]))))] })),
          [list.ordered ? "orderedListData" : "bulletedListData"]: { indentation: 0 },
        });
        break;
      }
      case "blockquote":
        out.push({ type: "BLOCKQUOTE", id: nodeId(), nodes: blocks((token as Tokens.Blockquote).tokens).filter((node) => node.type === "PARAGRAPH"), blockquoteData: { indentation: 1 } });
        break;
      case "code":
        out.push({ type: "CODE_BLOCK", id: nodeId(), nodes: [{ type: "TEXT", id: "", nodes: [], textData: { text: (token as Tokens.Code).text, decorations: [] } }], codeBlockData: {} });
        break;
      case "table": {
        // Tables become one bold header line and one line per row.
        const table = token as Tokens.Table;
        out.push(paragraph(table.header.flatMap((cell, index) => [...(index ? [{ type: "TEXT", id: "", nodes: [], textData: { text: " · ", decorations: [] } }] : []), ...inline(cell.tokens, [{ type: "BOLD", fontWeightValue: 700 }])])));
        for (const row of table.rows) out.push(paragraph(row.flatMap((cell, index) => [...(index ? [{ type: "TEXT", id: "", nodes: [], textData: { text: " · ", decorations: [] } }] : []), ...inline(cell.tokens)])));
        break;
      }
      case "hr":
        out.push({ type: "DIVIDER", id: nodeId(), nodes: [], dividerData: { lineStyle: "SINGLE", width: "LARGE", alignment: "CENTER" } });
        break;
      default:
        break; // raw HTML (CTA card markers) and spacing aren't carried over
    }
  }
  return out;
}

/** Converts article markdown into a Ricos document (headings, text styles, links, lists, quotes, images, tables as lines). */
export function markdownToRicos(markdown: string) {
  const cleaned = markdown.replace(/<!-- vaultio:block \d+ -->[\s\S]*?<!-- \/vaultio:block -->/g, "");
  return { nodes: blocks(marked.lexer(cleaned)), metadata: { version: 1 } };
}

// ------------------------------------------------------------------ API

/** Finds the post author and proves the key can create (and delete) a draft post. */
export async function verifyWix(siteId: string, credentials: WixCredentials): Promise<{ ok: true; memberId: string } | { ok: false; error: string }> {
  try {
    const members = await call<{ members?: { id: string }[] } & WixError>(`${base()}/members/v1/members/query`, {
      method: "POST",
      headers: headers({ siteId }, credentials),
      body: JSON.stringify({ query: { paging: { limit: 1 } } }),
    });
    if (members.status >= 400) return { ok: false, error: errorOf(members.body, members.status) };
    const memberId = members.body?.members?.[0]?.id;
    if (!memberId) return { ok: false, error: "The site has no members yet. Sign in to your live site once as the owner, then try again." };
    const draft = await call<{ draftPost?: { id: string } } & WixError>(`${base()}/blog/v3/draft-posts`, {
      method: "POST",
      headers: headers({ siteId }, credentials),
      body: JSON.stringify({ draftPost: { title: "Connection test", memberId, richContent: markdownToRicos("Connection test.") } }),
    });
    if (draft.status >= 400 || !draft.body?.draftPost?.id) return { ok: false, error: errorOf(draft.body, draft.status) };
    await call(`${base()}/blog/v3/draft-posts/${draft.body.draftPost.id}?permanent=true`, { method: "DELETE", headers: headers({ siteId }, credentials) });
    return { ok: true, memberId };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

type DraftPost = { id: string; url?: { base?: string; path?: string } };

export async function deliverWix(config: WixConfig, credentials: WixCredentials, post: PostInput, previous?: { postId: string }): Promise<Delivered<{ postId: string }>> {
  try {
    const draftPost = { title: post.title, excerpt: post.excerpt, memberId: config.memberId, seoSlug: post.slug, richContent: markdownToRicos(post.markdown) };
    const publish = config.mode === "publish";
    const result = previous?.postId
      ? await call<{ draftPost?: DraftPost } & WixError>(`${base()}/blog/v3/draft-posts/${previous.postId}?fieldsets=URL`, {
          method: "PATCH",
          headers: headers(config, credentials),
          body: JSON.stringify({ draftPost: { id: previous.postId, ...draftPost }, action: publish ? "UPDATE_PUBLISH" : "UPDATE" }),
        })
      : await call<{ draftPost?: DraftPost } & WixError>(`${base()}/blog/v3/draft-posts?fieldsets=URL`, {
          method: "POST",
          headers: headers(config, credentials),
          body: JSON.stringify({ draftPost, publish, fieldsets: ["URL"] }),
        });
    const saved = result.body?.draftPost;
    if (result.status >= 400 || !saved?.id) return { ok: false, error: errorOf(result.body, result.status) };
    const url = publish && saved.url?.base ? `${saved.url.base.replace(/\/$/, "")}${saved.url.path ?? ""}` : null;
    return { ok: true, url, delivery: { postId: saved.id } };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
