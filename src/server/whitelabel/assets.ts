/** Agency logos and favicons: validated, converted to PNG (so uploaded SVGs can't carry scripts) and kept in Postgres. */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { brandAssets } from "@/db/schema";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED = new Set(["png", "jpeg", "webp", "svg", "gif"]);

export const brandAssetPath = (id: string) => `/brand-assets/${id}.png`;
export const brandAssetIdFromPath = (path: string | null | undefined) => path?.match(/^\/brand-assets\/([A-Za-z0-9_-]{8,40})\.png$/)?.[1] ?? null;

export class AssetError extends Error {}

export async function storeBrandAsset(organizationId: number, kind: "logo" | "favicon", bytes: Buffer) {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new AssetError("The file is larger than 2 MB");
  let format: string | undefined;
  try {
    format = (await sharp(bytes).metadata()).format;
  } catch {
    throw new AssetError("This file isn't an image we can read");
  }
  if (!format || !ACCEPTED.has(format)) throw new AssetError("Use a PNG, JPG, WebP or SVG image");
  const image = sharp(bytes, { density: format === "svg" ? 300 : undefined }).ensureAlpha();
  const resized =
    kind === "favicon"
      ? image.resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      : image.resize(512, 512, { fit: "inside", withoutEnlargement: format !== "svg" });
  const { data, info } = await resized.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  const id = randomBytes(15).toString("base64url");
  await db.insert(brandAssets).values({ id, organizationId, kind, mimeType: "image/png", width: info.width, height: info.height, sizeBytes: data.length, data });
  return brandAssetPath(id);
}

export async function loadBrandAsset(id: string) {
  const [asset] = await db.select().from(brandAssets).where(eq(brandAssets.id, id));
  return asset ?? null;
}
