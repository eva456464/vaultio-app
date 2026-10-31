/**
 * The prompt a client pastes into their Lovable project (Settings → Publishing → Lovable). Lovable
 * builds a blog that copies the website's published articles from the content API into the
 * project's own database every hour. It's written for Lovable's AI, so it stays in English.
 */

/** "Acme Growth" → "ACME_GROWTH_API_KEY" (the secret's name in Lovable). */
export function lovableSecretName(brandName: string) {
  const base = brandName
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return `${/^[A-Z]/.test(base) ? base : "BLOG"}_API_KEY`;
}

export function lovablePrompt({ apiBaseUrl, brandName, settingsUrl }: { apiBaseUrl: string; brandName: string; settingsUrl: string }) {
  const secret = lovableSecretName(brandName);
  const api = apiBaseUrl.replace(/\/$/, "");
  const host = new URL(api).host;
  return `Add a blog to this website that fills itself with the articles from my ${brandName} account.

Do the whole build in one go and match this project's existing design, components, fonts and colours. Don't ask me design questions. The only thing to ask me for is the secret in step 2.

## Ground rules

1. The ${brandName} API is only ever called from a backend function, never from browser code. Calls from the browser are refused.
2. The API key lives only as a backend secret. It never goes into frontend code, a VITE_ or other public variable, a file in the repo, or the chat.
3. Visitors never trigger an API call: the blog pages read only from this project's own database.
4. Call the API one request at a time with at least 1 second between requests. Never run API calls in parallel.
5. Send a User-Agent header such as "lovable-blog-sync/1.0" with every request.
6. If an article returns 404, it was removed: delete it from the table and don't request it again in that run.
7. Keep to the blog: no new dependencies, no tests, no refactoring, and no sample or placeholder articles. Apart from the blog, the only change is one "Blog" link in the navigation.

## 1. Detect the stack

- TanStack Start (\`@tanstack/react-start\`): server-rendered blog routes and a dynamic sitemap route.
- React + Vite single-page app: client routes and a generated \`public/sitemap.xml\` (Lovable pre-renders pages for search engines).

Follow this project's own routing and data conventions.

## 2. Store the API key as a backend secret

Turn on Lovable Cloud if it's off. Ask me for the key with the secure secret field (not the chat) and store it as \`${secret}\`. Never print or log it.

If I don't have a key yet, tell me: "${settingsUrl} → Lovable → Create API key".

## 3. Create the tables

\`blog_articles\`:

| column | type |
| --- | --- |
| id | bigint primary key (the article id from the API) |
| slug | text, unique, not null |
| previous_slugs | text[], default '{}' |
| title | text, not null |
| meta_description | text |
| hero_image_url | text |
| language_code | text |
| content_html | text |
| json_ld | jsonb |
| faq_json_ld | jsonb |
| published_at | timestamptz |
| article_updated_at | timestamptz |
| synced_at | timestamptz, default now() |

Turn on row-level security with one policy: public SELECT. No write policies; only the sync function writes, with the service role. Index \`slug\` and \`published_at desc\`.

\`blog_sync_state\`: one row (id = 1) with \`list_offset int default 0\`, \`last_run_at timestamptz\`, \`lease_until timestamptz\`. Row-level security on, no policies.

## 4. Create the sync function \`blog-sync\`

A backend function that copies articles into \`blog_articles\`, reading \`${secret}\` from the environment.

API:

- Base URL \`${api}\`. Headers on every call: \`X-API-Key: <key>\`, \`Accept: application/json\`, \`User-Agent: lovable-blog-sync/1.0\`.
- \`GET /v1/articles?status=published&limit=50&offset=<n>\` returns summaries, newest first, without the article body: \`id\`, \`title\`, \`slug\`, \`hero_image_url\`, \`languageCode\`, \`meta_description\`, \`published_at\`, \`updated_at\`. Fewer than 50 items means it's the last page.
- \`GET /v1/articles/{id}\` returns one article with \`content_html\`, \`jsonLd\` and \`faqJsonLd\` added.
- 401 means the key is wrong, 404 means the article no longer exists.

How it works:

1. Take a lease first so two runs never overlap: \`update blog_sync_state set lease_until = now() + interval '5 minutes' where id = 1 and (lease_until is null or lease_until < now()) returning *\`. If no row comes back, another run is busy: stop. Clear the lease in a \`finally\` block.
2. Page through the list from \`list_offset\`. An article needs its full text fetched only if it's new or its \`updated_at\` is newer than the stored \`article_updated_at\`.
3. Fetch at most 25 articles per run, one at a time, each with a 15-second timeout. Move \`list_offset\` past a page only once every article on it is stored. After the last page, reset \`list_offset\` to 0.
4. Before storing \`content_html\`, remove any \`<script>\` elements, \`on…\` event attributes, \`javascript:\` links, and \`<iframe>\` elements that aren't from youtube.com, youtube-nocookie.com or vimeo.com. Keep everything else as it is.
5. Upsert on \`id\`. When the slug changes, add the old slug to \`previous_slugs\`.
6. When a pass reaches the last page, list every page once more (summaries only, still one call per second) and delete the rows whose ids aren't in it: those articles were unpublished or removed.
7. If work is left over, call itself again in the background (\`EdgeRuntime.waitUntil\`) after releasing the lease, up to 20 times in a row.

Running it twice in a row must do no harm.

## 5. Run it once, then schedule it

Run \`blog-sync\` once and check that \`blog_articles\` gets rows with \`content_html\`. If the table stays empty after a clean run, my account has no published articles yet: say so instead of inventing content.

Schedule it hourly with pg_cron + pg_net under the job name \`blog-sync-hourly\`. Remove any existing job with that name first, so there's only ever one.

## 6. Build the pages

Both pages read only from \`blog_articles\`.

\`/blog\`: every article, newest first (\`published_at desc\`), as cards with the hero image, title, \`meta_description\` and date. Set each card's \`lang\` from \`language_code\`. Include a friendly empty state.

\`/blog/:slug\`:

- Show the title as the page's only \`<h1>\`, then the hero image (\`hero_image_url\`, alt text = title) and the date, then \`content_html\` rendered as HTML. The body has no \`<h1>\` or hero image of its own.
- Style it with this project's typography (a prose-style wrapper): headings, lists, tables, quotes and images readable and responsive, images at most 100% wide.
- If the slug isn't found, look in \`previous_slugs\` and redirect; otherwise show a 404.
- Add a "Back to blog" link.

Add one "Blog" link to the existing header or footer navigation, in the same style.

## 7. SEO

For each article: its own \`<title>\`, \`<meta name="description">\` (\`meta_description\`), \`<link rel="canonical">\` to the article's address on this site, Open Graph and Twitter tags with \`hero_image_url\` and \`og:type=article\`, and \`lang\` from \`language_code\`. Add \`json_ld\` and \`faq_json_ld\` as \`<script type="application/ld+json">\`, serialised with \`JSON.stringify(data).replace(/</g, "\\\\u003c")\`; skip empty ones.

The stored schema points at my main website. Walk through it (including nodes inside \`@graph\`) and change the article's \`url\`, \`mainEntityOfPage\` and the last breadcrumb item to the article's real address on this site. Leave \`author\` and \`publisher\` as they are.

\`/blog\` gets its own title, description and canonical.

Sitemap: TanStack Start, a dynamic \`/sitemap.xml\` with the home page, \`/blog\` and every article (\`lastmod\` from \`article_updated_at\`). Vite single-page app: generate \`public/sitemap.xml\` now and remind me to ask you to refresh it after new articles go live.

\`robots.txt\` must exist, must not block \`/blog\`, and must have a \`Sitemap:\` line with the full address (https://…/sitemap.xml).

## 8. Check before finishing

1. The key appears nowhere in frontend code, and \`${host}\` appears only in the backend function.
2. \`/blog\` lists every stored article, and an article page shows styled HTML with exactly one \`<h1>\`.
3. An article page's HTML has its own title, description, canonical and JSON-LD, and no JSON-LD address points at my main website except \`author\` and \`publisher\`.
4. The hourly job exists and is enabled.
5. Nothing else on the site changed apart from the navigation link.

## 9. Tell me

In plain words: the blog address and how many articles are live, whether the first import is still catching up, how often new articles arrive, where the Blog link went, the sitemap note if this is a single-page app, and anything left for me to do (such as publishing the project).`;
}
