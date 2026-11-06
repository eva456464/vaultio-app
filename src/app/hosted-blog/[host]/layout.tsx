import Link from "next/link";
import type { CSSProperties } from "react";
import { blogTranslator, requireBlog } from "@/server/hosted-blog-page";

export default async function HostedBlogLayout({ children, params }: LayoutProps<"/hosted-blog/[host]">) {
  const { host } = await params;
  const blog = await requireBlog(host);
  const t = blogTranslator();
  return (
    <div style={{ "--blog-accent": blog.accent } as CSSProperties} className="flex min-h-dvh flex-col">
      <header className="border-b border-[#eef0f3]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            {blog.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blog.logoUrl} alt="" className="h-9 max-w-40 rounded-lg object-contain" />
            )}
            <span className="text-lg font-semibold tracking-tight text-[#111827]">{blog.name}</span>
          </Link>
          <a href={blog.site.url} className="text-sm font-medium text-[#4b5563] hover:text-[#111827]">
            {t("backToSite", { site: new URL(blog.site.url).hostname.replace(/^www\./, "") })} →
          </a>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#eef0f3]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-[#6b7280]">
          <span>{t("rights", { year: new Date().getFullYear(), name: blog.name })}</span>
          <span className="flex gap-4">
            <Link href="/rss.xml" className="hover:text-[#111827]">RSS</Link>
            <a href={blog.site.url} className="hover:text-[#111827]">{new URL(blog.site.url).hostname.replace(/^www\./, "")}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
