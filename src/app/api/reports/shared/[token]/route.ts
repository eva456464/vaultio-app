import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { agencyReports } from "@/db/schema";

/** A sent report, exactly as it was emailed (public, read-only). */
export async function GET(_request: Request, { params }: RouteContext<"/api/reports/shared/[token]">) {
  const { token } = await params;
  const [report] = await db.select({ html: agencyReports.html }).from(agencyReports).where(eq(agencyReports.shareToken, token));
  if (!report?.html) return new NextResponse("Report not found", { status: 404 });
  return new NextResponse(report.html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
