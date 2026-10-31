<!-- Source: https://www.babylovegrowth.ai/docs/integrations/webhook -->

Integrations

# Webhooks

Send BabyLoveGrowth articles to any endpoint with a simple bearer-auth POST webhook.

The Webhook integration sends articles in real time to any endpoint you control. We POST a JSON payload every time an article is published, perfect for custom CMS integrations and automated workflows.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect Webhooks](#how-to-connect-webhooks)

Open **Settings → Publishing**, find **Webhook** under **For developers**, and click **Connect** to launch the setup wizard. The wizard walks you through 3 short steps, mirrored below.

After saving, the Webhook card shows **Awaiting test** until you publish your first article. Once a payload is delivered successfully it flips to **Connected**. Click **Manage** any time to update the URL or token.

### [Add your webhook URL](#add-your-webhook-url)

Paste the **HTTPS endpoint** that should receive each new article. We send a JSON `POST` every time an article is published, for example `https://yoursite.com/api/blog-webhook`.

Use a `POST` route that returns **200** with a **JSON body**. You have up to 120 seconds to respond. See [What We Expect Back](#what-we-expect-back) for the exact response we need.

### [Authenticate your endpoint](#authenticate-your-endpoint)

Add a **Bearer token** (at least 8 characters) so we can prove the request came from us. We send it as `Authorization: Bearer <token>` on every call. Validate it in your endpoint before processing.

Keep this token private. Store it in environment variables, never in code.

### [Test the connection](#test-the-connection)

Send a test payload to confirm everything is wired up:

1. Click **Send test request** (also available as **Publish first article** on the connected screen)
2. Check your endpoint logs: you should see a **POST** with the article JSON
3. Confirm your endpoint replied with **200** and a **JSON body**. An empty or plain-text reply is treated as a failed publish

## [What We Send (Payload Reference)](#what-we-send)

**Request Details:**

- **Method:** POST
- **Headers:** `Authorization: Bearer <your-webhook-secret>`, `Content-Type: application/json`. We also repeat the same secret in `X-API-Key` if your stack strips the `Authorization` header.

Payload Example

```
{
  "id": 10,
  "keywords": "webhook integration",
  "title": "Test Article for Webhook Integration",
  "metaDescription": "Test article to verify webhook integration is working correctly",
  "slug": "test-article-for-webhook-integration",
  "languageCode": "en",
  "content_html": "<h1>Test Article for Webhook Integration</h1>",
  "content_markdown": "# Test Article for Webhook Integration",
  "jsonLd": { "@context": "https://schema.org", "@type": "Article" },
  "faqJsonLd": { "@context": "https://schema.org", "@type": "FAQPage" },
  "heroImageUrl": "https://cdn.example.com/hero-image.jpg",
  "heroImageAlt": "Illustration of a webhook payload",
  "featureImageEnabled": true,
  "createdAt": "2025-03-20T03:41:18.570Z",
  "lang": "en"
}
```

`content_html` can include embedded JSON-LD script tags. You also receive `jsonLd` and `faqJsonLd` as structured JSON fields for easier mapping.

`lang` is only present when a publishing language is set on your website. See [What We Expect Back](#what-we-expect-back) for the response we need in return.

## [What We Expect Back (Response Reference)](#what-we-expect-back)

Your endpoint must answer with an **HTTP 2xx** status *and* a **JSON object** body. Anything else marks the article as failed to publish.

Most common mistake

Replying `200` with an empty body, `204 No Content`, or plain text such as `OK`. We cannot read those and record the publish as failed with `Non-JSON response from webhook`. Always send `Content-Type: application/json` and a JSON object (`{}` is enough).

**Success (recommended):** return the live URL of the article you just created so we can link to it straight away.

Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "link": "https://yoursite.com/blog/test-article-for-webhook-integration"
}
```

**Success (minimum):** valid if you cannot produce the URL yet. We pick it up from your sitemap later instead.

Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{ "success": true }
```

**Failure:** tell us what went wrong. The message is shown in your dashboard.

Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": false,
  "error": "An article with this slug already exists"
}
```

**Fields we read:**

- `success`: optional boolean. Only `false` is special: it fails the publish even on a `200`. Omit it or send `true` when all is well.
- `link`: optional string, the published article URL. We save it as the article's live URL, which powers internal linking and reporting.
- `error` or `message`: the reason, read only when `success` is `false`.

Any other keys you return are ignored, so you can reply with your own object.

About `link`

We only store it when it points at the same domain or a subdomain of your website. If you set a blog path in the wizard we also fetch the URL once to confirm it is reachable. A link we cannot verify is skipped silently. Publishing still counts as successful, and the URL is filled in from your sitemap later.

**Timeouts and retries:**

- You have up to 120 seconds to respond. A slow answer is never retried, only a lost one.
- We retry up to 3 times, 2 seconds apart, when you return `429`, `500`, `502`, `503` or `504`.
- Every other non-2xx status (`400`, `401`, `403`, `404`) fails immediately with no retry.
- Retries repeat the same article, so make your handler idempotent: key it on `id` or `slug` and update instead of creating a duplicate.

## [Verify & Go Live](#verify--go-live)

On the **Webhook saved** screen, click **Publish first article**. We send your latest article to your endpoint to confirm the connection is live. After that, with **Automatically Publish** on (toggle at the top of the Integrations page), every new article is delivered automatically.

1. Go to your **Content Plan** and publish / re-publish any article
2. BabyLoveGrowth sends the article payload to your webhook URL
3. Check your endpoint logs and confirm it returns HTTP 200

## [Troubleshooting & FAQ](#troubleshooting--faq)

Getting 401 or auth errors?

Check the bearer token and ensure your endpoint compares it exactly. The format is `Bearer <your-secret>`.

Webhook marked as failed?

A publish fails when your endpoint returns a non-2xx status, a body that is not JSON (empty, `204`, or plain text), or JSON containing `"success": false`. Return `200` with a JSON object. See [What We Expect Back](#what-we-expect-back).

Not receiving any webhooks?

Verify your URL is publicly accessible, accepts POST requests, and isn't blocked by a firewall or WAF.

Test webhook succeeds but real articles fail?

Check your endpoint logs for errors. Ensure you can handle the full article payload, especially large HTML content.

How do I secure my webhook endpoint?

Always validate the bearer token before processing. Store the secret in environment variables, never in code.

What if my endpoint is temporarily down?

Return `503` (or `429`, `500`, `502`, `504`) and we retry up to 3 times, 2 seconds apart. Because retries resend the same article, key your handler on `id` or `slug` so a repeat updates rather than duplicates.

Can I use this with serverless functions?

Yes. Webhooks work great with serverless platforms like AWS Lambda, Vercel, Netlify Functions, and Cloudflare Workers.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Next.js Blog

Render your published BabyLoveGrowth articles as a blog on your own Next.js (App Router) site.](https://www.babylovegrowth.ai/docs/integrations/nextjs-blog)[Shopify Product Catalog

Connect your Shopify store and sync products into BabyLoveGrowth.](https://www.babylovegrowth.ai/docs/integrations/shopify-product-catalog)
