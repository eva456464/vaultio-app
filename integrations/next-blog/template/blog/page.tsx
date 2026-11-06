import type { Metadata } from "next";
import { getArticles } from "__PACKAGE__";
import { ArticleCard, Pagination } from "./components";

export const revalidate = 86400;
export const metadata: Metadata = { title: "Blog", alternates: { canonical: "/blog" } };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const result = await getArticles({ page: Number(page) || 1 });
  return (
    <main className="blog-container">
      <h1 className="blog-title">Blog</h1>
      {result.articles.length === 0 ? (
        <p className="blog-empty">No articles yet.</p>
      ) : (
        <div className="blog-grid">
          {result.articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
      <Pagination page={result.page} totalPages={result.totalPages} base="/blog" />
    </main>
  );
}
