/** Writing options shared by Settings → Writing, the planner and the article writer. */
import type { ArticleType } from "@/db/schema";

export const ENGLISH_TYPES = ["american", "british", "australian", "canadian", "south_african"] as const;
export type EnglishType = (typeof ENGLISH_TYPES)[number];
export const ENGLISH_NAMES: Record<EnglishType, string> = {
  american: "American English",
  british: "British English",
  australian: "Australian/New Zealand English",
  canadian: "Canadian English",
  south_african: "South African English",
};
export const asEnglishType = (value: string | null | undefined): EnglishType => (ENGLISH_TYPES as readonly string[]).includes(value ?? "") ? (value as EnglishType) : "american";

export const ARTICLE_LENGTHS = ["dynamic", "short", "medium", "long"] as const;
export type ArticleLength = (typeof ARTICLE_LENGTHS)[number];
export const LENGTH_RANGES: Record<Exclude<ArticleLength, "dynamic">, [number, number]> = { short: [1200, 1600], medium: [1700, 2300], long: [2400, 2800] };

/** The four types a website can allow (as in the reference product); the planner's other types map onto them. */
export const SELECTABLE_ARTICLE_TYPES = ["guide_explainer", "guide_how_to", "listicle_educational", "listicle_comparison"] as const;
const FAMILY: Record<ArticleType, (typeof SELECTABLE_ARTICLE_TYPES)[number]> = {
  guide_explainer: "guide_explainer",
  guide_how_to: "guide_how_to",
  listicle_educational: "listicle_educational",
  listicle_comparison: "listicle_comparison",
  comparison: "listicle_comparison",
  case_study: "guide_explainer",
  opinion: "guide_explainer",
};

/** The planned type if the website allows it, otherwise the closest allowed one. */
export function allowedArticleType(type: ArticleType, allowed: string[]): ArticleType {
  if (!allowed.length || allowed.includes(FAMILY[type])) return type;
  const fallbacks: Record<string, string[]> = {
    guide_explainer: ["guide_how_to", "listicle_educational", "listicle_comparison"],
    guide_how_to: ["guide_explainer", "listicle_educational", "listicle_comparison"],
    listicle_educational: ["guide_explainer", "guide_how_to", "listicle_comparison"],
    listicle_comparison: ["listicle_educational", "guide_explainer", "guide_how_to"],
  };
  return (fallbacks[FAMILY[type]]!.find((candidate) => allowed.includes(candidate)) ?? allowed[0]) as ArticleType;
}

/** Internal links in the website's preferred form (with or without "www", with or without a trailing slash). */
export function formatInternalLinks(markdown: string, siteUrl: string, options: { www: boolean; trailingSlash: boolean }) {
  if (!options.www && !options.trailingSlash) return markdown;
  const host = new URL(siteUrl).hostname.replace(/^www\./, "");
  return markdown.replace(/\]\((https?:\/\/)(www\.)?([^/\s)]+)([^\s)]*)\)/g, (whole, scheme: string, _www: string | undefined, linkHost: string, rest: string) => {
    if (linkHost.toLowerCase() !== host.toLowerCase()) return whole;
    let path = rest || "/";
    const [pathname, ...tail] = path.split(/(?=[?#])/);
    path = pathname!;
    // Only page paths get a slash, not files (".pdf", ".jpg").
    if (options.trailingSlash && !path.endsWith("/") && !/\.[a-z0-9]{2,5}$/i.test(path)) path = `${path}/`;
    return `](${scheme}${options.www ? "www." : ""}${host}${path}${tail.join("")})`;
  });
}

/** "Recommended reads" in the article's language (English when not listed). */
export const RECOMMENDED_TITLES: Record<string, string> = {
  en: "Recommended reads", es: "Lecturas recomendadas", fr: "À lire aussi", de: "Weiterlesen", nl: "Aanbevolen artikelen", pt: "Leituras recomendadas",
  it: "Letture consigliate", pl: "Polecane artykuły", sv: "Rekommenderad läsning", da: "Anbefalet læsning", no: "Anbefalt lesning", fi: "Suositellut artikkelit",
  cs: "Doporučené články", ro: "Lecturi recomandate", hu: "Ajánlott cikkek", tr: "Önerilen yazılar", el: "Προτεινόμενα άρθρα", ru: "Рекомендуем прочитать",
  uk: "Рекомендуємо прочитати", ja: "おすすめ記事", ko: "추천 글", zh: "推荐阅读", ar: "مقالات مقترحة", he: "מומלץ לקריאה", hi: "सुझाए गए लेख",
};
