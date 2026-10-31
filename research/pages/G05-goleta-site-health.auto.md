# G05-goleta-site-health — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/geo-audit`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/G05-goleta-site-health-1.png`, `screenshots/G05-goleta-site-health-2.png`

## Visible text (main content, top → bottom)

```text
Site health
Identifies issues that can block Google and ChatGPT from reading and ranking your site
Choose pages
What we check
Share
Health score
Overall score

99
Good
Page Speed
100
/100
LLM Optimization
99
/100
Technical SEO
99
/100
Crawler files

sitemap.xml
robots.txt
llms.txt
Issues detected
3 issue types on 4 pages

How to fix the whole site

Next check in 3d 9h
By issue
By page

Medium
Irrelevant meta description
Technical SEO
3 pages

Medium
Meta title length issue
Technical SEO
1 page

Low
Large image
Technical SEO
1 page
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
- Next check in 3d 9h [icon:lucide-refresh-cw]
- By issue [icon:lucide-layers]
- By page [icon:lucide-file-text]
- Medium Irrelevant meta description Technical SEO 3 pages [icon:lucide-chevron-down]
- Medium Meta title length issue Technical SEO 1 page [icon:lucide-chevron-down]
- Low Large image Technical SEO 1 page [icon:lucide-chevron-down]

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

## API calls (`api/G05-goleta-site-health.json`)

### `GET /api/geo-audit/data?orgWebsiteId=51141` → 200
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
   "url": "string: https://goletapressurewashing.com",
   "geoScore": "int",
   "issueCount": "int",
   "issues": [
    {
     "id": "int",
     "geoAuditId": "int",
     "issueType": "string: meta_title_length",
     "description": "string: Meta title length is not optimal (should be 45-60 characters",
     "pageId": "int",
     "severity": "string: MEDIUM",
     "action": {
      "fix": "…",
      "before": "…",
      "message": "…"
     },
     "fixedAt": "null",
     "createdAt": "string: 2026-10-27T15:30:24.137Z",
     "page": {
      "id": "…",
      "url": "…"
     }
    }
   ]
  }
 ],
 "auditDate": "string: 2026-10-27T15:30:01.562Z",
 "nextScheduledAuditAt": "string: 2026-11-03T15:32:06.056Z",
 "pagesAudited": "int",
 "inProgress": "bool"
}
```
