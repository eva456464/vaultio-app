# 05-site-health — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/geo-audit`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/05-site-health-1.png`, `screenshots/05-site-health-2.png`

## Visible text (main content, top → bottom)

```text
Site health
Identifies issues that can block Google and ChatGPT from reading and ranking your site
Choose pages
What we check
Share
Health score
Overall score

98
Good
Page Speed
100
/100
LLM Optimization
98
/100
Technical SEO
98
/100
Crawler files

sitemap.xml
robots.txt
llms.txt
Issues detected
2 issue types on 10 pages

How to fix the whole site

Next check in 3d 11h
By issue
By page

Medium
Irrelevant meta description
Technical SEO
4 pages

Low
Large image
Technical SEO
7 pages
```

## Headings

- H1: Site health
- H2: Health score
- H2: Issues detected

## Buttons / links (text [lucide icon] -> href)

- Choose pages [icon:lucide-list-checks]
- What we check [icon:lucide-info]
- Share [icon:lucide-share2]
- (Files that help Google and AI tools find and understand your pages.) [icon:lucide-info]
- How to fix the whole site [icon:lucide-sparkles]
- Next check in 3d 11h [icon:lucide-refresh-cw]
- By issue [icon:lucide-layers]
- By page [icon:lucide-file-text]
- Medium Irrelevant meta description Technical SEO 4 pages [icon:lucide-chevron-down]
- Low Large image Technical SEO 7 pages [icon:lucide-chevron-down]

## Lucide icons used

- lucide-list-checks
- lucide-info
- lucide-share2
- lucide-check
- lucide-sparkles
- lucide-refresh-cw
- lucide-layers
- lucide-file-text
- lucide-chevron-down

## API calls (`api/05-site-health.json`)

### `GET /api/organization/get-org-websites` → 200
Response shape:
```json
{
 "message": "string: Organization websites fetched successfully",
 "data": [
  {
   "id": "int",
   "organizationId": "int",
   "url": "string: https://vaultio.co",
   "brandName": "string: Vaultio",
   "selectedLanguage": "string: en",
   "onboardingStatus": "string: not_started",
   "onboardingCompletedAt": "null",
   "brandColor": "string: #E94545",
   "brandSecondaryColor": "string: #000000",
   "logoUrl": "null",
   "screenshotUrl": "null",
   "createdAt": "string: 2026-05-07T15:11:02.994Z",
   "isHidden": "bool",
   "subscriptions": []
  }
 ]
}
```

### `GET /api/geo-audit/data?orgWebsiteId=41420"` → 0
Response (text): ``

### `GET /api/geo-audit/data?orgWebsiteId=41420` → 200
Response shape:
```json
{
 "averageGeoScore": "int",
 "averagePageSpeed": "int",
 "llmOptimizationScore": "int",
 "technicalSeoScore": "int",
 "overallScore": "int",
 "robotsTxt": {
  "status": "string: ok"
 },
 "sitemap": {
  "status": "string: ok"
 },
 "llmTxt": {
  "status": "string: ok"
 },
 "pages": [
  {
   "url": "string: https://vaultio.co",
   "geoScore": "int",
   "issueCount": "int",
   "issues": [
    {
     "id": "int",
     "geoAuditId": "int",
     "issueType": "string: image_large",
     "description": "string: Image is too large (Image: https://images.unsplash.com/photo",
     "pageId": "int",
     "severity": "string: LOW",
     "action": {
      "fix": "…",
      "before": "…",
      "message": "…",
      "occurrences": "…"
     },
     "fixedAt": "null",
     "createdAt": "string: 2026-10-27T16:05:39.100Z",
     "page": {
      "id": "…",
      "url": "…"
     }
    }
   ]
  }
 ],
 "auditDate": "string: 2026-10-27T16:05:08.621Z",
 "nextScheduledAuditAt": "string: 2026-11-03T16:07:08.323Z",
 "pagesAudited": "int",
 "inProgress": "bool"
}
```
