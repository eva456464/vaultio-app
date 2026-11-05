/**
 * Runs the plugin's sync against a real content API with a stand-in Framer collection:
 *
 *   API_BASE=http://localhost:3000/api/integrations API_KEY=… npx tsx scripts/test-sync.ts
 *
 * Imports everything, checks a second run changes nothing, then checks that a changed article is
 * fetched again and that an item the API no longer lists is removed.
 */
import type { ManagedCollection, ManagedCollectionFieldInput, ManagedCollectionItemInput } from "framer-plugin";
import { listPublished } from "../src/api";
import { DATA, syncArticles } from "../src/sync";

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

function standInCollection() {
  const items = new Map<string, ManagedCollectionItemInput>();
  const data = new Map<string, string>();
  let order: string[] = [];
  let fields: ManagedCollectionFieldInput[] = [];
  const collection = {
    id: "collection-1",
    name: "Blog",
    async getItemIds() {
      return [...items.keys()];
    },
    async setFields(next: ManagedCollectionFieldInput[]) {
      fields = next;
    },
    async addItems(next: ManagedCollectionItemInput[]) {
      for (const item of next) items.set(item.id, item);
    },
    async removeItems(ids: string[]) {
      for (const id of ids) items.delete(id);
    },
    async setItemOrder(ids: string[]) {
      order = ids;
    },
    async getPluginData(key: string) {
      return data.get(key) ?? null;
    },
    async setPluginData(key: string, value: string | null) {
      if (value === null) data.delete(key);
      else data.set(key, value);
    },
  };
  return { collection: collection as unknown as ManagedCollection, items, data, order: () => order, fields: () => fields };
}

async function main() {
  const apiBase = process.env.API_BASE ?? "http://localhost:3000/api/integrations";
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Set API_KEY (a key from Settings → Publishing → Framer)");
  const connection = { apiBase, apiKey };
  const published = await listPublished(apiBase, apiKey);
  console.log(`  ${published.length} published articles`);

  const stand = standInCollection();
  const first = await syncArticles(stand.collection, connection);
  check(first.added === published.length && stand.items.size === published.length, `first import adds every published article (${first.added})`);
  check(stand.fields().some((field) => field.id === "content" && field.type === "formattedText"), "fields are set, with the content as formatted text");
  const sample = stand.items.get(String(published[0]?.id));
  check(!published.length || Boolean(sample && sample.slug === published[0]!.slug && (sample.fieldData.content as { value: string }).value.length > 0), "items carry slug and HTML content");
  check(JSON.stringify(stand.order()) === JSON.stringify(published.map((article) => String(article.id))), "items are ordered newest first");

  const second = await syncArticles(stand.collection, connection);
  check(second.added === 0 && second.updated === 0 && second.unchanged === published.length, "a second run changes nothing");

  if (published.length) {
    // Pretend the newest article changed after the last import.
    const newest = published.reduce((latest, article) => (article.updated_at > latest ? article.updated_at : latest), "");
    await stand.collection.setPluginData(DATA.lastSync, new Date(new Date(newest).getTime() - 1000).toISOString());
    await stand.collection.addItems([{ id: "999999999", slug: "removed-article", fieldData: {} }]);
    const third = await syncArticles(stand.collection, connection);
    check(third.updated === 1 && third.removed === 1 && !stand.items.has("999999999"), "a changed article is fetched again and a removed one is taken out");
  }

  const bad = await syncArticles(standInCollection().collection, { apiBase, apiKey: "not-a-key" }).then(
    () => null,
    (error: Error) => error.message,
  );
  check(Boolean(bad?.includes("isn't valid")), "a wrong key gives a clear message");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
