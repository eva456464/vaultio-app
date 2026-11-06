# Next.js blog

Render your published articles as a blog on your own Next.js (App Router) site: a paginated list,
article pages with metadata and JSON-LD, tag pages and a sitemap, on your own domain.

## Setup

1. In the dashboard, open **Settings → Publishing → Next.js Blog** and create the key. Add both lines
   it shows to `.env.local` (server-side only, never with a `NEXT_PUBLIC_` prefix):

   ```
   BLOG_API_KEY=your_key
   BLOG_API_URL=https://app.example.com/api/integrations/v1
   NEXT_PUBLIC_SITE_URL=https://your-site.com
   ```

2. `npm install vaultio-next-blog`
3. `npx vaultio-next-blog init` copies the routes, components and styles into `app/blog` (or
   `src/app/blog`). Existing files are kept unless you add `--force`.
4. Allow your article image host for `next/image` in `next.config.ts`:

   ```ts
   const nextConfig = { images: { remotePatterns: [{ protocol: "https", hostname: "**" }] } };
   ```

5. `npm run dev` and open `/blog`.

## Routes

| Route | |
| --- | --- |
| `/blog` | Paginated list |
| `/blog/[slug]` | Article page (metadata, canonical, JSON-LD) |
| `/blog/tag/[slug]` | Articles with a tag |
| `/blog/sitemap.xml` | Blog sitemap |

## Caching

Pages use ISR and refresh once a day in production (every minute in development). New articles can
take up to a day to appear unless you redeploy or call `revalidateTag("blog")`.

## Reading articles yourself

```ts
import { getArticles, getArticle, getTags, getAllArticles } from "vaultio-next-blog";
```

All functions run on the server and need Node.js 18.17+ and Next.js 15+.

## Troubleshooting

- **401**: the key was refused. Check `BLOG_API_KEY` and restart the dev server.
- **No articles**: only published articles are returned.
- **Images don't load**: add the image host to `images.remotePatterns`.
