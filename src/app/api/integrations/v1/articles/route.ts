import { NextResponse } from "next/server";
import { corsHeaders, listArticles, preflight, siteFromApiKey, summary, unauthorized } from "@/server/publishing/content-api";

/**
 * GET /api/integrations/v1/articles?limit=&offset=&status= — article summaries for the key's site,
 * newest first. `status=published` leaves out articles that haven't gone live yet.
 */
export async function GET(request: Request) {
  const site = await siteFromApiKey(request);
  if (!site) return unauthorized(request);
  const params = new URL(request.url).searchParams;
  const limit = Math.min(50, Math.max(1, Number(params.get("limit")) || 50));
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const rows = await listArticles(site, limit, offset, params.get("status") === "published");
  return NextResponse.json(
    rows.map((row) => summary(site, row)),
    { headers: corsHeaders(request) },
  );
}

export const OPTIONS = preflight;
