import { loadMedia } from "@/server/media";

/** Public article images. Ids are random and content never changes, so responses cache forever. */
export async function GET(_request: Request, { params }: RouteContext<"/media/[file]">) {
  const { file } = await params;
  const id = file.replace(/\.webp$/, "");
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const media = await loadMedia(id);
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      "content-type": media.mimeType,
      "content-length": String(media.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
    },
  });
}
