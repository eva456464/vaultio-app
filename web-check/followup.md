# Follow-up research (5 November 2026)

Read-only. Requested by the feature session after `integrations.md`.

## 1. Wix Blog draft posts: cover image and limits

Source: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post.md (the update
endpoint uses the same `draftPost` schema).

**Limits:** `title` is required with maxLength **200**. `excerpt` maxLength **500**. `seoSlug` maxLength **100**.
`media.altText` minLength 1, maxLength 1000.

**Cover fields in `draftPost`.** There is no `coverMedia` field. Two fields exist:

```jsonc
"heroImage": { "id": "<WixMedia image GUID>", "url": "<image URL>", "altText": "..." },   // "Image placed at the top of the blog page"
"media": {                                   // "Post cover media"
  "wixMedia": { "image": { /* Image: id, url, ... */ } },   // ONE-OF with embedMedia
  // or "embedMedia": { "thumbnail": { "url", "width", "height" }, "video": { "url", "width", "height" } },
  "displayed": true,                         // whether cover media is shown
  "custom": true,                            // false => first media item in the content is used as cover
  "altText": "..."
}
```

**External URL or import?** The docs don't say whether `heroImage.url` or `media.wixMedia.image.url` accepts an image
hosted outside Wix. The only example, from the JS SDK, shows `"heroImage": "https://example.com/hero-image.jpg"`, but
that is the JS shape, not the REST one. Two things point to importing first:

- `heroImage.id` is described as a "WixMedia image GUID".
- The Ricos image nodes Vaultio already sends are a separate path.

The safe route is to import the image first.

**Import from a URL.** Source: https://dev.wix.com/docs/api-reference/assets/media/media-manager/files/import-file.md.
Scope: `SCOPE.DC-MEDIA.MANAGE-MEDIAMANAGER` ("Manage Media Manager").

```
POST https://www.wixapis.com/site-media/v1/files/import
{ "url": "https://app.example.com/media/abc.webp",   // required, public
  "mimeType": "image/webp",                          // or a file extension in displayName/url, or a host that answers HEAD
  "displayName": "cover.webp", "mediaType": "IMAGE", // optional; mediaType validates the type
  "parentFolderId": "media-root", "filePath": "/vaultio" }   // optional
→ 200 { "file": { "id", "displayName", "url" (static.wixstatic.com/media/...), "mediaType": "IMAGE",
                  "operationStatus": "PENDING" | "READY" | "FAILED", "sourceUrl", "thumbnailUrl", "sizeInBytes", ... } }
```

- The file isn't usable right away: the import returns `operationStatus: "PENDING"` and URLs may not be available yet.
- Wait for READY by polling `GET https://www.wixapis.com/site-media/v1/files/get-file-by-id?fileId=<id>` until
  `file.operationStatus == "READY"`, or listen for the File Ready / File Failed events
  (https://dev.wix.com/docs/api-reference/assets/media/media-manager/files/importing-files.md).
- Once READY, the descriptor carries `file.media.image.image` = `{ id, url, width, height, altText, filename }`.
- The docs note that "the `media` property isn't returned in the `files` response object", so read it from the
  get-by-id response.

**Referencing the imported file in the draft post.** This combination is the most consistent with the schema, but it
is **unverified without a live call**:

- `heroImage: { id: file.id, url: file.url, altText }`
- `media: { wixMedia: { image: { id: file.id, url: file.url } }, displayed: true, custom: true, altText }`

`fileId` also accepts the `wix:image://v1/...` media URL.

## 2. Vercel: apex domain config and the 409 error

Source: https://vercel.com/openapi.json and https://vercel.com/docs/rest-api/errors.md.

**`GET /v6/domains/{domain}/config`**

- Query parameters: `projectIdOrName` (use it when the domain isn't on a project yet), `strict` (`true`/`false`,
  nameserver scope), `teamId` and `slug`.
- All five response fields are required:

```jsonc
{ "configuredBy": "A" | "CNAME" | "http" | "dns-01" | null,
  "acceptedChallenges": ["dns-01" | "http-01"],
  "misconfigured": boolean,                 // configured AND a TLS cert can be issued
  "recommendedCNAME": [{ "rank": number, "value": string }],     // rank 1 preferred
  "recommendedIPv4":  [{ "rank": number, "value": string[] }] }  // rank 1 preferred; "only using 1 ip value is acceptable"
```

- For an apex domain, show an **A record** with `recommendedIPv4.find(r => r.rank === 1).value[0]`. Note that
  `value` is an **array** of strings.

**409 on `POST /v10/projects/{idOrName}/domains`**

- The spec only gives descriptions:
  - "The domain is already assigned to another Vercel project"
  - "The domain is already assigned to a project on this account"
  - "The domain is not allowed to be used"
  - "The project is currently being transferred"
- No response schema and **no `error.code` values are documented**.
- The general error format is `{ "error": { "code": string, "message": string, ... } }`. The documented domain codes
  are `forbidden` (with `error.domain`), `not_found`, `missing_name` and `conflict_aliases`.
- Recommendation: on 409, call `GET /v9/projects/{id}/domains/{domain}`. A 200 means the domain is already on this
  project; anything else means showing `error.message`.

## 3. OpenAI (from the `openai@7.52.0` SDK types; platform.openai.com returns 403)

**(a) Images**

- `gpt-image-1` was "shut down on October 23, 2026. Use `gpt-image-2.5-sunburst` or `gpt-image-2.5-flare` instead."
- The full `ImageModel` union:
  - current and snapshot IDs: `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, `gpt-image-2.5-sunburst(-2026-09-08)`,
    `gpt-image-2.5-flare(-2026-09-08)`, `gpt-image-2`, `gpt-image-2-2026-04-21`
  - older IDs: `gpt-image-1.5`, `gpt-image-1-mini`, `chatgpt-image-latest`
- The `/v1/images/generations` description says "Specify a model explicitly". The Responses API `image_generation`
  tool defaults to `gpt-image-2`.
- **Which replacement is the standard-quality one is not stated** in the SDK. Sunburst and flare are documented
  identically: `quality` low/medium/high/**xhigh/max**, any `WIDTHxHEIGHT` divisible by 16 with an aspect ratio from
  1:3 to 3:1, and opaque/transparent backgrounds. Pricing and positioning live on developers.openai.com, which is
  blocked here, so this is unverified.
- `response_format` is deprecated (GPT image models always return `b64_json`). Output formats are
  `png | jpeg | webp | gif | svg`.

**(b) Responses API with web search**

Model IDs:

- **Not deprecated** in the SDK list:
  - `gpt-5.4-mini` (snapshot `gpt-5.4-mini-2026-03-17`)
  - `gpt-5.5`
  - `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`
  - `gpt-6-sol`, `gpt-6-luna`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-astra`
- **Deprecated:**
  - `gpt-5.4-nano`: shutdown 2027-04-01
  - `gpt-5` / `gpt-5-mini` / `gpt-5-nano`: shutdown 2026-12-11
  - `gpt-4.1*` and `gpt-4o*`: shutdown 2027-01-14
  - the `*-search-preview` models: shut down 2026-07-23
- The SDK has no prices. `gpt-5.4-mini` is the cheapest-looking non-deprecated ID, but whether it is cheapest is
  unverified.

Request:

```jsonc
POST https://api.openai.com/v1/responses
{ "model": "gpt-5.4-mini",
  "input": "<question>",
  "tools": [{ "type": "web_search" }],      // or "web_search_2025_08_26"; optional: search_context_size low|medium|high (default medium),
                                            // user_location {type:"approximate", country, region, city, timezone} (omitted => defaults to US),
                                            // filters.allowed_domains [], external_web_access (default true)
  "include": ["web_search_call.action.sources"] }   // optional: full list of sources consulted
```

Nothing besides `tools` is required.

Where citations appear in the response:

- `output[]` items of `type: "message"` → `content[]` of `type: "output_text"` → `annotations[]`, where
  `type: "url_citation"` items carry `{ url, title, start_index, end_index }`.
- `output[]` items of `type: "web_search_call"` → `action` (`type: "search"`) → `sources[]` = `{ type: "url", url }`.
  These are only present when that `include` is set.
- `output_text` is an SDK convenience property, not part of the raw JSON.

## 4. Perplexity

`docs.perplexity.ai` and `api.perplexity.ai` are **not reachable**: the proxy rejected the connection because they
aren't on the allowlist. Skipped.

## 5. Google PageSpeed Insights API v5

Sources: https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed and
https://developers.google.com/speed/docs/insights/v5/get-started.

**Request**

```
GET https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile&category=performance[&key=<API key>]
```

- The older host `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` still appears in the guide's samples.
- `url` is required.
- `strategy` is `desktop` or `mobile`; **desktop is the default**.
- `category` is repeatable; when omitted only Performance runs.
- `locale` is optional.
- **An API key is not required**: "can be used with or without an API key, although a key is recommended for frequent,
  automated queries".

**Response (lab data)**

| Metric | Path |
|---|---|
| Performance score | `lighthouseResult.categories.performance.score` (0–1, e.g. `0.96`; ×100 for the usual score) |
| First Contentful Paint | `lighthouseResult.audits["first-contentful-paint"]` |
| Largest Contentful Paint | `lighthouseResult.audits["largest-contentful-paint"]` |
| Total Blocking Time | `lighthouseResult.audits["total-blocking-time"]` |
| Cumulative Layout Shift | `lighthouseResult.audits["cumulative-layout-shift"]` |

- Each audit has `score` (0–1), `displayValue` (e.g. "1.2 s") and `numericValue`. `numericValue` is in milliseconds
  for the timings and unitless for CLS.
- The guide's sample only shows the FCP, LCP and TBT keys plus `displayValue`. The CLS key and `numericValue` are
  standard Lighthouse fields, not shown on the PSI page.

**Response (field data from Chrome UX Report, when available)**

- `loadingExperience.metrics.<METRIC>.percentile`, for example `FIRST_CONTENTFUL_PAINT_MS` (75th percentile).
  `originLoadingExperience` has the same shape for the whole origin.
