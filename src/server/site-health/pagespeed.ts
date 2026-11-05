/**
 * PageSpeed Insights (Lighthouse, mobile). Works without a key at low volume; PAGESPEED_API_KEY
 * raises the quota. PAGESPEED_API_BASE points at a stand-in for tests.
 */
import type { SpeedMetrics } from "@/db/schema";

const API = () => process.env.PAGESPEED_API_BASE ?? "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed";

type Audit = { numericValue?: number };
type Response = { lighthouseResult?: { categories?: { performance?: { score?: number | null } }; audits?: Record<string, Audit> } };

export async function pageSpeed(url: string): Promise<SpeedMetrics | null> {
  const query = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  if (process.env.PAGESPEED_API_KEY) query.set("key", process.env.PAGESPEED_API_KEY);
  try {
    const response = await fetch(`${API()}?${query}`, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok) {
      console.error(`[pagespeed] ${url}: HTTP ${response.status}`);
      return null;
    }
    const json = (await response.json()) as Response;
    const score = json.lighthouseResult?.categories?.performance?.score;
    if (typeof score !== "number") return null;
    const audits = json.lighthouseResult?.audits ?? {};
    const value = (key: string) => (typeof audits[key]?.numericValue === "number" ? audits[key]!.numericValue! : null);
    const ms = (key: string) => (value(key) === null ? null : Math.round(value(key)!));
    return {
      performance: Math.round(score * 100),
      fcpMs: ms("first-contentful-paint"),
      lcpMs: ms("largest-contentful-paint"),
      tbtMs: ms("total-blocking-time"),
      cls: value("cumulative-layout-shift") === null ? null : Math.round(value("cumulative-layout-shift")! * 1000) / 1000,
      speedIndexMs: ms("speed-index"),
    };
  } catch (error) {
    console.error(`[pagespeed] ${url}:`, (error as Error).message);
    return null;
  }
}
