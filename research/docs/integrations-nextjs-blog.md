<!-- Source: https://www.babylovegrowth.ai/docs/integrations/nextjs-blog -->

Integrations

# Next.js Blog

Render your published BabyLoveGrowth articles as a blog on your own Next.js (App Router) site.

Read your published BabyLoveGrowth articles server-side and render them as a blog on your own **Next.js (App Router)** site: article lists, article pages, tag pages, and a sitemap, all on your own domain. The `babylovegrowth-next-js-blog` package is the read client; one scaffold command drops in a ready-made `app/blog`.

## [Integration Video](#integration-video)

Keep your API key server-side only

Read it from `BABYLOVEGROWTH_BLOG_API_KEY` in Server Components, route handlers, or server utilities. Never expose it with a `NEXT_PUBLIC_` prefix.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

## [Requirements](#requirements)

- Node.js 18.17+
- A Next.js App Router project (the starter uses Tailwind CSS classes)

## [Setup](#setup)

1. **Get your API key.** In **Settings → Publishing**, find **Next.js Blog** under **For developers** and click **Connect**, then add the key to `.env.local`:

   .env.local

   ```
   BABYLOVEGROWTH_BLOG_API_KEY=your_api_key
   ```
2. **Install the package** in your Next.js project:

   ```
   npm install babylovegrowth-next-js-blog
   ```
3. **Scaffold the blog**: copies the routes, components, sitemap, and styles into `app/blog` (or `src/app/blog`):

   ```
   npx babylovegrowth-next-js-blog init
   ```
4. **Allow your article image host** in `next.config.js` (the starter renders images with `next/image`):

   next.config.ts

   ```
   import type { NextConfig } from 'next';

   const nextConfig: NextConfig = {
     images: { remotePatterns: [{ protocol: 'https', hostname: '*' }] },
   };

   export default nextConfig;
   ```
5. **Run it:** `npm run dev`, then open `/blog`.

## [Environment variables](#environment-variables)

| Variable | Required | Purpose |
| --- | --- | --- |
| `BABYLOVEGROWTH_BLOG_API_KEY` | Yes | Reads your published articles. Server-side only. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Your site's URL, used for absolute sitemap and canonical URLs. |
| `BABYLOVEGROWTH_BLOG_API_URL` | No | Override the API base (e.g. a staging backend). Defaults to production. |

## [Routes](#routes)

| Route | Description |
| --- | --- |
| `/blog` | Paginated article list |
| `/blog/[slug]` | Article page with metadata and JSON-LD |
| `/blog/tag/[slug]` | Tag-filtered list |
| `/blog/sitemap.xml` | Blog sitemap |

## [Caching](#caching)

Blog data uses ISR: it revalidates once per day in production, and changes appear quickly in development. New or updated articles can take up to a day to show unless you redeploy or add [on-demand revalidation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration).

## [Sitemap](#sitemap)

Submit `/blog/sitemap.xml` in Google Search Console, or merge it into your site's main sitemap. Set `NEXT_PUBLIC_SITE_URL` so its URLs are absolute.

## [Troubleshooting](#troubleshooting)

- **401 Unauthorized**: the key doesn't match the API it's calling. Check `BABYLOVEGROWTH_BLOG_API_KEY`, and restart the dev server after editing `.env.local`. If you point at a non-production backend, set `BABYLOVEGROWTH_BLOG_API_URL`.
- **No articles**: only published articles are returned. Confirm the website tied to this key has published articles.
- **Images don't load**: add the image host to `next.config.js` under `images.remotePatterns`.
- **New articles missing**: that's the daily ISR cache; redeploy or add on-demand revalidation.

Prefer a no-code option? Use [Blog Hosting](https://www.babylovegrowth.ai/docs/integrations/blog-hosting) to host your blog on a subdomain with one DNS record.

[BabyLoveGrowth API

Use the BabyLoveGrowth API to fetch generated articles programmatically and push them anywhere.](https://www.babylovegrowth.ai/docs/integrations/api)[Webhooks

Send BabyLoveGrowth articles to any endpoint with a simple bearer-auth POST webhook.](https://www.babylovegrowth.ai/docs/integrations/webhook)
