# 09-ai-visibility-overview — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/ai-visibility`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/09-ai-visibility-overview-1.png`, `screenshots/09-ai-visibility-overview-2.png`, `screenshots/09-ai-visibility-overview-3.png`

## Visible text (main content, top → bottom)

```text
AI visibility overview
Monitor how AI platforms discover, mention and recommend your brand.
Explanation
Across 10 prompts and 3 models , your brand appeared in 0 of 20 answers, a 0% visibility score. Most mentioned brand: Google (14 mentions). Top source: sianamarketing.com (3 times).
Visibility score

0/100
for 10 prompts
Starting point
0/100 means AI doesn't mention your brand in these answers yet, which is a normal place to start. We'll create and publish content for these exact prompts, back it with contextual and quality backlinks, and work toward your brand's first mentions and citations in AI answers.

Brand mentions

0
/20 answers
Visibility over time
How your visibility score changed over time
Aug 23
Sep 6
Sep 20
Oct 5
Oct 20
0%
25%
50%
75%
100%
Top AI sources
Websites AI models relied on most when answering questions
Source
Citation share

backlinko.com
14%

sianamarketing.com
14%

semrush.com
9%

clutch.co
9%

pipelineon.com
9%

g2.com
9%

hookagency.com
9%
1
1seo.com
9%

leadadvisors.com
9%

socialcali.com
9%
Brands mentioned
Brands AI recommends most often alongside yours
Brand
Mentioned in
Visibility
Sentiment
Google
14 /20 responses
70%
61
Google Search Console
3 /20 responses
15%
50
Google Business Profile
3 /20 responses
15%
67
Yelp
3 /20 responses
15%
50
Clutch
3 /20 responses
15%
50
Scorpion
3 /20 responses
15%
67
Google Maps
2 /20 responses
10%
50
BBB
2 /20 responses
10%
50
Facebook
2 /20 responses
10%
50
ChatGPT
2 /20 responses
10%
50
```

## Headings

- H1: AI visibility overview

## Buttons / links (text [lucide icon] -> href)

- Brand mentions 0 /20 answers [icon:lucide-info]
- Top AI sources Websites AI models relied on most when answering questions Source [icon:lucide-info] -> /dashboard/ai-visibility?tab=sources
- (See all brands) -> /dashboard/ai-visibility?tab=brands-mentioned

## Lucide icons used

- lucide-info

## Images

- ChatGPT | https://app.vaultio.co/_next/image?url=%2Flogos%2Fchatgpt-logo.png&w=48&q=75
- Gemini | https://app.vaultio.co/logos/gemini.svg
- Claude | https://app.vaultio.co/logos/claude-ai-icon.svg
- backlinko.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dbacklinko.com%26default%3Ddata%253Aimage%252Fsvg%252Bxm
- sianamarketing.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dsianamarketing.com%26default%3Ddata%253Aimage%252Fsvg%2
- semrush.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dsemrush.com%26default%3Ddata%253Aimage%252Fsvg%252Bxml%
- clutch.co | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dclutch.co%26default%3Ddata%253Aimage%252Fsvg%252Bxml%25
- pipelineon.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dpipelineon.com%26default%3Ddata%253Aimage%252Fsvg%252Bx
- g2.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dg2.com%26default%3Ddata%253Aimage%252Fsvg%252Bxml%253Bb
- hookagency.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dhookagency.com%26default%3Ddata%253Aimage%252Fsvg%252Bx
- leadadvisors.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dleadadvisors.com%26default%3Ddata%253Aimage%252Fsvg%252
- socialcali.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dsocialcali.com%26default%3Ddata%253Aimage%252Fsvg%252Bx

## API calls (`api/09-ai-visibility-overview.json`)

### `GET /api/llm-visibility/top-sources` → 200
Response shape:
```json
[
 {
  "domain": "string: backlinko.com",
  "count": "int",
  "urls": [
   {
    "url": "string: https://backlinko.com/hub/seo/best-practices",
    "sourceType": "string: resource_page"
   }
  ]
 }
]
```

### `GET /api/llm-visibility/history` → 200
Response shape:
```json
[
 {
  "date": "string: 2026-08-23",
  "visibilityScore": "int",
  "totalMentions": "int",
  "totalAnswers": "int"
 }
]
```

### `GET /api/llm-visibility/brands-mentioned` → 200
Response shape:
```json
[
 {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "float",
   "positive": "int",
   "neutral": "int",
   "negative": "int",
   "classifiedMentions": "int"
  }
 }
]
```

### `GET /api/llm-visibility/overall-insights` → 200
Response shape:
```json
{
 "visibilityScore": "int",
 "totalMentions": "int",
 "totalAnswers": "int",
 "totalPrompts": "int",
 "topSource": {
  "domain": "string: sianamarketing.com",
  "count": "int",
  "urls": [
   {
    "url": "string: https://www.sianamarketing.com/resources/top-local-seo-agenc",
    "sourceType": "string: resource_page"
   }
  ]
 },
 "topMentionedBrand": {
  "brandName": "string: Google",
  "count": "int",
  "brandUrl": "string"
 }
}
```
