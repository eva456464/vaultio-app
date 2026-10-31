/** Stores article images (resized WebP in Postgres) and builds their public /media URLs. */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";

type Kind = (typeof mediaAssets.$inferSelect)["kind"];

// Covers are 16:9; body images 3:2. Generators are asked to keep lettering away from the edges.
const SIZES: Record<Kind, { width: number; height: number }> = {
  hero: { width: 1600, height: 900 },
  body: { width: 1200, height: 800 },
  upload: { width: 1600, height: 1200 },
};

export const mediaBaseUrl = () => (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
export const mediaUrl = (id: string) => `${mediaBaseUrl()}/media/${id}.webp`;

/** The media id inside one of our /media URLs, or null for any other URL. */
export function mediaIdFromUrl(url: string) {
  return url.match(/\/media\/([A-Za-z0-9_-]{8,40})\.webp(?:$|\?)/)?.[1] ?? null;
}

export async function storeImage(input: { siteId: number; articleId?: number | null; kind: Kind; bytes: Buffer; prompt?: string; model?: string }) {
  const size = SIZES[input.kind];
  const { data, info } = await sharp(input.bytes)
    .resize(size.width, size.height, { fit: input.kind === "upload" ? "inside" : "cover", position: "centre", withoutEnlargement: input.kind === "upload" })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const id = randomBytes(15).toString("base64url");
  await db.insert(mediaAssets).values({
    id,
    orgWebsiteId: input.siteId,
    articleId: input.articleId ?? null,
    kind: input.kind,
    mimeType: "image/webp",
    width: info.width,
    height: info.height,
    sizeBytes: data.length,
    data,
    prompt: input.prompt ?? null,
    model: input.model ?? null,
  });
  return { id, url: mediaUrl(id), width: info.width, height: info.height };
}

export async function loadMedia(id: string) {
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  return row ?? null;
}
