# 14-traffic-ai-search — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/analytics/ai-traffic`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/14-traffic-ai-search-1.png`, `screenshots/14-traffic-ai-search-2.png`, `screenshots/14-traffic-ai-search-3.png`

## Visible text (main content, top → bottom)

```text
AI search traffic
Analyze your site traffic across Google and AI search.

All time
Active users

26
Users who came from AI searches
Sessions

30
Sessions from AI searches
Top AI model

ChatGPT
Top model by AI traffic
AI models

4
Number of AI models
AI search performance
See which AI models drive the most traffic to your site
All models

ChatGPT

Perplexity

Gemini

Copilot

Claude

You.com

Phind

Poe

Groq

Meta AI
Apr 26
May 12
May 28
Jun 13
Jun 28
Jul 13
Jul 27
Aug 11
Aug 27
Sep 12
Sep 28
Oct 14
Oct 30
0
1
2
3
4
Top AI models
AI model
Active Users ↓
Share
ChatGPT
15
60.0%
Gemini
4
16.0%
Perplexity
4
16.0%
Copilot
2
8.0%
Top pages
Analyze which pages get the most traffic from AI searches
Group by

Pages

Vaultio articles only
Page	
Active Users

Page Share

Top AI Model

Homepage
11	44.0%	
ChatGPT
/About
3	12.0%	
ChatGPT
/AIReceptionist
1	4.0%	
Perplexity
/B2BOutreach
1	4.0%	
ChatGPT
/Blog
1	4.0%	
Gemini
/Blog/llm-citations
Vaultio article
1	4.0%	
Gemini
/Blog/website-design-home-services
1	4.0%	
ChatGPT
/CarpetCleanersMarketing
1	4.0%	
Gemini
/GarageDoorsMarketing
1	4.0%	
ChatGPT
/HomeSecurityMarketing
1	4.0%	
ChatGPT
Showing 1–10 of 13 items
Previous
Next
```

## Headings

- H1: AI search traffic
- H3: AI search performance

## Buttons / links (text [lucide icon] -> href)

- All time [icon:lucide-calendar-days]
- All models [icon:lucide-chevron-down]
- ChatGPT
- Perplexity
- Gemini
- Copilot
- Claude
- You.com
- Phind
- Poe
- Groq
- Meta AI
- AI model
- Active Users ↓
- Share
- Pages [icon:]
- Vaultio articles only
- (Active Users explanation) [icon:lucide-info]
- (Page Share explanation) [icon:lucide-info]
- (Top AI model explanation) [icon:lucide-info]
- Homepage [icon:lucide-external-link] -> https://vaultio.co/
- /About [icon:lucide-external-link] -> https://vaultio.co/About
- /AIReceptionist [icon:lucide-external-link] -> https://vaultio.co/AIReceptionist
- /B2BOutreach [icon:lucide-external-link] -> https://vaultio.co/B2BOutreach
- /Blog [icon:lucide-external-link] -> https://vaultio.co/Blog
- /Blog/llm-citations [icon:lucide-external-link] -> https://vaultio.co/Blog/llm-citations
- /Blog/website-design-home-services [icon:lucide-external-link] -> https://vaultio.co/Blog/website-design-home-services
- /CarpetCleanersMarketing [icon:lucide-external-link] -> https://vaultio.co/CarpetCleanersMarketing
- /GarageDoorsMarketing [icon:lucide-external-link] -> https://vaultio.co/GarageDoorsMarketing
- /HomeSecurityMarketing [icon:lucide-external-link] -> https://vaultio.co/HomeSecurityMarketing
- Previous [icon:lucide-chevron-left] [disabled]
- Next [icon:lucide-chevron-right]

## Lucide icons used

- lucide-calendar-days
- lucide-info
- lucide-chevron-down
- lucide-search
- lucide-external-link
- lucide-chevron-left
- lucide-chevron-right

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| BUTTON | button | Reporting period |  | All time closed |
| BUTTON | button | Group pages table by |  | Pages closed |
| INPUT | text | Search pages | Search pages... |   |

## Tables

- headers: ['Page', 'Active Users', 'Page Share', 'Top AI Model'] · rows rendered: 10
- sample: `[["Homepage", "11", "44.0%", "ChatGPT"], ["/About", "3", "12.0%", "ChatGPT"], ["/AIReceptionist", "1", "4.0%", "Perplexity"], ["/B2BOutreach", "1", "4.0%", "ChatGPT"]]`

## Images

- ChatGPT | https://app.vaultio.co/_next/image?url=%2Flogos%2Fchatgpt-logo.png&w=32&q=75
- Gemini | https://app.vaultio.co/logos/gemini.svg
- Perplexity | https://app.vaultio.co/logos/perplexity.svg
- Copilot | https://app.vaultio.co/logos/copilot.svg
-  | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png

## API calls (`api/14-traffic-ai-search.json`)

### `GET /api/ga4/status` → 200
Response shape:
```json
{
 "message": "string: GA4 integration status",
 "data": {
  "connected": "bool",
  "selectedGa4Property": "string: properties/534109473",
  "ga4InitialSyncCompleted": "bool"
 }
}
```

### `GET /api/ga4/ai-overview?range=all` → 200
Response shape:
```json
{
 "message": "string: AI overview fetched successfully",
 "data": {
  "aiActiveUsers": "int",
  "aiSessions": "string: [REDACTED]",
  "topSource": "string: chatgpt",
  "aiSourcesCount": "int"
 }
}
```

### `GET /api/ga4/ai-sources-timeseries?range=all` → 200
Response shape:
```json
{
 "message": "string: AI sources timeseries fetched successfully",
 "data": [
  {
   "date": "string: 2026-04-21",
   "chatgpt": "int",
   "copilot": "int",
   "gemini": "int",
   "perplexity": "int"
  }
 ]
}
```

### `GET /api/ga4/ai-sources?range=all` → 200
Response shape:
```json
{
 "message": "string: AI sources fetched successfully",
 "data": [
  {
   "source": "string: chatgpt",
   "activeUsers": "int",
   "percentage": "int"
  }
 ],
 "total": "int"
}
```

### `GET /api/ga4/ai-pages?range=all&page=1&limit=10` → 200
Response shape:
```json
{
 "message": "string: AI pages fetched successfully",
 "data": [
  {
   "page": "string",
   "activeUsers": "int",
   "percentage": "int",
   "topSource": "string: ChatGPT",
   "isBlgArticle": "bool"
  }
 ],
 "pagination": {
  "page": "int",
  "limit": "int",
  "total": "int",
  "totalPages": "int"
 },
 "hasBlgArticles": "bool",
 "totalActiveUsers": "int"
}
```

### `GET /api/ga4/ai-source-page-mapping?range=all` → 200
Response shape:
```json
{
 "message": "string: AI source-page mapping fetched successfully",
 "data": [
  {
   "source": "string: chatgpt",
   "totalActiveUsers": "int",
   "pages": [
    {
     "page": "string",
     "activeUsers": "int",
     "percentage": "int"
    }
   ]
  }
 ]
}
```
