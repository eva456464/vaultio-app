/** Sections a client report can include, in display order. */
export const REPORT_BLOCKS = [
  "achievements",
  "summary",
  "kpis",
  "clicksChart",
  "countries",
  "pages",
  "keywords",
  "articles",
  "backlinks",
  "siteHealth",
  "community",
  "aiVisibility",
] as const;
export type ReportBlock = (typeof REPORT_BLOCKS)[number];

/** Sections filled from Google Search Console data. */
export const SEARCH_CONSOLE_BLOCKS: ReadonlySet<ReportBlock> = new Set(["summary", "kpis", "clicksChart", "countries", "pages", "keywords"]);
