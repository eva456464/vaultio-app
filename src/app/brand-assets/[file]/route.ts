import { loadBrandAsset } from "@/server/whitelabel/assets";

/** Public agency logos and favicons. Ids are random and files never change, so they cache forever. */
export async function GET(_request: Request, { params }: RouteContext<"/brand-assets/[file]">) {
  const { file } = await params;
  const id = file.replace(/\.png$/, "");
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const asset = await loadBrandAsset(id);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "content-type": asset.mimeType,
      "content-length": String(asset.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
