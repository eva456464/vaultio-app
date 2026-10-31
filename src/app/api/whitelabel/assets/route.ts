import { getAppContext } from "@/server/context";
import { AssetError, MAX_UPLOAD_BYTES, storeBrandAsset } from "@/server/whitelabel/assets";

/** Uploads a logo or favicon for the workspace's white label (admins only). Returns its public path. */
export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context?.organization || context.member?.role !== "admin") return Response.json({ error: "Only workspace admins can change the white label" }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || (kind !== "logo" && kind !== "favicon")) return Response.json({ error: "Choose an image to upload" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "The file is larger than 2 MB" }, { status: 413 });
  try {
    const path = await storeBrandAsset(context.organization.id, kind, Buffer.from(await file.arrayBuffer()));
    return Response.json({ path });
  } catch (error) {
    if (error instanceof AssetError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
