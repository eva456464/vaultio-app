# G09-goleta-ai-visibility — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/ai-visibility`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/G09-goleta-ai-visibility-1.png`, `screenshots/G09-goleta-ai-visibility-2.png`, `screenshots/G09-goleta-ai-visibility-3.png`

## Visible text (main content, top → bottom)

```text
AI visibility overview
Monitor how AI platforms discover, mention and recommend your brand.
Explanation
Across 10 prompts and 3 models , your brand appeared in 0 of 20 answers, a 0% visibility score. Most mentioned brand: Santa Barbara Soft Wash (5 mentions). Top source: yelp.com (7 times).
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
Aug 22
Sep 7
Sep 22
Oct 7
Oct 21
0%
25%
50%
75%
100%
Top AI sources
Websites AI models relied on most when answering questions
Source
Citation share

yelp.com
22%

santabarbarasoftwash.com
19%

thumbtack.com
9%

angi.com
9%

alohawindowbros.com
9%

airtasker.com
6%

en.wikipedia.org
6%

timetoshinesb.com
6%

mastercleanusa.net
6%

purepressureca.com
6%
Brands mentioned
Brands AI recommends most often alongside yours
Brand
Mentioned in
Visibility
Sentiment
Santa Barbara Soft Wash
5 /20 responses
25%
90
Google
3 /20 responses
15%
50
Time To Shine
2 /20 responses
10%
75
Master Clean USA
2 /20 responses
10%
75
Pure Pressure
2 /20 responses
10%
75
Clean Roof USA
2 /20 responses
10%
100
Roof Cleaning Pros
2 /20 responses
10%
100
Fish Window Cleaning
2 /20 responses
10%
100
Aloha Window Bros
2 /20 responses
10%
75
Home Depot
1 /20 responses
5%
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
- yelp.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dyelp.com%26default%3Ddata%253Aimage%252Fsvg%252Bxml%253
- santabarbarasoftwash.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dsantabarbarasoftwash.com%26default%3Ddata%253Aimage%252
- thumbtack.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dthumbtack.com%26default%3Ddata%253Aimage%252Fsvg%252Bxm
- angi.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dangi.com%26default%3Ddata%253Aimage%252Fsvg%252Bxml%253
- alohawindowbros.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dalohawindowbros.com%26default%3Ddata%253Aimage%252Fsvg%
- airtasker.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dairtasker.com%26default%3Ddata%253Aimage%252Fsvg%252Bxm
- en.wikipedia.org | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Den.wikipedia.org%26default%3Ddata%253Aimage%252Fsvg%252
- timetoshinesb.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dtimetoshinesb.com%26default%3Ddata%253Aimage%252Fsvg%25
- mastercleanusa.net | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dmastercleanusa.net%26default%3Ddata%253Aimage%252Fsvg%2
- purepressureca.com | https://app.vaultio.co/_next/image?url=https%3A%2F%2Fwww.google.com%2Fs2%2Ffavicons%3Fsz%3D64%26domain%3Dpurepressureca.com%26default%3Ddata%253Aimage%252Fsvg%2

## API calls (`api/G09-goleta-ai-visibility.json`)

### `GET /api/llm-visibility/top-sources` → 200
Response shape:
```json
[
 {
  "domain": "string: yelp.com",
  "count": "int",
  "urls": [
   {
    "url": "string: https://www.yelp.com/search?find_desc=exterior+cleaning&find",
    "sourceType": "string: category_page"
   }
  ]
 }
]
```

### `GET /api/llm-visibility/brands-mentioned` → 200
Response shape:
```json
[
 {
  "brandName": "string: Santa Barbara Soft Wash",
  "count": "int",
  "brandUrl": "string",
  "sentiment": {
   "score": "int",
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
  "domain": "string: yelp.com",
  "count": "int",
  "urls": [
   {
    "url": "string: https://www.yelp.com/search?find_desc=soft+wash&find_loc=san",
    "sourceType": "string: category_page"
   }
  ]
 },
 "topMentionedBrand": {
  "brandName": "string: Santa Barbara Soft Wash",
  "count": "int",
  "brandUrl": "string"
 }
}
```

### `GET /api/llm-visibility/history` → 200
Response shape:
```json
[
 {
  "date": "string: 2026-08-22",
  "visibilityScore": "int",
  "totalMentions": "int",
  "totalAnswers": "int"
 }
]
```
