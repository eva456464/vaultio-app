<!-- Source: https://www.babylovegrowth.ai/docs/integrations/api -->

Integrations

# BabyLoveGrowth API

Use the BabyLoveGrowth API to fetch generated articles programmatically and push them anywhere.

The BabyLoveGrowth API lets you programmatically fetch your articles and push them into any CMS or backend, using code you write. Authenticate with an API key and access your content via REST endpoints.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect the API](#how-to-connect-the-api)

Open **Settings → Publishing**, find **API** under **For developers**, and click **Connect** to launch the setup wizard. It walks you through 7 short steps, mirrored below. Once you generate a key, the API card shows as **Connected** with a **Manage** button.

Using an AI coding agent?

Each technical step (Authenticate, Fetch, Paginate, Map) has a **Copy for agent** view. Flip the toggle on the **Authenticate** step and it applies to every step, turning the guide into paste-ready instructions for your AI tool (Cursor, Claude Code, Copilot, v0…). The content is identical to the guide, just formatted to hand straight to an agent.

Because our API is rate-limited, tell the agent to **self-host**: sync the articles into your project (at build time or on a schedule) and serve them from your own storage. Never call the API on every page view. For the best result, use a current frontier model; older or smaller models may produce incomplete code.

### [This is a developer integration](#this-is-a-developer-integration)

Our API lets you fetch your articles programmatically and **push them to any CMS** or backend, using code you write.

This requires writing code (Node.js, Python, curl, etc.). If you want a no-code connection, use one of the other integrations instead.

### [Generate your API key](#generate-your-api-key)

In the wizard, click **Generate API Key**, then **Copy** it and store it securely.

Never expose your API key. Rotate it immediately if it gets leaked.

### [Authenticate your requests](#authenticate-your-requests)

Every API request needs these two headers. Add them to all your calls:

- `X-API-Key: <your-api-key>`
- `Content-Type: application/json`

**Base URL:** `https://api.babylovegrowth.ai/api/integrations`

### [Fetch your articles](#fetch-your-articles)

#### [GET /v1/articles](#get-v1articles)

Use a `GET` request to list your articles. The list endpoint returns summaries only (no `content_html` or `content_markdown`):

Request

```
curl -X GET "https://api.babylovegrowth.ai/api/integrations/v1/articles" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json"
```

Response

```
[
  {
    "id": 151241,
    "title": "Article Title",
    "slug": "article-slug",
    "hero_image_url": "https://...",
    "languageCode": "en",
    "meta_description": "Meta description for SEO...",
    "excerpt": "Short excerpt from the article...",
    "orgWebsite": "https://your-site.com",
    "created_at": "2026-01-20T09:59:49.132Z",
    "published_url": "https://your-site.com/blog/article-slug",
    "seedKeyword": "main keyword",
    "keywords": ["keyword1", "keyword2"]
  }
]
```

#### [GET /v1/articles/{id}](#get-v1articlesid)

**Get one article (full content):** use the article `id` from the list response to get full `content_html` and `content_markdown`.

Request

```
curl -X GET "https://api.babylovegrowth.ai/api/integrations/v1/articles/12345" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json"
```

Response

```
{
  "id": 12345,
  "title": "Sample Article Title",
  "slug": "sample-article-title",
  "content_markdown": "# Sample...",
  "content_html": "<h1>Sample...</h1>",
  "jsonLd": { "@context": "https://schema.org", "@type": "Article" },
  "faqJsonLd": { "@context": "https://schema.org", "@type": "FAQPage" },
  "meta_description": "Example meta description",
  "hero_image_url": "https://path-to-image.jpg",
  "orgWebsite": "https://your-website.com",
  "created_at": "2025-01-15T10:30:00.000Z",
  "published_url": "https://your-website.com/blog/sample-article-title",
  "seedKeyword": "example",
  "keywords": ["keyword1", "keyword2"]
}
```

Replace `12345` with the article `id` from the list response.

### [Paginate large results](#paginate-large-results)

Control how many articles you fetch at once using query parameters:

- `limit`: number of articles to return (max: 50)
- `offset`: number of articles to skip for pagination (default: 0)

Example: get first 5 articles

```
curl -X GET "https://api.babylovegrowth.ai/api/integrations/v1/articles?limit=5&offset=0" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json"
```

Node.js: fetch every article

```
async function fetchAllArticles() {
  const allArticles = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const res = await fetch(
      `https://api.babylovegrowth.ai/api/integrations/v1/articles?limit=${limit}&offset=${offset}`,
      { headers: { 'X-API-Key': process.env.BABYLOVE_API_KEY } }
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const articles = await res.json();
    if (articles.length === 0) break;

    allArticles.push(...articles);
    if (articles.length < limit) break;
    offset += limit;
  }

  return allArticles;
}
```

**Tips:**

- Articles are sorted newest first
- If a response returns fewer articles than your `limit`, you've reached the end
- Use `offset = (page - 1) * limit` for page-based navigation

Store it yourself, don't fetch on demand

The API is rate-limited, so don't call it on every page view. Sync all articles into your own storage (files or a database) and serve them from there.

**Publish new articles automatically:** run the sync on a schedule, such as a cron job, a scheduled CI workflow (e.g. GitHub Actions), your framework's build hook / ISR, or a background job, so new content appears without manual work.

### [Map fields to your CMS](#map-fields-to-your-cms)

Each article returns these fields. Map them to what your CMS expects:

- `title`: post title
- `content_html`: full HTML; use for most CMS platforms
- `content_markdown`: Markdown version; use if your CMS prefers it
- `slug`: URL-friendly post identifier
- `meta_description`: SEO meta description
- `hero_image_url`: featured image URL
- `jsonLd` / `faqJsonLd`: article schema markup for SEO
- `published_url`: the article's live URL on your site, once we detect it there; an empty string until then

Node.js: sync one article into your CMS

```
import fetch from 'node-fetch';

async function syncArticle(id) {
  const res = await fetch(`https://api.babylovegrowth.ai/api/integrations/v1/articles/${id}`, {
    headers: { 'X-API-Key': process.env.BABYLOVE_API_KEY },
  });
  const article = await res.json();

  // Upsert into your CMS
  await fetch('https://your-cms.example.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: article.slug || article.id,
      title: article.title,
      html: article.content_html,
      description: article.meta_description,
      language: article.languageCode,
    }),
  });
}
```

For real-time pushes instead of polling, use the [Webhooks](https://www.babylovegrowth.ai/docs/integrations/webhook) integration.

### [You're all set](#youre-all-set)

The final step confirms your key is active. The API is **pull-based**: your code fetches articles whenever you need them; nothing publishes automatically. Keep your key secret and rotate it from this screen if it ever leaks.

Stuck wiring it up? Use **Chat with support** on this step (or the chat icon in the bottom-right corner).

## [Troubleshooting & FAQ](#troubleshooting--faq)

Getting 401 Unauthorized?

Check your API key and header spelling. Ensure you're using `X-API-Key: <key>` format.

Getting 404 errors?

The article ID may not exist in your account. Verify the ID by listing all articles first.

Hitting rate limits?

Add exponential backoff and cache responses where possible. Avoid polling too frequently.

What format should I use: HTML or Markdown?

Use `content_html` for most modern CMS platforms. Use `content_markdown` if your CMS prefers Markdown.

Can I use this with any CMS?

Yes. The API returns standard JSON. You can integrate with any platform that accepts programmatic content creation.

How do I get notified when new articles are published?

Use the [Webhooks](https://www.babylovegrowth.ai/docs/integrations/webhook) integration for real-time push notifications instead of polling the API.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Snapps CMS

Connect BabyLoveGrowth to Snapps with a Site ID and API key, then publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/snapps)[Next.js Blog

Render your published BabyLoveGrowth articles as a blog on your own Next.js (App Router) site.](https://www.babylovegrowth.ai/docs/integrations/nextjs-blog)
