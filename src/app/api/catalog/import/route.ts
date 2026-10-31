import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { rerunAgentJob } from "@/server/agents/queue";
import { siteDay } from "@/server/agents/schedule";
import { catalogFamily, catalogOwnerId, saveProducts } from "@/server/catalog/catalog";
import { CatalogFileError, parseCatalogFile } from "@/server/catalog/parse";
import { getAppContext } from "@/server/context";
import { storeImage } from "@/server/media";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Images in the file are copied to Vaultio (up to this many per import; the rest keep their links). */
const MAX_IMAGES = 200;

async function copyImage(siteId: number, url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok || !/^image\//.test(response.headers.get("content-type") ?? "image/")) return url;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 15 * 1024 * 1024) return url;
    return (await storeImage({ siteId, kind: "product", bytes })).url;
  } catch {
    return url;
  }
}

/** Imports products from an XML, CSV or Excel file as manual products (re-importing updates the same ids). */
export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") return Response.json({ error: "Only workspace admins can change the product catalog" }, { status: 403 });
  // Language sites share their primary website's catalog.
  const site = { ...context.site, id: catalogOwnerId(context.site) };
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Please select a file to import" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: "The file is larger than 20 MB" }, { status: 413 });
  let parsed: ReturnType<typeof parseCatalogFile>;
  try {
    parsed = parseCatalogFile(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof CatalogFileError) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ error: "The file couldn't be read" }, { status: 400 });
  }
  if (!parsed.products.length) return Response.json({ error: "No products with an id and a title were found" }, { status: 400 });

  // Products that already have a stored image keep it; new images are copied, a few at a time.
  const stored = new Map(
    (await db.select({ externalId: products.externalId, imageUrl: products.imageUrl }).from(products).where(and(eq(products.orgWebsiteId, site.id), eq(products.source, "manual"), isNotNull(products.externalId)))).map((row) => [
      row.externalId!,
      row.imageUrl,
    ]),
  );
  const queue = parsed.products.filter((product) => {
    const existing = stored.get(product.externalId);
    if (existing && product.imageUrl) product.imageUrl = existing;
    return product.imageUrl && !existing;
  }).slice(0, MAX_IMAGES);
  for (let index = 0; index < queue.length; index += 6) {
    await Promise.all(queue.slice(index, index + 6).map(async (product) => (product.imageUrl = await copyImage(site.id, product.imageUrl!))));
  }

  const saved = await saveProducts(site.id, "manual", parsed.products, { removeMissing: false });
  for (const member of await catalogFamily(site.id)) await rerunAgentJob(member.id, "productMatching", siteDay(new Date(), member.timeZone)).catch(() => null);
  return Response.json({ count: parsed.products.length, ...saved, skipped: parsed.skipped, truncated: parsed.truncated });
}
