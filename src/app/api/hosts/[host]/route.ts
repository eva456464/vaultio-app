import { blogForHost } from "@/server/hosted-blog";

/** Lets the proxy ask whether a host is a hosted blog (it can't query the database itself). */
export async function GET(_request: Request, { params }: RouteContext<"/api/hosts/[host]">) {
  const { host } = await params;
  const blog = /^[a-z0-9.-]{3,253}$/i.test(host) ? await blogForHost(host) : null;
  return Response.json({ blog: Boolean(blog) }, { headers: { "cache-control": "public, max-age=60" } });
}
