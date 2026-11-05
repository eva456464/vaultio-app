/** Checks links and images once per audit: status, size and type, a few at a time. */
import { BOT_USER_AGENT } from "../agents/web";
import type { Probe } from "./checks";

const TIMEOUT = 8000;

async function probeOnce(url: string): Promise<Probe> {
  const request = (method: "HEAD" | "GET") =>
    fetch(url, { method, redirect: "follow", headers: { "user-agent": BOT_USER_AGENT, ...(method === "GET" ? { range: "bytes=0-0" } : {}) }, signal: AbortSignal.timeout(TIMEOUT) });
  try {
    let response = await request("HEAD");
    // Some servers don't answer HEAD properly; ask for the first byte instead.
    if (response.status === 405 || response.status === 501 || response.status === 403) {
      response = await request("GET");
      await response.body?.cancel();
    }
    const range = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
    const length = response.headers.get("content-length");
    const bytes = range ? Number(range) : response.status !== 206 && length ? Number(length) : null;
    return { url, status: response.status, bytes: Number.isFinite(bytes) ? bytes : null, type: response.headers.get("content-type") };
  } catch (error) {
    // A name that doesn't resolve is broken; a timeout or refused connection isn't counted.
    const code = (error as { cause?: { code?: string } }).cause?.code;
    return { url, status: code === "ENOTFOUND" ? -1 : 0, bytes: null, type: null };
  }
}

export function createProber(options: { maxRequests?: number; concurrency?: number } = {}) {
  const cache = new Map<string, Promise<Probe>>();
  const maxRequests = options.maxRequests ?? 400;
  const concurrency = options.concurrency ?? 8;
  let active = 0;
  const waiting: (() => void)[] = [];
  const slot = async () => {
    if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
  };
  const release = () => {
    active -= 1;
    waiting.shift()?.();
  };
  const probe = (url: string) => {
    if (!cache.has(url)) {
      if (cache.size >= maxRequests) return Promise.resolve<Probe>({ url, status: 0, bytes: null, type: null });
      cache.set(
        url,
        (async () => {
          await slot();
          try {
            return await probeOnce(url);
          } finally {
            release();
          }
        })(),
      );
    }
    return cache.get(url)!;
  };
  /** Probes the URLs (at most `limit` of them) and returns the results by URL. */
  return async (urls: string[], limit = 40) => {
    const picked = [...new Set(urls)].slice(0, limit);
    const results = await Promise.all(picked.map(probe));
    return new Map(results.map((result) => [result.url, result]));
  };
}
