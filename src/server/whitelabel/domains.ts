/**
 * Custom domains for white-label agencies.
 *
 * Hosting domain: with VERCEL_TOKEN + VERCEL_PROJECT_ID the domain is added to the Vercel project
 * (which issues its HTTPS certificate) and Vercel's recommended CNAME and any ownership TXT record
 * are shown; otherwise the domain must CNAME to CUSTOM_DOMAIN_CNAME (or the app's own host) and the
 * hosting provider must serve it, and we only check DNS.
 *
 * Email sending domain: added to Resend, whose DKIM/SPF/MX records are shown until verified.
 *
 * Written from the Vercel and Resend REST APIs as documented; not yet run against the live services.
 */
import { resolveCname } from "node:dns/promises";
import type { WhitelabelDnsRecord, WhitelabelEmailRecord } from "@/db/schema";

export type HostingCheck = { verified: boolean; records: WhitelabelDnsRecord[]; error: string | null };
export type EmailDomain = { id: string; status: string; records: WhitelabelEmailRecord[] };

const HOST_PATTERN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "https://App.Agency.com/login" → "app.agency.com"; null when it isn't a usable domain name. */
export function normalizeDomain(input: string) {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  return HOST_PATTERN.test(host) ? host : null;
}

const hostOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
};

/** The platform's own hosts, which no agency may claim. */
export const platformHosts = () => new Set([hostOf(process.env.APP_URL), hostOf(process.env.BETTER_AUTH_URL), "localhost"].filter(Boolean) as string[]);

const trimDot = (value: string) => value.toLowerCase().replace(/\.$/, "");

// ------------------------------------------------------------------ Vercel

export const vercelConfigured = () => Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);

async function vercel<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const base = (process.env.VERCEL_API_BASE ?? "https://api.vercel.com").replace(/\/$/, "");
  const team = process.env.VERCEL_TEAM_ID ? `${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  const response = await fetch(`${base}${path}${team}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

type VercelProjectDomain = { name?: string; verified?: boolean; verification?: { type: string; domain: string; value: string; reason?: string }[]; error?: { code?: string; message?: string } };
type VercelDomainConfig = { misconfigured?: boolean; recommendedCNAME?: { rank: number; value: string }[]; recommendedIPv4?: { rank: number; value: string[] }[]; cnames?: string[] };

/** A root domain (example.com, example.co.uk) can't have a CNAME record: it points with A records instead. */
export function isApexDomain(domain: string) {
  const labels = domain.toLowerCase().split(".");
  if (labels.length === 2) return true;
  return labels.length === 3 && /^(co|com|org|net|ac|gov|edu|ltd|plc)$/.test(labels[1]!) && labels[2]!.length === 2;
}

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID!);

async function checkOnVercel(domain: string): Promise<HostingCheck> {
  let current = await vercel<VercelProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`);
  if (current.status === 404) return { verified: false, records: [], error: "The domain isn't added yet. Save it again." };
  if (current.status >= 400) return { verified: false, records: [], error: current.body.error?.message ?? `Vercel returned HTTP ${current.status}` };
  if (!current.body.verified) {
    // Asks Vercel to look for the ownership record now; it answers with an error until it's there.
    const verify = await vercel<VercelProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(domain)}/verify`, { method: "POST" });
    if (verify.status < 400) current = verify;
  }
  const config = await vercel<VercelDomainConfig>(`/v6/domains/${encodeURIComponent(domain)}/config`);
  const cname = [...(config.body.recommendedCNAME ?? [])].sort((a, b) => a.rank - b.rank)[0]?.value ?? "cname.vercel-dns.com.";
  const ips = [...(config.body.recommendedIPv4 ?? [])].sort((a, b) => a.rank - b.rank)[0]?.value ?? ["76.76.21.21"];
  const records: WhitelabelDnsRecord[] = [
    ...(isApexDomain(domain) ? ips.map((ip) => ({ type: "A", name: domain, value: ip })) : [{ type: "CNAME", name: domain, value: cname }]),
    ...(current.body.verification ?? []).map((item) => ({ type: item.type, name: item.domain, value: item.value })),
  ];
  const verified = Boolean(current.body.verified) && config.body.misconfigured === false;
  return { verified, records, error: verified ? null : config.body.misconfigured ? "The DNS record isn't pointing at the app yet." : null };
}

// ------------------------------------------------------------------ Hosting domain

/** CNAME target when not on Vercel. */
const manualTarget = () => trimDot(process.env.CUSTOM_DOMAIN_CNAME || hostOf(process.env.APP_URL) || hostOf(process.env.BETTER_AUTH_URL) || "localhost");

export async function connectHostingDomain(domain: string): Promise<HostingCheck> {
  if (vercelConfigured()) {
    const added = await vercel<VercelProjectDomain>(`/v10/projects/${project()}/domains`, { method: "POST", body: JSON.stringify({ name: domain }) });
    if (added.status === 409) {
      // 409 means the domain is in use: fine if it's on this project already (saved again), not if another project has it.
      const ours = await vercel<VercelProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`);
      if (ours.status >= 400) return { verified: false, records: [], error: added.body.error?.message ?? "This domain is already used by another Vercel project. Remove it there first." };
    } else if (added.status >= 400) return { verified: false, records: [], error: added.body.error?.message ?? `Vercel returned HTTP ${added.status}` };
  }
  return checkHostingDomain(domain);
}

export async function checkHostingDomain(domain: string): Promise<HostingCheck> {
  if (vercelConfigured()) return checkOnVercel(domain);
  const target = manualTarget();
  const records = [{ type: "CNAME", name: domain, value: `${target}.` }];
  try {
    const answers = (await resolveCname(domain)).map(trimDot);
    if (answers.includes(target)) return { verified: true, records, error: null };
    return { verified: false, records, error: `The domain points to ${answers.join(", ")} instead.` };
  } catch {
    return { verified: false, records, error: null };
  }
}

export async function disconnectHostingDomain(domain: string) {
  if (!vercelConfigured()) return;
  await vercel(`/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`, { method: "DELETE" }).catch(() => undefined);
}

// ------------------------------------------------------------------ Email sending domain (Resend)

export const emailDomainsConfigured = () => Boolean(process.env.RESEND_API_KEY);

async function resend<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const base = (process.env.RESEND_API_BASE ?? "https://api.resend.com").replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

type ResendDomain = { id?: string; name?: string; status?: string; records?: (WhitelabelEmailRecord & { priority?: number })[]; message?: string };

const toEmailDomain = (domain: ResendDomain): EmailDomain => ({
  id: domain.id!,
  status: domain.status ?? "not_started",
  records: (domain.records ?? []).map((record) => ({ record: record.record, name: record.name, value: record.value, type: record.type, status: record.status, ttl: record.ttl, ...(record.priority !== undefined ? { priority: record.priority } : {}) })),
});

export async function createEmailDomain(name: string): Promise<EmailDomain> {
  const created = await resend<ResendDomain>("/domains", { method: "POST", body: JSON.stringify({ name }) });
  if (created.status < 400 && created.body.id) return toEmailDomain(created.body);
  // Already added to this Resend account: find it.
  const list = await resend<{ data?: ResendDomain[] }>("/domains");
  const existing = list.body.data?.find((domain) => domain.name === name);
  if (existing?.id) return getEmailDomain(existing.id);
  throw new Error(created.body.message ?? `Resend returned HTTP ${created.status}`);
}

export async function getEmailDomain(id: string): Promise<EmailDomain> {
  const domain = await resend<ResendDomain>(`/domains/${encodeURIComponent(id)}`);
  if (domain.status >= 400 || !domain.body.id) throw new Error(domain.body.message ?? `Resend returned HTTP ${domain.status}`);
  return toEmailDomain(domain.body);
}

/** Asks Resend to check the DNS records now, then returns the current state. */
export async function verifyEmailDomain(id: string): Promise<EmailDomain> {
  await resend(`/domains/${encodeURIComponent(id)}/verify`, { method: "POST" }).catch(() => undefined);
  return getEmailDomain(id);
}

export async function deleteEmailDomain(id: string) {
  await resend(`/domains/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
}
