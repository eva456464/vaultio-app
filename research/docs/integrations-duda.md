<!-- Source: https://www.babylovegrowth.ai/docs/integrations/duda -->

Integrations

# Duda

Connect BabyLoveGrowth to Duda using an RSS feed to import your latest articles.

The Duda integration imports BabyLoveGrowth articles into your Duda website using an RSS feed. Duda doesn't connect directly. Instead, it pulls your latest articles from a feed we generate for you.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect Duda](#how-to-connect-duda)

Open **Settings → Publishing**, find **Duda** under **Website platforms**, and click **Connect** to launch the setup wizard. The wizard walks you through 5 short steps, mirrored below.

Already connected? The Duda card shows a **Connected** badge. Click **Manage** to copy your RSS feed URL again at any time.

### [What You Need](#what-you-need)

- A BabyLoveGrowth account with at least one published article
- Admin access to your Duda website editor

### [Before you start](#before-you-start)

Duda uses an **RSS feed to pull your articles** automatically. There's no direct connection to authorize.

No article published yet?

You can still set this up now. The feed will be empty until your first article publishes, then Duda fills it in automatically. Generate and publish one from your **Content Plan** whenever you're ready.

### [Generate your RSS feed URL](#generate-your-rss-feed-url)

Duda pulls your articles from an **RSS feed**. Click **Generate feed URL**, then **Copy RSS URL**. **You'll paste it into Duda in the next step**. The URL is unique to your site and already includes everything Duda needs (there's no separate API key to manage). Need to rotate it? **Regenerate URL** creates a new one and disables the old. If you've already added it to Duda, update it there with the new URL.

Example RSS Feed URL

```
https://api.babylovegrowth.ai/api/public/rss?domain=yoursite.com&limit=10&key=be0e5c42-be0e5c42-be0e5c42-be0e5c42
```

You can change `limit=10` to any number to control how many articles appear in Duda.

Keep this RSS feed URL private. Anyone with the URL can read your article feed.

### [Add the RSS feed to Duda](#add-the-rss-feed-to-duda)

Do this in the Duda editor (open your site from [your Duda dashboard](https://my.duda.co)). Full reference: [Duda’s RSS Feed widget guide](https://support.duda.co/hc/en-us/articles/26519254221335-Widgets-RSS-Feeds).

1. Open your site in the **Duda Website Editor**.
2. In the left sidebar, click **Add → Elements**, search for **“RSS Feed”**, and **drag** the widget onto the page where you want your articles.
3. The **RSS Feed Content** panel usually opens automatically when you drop the widget. If it doesn't, right-click the widget and select **Edit Content**. In Flex mode and Editor 2.0, use the widget's floating **Edit Content** button instead.
4. **Paste the RSS feed URL** you copied into the field, adjust the display settings (number of posts, layout), then click **Publish**.

The RSS Feed widget **displays** your articles on this page, it does not add them to Duda’s native Blog. If you want real blog posts instead, use the Blog import in step 4.

### [Import your articles into Duda's Blog](#import-your-articles-into-dudas-blog)

Duda's native **Blog** can import the same feed, turning your articles into real blog posts on your site. Do this in the Duda editor, on the site where you want the posts.

1. Open your site in the **Duda Website Editor**.
2. In the left sidebar, click **Blog**, then open the **Import** tab.
3. **Paste the RSS feed URL** you copied into the **Enter RSS feed URL** field.
4. Click **Import Posts**, then **Publish** your site so the posts go live.

Duda's own limits: you can import up to **300 posts**, and a blog's total post count can't exceed **1,500**.

![Importing an RSS feed from the Blog panel in the Duda editor](https://www.babylovegrowth.ai/_next/static/media/duda-rss-blog.3d85444b.png)

### [You're all set](#youre-all-set)

The final step confirms the connection. Duda is **pull-based**, so there's no test publish. It reads your RSS feed on its own schedule. Just make sure at least one article is published so the feed has content.

If your articles aren't showing up, use **Chat with support** on this step (or the chat icon in the bottom-right corner) and we'll help.

## [How It Works](#how-it-works)

The Duda integration uses RSS (Really Simple Syndication) to sync articles:

- BabyLoveGrowth generates an RSS feed of your published articles
- Duda periodically checks the RSS feed for new content
- When new articles are published in BabyLoveGrowth, they appear in your Duda RSS feed
- Duda automatically imports and displays the new articles on your site

This is a **pull-based integration**: Duda pulls content from BabyLoveGrowth's RSS feed.

## [Troubleshooting & FAQ](#troubleshooting--faq)

RSS feed not working in Duda?

Ensure you copied the complete RSS feed URL including all parameters (domain, limit, and key). Test the URL in a browser to verify it returns XML content.

Articles not updating in Duda?

Duda may cache RSS feeds. Check Duda's RSS widget settings for refresh intervals. New articles may take a few minutes to appear.

How do I change the number of articles in the feed?

Modify the `limit` parameter in your RSS feed URL. For example, change `limit=10` to `limit=20` to show 20 articles.

Can I customize how articles appear in Duda?

Yes. Use Duda's widget settings to customize the layout, styling, and display options for your RSS feed content.

What if I regenerate my API key?

You'll get a new RSS feed URL. Update the URL in your Duda RSS widget with the new one. The old URL stops working.

Can I use this RSS feed elsewhere?

Yes! The RSS feed is standard and can be used in any platform that supports RSS imports, not just Duda.

How often does Duda check for new articles?

This depends on Duda's RSS refresh settings. Check your Duda RSS widget configuration for refresh interval options.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[GoHighLevel

Connect BabyLoveGrowth to GoHighLevel with a Private Integration token and publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/gohighlevel)[BigCommerce

Connect BabyLoveGrowth to BigCommerce with a store hash and access token, then publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/bigcommerce)
