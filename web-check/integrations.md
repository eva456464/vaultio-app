# Vaultio integrations vs. vendor docs

Checked 5 November 2026, read-only (docs fetched with GET; no vendor API calls). Concrete discrepancies only, each
with the repo location, what the docs say and the docs URL. Where a docs host redirected to a host outside the
network allowlist, the vendor's official npm SDK (types/doc comments) was used instead and is named.

## Most important

| # | Where | Problem | Fix direction |
|---|---|---|---|
| 1 | `src/server/ai/images.ts:25` | Default OpenAI image model `gpt-image-1` **was shut down on 23 Oct 2026** (openai SDK 7.52.0 `ImageGenerateParams.model` doc: "Use `gpt-image-2.5-sunburst` or `gpt-image-2.5-flare` instead"). Every OpenAI image request fails unless `OPENAI_IMAGE_MODEL` is set. | Change the default model |
| 2 | `src/server/publishing/platforms/shopify.ts:12` | Default `SHOPIFY_API_VERSION` `2025-10` became **unsupported on 16 Oct 2026**; Shopify now falls forward to 2026-01. Supported: 2026-01, 2026-04, 2026-07, 2026-10. https://shopify.dev/docs/api/usage/versioning | Bump to `2026-10` |
| 3 | `integrations/framer-plugin/src/sync.ts:90` | The `synced` map (`{articleId: updated_at}`) is one plugin-data entry; Framer allows **2 kB per entry, 4 kB total** per collection and `setPluginData` throws over the limit. With ~35 bytes/article it fails at about 55 articles; the error is swallowed (`.catch(() => undefined)`), so after that every sync re-downloads every article. https://www.framer.com/developers/storing-data | Store less (e.g. one hash / last-sync timestamp) or keep state in item field data |
| 4 | `src/server/ai/assistants.ts:20-30` | ChatGPT visibility answers use Chat Completions with `gpt-4o-mini` and **no web search**: answers aren't grounded and "sources" are only URLs the model writes. `gpt-4o-mini` is deprecated, shutdown **14 Jan 2027**. Grounded answers with citations need the Responses API (`POST /v1/responses`, `tools: [{type: "web_search"}]`, `url_citation` annotations). Source: openai SDK 7.52.0 `responses.d.ts`, `shared.d.ts` (platform.openai.com returned 403). | Move to Responses API + web_search, new model |
| 5 | `src/server/publishing/platforms/wix.ts:149` | Cover image never sent: `draftPost` has no `heroImage` / `media`. `seoSlug` (max 100) and `title` (max 200) aren't truncated, so long slugs are rejected. https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post.md | Add `media`/`heroImage`, truncate |
| 6 | `src/server/whitelabel/domains.ts:94-95` | Vercel `409` on `POST /v10/projects/{id}/domains` is treated as "already on this project", but per the OpenAPI spec it means **assigned to another project**. The user then gets "The domain isn't added yet. Save it again" in a loop. https://vercel.com/openapi.json | Show `error.message` for 409 |
| 7 | `src/server/billing/sync.ts:165-186` | `customer.subscription.pending_update_applied` / `pending_update_expired` not handled although upgrades use `payment_behavior: "pending_if_incomplete"` (`src/server/actions/billing.ts:63`). https://docs.stripe.com/billing/subscriptions/pending-updates.md#events | Handle both events |

## 1. DataForSEO — `src/server/seo/dataforseo.ts`

**No discrepancies.** Verified base URL `https://api.dataforseo.com/v3`, Basic auth, `status_code === 20000`, and request
fields / response paths of `dataforseo_labs/google/keyword_ideas/live`, `competitors_domain/live`,
`ranked_keywords/live`, `serp/google/organic/live/regular`, `backlinks/summary/live` (`rank` is 0–1000 by default, so
`/10` is right). Note: `target` must be a bare domain (no scheme, no `www.`); this file passes it through, callers must
strip it (not checked). https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/ (and sibling pages)

## 2. GoHighLevel blogs — `src/server/publishing/platforms/gohighlevel.ts`

| Where | Code | Docs |
|---|---|---|
| :84, :87-88 | After `PUT /blogs/posts/{id}` reads `body.data ?? body.blogPost ?? body` | Update returns the post under **`updatedBlogPost`**; update only works via the `previous?.postId` fallback. https://marketplace.gohighlevel.com/docs/2021-07-28/ghl/blogs/update-blog-post.md |

Verified: base URL, Bearer PIT, `Version: 2021-07-28` (still supported; `v3` latest, same blogs schema), list keys
`data` (blogs), `authors`, `categories` (`label`), slug check `GET /blogs/posts/url-slug-exists` → `{exists}`, required
create fields `locationId, blogId, rawHTML, status`, optional field names, the seven scopes.
https://marketplace.gohighlevel.com/docs/llms/2021-07-28/blogs.md

## 3. BigCommerce — `src/server/publishing/platforms/bigcommerce.ts`

**Unverified.** `developer.bigcommerce.com` 301-redirects to `docs.bigcommerce.com`, which is not on the network
allowlist. Not checked: `/v2/blog/posts` fields incl. `thumbnail_path`, 409 duplicate-URL code, `/v2/store` fields,
WebDAV path and digest auth. Add `docs.bigcommerce.com` to the allowlist to check.

## 4. Framer plugin — `integrations/framer-plugin/`, `src/server/publishing/content-api.ts`

| Where | Code | Docs |
|---|---|---|
| `sync.ts:90` | see "Most important" #3 | 2 kB/entry, 4 kB total plugin data |
| `App.tsx:26-27` | API key stored in collection plugin data | "Don't use this API to store sensitive data such as secret keys or access tokens." https://www.framer.com/developers/storing-data |
| `content-api.ts:28` | CORS allowlist `https://*.framercdn.com`, `https://*.framer.com` | Plugins are served only from `https://<pluginId>.plugins.framercdn.com` (production) and `https://<pluginId>-<versionId>.plugins.framercdn.com` (review/testing); recommended match `^https://<PLUGIN_ID>(-[a-zA-Z0-9]+)?\.plugins\.framercdn\.com$`. `*.framercdn.com` works but is broader than needed; **`*.framer.com` is not a plugin origin**. Dev: `https://localhost:5173` (allowed ✓). https://www.framer.com/developers/plugins-cors |
| `package.json:12` | `pack` = `npm run build && npx framer-plugin-tools@latest pack` | `framer-plugin-tools pack` builds itself → build runs twice (harmless). |

Verified (framer-plugin 3.10.3 types): modes `configureManagedCollection` + `syncManagedCollection`, `setFields`,
`addItems` (upsert by id), `removeItems`, `getItemIds`, `setItemOrder`, field-data shapes (`string`, `formattedText`
with `contentType: "html"`, `image {value, alt}`, `date`, `link`), 10 of max 30 fields, `closePlugin`/`notify`.
Marketplace submission: create "New Plugin" in the Marketplace dashboard, `npm run pack`, upload `plugin.zip`
(https://www.framer.com/developers/publishing). Unverified: whether `framer.json` `id` must equal the dashboard
Plugin ID (docs say copy it from the dashboard).

## 5. Shopify Admin GraphQL — `shopify.ts`, `src/server/catalog/stores.ts`

| Where | Code | Docs |
|---|---|---|
| `shopify.ts:12` | default API version `2025-10` | unsupported since 2026-10-16 (see #2) |
| `stores.ts:26, 70-72` | status typed `ACTIVE \| DRAFT \| ARCHIVED` | `ProductStatus` also has **`UNLISTED`** (active, link-only); currently mapped as draft. https://shopify.dev/docs/api/admin-graphql/latest/enums/ProductStatus |
| `stores.ts:44, 78` | `featuredImage { url }` | `Product.featuredImage` is **deprecated** → `featuredMedia`. https://shopify.dev/docs/api/admin-graphql/latest/objects/Product |

Verified: `articleCreate`/`articleUpdate` inputs (`title, handle, body, summary, isPublished, blogId, author{name},
image{url, altText}`), `blogs(first:) { nodes {id title handle} }`, client-credentials grant (`POST
/admin/oauth/access_token`, form-encoded, `expires_in` 86399; only works when app and store are in the same Dev
Dashboard organization, else `shop_not_permitted`), products query fields.
https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant

## 6. Webflow, Wix, Ghost

- **Webflow** (`webflow.ts`): no discrepancies. Single-item `POST /collections/{id}/items[/live]` still works but is
  an "older endpoint"; new work should use `POST /collections/{id}/items/insert` + publish. Image fields max 4 MB.
  https://developers.webflow.com/data/v2.0.0/docs/working-with-the-cms/create-items.md
- **Wix** (`wix.ts:149`): cover image missing; `seoSlug`/`title` not truncated (see #5). Unverified (`wix.ts:164`):
  `url.base` may come without a scheme on free `wixsite.com` sites. Ricos node/decoration names, auth headers,
  draft-post create/update/delete, members query verified.
- **Ghost** (`ghost.ts:25`): docs blocked (`docs.ghost.org`); checked against `@tryghost/admin-api@1.14.14`. Sends
  `accept-version: v5.0`; SDK now defaults to `v6.0` but still supports v5 — not broken. JWT, `PUT` with
  `updated_at`, `?source=html` verified. Unverified: `feature_image_alt` length limit (code truncates to 190).

## 7. Google Analytics Admin/Data, Search Console — `src/server/google/client.ts`, `src/server/agents/jobs/traffic.ts`

**No discrepancies.** Verified `accountSummaries` (v1beta, pageSize ≤200), `runReport` / `batchRunReports` (≤5 per
batch), dimension/metric names, `PARTIAL_REGEXP` filters, Search Console `searchAnalytics/query` with `type` (not the
deprecated `searchType`), `rowLimit` ≤25,000, `sites` list, scopes `analytics.readonly`, `webmasters.readonly`.
https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport,
https://developers.google.com/webmaster-tools/v1/searchanalytics/query

## 8. OpenAI / Gemini — `src/server/ai/images.ts`, `src/server/ai/assistants.ts`

Docs blocked (platform.openai.com 403; ai.google.dev → aistudio.google.com); checked against `openai@7.52.0` and
`@google/genai@2.32.0`.

- `images.ts:25` — `gpt-image-1` shut down (see #1).
- `assistants.ts:20-30` — `gpt-4o-mini` deprecated (shutdown 2027-01-14); no web search (see #4).
- Verified: image params `size: "1536x1024"`, `quality`, `output_format`, `b64_json` response; Gemini
  `generateContent` with `x-goog-api-key`, `responseModalities`, `imageConfig.aspectRatio` (`16:9`, `3:2` valid),
  `inlineData` response, `tools: [{google_search: {}}]`, `groundingMetadata.groundingChunks[].web`. Models
  `gemini-2.5-flash-image`, `gemini-2.5-flash` still listed.
- Unverified: Gemini model retirement dates; whether `groundingChunks[].web.uri` is a Google redirect URL rather than
  the publisher URL (matters for domain matching in `assistants.ts:47`).

## 9. Resend and Vercel — `src/server/email.ts`, `src/server/whitelabel/domains.ts`

| Where | Code | Docs |
|---|---|---|
| `domains.ts:135` (`toEmailDomain`) and `src/db/schema/organization.ts:87` | MX record copied without `priority` | Resend returns the MX record with `priority: 10`; users see incomplete DNS instructions. https://resend.com/docs/api-reference/domains/create-domain.md |
| `organization.ts:88` | `record: "DKIM" \| "SPF" \| "MX"` | also `"Tracking"` (CNAME) when tracking is on (type-only). |
| `domains.ts:94-95` | Vercel 409 handling | see #6 |
| `domains.ts:77-81` | always tells users to add a CNAME | apex domains can't use CNAME; `GET /v6/domains/{domain}/config` returns `recommendedIPv4[]` (A records), which is ignored. https://vercel.com/openapi.json |

Verified: Resend `POST /emails`, domains create/list/get/verify/delete (Node fetch sends a `User-Agent`, which Resend
requires); Vercel project-domain endpoints v9/v10, `/v6/domains/{d}/config`, `teamId` param, none deprecated.

## 10. Stripe — `src/server/billing/*.ts`, `src/app/api/stripe/webhook/route.ts`

- `sync.ts:165-186` — `customer.subscription.pending_update_applied` / `pending_update_expired` missing (see #7).
- Minor: `invoice.payment_action_required` and `invoice.finalization_failed` not handled, so nobody is told when 3DS
  or a finalization fix is needed. https://docs.stripe.com/billing/subscriptions/webhooks.md
- Verified: `invoice.paid` + `invoice.payment_succeeded`, `checkout.session.completed`, subscription
  created/updated/deleted/paused/resumed/trial_will_end, invoice lifecycle events; Checkout (`mode: subscription`,
  `line_items`, `allow_promotion_codes`, `client_reference_id`, `subscription_data.trial_period_days`,
  `{CHECKOUT_SESSION_ID}`) and Billing Portal (`customer`, `return_url`) parameters.
  https://docs.stripe.com/api/checkout/sessions/create.md

## Docs not reachable from this environment

`docs.bigcommerce.com` (BigCommerce unverified), `docs.ghost.org`, `developers.openai.com` / platform.openai.com API
reference (403), `aistudio.google.com`, Google discovery documents (404).
