import { getAppContext } from "@/server/context";
import { storeImage } from "@/server/media";

const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Stores a product photo for a manual product; returns its public URL. */
export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") return Response.json({ error: "Only workspace admins can change the product catalog" }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !TYPES.includes(file.type)) return Response.json({ error: "Only PNG, JPG, JPEG, or WEBP images are allowed" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "The image is larger than 10 MB" }, { status: 413 });
  try {
    const stored = await storeImage({ siteId: context.site.id, kind: "product", bytes: Buffer.from(await file.arrayBuffer()) });
    return Response.json({ url: stored.url });
  } catch {
    return Response.json({ error: "Failed to upload image" }, { status: 400 });
  }
}
