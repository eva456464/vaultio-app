import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticles, getArticle, siteUrl } from "__PACKAGE__";
import { formatDate, Tags } from "../components";

export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getAllArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  const description = article.metaDescription ?? article.excerpt;
  return {
    title: article.title,
    description,
    alternates: { canonical: `${siteUrl()}/blog/${article.slug}` },
    openGraph: { type: "article", title: article.title, description, publishedTime: article.publishedAt ?? undefined, modifiedTime: article.updatedAt, images: article.heroImageUrl ? [article.heroImageUrl] : [] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const schema = [article.jsonLd, article.faqJsonLd].filter(Boolean);
  return (
    <main className="blog-container blog-narrow">
      <Link href="/blog" className="blog-back">
        ← All articles
      </Link>
      <Tags tags={article.tags} />
      <h1 className="blog-article-title">{article.title}</h1>
      <time className="blog-date" dateTime={article.publishedAt ?? undefined}>
        {formatDate(article.publishedAt)}
      </time>
      {article.heroImageUrl && <Image className="blog-hero" src={article.heroImageUrl} alt="" width={1200} height={675} priority sizes="(max-width: 768px) 100vw, 768px" />}
      {/* The article's HTML is generated and sanitized by the platform. */}
      <article className="blog-prose" dangerouslySetInnerHTML={{ __html: article.html }} />
      {schema.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }} />
      ))}
    </main>
  );
}
