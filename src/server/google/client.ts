/**
 * Google OAuth, Analytics (GA4) and Search Console over their REST APIs.
 * GA4 and Search Console are connected separately per site (like the reference product), each
 * with its own refresh token stored encrypted on the `integrations` row.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import type { AgentJob } from "../agents/schedule";
import { decryptJson, encryptJson } from "../crypto";

export type GoogleProduct = "ga4" | "gsc";
export const GOOGLE_PRODUCTS: GoogleProduct[] = ["ga4", "gsc"];
/** Agents that copy each product's data; run right away when a property is connected. */
export const GOOGLE_SYNC_JOBS = { ga4: ["analyticsSync", "aiTrafficReport"], gsc: ["rankingsCheck"] } as const satisfies Record<GoogleProduct, readonly AgentJob[]>;
type IntegrationRow = typeof integrations.$inferSelect;

const SCOPES: Record<GoogleProduct, string> = {
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
};

// GOOGLE_API_MOCK_URL points every endpoint at a local stand-in (scripts/dev-fixtures/mock-google.py).
const mock = process.env.GOOGLE_API_MOCK_URL?.replace(/\/$/, "");
const ENDPOINTS = {
  authorize: mock ? `${mock}/oauth/authorize` : "https://accounts.google.com/o/oauth2/v2/auth",
  token: mock ? `${mock}/oauth/token` : "https://oauth2.googleapis.com/token",
  revoke: mock ? `${mock}/oauth/revoke` : "https://oauth2.googleapis.com/revoke",
  analyticsAdmin: mock ? `${mock}/analyticsadmin/v1beta` : "https://analyticsadmin.googleapis.com/v1beta",
  analyticsData: mock ? `${mock}/analyticsdata/v1beta` : "https://analyticsdata.googleapis.com/v1beta",
  searchConsole: mock ? `${mock}/webmasters/v3` : "https://www.googleapis.com/webmasters/v3",
};

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function redirectUri() {
  const base = (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/integrations/google/callback`;
}

// ------------------------------------------------------------------ OAuth state

export type OAuthState = { siteId: number; product: GoogleProduct; userId: string; locale: string; exp: number; nonce: string };

const stateKey = () => createHash("sha256").update(`vaultio-google-state:${process.env.BETTER_AUTH_SECRET ?? ""}`).digest();

export function signState(state: Omit<OAuthState, "exp" | "nonce">) {
  const full: OAuthState = { ...state, exp: Date.now() + 15 * 60_000, nonce: randomBytes(8).toString("hex") };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${createHmac("sha256", stateKey()).update(body).digest("base64url")}`;
}

export function verifyState(value: string | null): OAuthState | null {
  const [body, signature] = (value ?? "").split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", stateKey()).update(body).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const state = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
  return state.exp > Date.now() && GOOGLE_PRODUCTS.includes(state.product) ? state : null;
}

export function authorizeUrl(product: GoogleProduct, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: `openid email profile ${SCOPES[product]}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${ENDPOINTS.authorize}?${params}`;
}

// ------------------------------------------------------------------ Tokens

type Tokens = { refreshToken: string; accessToken: string; expiresAt: number };
export type GoogleAccount = { email: string; name: string | null; picture: string | null };

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch(ENDPOINTS.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, string | number | undefined>;
  if (!response.ok) throw new GoogleApiError(String(json.error_description ?? json.error ?? `HTTP ${response.status}`), response.status, json.error as string | undefined);
  return json;
}

/** Exchanges the code from the consent screen for tokens and the Google account behind them. */
export async function exchangeCode(code: string) {
  const json = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!json.refresh_token) throw new GoogleApiError("Google did not return offline access. Please try connecting again.", 400);
  // The ID token comes straight from Google's token endpoint over TLS, so its claims can be read without verifying the signature.
  const claims = JSON.parse(Buffer.from(String(json.id_token ?? "").split(".")[1] ?? "", "base64url").toString("utf8") || "{}") as Record<string, string>;
  const tokens: Tokens = { refreshToken: String(json.refresh_token), accessToken: String(json.access_token), expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  const account: GoogleAccount = { email: claims.email ?? "", name: claims.name ?? null, picture: claims.picture ?? null };
  return { credentials: encryptJson(tokens), account };
}

async function accessToken(row: IntegrationRow, force = false) {
  if (!row.credentialsEncrypted) throw new GoogleApiError("Google is not connected", 401);
  const tokens = decryptJson<Tokens>(row.credentialsEncrypted);
  if (!force && tokens.expiresAt > Date.now() + 60_000) return tokens.accessToken;
  let json: Awaited<ReturnType<typeof tokenRequest>>;
  try {
    json = await tokenRequest({ grant_type: "refresh_token", refresh_token: tokens.refreshToken });
  } catch (error) {
    if (error instanceof GoogleApiError && error.code === "invalid_grant") {
      await db
        .update(integrations)
        .set({ status: "error", lastError: "Google access was removed. Reconnect to keep syncing.", updatedAt: new Date() })
        .where(eq(integrations.id, row.id));
    }
    throw error;
  }
  const next: Tokens = { ...tokens, accessToken: String(json.access_token), expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  row.credentialsEncrypted = encryptJson(next);
  await db.update(integrations).set({ credentialsEncrypted: row.credentialsEncrypted, updatedAt: new Date() }).where(eq(integrations.id, row.id));
  return next.accessToken;
}

async function googleFetch<T>(row: IntegrationRow, url: string, body?: unknown, retried = false): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bearer ${await accessToken(row, retried)}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status === 401 && !retried) return googleFetch(row, url, body, true);
  const json = (await response.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
  if (!response.ok) throw new GoogleApiError(json.error?.message ?? `Google API error (HTTP ${response.status})`, response.status, json.error?.status);
  return json as T;
}

/** Revokes the refresh token (best effort: the row is removed either way). */
export async function revokeAccess(row: IntegrationRow) {
  if (!row.credentialsEncrypted) return;
  const { refreshToken } = decryptJson<Tokens>(row.credentialsEncrypted);
  await fetch(`${ENDPOINTS.revoke}?token=${encodeURIComponent(refreshToken)}`, { method: "POST", signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
}

// ------------------------------------------------------------------ Google Analytics 4

export type Ga4PropertyOption = { id: string; name: string; account: string };

export async function listGa4Properties(row: IntegrationRow): Promise<Ga4PropertyOption[]> {
  const out: Ga4PropertyOption[] = [];
  let pageToken = "";
  do {
    const page = await googleFetch<{
      accountSummaries?: { displayName?: string; propertySummaries?: { property: string; displayName?: string }[] }[];
      nextPageToken?: string;
    }>(row, `${ENDPOINTS.analyticsAdmin}/accountSummaries?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`);
    for (const account of page.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        out.push({ id: property.property, name: property.displayName ?? property.property, account: account.displayName ?? "" });
      }
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

export async function getGa4Property(row: IntegrationRow, propertyId: string) {
  return googleFetch<{ createTime?: string; timeZone?: string }>(row, `${ENDPOINTS.analyticsAdmin}/${propertyId}`);
}

export type Ga4Filter = { fieldName: string; regex: string };
export type Ga4ReportRequest = { dimensions: string[]; metrics: string[]; startDate: string; endDate: string; filter?: Ga4Filter; limit?: number };
export type Ga4Row = { dimensions: string[]; metrics: number[] };

function ga4Body(request: Ga4ReportRequest, offset = 0) {
  return {
    dateRanges: [{ startDate: request.startDate, endDate: request.endDate }],
    dimensions: request.dimensions.map((name) => ({ name })),
    metrics: request.metrics.map((name) => ({ name })),
    ...(request.filter ? { dimensionFilter: { filter: { fieldName: request.filter.fieldName, stringFilter: { matchType: "PARTIAL_REGEXP", value: request.filter.regex, caseSensitive: false } } } } : {}),
    limit: request.limit ?? 100_000,
    offset,
    keepEmptyRows: false,
  };
}

type Ga4Response = { rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[]; rowCount?: number };
const ga4Rows = (response: Ga4Response): Ga4Row[] =>
  (response.rows ?? []).map((row) => ({ dimensions: (row.dimensionValues ?? []).map((d) => d.value), metrics: (row.metricValues ?? []).map((m) => Number(m.value)) }));

/** One report, following pages until every row is read (or `maxRows`). */
export async function runGa4Report(row: IntegrationRow, propertyId: string, request: Ga4ReportRequest, maxRows = 500_000): Promise<Ga4Row[]> {
  const out: Ga4Row[] = [];
  for (let offset = 0; offset < maxRows; ) {
    const response = await googleFetch<Ga4Response>(row, `${ENDPOINTS.analyticsData}/${propertyId}:runReport`, ga4Body(request, offset));
    const rows = ga4Rows(response);
    out.push(...rows);
    offset += rows.length;
    if (!rows.length || offset >= (response.rowCount ?? 0) || request.limit) break;
  }
  return out;
}

/** Up to five small reports per request. */
export async function runGa4Reports(row: IntegrationRow, propertyId: string, requests: Ga4ReportRequest[]): Promise<Ga4Row[][]> {
  const out: Ga4Row[][] = [];
  for (let index = 0; index < requests.length; index += 5) {
    const batch = requests.slice(index, index + 5);
    const response = await googleFetch<{ reports?: Ga4Response[] }>(row, `${ENDPOINTS.analyticsData}/${propertyId}:batchRunReports`, { requests: batch.map((request) => ga4Body(request)) });
    out.push(...batch.map((_, i) => ga4Rows(response.reports?.[i] ?? {})));
  }
  return out;
}

// ------------------------------------------------------------------ Search Console

export type GscSiteOption = { id: string; name: string; account: string };

export async function listGscSites(row: IntegrationRow): Promise<GscSiteOption[]> {
  const response = await googleFetch<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(row, `${ENDPOINTS.searchConsole}/sites`);
  return (response.siteEntry ?? [])
    .filter((site) => site.permissionLevel !== "siteUnverifiedUser")
    .map((site) => ({ id: site.siteUrl, name: site.siteUrl.replace(/^sc-domain:/, ""), account: site.siteUrl.startsWith("sc-domain:") ? "domain" : "prefix" }));
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/** Search analytics rows for the given dimensions, following pages up to `maxRows`. */
export async function queryGsc(row: IntegrationRow, siteUrl: string, request: { startDate: string; endDate: string; dimensions: string[] }, maxRows = 250_000): Promise<GscRow[]> {
  const out: GscRow[] = [];
  const pageSize = 25_000;
  for (let startRow = 0; startRow < maxRows; startRow += pageSize) {
    const response = await googleFetch<{ rows?: GscRow[] }>(row, `${ENDPOINTS.searchConsole}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      ...request,
      type: "web",
      rowLimit: pageSize,
      startRow,
    });
    out.push(...(response.rows ?? []));
    if ((response.rows ?? []).length < pageSize) break;
  }
  return out;
}
