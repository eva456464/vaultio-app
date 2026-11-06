import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles, getTags } from "__PACKAGE__";
import { ArticleCard, Pagination } from "../../components";

export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getTags()).map((tag) => ({ slug: tag.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { tag } = await getArticles({ tag: slug });
  return tag ? { title: `${tag.name} · Blog`, alternates: { canonical: `/blog/tag/${tag.slug}` } } : {};
}

export default async function TagPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const result = await getArticles({ tag: slug, page: Number(page) || 1 });
  if (!result.tag) notFound();
  return (
    <main className="blog-container">
      <p className="blog-eyebrow">Tag</p>
      <h1 className="blog-title">{result.tag.name}</h1>
      <div className="blog-grid">
        {result.articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} base={`/blog/tag/${result.tag.slug}`} />
    </main>
  );
}
