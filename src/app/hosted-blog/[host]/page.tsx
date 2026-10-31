import Link from "next/link";
import type { Metadata } from "next";
import { blogArticles } from "@/server/hosted-blog";
import { blogTranslator, requireBlog } from "@/server/hosted-blog-page";

export async function generateMetadata({ params }: PageProps<"/hosted-blog/[host]">): Promise<Metadata> {
  const blog = await requireBlog((await params).host);
  const description = blog.site.description ?? blog.site.positioning ?? undefined;
  return {
    title: blog.name,
    description,
    alternates: { canonical: `${blog.origin}/`, types: { "application/rss+xml": `${blog.origin}/rss.xml` } },
    icons: blog.site.logoUrl ? { icon: blog.site.logoUrl } : undefined,
    openGraph: { title: blog.name, description, url: `${blog.origin}/`, type: "website" },
  };
}

export default async function HostedBlogIndex({ params, searchParams }: PageProps<"/hosted-blog/[host]">) {
  const [{ host }, query] = await Promise.all([params, searchParams]);
  const blog = await requireBlog(host);
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const { rows, pages } = await blogArticles(blog.site.id, page);
  const t = blogTranslator();
  const date = (value: Date | null) => (value ? value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: blog.site.timeZone }) : "");

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-[#111827] md:text-4xl">{t("latest")}</h1>
      {rows.length === 0 ? (
        <p className="mt-8 text-[#6b7280]">{t("empty")}</p>
      ) : (
        <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((article) => (
            <li key={article.id}>
              <Link href={`/${article.slug}`} className="group block">
                {article.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.heroImageUrl} alt={article.media.find((item) => item.identifier === "hero_image")?.altText ?? ""} loading="lazy" className="aspect-[16/9] w-full rounded-2xl object-cover" />
                )}
                <p className="mt-4 text-xs uppercase tracking-wide text-[#6b7280]">{date(article.publishedAt)}</p>
                <h2 className="mt-1 text-lg font-semibold leading-snug text-[#111827] group-hover:underline">{article.title}</h2>
                {article.metaDescription && <p className="mt-2 line-clamp-3 text-[15px] text-[#4b5563]">{article.metaDescription}</p>}
                <span className="mt-3 inline-block text-sm font-semibold" style={{ color: "var(--blog-accent)" }}>{t("readMore")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-14 flex items-center justify-between text-sm font-medium">
          {page > 1 ? <Link href={page === 2 ? "/" : `/?page=${page - 1}`} className="hover:underline">← {t("newer")}</Link> : <span />}
          <span className="text-[#6b7280]">{t("pageOf", { page, pages })}</span>
          {page < pages ? <Link href={`/?page=${page + 1}`} className="hover:underline">{t("older")} →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
