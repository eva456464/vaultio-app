# 13-traffic-all — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/analytics/ga4`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/13-traffic-all-1.png`, `screenshots/13-traffic-all-2.png`, `screenshots/13-traffic-all-3.png`

## Visible text (main content, top → bottom)

```text
All traffic
Analyze your site traffic across Google and AI search.

All time
Active users

2.5K
Total active users in this period
Sessions

2.9K
Total sessions in this period
Top channel

Direct
Channel with most users
Users from AI searches

26
Users who came from AI searches
Channel performance
Compare which channels drive the most traffic to your site
All channels

Direct

Other

Organic Search

AI Search

Paid
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
200
400
600
800
Channel Breakdown
Channel
Active Users ↓
Share
Direct
1,666
67.5%
Other
489
19.8%
Organic Search
293
11.9%
AI Search
20
0.8%
Paid
0
0.0%
Top pages
Pages with the highest number of active users during the selected period

Vaultio articles only
Page	
Active Users

Page Share

Top Source

Homepage
1,084	44.6%	
Direct
/About
72	3%	
Direct
/ClientOnboarding
31	1.3%	
Direct
/WhoWeHelp
29	1.2%	
Direct
/cities
28	1.2%	
Direct
/Blog
26	1.1%	
Direct
/Guarantee
25	1%	
Direct
/MetaAds
17	0.7%	
Direct
/FAQ
14	0.6%	
Direct
/Blog/role-of-trust-signals-in-lead-capture
Vaultio article
14	0.6%	
Direct
Showing 1–10 of 735 items
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
- Other
- Organic Search
- AI Search
- Paid
- Channel
- Active Users ↓
- Share
- Vaultio articles only
- (Active Users explanation) [icon:lucide-info]
- (Page Share explanation) [icon:lucide-info]
- (Top Source explanation) [icon:lucide-info]
- Homepage [icon:lucide-external-link] -> https://vaultio.co/
- /About [icon:lucide-external-link] -> https://vaultio.co/About
- /ClientOnboarding [icon:lucide-external-link] -> https://vaultio.co/ClientOnboarding
- /WhoWeHelp [icon:lucide-external-link] -> https://vaultio.co/WhoWeHelp
- /cities [icon:lucide-external-link] -> https://vaultio.co/cities
- /Blog [icon:lucide-external-link] -> https://vaultio.co/Blog
- /Guarantee [icon:lucide-external-link] -> https://vaultio.co/Guarantee
- /MetaAds [icon:lucide-external-link] -> https://vaultio.co/MetaAds
- /FAQ [icon:lucide-external-link] -> https://vaultio.co/FAQ
- /Blog/role-of-trust-signals-in-lead-capture [icon:lucide-external-link] -> https://vaultio.co/Blog/role-of-trust-signals-in-lead-capture
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
- sample: `[["Homepage", "1,084", "44.6%", "Direct"], ["/About", "72", "3%", "Direct"], ["/ClientOnboarding", "31", "1.3%", "Direct"], ["/WhoWeHelp", "29", "1.2%", "Direct"]]`

## Images

-  | https://csuxjmfbwmkxiegfpljm.supabase.co/storage/v1/object/public/whitelabel/vaultio/vaultio_favicon.png

## API calls (`api/13-traffic-all.json`)

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
   "date": "string: 2026-04-21",
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
   "percentage": "float",
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
