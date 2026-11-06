import Image from "next/image";
import Link from "next/link";
import type { BlogArticle } from "__PACKAGE__";

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "");

export function ArticleCard({ article }: { article: BlogArticle }) {
  return (
    <article className="blog-card">
      {article.heroImageUrl && (
        <Link href={`/blog/${article.slug}`} className="blog-card-image">
          <Image src={article.heroImageUrl} alt="" width={800} height={450} sizes="(max-width: 768px) 100vw, 33vw" />
        </Link>
      )}
      <div className="blog-card-body">
        <Tags tags={article.tags} />
        <h2>
          <Link href={`/blog/${article.slug}`}>{article.title}</Link>
        </h2>
        <p>{article.metaDescription ?? article.excerpt}</p>
        <time dateTime={article.publishedAt ?? undefined}>{date(article.publishedAt)}</time>
      </div>
    </article>
  );
}

export function Tags({ tags }: { tags: BlogArticle["tags"] }) {
  if (!tags.length) return null;
  return (
    <ul className="blog-tags">
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link href={`/blog/tag/${tag.slug}`}>{tag.name}</Link>
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, totalPages, base }: { page: number; totalPages: number; base: string }) {
  if (totalPages < 2) return null;
  const href = (target: number) => (target === 1 ? base : `${base}?page=${target}`);
  return (
    <nav className="blog-pagination" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}>← Newer</Link> : <span />}
      <span>
        {page} / {totalPages}
      </span>
      {page < totalPages ? <Link href={href(page + 1)}>Older →</Link> : <span />}
    </nav>
  );
}

export { date as formatDate };
