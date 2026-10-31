import { NextResponse } from "next/server";
import { getAppContext } from "@/server/context";
import { getArticle } from "@/server/queries/content";

/** Download an article as Markdown (default) or standalone HTML. */
export async function GET(request: Request, { params }: RouteContext<"/api/articles/[id]/export">) {
  const { id } = await params;
  const context = await getAppContext();
  if (!context?.site) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await getArticle(context.site.id, Number(id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { article } = row;
  const format = new URL(request.url).searchParams.get("format") === "html" ? "html" : "md";
  const body =
    format === "html"
      ? `<!doctype html>\n<html lang="${article.languageCode}">\n<head>\n<meta charset="utf-8">\n<title>${article.title}</title>\n<meta name="description" content="${(article.metaDescription ?? "").replace(/"/g, "&quot;")}">\n${[article.jsonLd, article.faqJsonLd].filter(Boolean).map((json) => `<script type="application/ld+json">${JSON.stringify(json)}</script>`).join("\n")}\n</head>\n<body>\n<h1>${article.title}</h1>\n${article.htmlContent ?? ""}\n</body>\n</html>\n`
      : `# ${article.title}\n\n${article.content ?? ""}`;
  return new NextResponse(body, {
    headers: {
      "content-type": format === "html" ? "text/html; charset=utf-8" : "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${article.slug}.${format}"`,
    },
  });
}
