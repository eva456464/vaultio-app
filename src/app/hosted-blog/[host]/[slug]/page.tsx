import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogArticle, blogArticles } from "@/server/hosted-blog";
import { blogTranslator, requireBlog } from "@/server/hosted-blog-page";

const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export async function generateMetadata({ params }: PageProps<"/hosted-blog/[host]/[slug]">): Promise<Metadata> {
  const { host, slug } = await params;
  const blog = await requireBlog(host);
  const article = await blogArticle(blog.site.id, slug);
  if (!article) return {};
  const url = `${blog.origin}/${article.slug}`;
  return {
    title: `${article.title} | ${blog.name}`,
    description: article.metaDescription ?? undefined,
    alternates: { canonical: url },
    icons: blog.site.logoUrl ? { icon: blog.site.logoUrl } : undefined,
    openGraph: { title: article.title, description: article.metaDescription ?? undefined, url, type: "article", images: article.heroImageUrl ? [article.heroImageUrl] : undefined, publishedTime: article.publishedAt?.toISOString() },
    twitter: { card: article.heroImageUrl ? "summary_large_image" : "summary", title: article.title, description: article.metaDescription ?? undefined },
  };
}

export default async function HostedBlogArticle({ params }: PageProps<"/hosted-blog/[host]/[slug]">) {
  const { host, slug } = await params;
  const blog = await requireBlog(host);
  const article = await blogArticle(blog.site.id, slug);
  if (!article) notFound();
  const t = blogTranslator();
  const { rows } = await blogArticles(blog.site.id, 1);
  const related = rows.filter((row) => row.id !== article.id).slice(0, 3);
  const hero = article.media.find((item) => item.identifier === "hero_image");
  const date = article.publishedAt?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: blog.site.timeZone });

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="text-sm font-medium text-[#6b7280] hover:text-[#111827]">← {t("backToBlog")}</Link>
      <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-[#111827] md:text-[2.6rem]">{article.title}</h1>
      <p className="mt-4 text-sm text-[#6b7280]">
        {date && t("published", { date })}
        {blog.site.authorName && <> · {t("by", { author: blog.site.authorName })}</>}
      </p>
      {article.heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.heroImageUrl} alt={hero?.altText ?? ""} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
      )}
      {/* Rendered and sanitized when the article was written (src/server/markdown.ts). */}
      <div className="blog-prose mt-10" dangerouslySetInnerHTML={{ __html: article.htmlContent ?? "" }} />
      {article.jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article.jsonLd) }} /> : null}
      {article.faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(article.faqJsonLd) }} /> : null}
      {related.length > 0 && (
        <aside className="mt-16 border-t border-[#eef0f3] pt-10">
          <h2 className="text-lg font-semibold text-[#111827]">{t("related")}</h2>
          <ul className="mt-5 grid gap-6 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <Link href={`/${item.slug}`} className="group block">
                  {item.heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.heroImageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full rounded-xl object-cover" />
                  )}
                  <p className="mt-3 text-[15px] font-semibold leading-snug text-[#111827] group-hover:underline">{item.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
