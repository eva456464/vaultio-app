<!-- Source: https://www.babylovegrowth.ai/docs/cms-integration -->

# CMS Integration Guide

Connect your website for automatic article publishing

Connect your website once to enable automatic article publishing. Choose your platform below for step-by-step instructions.

## [Supported Platforms](#supported-platforms)

[### WordPress

Connect your WordPress site](https://www.babylovegrowth.ai/docs/integrations/wordpress)[### Webflow

Connect your Webflow CMS](https://www.babylovegrowth.ai/docs/integrations/webflow)[### Shopify

Connect your Shopify blog](https://www.babylovegrowth.ai/docs/integrations/shopify)[### Wix

Connect your Wix site](https://www.babylovegrowth.ai/docs/integrations/wix)[### Ghost

Connect your Ghost blog](https://www.babylovegrowth.ai/docs/integrations/ghost)[### Custom API

Connect via REST API](https://www.babylovegrowth.ai/docs/integrations/api)

---

## [How It Works](#how-it-works)

Once connected, articles from your Content Plan will automatically publish to your CMS:

1. **Articles are created** in your Content Plan
2. **You review** (optional) before the publish date
3. **System publishes** automatically on the scheduled date
4. **Content appears** on your live website

---

## [Custom API Integration](#custom-api-integration)

For platforms not listed above, you can connect via our REST API.

### [Setup Instructions](#setup-instructions)

1. In **Settings → Publishing**, find **Webhook** under **For developers**
2. Enter your **webhook URL** (endpoint that will receive article data)
3. Configure **authentication** (API key, Bearer token, or Basic auth)
4. Set up **field mapping** to match your CMS structure
5. Click **Save** to finish setup
6. Open your latest article from **Content Plan** and click **Publish** to trigger the webhook
7. Review the published payload/article in your CMS

### [API Payload Format](#api-payload-format)

When an article is ready to publish, we send a POST request to your webhook with this JSON structure:

```
{
  "title": "Article Title",
  "slug": "article-slug",
  "content": "<p>HTML content...</p>",
  "excerpt": "Short description",
  "featured_image": "https://example.com/image.jpg",
  "meta_title": "SEO Title",
  "meta_description": "SEO description",
  "tags": ["tag1", "tag2"],
  "publish_date": "2024-01-15T10:00:00Z",
  "author": "Author Name",
  "categories": ["category1", "category2"]
}
```

### [Requirements](#requirements)

- **Publicly accessible webhook endpoint**: Must be reachable from the internet
- **Ability to receive POST requests**: Your endpoint must accept POST with JSON payload
- **Authentication method**: API key, Bearer token, or Basic auth (recommended)
- **HTTPS**: Secure connection required for production

### [Field Mapping](#field-mapping)

Map our standard fields to your CMS structure:

- **Title** → Your CMS title field
- **Content** → Your CMS body/content field
- **Slug** → Your CMS URL/slug field
- **Meta fields** → Your SEO meta fields
- **Images** → Your media/attachment fields
- **Categories/Tags** → Your taxonomy fields

### [Testing](#testing)

Always test your integration:

1. Open your latest article in **Content Plan**
2. Click **Publish** to send the payload to your endpoint/CMS
3. Verify the article appears correctly in your CMS
4. Check formatting, images, and metadata

---

## [Troubleshooting](#troubleshooting)

### [Connection Issues](#connection-issues)

- **Verify webhook URL**: Ensure it's publicly accessible
- **Check authentication**: Confirm API keys or tokens are correct
- **Test endpoint**: Use a tool like Postman to test your endpoint
- **Review logs**: Check your server logs for errors

### [Publishing Issues](#publishing-issues)

- **Check field mapping**: Ensure fields match your CMS structure
- **Verify permissions**: Confirm API has write access
- **Review payload**: Check if your CMS requires different field names
- **Test manually**: Try sending a test post

### [Formatting Issues](#formatting-issues)

- **HTML content**: Our content is HTML-formatted
- **Image handling**: Images are hosted by us, or you can download and host
- **Custom fields**: Use field mapping for CMS-specific fields

---

## [Best Practices](#best-practices)

- **Test first**: Always test before enabling autopilot
- **Monitor initially**: Watch the first few articles to ensure quality
- **Backup content**: Keep backups of published articles
- **Review regularly**: Check published articles for formatting
- **Update mapping**: Adjust field mapping as your CMS evolves

---

## [Need Help?](#need-help)

If you need assistance with integration:

- **Check platform docs**: See specific platform guides above
- **Contact support**: Use in-app chat or email
- **API documentation**: Review our API docs for advanced setups
