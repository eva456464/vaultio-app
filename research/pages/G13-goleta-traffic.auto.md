# G13-goleta-traffic — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/analytics/ga4`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/G13-goleta-traffic-1.png`, `screenshots/G13-goleta-traffic-2.png`, `screenshots/G13-goleta-traffic-3.png`

## Visible text (main content, top → bottom)

```text
All traffic
Analyze your site traffic across Google and AI search.

All time
Active users

645
Total active users in this period
Sessions

744
Total sessions in this period
Top channel

Direct
Channel with most users
Users from AI searches

7
Users who came from AI searches
Channel performance
Compare which channels drive the most traffic to your site
All channels

Direct

Organic Search

Other

Paid

AI Search
Aug 8
Aug 15
Aug 23
Aug 31
Sep 7
Sep 14
Sep 22
Sep 30
Oct 7
Oct 14
Oct 22
Oct 30
0
6
12
18
24
Channel Breakdown
Channel
Active Users ↓
Share
Direct
293
45.4%
Organic Search
197
30.5%
Other
123
19.1%
Paid
26
4.0%
AI Search
6
0.9%
Top pages
Pages with the highest number of active users during the selected period

Vaultio articles only
Page	
Active Users

Page Share

Top Source

Homepage
404	58%	
Direct
/about
17	2.4%	
Not set
/contact
16	2.3%	
Direct
/blog/window-screen-cleaning
Vaultio article
15	2.2%	
Direct
/services/solar-panel-cleaning
12	1.7%	
Direct
/blog/algae-on-stucco-removal
Vaultio article
11	1.6%	
Google
/services/gutter-cleaning
11	1.6%	
Direct
/blog/efflorescence-on-pavers
Vaultio article
11	1.6%	
Google
/services/roof-cleaning
11	1.6%	
Direct
/blog/driveway-mold-removal
Vaultio article
10	1.4%	
Google
Showing 1–10 of 83 items
Previous
Next
```

## Headings

- H1: All traffic
- H3: Channel performance

## Buttons / links (text [lucide icon] -> href)

- All time [icon:lucide-calendar-days]
- All channels [icon:lucide-chevron-down]
- Direct
- Organic Search
- Other
- Paid
- AI Search
- Channel
- Active Users ↓
- Share
- Vaultio articles only
- (Active Users explanation) [icon:lucide-info]
- (Page Share explanation) [icon:lucide-info]
- (Top Source explanation) [icon:lucide-info]
- Homepage [icon:lucide-external-link] -> https://goletapressurewashing.com/
- /about [icon:lucide-external-link] -> https://goletapressurewashing.com/about
- /contact [icon:lucide-external-link] -> https://goletapressurewashing.com/contact
- /blog/window-screen-cleaning [icon:lucide-external-link] -> https://goletapressurewashing.com/blog/window-screen-cleaning
- /services/solar-panel-cleaning [icon:lucide-external-link] -> https://goletapressurewashing.com/services/solar-panel-cleaning
- /blog/algae-on-stucco-removal [icon:lucide-external-link] -> https://goletapressurewashing.com/blog/algae-on-stucco-removal
- /services/gutter-cleaning [icon:lucide-external-link] -> https://goletapressurewashing.com/services/gutter-cleaning
- /blog/efflorescence-on-pavers [icon:lucide-external-link] -> https://goletapressurewashing.com/blog/efflorescence-on-pavers
- /services/roof-cleaning [icon:lucide-external-link] -> https://goletapressurewashing.com/services/roof-cleaning
- /blog/driveway-mold-removal [icon:lucide-external-link] -> https://goletapressurewashing.com/blog/driveway-mold-removal
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
| INPUT | text | Search pages | Search pages... |   |

## Tables

- headers: ['Page', 'Active Users', 'Page Share', 'Top Source'] · rows rendered: 10
- sample: `[["Homepage", "404", "58%", "Direct"], ["/about", "17", "2.4%", "Not set"], ["/contact", "16", "2.3%", "Direct"], ["/blog/window-screen-cleaning Vaultio article", "15", "2.2%", "Direct"]]`

## Images

-  | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png

## API calls (`api/G13-goleta-traffic.json`)

### `GET /api/ga4/status` → 200
Response shape:
```json
{
 "message": "string: GA4 integration status",
 "data": {
  "connected": "bool",
  "selectedGa4Property": "string: properties/548796786",
  "ga4InitialSyncCompleted": "bool"
 }
}
```

### `GET /api/ga4/overall-overview?range=all` → 200
Response shape:
```json
{
 "message": "string: Overall overview fetched successfully",
 "data": {
  "totalActiveUsers": "int",
  "totalSessions": "string: [REDACTED]",
  "aiActiveUsers": "int",
  "topChannelGroup": "string: Direct"
 }
}
```

### `GET /api/ga4/channel-timeseries?range=all` → 200
Response shape:
```json
{
 "message": "string: Channel timeseries fetched successfully",
 "data": [
  {
   "date": "string: 2026-08-05",
   "Direct": "int",
   "Paid": "int",
   "Organic search": "int",
   "Other": "int",
   "LLM referrers": "int"
  }
 ]
}
```

### `GET /api/ga4/channel-breakdown?range=all` → 200
Response shape:
```json
{
 "message": "string: Channel breakdown fetched successfully",
 "data": [
  {
   "channelGroup": "string: Direct",
   "activeUsers": "int",
   "percentage": "float"
  }
 ],
 "total": "int"
}
```

### `GET /api/ga4/traffic-pages?range=all&page=1&limit=10` → 200
Response shape:
```json
{
 "message": "string: Traffic pages fetched successfully",
 "data": [
  {
   "page": "string",
   "activeUsers": "int",
   "percentage": "int",
   "topSource": "string: Direct",
   "topSourceIsAi": "bool",
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
