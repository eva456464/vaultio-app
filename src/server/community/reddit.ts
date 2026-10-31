/**
 * Optional Reddit Data API access (application-only OAuth) for thread details: votes, comment count,
 * post text, age, and whether the thread still accepts replies. Used only when REDDIT_CLIENT_ID and
 * REDDIT_CLIENT_SECRET are set; without them threads are shown with what the search found.
 * Commercial use of the Reddit Data API needs Reddit's approval (see docs/ARCHITECTURE.md).
 */

export type RedditDetails = {
  id: string;
  subreddit: string;
  title: string;
  body: string | null;
  author: string | null;
  upvotes: number;
  numComments: number;
  postedAt: Date;
  /** Archived, locked, removed or adult threads can't (or shouldn't) be replied to. */
  closed: boolean;
};

const USER_AGENT = `web:vaultio-agents:1.0 (by /u/${process.env.REDDIT_USERNAME ?? "vaultio"})`;

export const redditApiConfigured = () => Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);

let token: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const credentials = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${process.env.REDDIT_AUTH_URL ?? "https://www.reddit.com"}/api/v1/access_token`, {
    method: "POST",
    headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Reddit sign-in failed (HTTP ${response.status})`);
  const json = (await response.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

type Listing = { data?: { children?: { kind: string; data: Record<string, unknown> }[] } };

/** Details for up to 100 thread ids per call (ids without the "t3_" prefix). */
export async function redditDetails(ids: string[]): Promise<Map<string, RedditDetails>> {
  const details = new Map<string, RedditDetails>();
  if (!ids.length || !redditApiConfigured()) return details;
  const bearer = await accessToken();
  for (let start = 0; start < ids.length; start += 100) {
    const batch = ids.slice(start, start + 100).map((id) => `t3_${id}`);
    const response = await fetch(`${process.env.REDDIT_API_URL ?? "https://oauth.reddit.com"}/api/info?id=${batch.join(",")}&raw_json=1`, {
      headers: { authorization: `Bearer ${bearer}`, "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Reddit returned HTTP ${response.status}`);
    const listing = (await response.json()) as Listing;
    for (const child of listing.data?.children ?? []) {
      const post = child.data;
      const id = String(post.id ?? "");
      if (!id) continue;
      const removed = post.removed_by_category != null || post.selftext === "[removed]" || post.selftext === "[deleted]";
      details.set(id, {
        id,
        subreddit: String(post.subreddit ?? ""),
        title: String(post.title ?? ""),
        body: typeof post.selftext === "string" && post.selftext && !removed ? post.selftext.slice(0, 4000) : null,
        author: typeof post.author === "string" && post.author !== "[deleted]" ? post.author : null,
        upvotes: Number(post.score ?? 0),
        numComments: Number(post.num_comments ?? 0),
        postedAt: new Date(Number(post.created_utc ?? 0) * 1000),
        closed: Boolean(post.archived || post.locked || post.over_18) || removed,
      });
    }
  }
  return details;
}
