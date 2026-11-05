/** Display metadata for site health issue types (shared by the app and the public share page). */
export type IssueCategory = "crawler" | "technical" | "ai";

export const ISSUE_CATEGORY: Record<string, IssueCategory> = {
  missing_robots_txt: "crawler",
  robots_blocks_search: "crawler",
  missing_sitemap: "crawler",
  sitemap_unreadable: "crawler",
  missing_llms_txt: "crawler",
  ai_crawlers_blocked: "crawler",
  not_https: "crawler",
  missing_structured_data: "ai",
  invalid_structured_data: "ai",
  unanswered_questions: "ai",
};

export const categoryOf = (issueType: string): IssueCategory => ISSUE_CATEGORY[issueType] ?? "technical";

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function scoreLabel(score: number) {
  return score >= 80 ? "good" : score >= 50 ? "fair" : "poor";
}

export const MAX_AUDIT_PAGES = 20;
