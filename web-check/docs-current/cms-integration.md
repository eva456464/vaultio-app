<!-- Source: https://www.babylovegrowth.ai/docs/cms-integration (fetched 2026-11-05) -->

# CMS Integration Guide

Connect your website for automatic article publishing

Connect your website once to enable automatic article publishing. Choose your platform below for step-by-step instructions.

## [Supported Platforms](#supported-platforms)

[](/docs/integrations/wordpress)

### WordPress

Connect your WordPress site

[](/docs/integrations/webflow)

### Webflow

Connect your Webflow CMS

[](/docs/integrations/shopify)

### Shopify

Connect your Shopify blog

[](/docs/integrations/wix)

### Wix

Connect your Wix site

[](/docs/integrations/ghost)

### Ghost

Connect your Ghost blog

[](/docs/integrations/api)

### Custom API

Connect via REST API

------------------------------------------------------------------------

## [How It Works](#how-it-works)

Once connected, articles from your Content Plan will automatically publish to your CMS:

1.  **Articles are created** in your Content Plan
2.  **You review** (optional) before the publish date
3.  **System publishes** automatically on the scheduled date
4.  **Content appears** on your live website

------------------------------------------------------------------------

## [Custom API Integration](#custom-api-integration)

For platforms not listed above, you can send articles to your own endpoint with our [Webhook](/docs/integrations/webhook) integration.

### [Setup Instructions](#setup-instructions)

1.  In **Settings → Publishing**, find **Webhook** under **For developers**
2.  Enter your **webhook URL** (endpoint that will receive article data)
3.  Add a **Bearer token**. We send it as `Authorization: Bearer <token>` and as `X-API-Key: <token>` on every call
4.  Click **Save** to finish setup
5.  Open your latest article from **Content Plan** and click **Publish** to trigger the webhook
6.  Review the published payload/article in your CMS

Map the payload fields in your own endpoint.

### [API Payload Format](#api-payload-format)

When an article is ready to publish, we send a POST request to your webhook with a JSON body containing these fields: `id`, `keywords`, `title`, `metaDescription`, `slug`, `languageCode`, `content_html`, `content_markdown`, `jsonLd`, `faqJsonLd`, `heroImageUrl`, `heroImageAlt`, `featureImageEnabled` and `createdAt`. See the [full payload reference](/docs/integrations/webhook#what-we-send) for types and an example.

Your endpoint must return 2xx with a JSON body (`{}` is enough), ideally `{ "link": "<live URL>" }`.

### [Requirements](#requirements)

- **Publicly accessible webhook endpoint**: Must be reachable from the internet
- **Ability to receive POST requests**: Your endpoint must accept POST with JSON payload
- **Authentication**: a Bearer token, sent as `Authorization: Bearer <token>` and `X-API-Key: <token>`
- **HTTPS**: Secure connection required for production

### [Testing](#testing)

Always test your integration:

1.  Open your latest article in **Content Plan**
2.  Click **Publish** to send the payload to your endpoint/CMS
3.  Verify the article appears correctly in your CMS
4.  Check formatting, images, and metadata

------------------------------------------------------------------------

## [Troubleshooting](#troubleshooting)

### [Connection Issues](#connection-issues)

- **Verify webhook URL**: Ensure it's publicly accessible
- **Check authentication**: Confirm your Bearer token is correct
- **Test endpoint**: Use a tool like Postman to test your endpoint
- **Review logs**: Check your server logs for errors

### [Publishing Issues](#publishing-issues)

- **Check field mapping**: Ensure your endpoint maps our payload fields to your CMS structure
- **Verify permissions**: Confirm API has write access
- **Review payload**: Check if your CMS requires different field names
- **Test manually**: Try sending a test post

### [Formatting Issues](#formatting-issues)

- **HTML content**: Our content is HTML-formatted
- **Image handling**: Images are hosted by us, or you can download and host
- **Custom fields**: Use field mapping for CMS-specific fields

------------------------------------------------------------------------

## [Best Practices](#best-practices)

- **Test first**: Always test before enabling autopilot
- **Monitor initially**: Watch the first few articles to ensure quality
- **Backup content**: Keep backups of published articles
- **Review regularly**: Check published articles for formatting
- **Update mapping**: Adjust field mapping as your CMS evolves

------------------------------------------------------------------------

## [Need Help?](#need-help)

If you need assistance with integration:

- **Check platform docs**: See specific platform guides above
- **Contact support**: Use in-app chat or email
- **API documentation**: Review our API docs for advanced setups
