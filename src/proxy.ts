import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

const hostOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
};

/** The app's own hosts never serve a hosted blog, so they skip the lookup. */
const APP_HOSTS = new Set([hostOf(process.env.APP_URL), hostOf(process.env.BETTER_AUTH_URL), "localhost", "127.0.0.1"].filter(Boolean) as string[]);
const BLOG_FILES = new Set(["/sitemap.xml", "/robots.txt", "/rss.xml"]);

// Best-effort cache of host lookups; a miss just asks again.
const known = new Map<string, { blog: boolean; until: number }>();

async function isHostedBlog(host: string, request: NextRequest) {
  const hit = known.get(host);
  if (hit && hit.until > Date.now()) return hit.blog;
  try {
    const response = await fetch(new URL(`/api/hosts/${encodeURIComponent(host)}`, request.url), { signal: AbortSignal.timeout(3000) });
    const blog = response.ok && ((await response.json()) as { blog?: boolean }).blog === true;
    known.set(host, { blog, until: Date.now() + 60_000 });
    return blog;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0]!.toLowerCase();
  const { pathname } = request.nextUrl;
  // Agencies' white-label domains and clients' hosted blogs arrive on other hosts.
  if (host && !APP_HOSTS.has(host) && (await isHostedBlog(host, request))) {
    const url = request.nextUrl.clone();
    url.pathname = `/hosted-blog/${host}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  if (BLOG_FILES.has(pathname) || pathname.startsWith("/hosted-blog/")) return NextResponse.next();
  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (plus the blog's files).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/sitemap.xml", "/robots.txt", "/rss.xml"],
};
