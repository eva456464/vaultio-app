import type { ManagedCollection, ManagedCollectionFieldInput, ManagedCollectionItemInput } from "framer-plugin";
import { getArticle, listPublished, pause, type Article } from "./api";

/** Field ids stay fixed so pages bound to them keep working after updates. */
export const FIELDS: ManagedCollectionFieldInput[] = [
  { id: "title", name: "Title", type: "string" },
  { id: "content", name: "Content", type: "formattedText" },
  { id: "image", name: "Cover image", type: "image" },
  { id: "description", name: "Meta description", type: "string" },
  { id: "excerpt", name: "Excerpt", type: "string" },
  { id: "published", name: "Published", type: "date" },
  { id: "updated", name: "Updated", type: "date" },
  { id: "keyword", name: "Main keyword", type: "string" },
  { id: "language", name: "Language", type: "string" },
  { id: "source", name: "Original address", type: "link" },
];

/**
 * Plugin data kept on the collection (Framer allows 2 kB per entry): the API address and the time of
 * the newest article imported. The API key is a secret, so it stays in this browser (localStorage),
 * as Framer recommends; another editor enters it once on their computer.
 */
export const DATA = { apiBase: "apiBase", lastSync: "lastUpdatedAt" } as const;
const keyStorage = (collection: ManagedCollection) => `vaultio-api-key:${collection.id}`;

export function rememberKey(collection: ManagedCollection, apiKey: string) {
  try {
    localStorage.setItem(keyStorage(collection), apiKey);
  } catch {
    // Storage blocked: the key is asked for again next time.
  }
}

export type Connection = { apiBase: string; apiKey: string };
export type Progress = { done: number; total: number };
export type SyncResult = { added: number; updated: number; removed: number; unchanged: number };

export async function storedConnection(collection: ManagedCollection): Promise<{ apiKey: string | null; apiBase: string | null }> {
  let apiKey: string | null = null;
  try {
    apiKey = localStorage.getItem(keyStorage(collection));
  } catch {
    apiKey = null;
  }
  return { apiKey, apiBase: await collection.getPluginData(DATA.apiBase) };
}

function itemOf(article: Article, usedSlugs: Set<string>): ManagedCollectionItemInput {
  let slug = article.slug || String(article.id);
  if (usedSlugs.has(slug)) slug = `${slug}-${article.id}`;
  usedSlugs.add(slug);
  return {
    id: String(article.id),
    slug,
    fieldData: {
      title: { type: "string", value: article.title },
      content: { type: "formattedText", value: article.content_html ?? "", contentType: "html" },
      image: { type: "image", value: article.hero_image_url, alt: article.title },
      description: { type: "string", value: article.meta_description ?? "" },
      excerpt: { type: "string", value: article.excerpt ?? "" },
      published: { type: "date", value: article.published_at ?? article.created_at },
      updated: { type: "date", value: article.updated_at },
      keyword: { type: "string", value: article.seedKeyword ?? "" },
      language: { type: "string", value: article.languageCode ?? "" },
      source: { type: "link", value: article.published_url || null },
    },
  };
}

/**
 * Brings the collection in line with the published articles: new and changed ones are fetched
 * one at a time, unpublished or removed ones are taken out.
 */
export async function syncArticles(collection: ManagedCollection, connection: Connection, onProgress?: (progress: Progress) => void): Promise<SyncResult> {
  await collection.setFields(FIELDS);
  const summaries = await listPublished(connection.apiBase, connection.apiKey);
  const existing = new Set(await collection.getItemIds());
  // Articles changed since the newest one imported last time, and any not in the collection yet.
  const lastSync = (await collection.getPluginData(DATA.lastSync)) ?? "";
  const stale = summaries.filter((summary) => !existing.has(String(summary.id)) || summary.updated_at > lastSync);
  const usedSlugs = new Set(summaries.filter((summary) => !stale.includes(summary)).map((summary) => summary.slug));
  const items: ManagedCollectionItemInput[] = [];
  const gone = new Set<string>();
  onProgress?.({ done: 0, total: stale.length });
  for (const [index, summary] of stale.entries()) {
    const article = await getArticle(connection.apiBase, connection.apiKey, summary.id);
    if (article) items.push(itemOf(article, usedSlugs));
    else gone.add(String(summary.id));
    onProgress?.({ done: index + 1, total: stale.length });
    if (items.length === 20) await collection.addItems(items.splice(0));
    await pause(150);
  }
  if (items.length) await collection.addItems(items);

  const live = new Set(summaries.map((summary) => String(summary.id)).filter((id) => !gone.has(id)));
  const removed = [...existing].filter((id) => !live.has(id));
  if (removed.length) await collection.removeItems(removed);
  // Newest first, like the blog.
  await collection.setItemOrder(summaries.map((summary) => String(summary.id)).filter((id) => live.has(id)));

  const newest = summaries.reduce((latest, summary) => (summary.updated_at > latest ? summary.updated_at : latest), lastSync);
  if (newest) await collection.setPluginData(DATA.lastSync, newest);

  const added = stale.filter((summary) => !existing.has(String(summary.id)) && live.has(String(summary.id))).length;
  const updated = stale.filter((summary) => existing.has(String(summary.id)) && live.has(String(summary.id))).length;
  return { added, updated, removed: removed.length, unchanged: summaries.length - stale.length };
}
