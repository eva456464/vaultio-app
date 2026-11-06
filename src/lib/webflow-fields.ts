/** Article parts a Webflow CMS field can receive, by field type (shared by the wizard and the publisher). */
export const ARTICLE_PARTS = ["body", "summary", "image", "imageAlt", "metaTitle", "metaDescription", "publishedAt", "author", "keyword"] as const;
export type ArticlePart = (typeof ARTICLE_PARTS)[number];

const PARTS_FOR_TYPE: Record<string, ArticlePart[]> = {
  RichText: ["body"],
  PlainText: ["summary", "metaTitle", "metaDescription", "imageAlt", "author", "keyword"],
  Image: ["image"],
  DateTime: ["publishedAt"],
};
export const partsForType = (type: string) => PARTS_FOR_TYPE[type] ?? [];
