# Observed backend endpoints (auto-generated)

Base URL `https://api.babylovegrowth.ai`. All requests: `Authorization: Bearer <JWT access_token>` + `x-org-website-id: <orgWebsiteId>` (site scope) + `Accept: application/json`. Shapes below come from real responses (types only; examples in `api/<page>.json`).

Total distinct endpoints: **80**

## achievement

### `GET /api/achievement/trustpilot/status`
- seen on: 00-global
- status: [200]
- response shape:
```json
{
 "hasReview": "bool",
 "isUsed": "bool",
 "reviewsClaimedToday": "int"
}
```

## agency-reporting

### `GET /api/agency-reporting/availability`
- seen on: 08-reporting, G08-goleta-reporting
- status: [200]
- query params seen: `period=previous_month`
- response shape:
```json
{
 "range": {
  "from": "string",
  "to": "string"
 },
 "clamped": "bool",
 "dataThrough": "string",
 "blocks": {
  "achievements": {
   "available": "bool",
   "count": "int"
  },
  "summary": {
   "available": "bool",
   "count": "int"
  },
  "kpis": {
   "available": "bool",
   "count": "int"
  },
  "clicksChart": {
   "available": "bool",
   "count": "int"
  },
  "countries": {
   "available": "bool",
   "count": "int"
  },
  "pages": {
   "available": "bool",
   "count": "int"
  },
  "keywords": {
   "available": "bool",
   "count": "int"
  },
  "articles": {
   "available": "bool",
   "count": "int"
  },
  "backlinks": {
   "available": "bool",
   "count": "int"
  },
  "siteHealth": {
   "available": "bool",
   "count": "int"
  },
  "community": {
   "available": "bool",
   "count": "int"
  },
  "aiVisibility": {
   "available": "bool",
   "count": "int"
  }
 }
}
```

### `POST /api/agency-reporting/preview`
- seen on: 08-reporting, G08-goleta-reporting
- status: [200]
- request body:
```json
{
 "period": "previous_month",
 "blocks": {
  "achievements": true,
  "summary": false,
  "kpis": true,
  "clicksChart": true,
  "countries": true,
  "pages": true,
  "keywords": true,
  "articles": true,
  "backlinks": true,
  "siteHealth": true,
  "community": true,
  "aiVisibility": true
 },
 "kpiMetrics": [
  "clicks",
  "impressions",
  "position"
 ]
}
```
- response shape:
```json
text/html: <!doctype html> <html lang="en"> <head> <meta charset="utf-8" /> <title>Vaultio — https://vaultio.co</title> <link rel="
```

### `GET /api/agency-reporting/preview`
- seen on: 08-reporting
- status: [404]
- response shape:
```json
{
 "message": "string"
}
```

### `GET /api/agency-reporting/settings`
- seen on: 08-reporting, G08-goleta-reporting
- status: [200]
- response shape:
```json
{
 "autoSend": "bool",
 "blockToggles": {
  "kpis": "bool",
  "pages": "bool",
  "summary": "bool",
  "articles": "bool",
  "keywords": "bool",
  "backlinks": "bool",
  "community": "bool",
  "countries": "bool",
  "siteHealth": "bool",
  "clicksChart": "bool",
  "achievements": "bool",
  "aiVisibility": "bool"
 },
 "kpiMetrics": [
  "string"
 ],
 "recipientEmail": "string"
}
```

## article-improvements

### `GET /api/article-improvements`
- seen on: 02-blog-content, 03-content-improvements, G02-goleta-blog-content
- status: [200]
- response shape:
```json
[]
```

### `GET /api/article-improvements/candidates`
- seen on: 03-content-improvements
- status: [200]
- response shape:
```json
[]
```

### `GET /api/article-improvements/pending-count`
- seen on: 02-blog-content, 03-content-improvements, G02-goleta-blog-content
- status: [200]
- response shape:
```json
{
 "pendingCount": "int"
}
```

### `GET /api/article-improvements/settings`
- seen on: 03-content-improvements, 27-settings-improvements
- status: [200]
- response shape:
```json
{
 "improvementsEnabled": "bool",
 "improvementWeekdays": [
  "int"
 ],
 "improvementsAutoPublish": "bool",
 "gscConnected": "bool",
 "hasUpdateCapableIntegration": "bool"
}
```

## articles

### `GET /api/articles`
- seen on: 22-settings-billing, 30-settings-publishing, G30-goleta-publishing
- status: [200]
- response shape:
```json
text/html: [{"id":1036058,"orgWebsiteId":41420,"title":"Local SEO Ranking Factors for Contractors in 2026","slug":"local-seo-rankin
```

### `GET /api/articles/:id`
- seen on: 18-article-detail
- status: [200]
- response shape:
```json
{
 "id": "int",
 "orgWebsiteId": "int",
 "title": "string",
 "content": "string",
 "metaDescription": "string",
 "languageCode": "string",
 "keywordClusterId": "int",
 "mediaQueries": [
  {
   "type": "string",
   "altText": "string",
   "elementId": "string",
   "identifier": "string",
   "searchTerm": "string",
   "heroPromptKind": "string",
   "generationPrompt": "string"
  }
 ],
 "media": [
  {
   "url": "string",
   "type": "string",
   "source": "string",
   "altText": "string",
   "selected": "bool",
   "identifier": "string",
   "thumbnailUrl": "string"
  }
 ],
 "outline": [],
 "formattedContent": "string",
 "htmlContent": "string",
 "jsonLd": "null",
 "faqJsonLd": "null",
 "slug": "string",
 "publicUrl": "string",
 "downloaded": "bool",
 "isHappyFeedback": "null",
 "feedbackComment": "null",
 "createdAt": "string",
 "updatedAt": "string",
 "seoScore": "int",
 "publishedUrl": "string",
 "publishedAt": "string",
 "lastUrlCheckAt": "null",
 "wordCount": "int",
 "internalLinksCount": "int",
 "externalLinksCount": "int",
 "backlinksCount": "int",
 "generationRationale": {
  "brand": "string",
  "keyword": "string",
  "audience": "string",
  "serpShape": "string",
  "competitorsIncluded": "bool",
  "whyThisTopicMessages": [
   "string"
  ],
  "whyThisStructureMessages": [
   "string"
  ]
 },
 "generationSettings": "null",
 "aiImageRegenerationCount": "int",
 "ctaCards": {
  "cards": [
   {
    "kind": "string",
    "slot": "string",
    "pitch": "string",
    "title": "string",
    "layout": "string",
    "buttonUrl": "string",
    "buttonLabel": "string"
   }
  ],
  "branding": {
   "brandName": "string",
   "brandColor": "string",
   "brandSecondaryColor": "string"
  }
 },
 "keywordCluster": {
  "id": "int",
  "seedKeywordId": "int",
  "averageIntent": "null",
  "totalSearchVolume": "int",
  "commonUrls": [],
  "orgWebsiteId": "int",
  "articleGenerationAttempts": "null",
  "score": "float",
  "locationCode": "null",
  "locationName": "null",
  "clusterCategory": "string",
  "creationSource": "null",
  "createdAt": "string",
  "updatedAt": "string",
  "seedKeyword": {
   "id": "int",
   "value": "string",
   "languageCode": "string",
   "avgSearchVolume": "int",
   "averageCpc": "null",
   "averageIntent": "null",
   "keywordDifficulty": "int",
   "orgWebsiteId": "int",
   "source": "string",
   "relevancyScore": "null",
   "sourceTopic": "null",
   "articleType": "string",
   "createdAt": "string",
   "updatedAt": "string"
  },
  "keywords": [
   {
    "id": "int",
    "value": "string",
    "languageCode": "string",
    "avgSearchVolume": "int",
    "averageCpc": "null",
    "averageIntent": "null",
    "keywordDifficulty": "int",
    "orgWebsiteId": "int",
    "source": "string",
    "relevancyScore": "null",
    "sourceTopic": "null",
    "articleType": "string",
    "createdAt": "string",
    "updatedAt": "string"
   }
  ],
  "contentPlan": {
   "userInstruction": "null"
  }
 },
 "contentPlan": [
  {
   "scheduledFor": "string"
  }
 ],
 "canRegenerate": "bool"
}
```

## async-jobs

### `GET /api/async-jobs`
- seen on: 00-global, 29-settings-product-catalog
- status: [200]
- response shape:
```json
[]
```

## auth

### `GET /api/auth/sign-in-methods`
- seen on: 20-settings-account, 42-clients-settings-profile
- status: [200]
- response shape:
```json
{
 "data": {
  "hasPassword": "bool"
 }
}
```

## backlinks

### `GET /api/backlinks`
- seen on: 04-backlinks, 22-settings-billing, G04-goleta-backlinks, G22-goleta-billing
- status: [200]
- response shape:
```json
{
 "creditBalance": "int",
 "given": [
  {
   "id": "int",
   "sourceOrgWebsiteId": "int",
   "targetOrgWebsiteId": "int",
   "url": "string",
   "isBacklinkPresent": "bool",
   "articleId": "int",
   "articleClusterId": "int",
   "linkPower": "int",
   "becameOnlineAt": "string",
   "removedAt": "null",
   "blgRemovedAt": "null",
   "lastCrawledAt": "string",
   "followType": "string",
   "nofollowEmailSentAt": "null",
   "createdAt": "string",
   "updatedAt": "string",
   "targetOrgWebsite": {
    "url": "string"
   },
   "article": {
    "title": "string",
    "publishedUrl": "string",
    "publishedAt": "string"
   },
   "keywordCluster": {
    "contentPlan": {
     "scheduledFor": "…"
    }
   }
  }
 ],
 "received": [
  {
   "id": "int",
   "sourceOrgWebsiteId": "int",
   "targetOrgWebsiteId": "int",
   "url": "string",
   "isBacklinkPresent": "bool",
   "articleId": "int",
   "articleClusterId": "int",
   "linkPower": "int",
   "becameOnlineAt": "null",
   "removedAt": "null",
   "blgRemovedAt": "null",
   "lastCrawledAt": "null",
   "followType": "null",
   "nofollowEmailSentAt": "null",
   "backlinkExplanation": "string",
   "createdAt": "string",
   "updatedAt": "string",
   "sourceOrgWebsite": {
    "url": "string"
   },
   "article": {
    "title": "string",
    "publishedUrl": "null",
    "publishedAt": "null"
   },
   "keywordCluster": {
    "contentPlan": {
     "scheduledFor": "…"
    }
   }
  }
 ]
}
```

### `GET /api/backlinks/exchange-pool`
- seen on: 04-backlinks, G04-goleta-backlinks
- status: [200]
- response shape:
```json
{
 "poolCount": "int"
}
```

## competitor

### `GET /api/competitor`
- seen on: 01-overview, 22-settings-billing, 25-settings-competitors, G22-goleta-billing, zz-redirected-16-seo-specialist
- status: [200]
- response shape:
```json
[
 {
  "id": "int",
  "url": "string",
  "orgWebsiteId": "int",
  "organicTraffic": "null",
  "lastAnalyzedDate": "null",
  "createdAt": "string",
  "updatedAt": "string"
 }
]
```

## content-plan

### `GET /api/content-plan`
- seen on: 00-global, 01-overview, 02-blog-content, 18-article-detail, 22-settings-billing, G22-goleta-billing, zz-redirected-16-seo-specialist
- status: [200]
- response shape:
```json
text/html: [{"id":1028777,"orgWebsiteId":41420,"scheduledFor":"2026-06-27T00:00:00.000Z","userInstruction":null,"supportUrl":null,"
```

### `GET /api/content-plan/get-unused-clusters`
- seen on: 18-article-detail
- status: [200]
- response shape:
```json
[
 {
  "clusterId": "int",
  "keyword": "string",
  "searchVolume": "int",
  "keywordDifficulty": "int",
  "source": "string",
  "articleType": "string"
 }
]
```

## ga4

### `GET /api/ga4/account-info`
- seen on: 21-settings-analytics
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "email": "string",
  "name": "string",
  "picture": "string"
 }
}
```

### `GET /api/ga4/ai-overview`
- seen on: 14-traffic-ai-search
- status: [200]
- query params seen: `range=all`
- response shape:
```json
{
 "message": "string",
 "data": {
  "aiActiveUsers": "int",
  "aiSessions": "string",
  "topSource": "string",
  "aiSourcesCount": "int"
 }
}
```

### `GET /api/ga4/ai-pages`
- seen on: 14-traffic-ai-search
- status: [200]
- query params seen: `limit=10`, `page=1`, `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "page": "string",
   "activeUsers": "int",
   "percentage": "int",
   "topSource": "string",
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

### `GET /api/ga4/ai-source-page-mapping`
- seen on: 14-traffic-ai-search
- status: [200]
- query params seen: `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "source": "string",
   "totalActiveUsers": "int",
   "pages": [
    {
     "page": "…",
     "activeUsers": "…",
     "percentage": "…"
    }
   ]
  }
 ]
}
```

### `GET /api/ga4/ai-sources`
- seen on: 14-traffic-ai-search
- status: [200]
- query params seen: `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "source": "string",
   "activeUsers": "int",
   "percentage": "int"
  }
 ],
 "total": "int"
}
```

### `GET /api/ga4/ai-sources-timeseries`
- seen on: 14-traffic-ai-search
- status: [200]
- query params seen: `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "date": "string",
   "chatgpt": "int",
   "copilot": "int",
   "gemini": "int",
   "perplexity": "int"
  }
 ]
}
```

### `GET /api/ga4/channel-breakdown`
- seen on: 01-overview, 13-traffic-all, G13-goleta-traffic, zz-redirected-16-seo-specialist, zz-redirected-26-settings-gbp
- status: [200]
- query params seen: `range=90d`, `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "channelGroup": "string",
   "activeUsers": "int",
   "percentage": "float"
  }
 ],
 "total": "int"
}
```

### `GET /api/ga4/channel-timeseries`
- seen on: 01-overview, 13-traffic-all, G13-goleta-traffic, zz-redirected-16-seo-specialist, zz-redirected-26-settings-gbp
- status: [200]
- query params seen: `range=90d`, `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "date": "string",
   "Direct": "int",
   "Paid": "int",
   "Organic search": "int",
   "Other": "int",
   "LLM referrers": "int"
  }
 ]
}
```

### `GET /api/ga4/overall-overview`
- seen on: 13-traffic-all, G13-goleta-traffic
- status: [200]
- query params seen: `range=all`
- response shape:
```json
{
 "message": "string",
 "data": {
  "totalActiveUsers": "int",
  "totalSessions": "string",
  "aiActiveUsers": "int",
  "topChannelGroup": "string"
 }
}
```

### `GET /api/ga4/status`
- seen on: 01-overview, 13-traffic-all, 14-traffic-ai-search, G13-goleta-traffic, zz-redirected-16-seo-specialist, zz-redirected-17-product-updates, zz-redirected-26-settings-gbp, zz-redirected-28-settings-meta, zz-redirected-B26-blg-settings-gbp
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "connected": "bool",
  "selectedGa4Property": "string",
  "ga4InitialSyncCompleted": "bool"
 }
}
```

### `GET /api/ga4/traffic-pages`
- seen on: 13-traffic-all, G13-goleta-traffic
- status: [200]
- query params seen: `limit=10`, `page=1`, `range=all`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "page": "string",
   "activeUsers": "int",
   "percentage": "float",
   "topSource": "string",
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

## gbp

### `GET /api/gbp/availability`
- seen on: 00-global
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "available": "bool"
 }
}
```

## geo-audit

### `GET /api/geo-audit/data`
- seen on: 05-site-health, 22-settings-billing, G05-goleta-site-health
- status: [200]
- query params seen: `orgWebsiteId=41420`, `orgWebsiteId=51141`
- response shape:
```json
{
 "averageGeoScore": "int",
 "averagePageSpeed": "int",
 "llmOptimizationScore": "int",
 "technicalSeoScore": "int",
 "overallScore": "int",
 "robotsTxt": {
  "status": "string"
 },
 "sitemap": {
  "status": "string"
 },
 "llmTxt": {
  "status": "string"
 },
 "pages": [
  {
   "url": "string",
   "geoScore": "int",
   "issueCount": "int",
   "issues": [
    {
     "id": "…",
     "geoAuditId": "…",
     "issueType": "…",
     "description": "…",
     "pageId": "…",
     "severity": "…",
     "action": "…",
     "fixedAt": "…",
     "createdAt": "…",
     "page": "…"
    }
   ]
  }
 ],
 "auditDate": "string",
 "nextScheduledAuditAt": "string",
 "pagesAudited": "int",
 "inProgress": "bool"
}
```

## gsc

### `GET /api/gsc/account-info`
- seen on: 21-settings-analytics
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "email": "string",
  "name": "string",
  "picture": "string"
 }
}
```

### `GET /api/gsc/generate-gsc-consent-url`
- seen on: 21-settings-analytics
- status: [200]
- query params seen: `redirectPath=/dashboard/settings/analytics`
- response shape:
```json
{
 "message": "string",
 "data": {
  "authUrl": "string"
 }
}
```

### `GET /api/gsc/metrics/countries`
- seen on: 15-traffic-google, G15-goleta-google
- status: [200]
- query params seen: `period=all`
- response shape:
```json
[
 {
  "country": "string",
  "total": {
   "clicks": "int",
   "impressions": "int",
   "avgPosition": "float"
  },
  "first": {
   "clicks": "int",
   "impressions": "int",
   "position": "float"
  },
  "last": {
   "clicks": "int",
   "impressions": "int",
   "position": "float"
  }
 }
]
```

### `GET /api/gsc/metrics/pages`
- seen on: 15-traffic-google, G15-goleta-google
- status: [200]
- query params seen: `limit=10`, `page=1`
- response shape:
```json
{
 "data": [
  {
   "id": "int",
   "page": "string",
   "clicks": "int",
   "impressions": "int",
   "ctr": "float",
   "position": "float",
   "createdAt": "string",
   "updatedAt": "string",
   "orgWebsiteId": "int",
   "isBlgArticle": "bool",
   "clickShare": "float"
  }
 ],
 "pagination": {
  "page": "int",
  "limit": "int",
  "total": "int",
  "totalPages": "int"
 },
 "hasBlgArticles": "bool"
}
```

### `GET /api/gsc/metrics/queries`
- seen on: 15-traffic-google, G15-goleta-google
- status: [200]
- query params seen: `limit=10`, `page=1`
- response shape:
```json
{
 "data": [
  {
   "query": "string",
   "clicks": "int",
   "impressions": "int",
   "ctr": "float",
   "position": "float",
   "isBlgKeyword": "bool"
  }
 ],
 "pagination": {
  "page": "int",
  "limit": "int",
  "total": "int",
  "totalPages": "int"
 },
 "hasBlgKeywords": "bool"
}
```

### `GET /api/gsc/metrics/timeseries`
- seen on: 01-overview, 15-traffic-google, 22-settings-billing, G15-goleta-google, G22-goleta-billing
- status: [200]
- query params seen: `period=30d`, `period=3m`, `period=all`
- response shape:
```json
{
 "total": {
  "clicks": "int",
  "impressions": "int",
  "avgPosition": "float"
 },
 "first": {
  "clicks": "int",
  "impressions": "int",
  "position": "float"
 },
 "last": {
  "clicks": "int",
  "impressions": "int",
  "position": "float"
 },
 "timeseries": [
  {
   "id": "int",
   "date": "string",
   "clicks": "int",
   "impressions": "int",
   "ctr": "float",
   "position": "float",
   "createdAt": "string",
   "updatedAt": "string",
   "orgWebsiteId": "int"
  }
 ]
}
```

## integrations

### `GET /api/integrations`
- seen on: 00-global, 01-overview, 18-article-detail, 20-settings-account, 27-settings-improvements, 42-clients-settings-profile, G30-goleta-publishing, zz-redirected-16-seo-specialist
- status: [200]
- response shape:
```json
{
 "wordpress": "null",
 "wordpressCom": "null",
 "wix": "null",
 "shopify": "null",
 "webflow": "null",
 "webhook": "null",
 "wordpressWebhook": "null",
 "bigcommerce": "null",
 "snapps": "null",
 "ghost": "null",
 "gohighlevel": "null",
 "blog": "null",
 "apiKey": "string",
 "apiKeySource": "null",
 "nextjsBlogConnected": "bool"
}
```

## llm-visibility

### `GET /api/llm-visibility/brands-mentioned`
- seen on: 09-ai-visibility-overview, 11-ai-visibility-brands, G09-goleta-ai-visibility
- status: [200]
- query params seen: `promptId=407334`, `promptId=407336`, `promptId=407341`, `promptId=407345`, `promptId=407346`, `promptId=533740`, `promptId=533741`, `promptId=533742`, `promptId=556092`, `promptId=598774`
- response shape:
```json
[
 {
  "brandName": "string",
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

### `GET /api/llm-visibility/history`
- seen on: 09-ai-visibility-overview, G09-goleta-ai-visibility
- status: [200]
- response shape:
```json
[
 {
  "date": "string",
  "visibilityScore": "int",
  "totalMentions": "int",
  "totalAnswers": "int"
 }
]
```

### `GET /api/llm-visibility/overall-insights`
- seen on: 09-ai-visibility-overview, 11-ai-visibility-brands, G09-goleta-ai-visibility
- status: [200]
- response shape:
```json
{
 "visibilityScore": "int",
 "totalMentions": "int",
 "totalAnswers": "int",
 "totalPrompts": "int",
 "topSource": {
  "domain": "string",
  "count": "int",
  "urls": [
   {
    "url": "string",
    "sourceType": "string"
   }
  ]
 },
 "topMentionedBrand": {
  "brandName": "string",
  "count": "int",
  "brandUrl": "string"
 }
}
```

### `GET /api/llm-visibility/prompt-allowance`
- seen on: 10-ai-visibility-prompts
- status: [200]
- response shape:
```json
{
 "baseLimit": "int",
 "limit": "int",
 "activeCount": "int"
}
```

### `GET /api/llm-visibility/prompts`
- seen on: 10-ai-visibility-prompts, 11-ai-visibility-brands, 12-ai-visibility-sources, 22-settings-billing, G22-goleta-billing
- status: [200]
- response shape:
```json
[
 {
  "id": "int",
  "orgWebsiteId": "int",
  "prompt": "string",
  "intent": "string",
  "isActive": "bool",
  "lastCheckedAt": "null",
  "createdAt": "string",
  "updatedAt": "string",
  "tierLabel": "string",
  "providers": [],
  "providersWithMentions": [],
  "sentiment": "null"
 }
]
```

### `GET /api/llm-visibility/prompts/:id`
- seen on: 19-ai-visibility-prompt-detail
- status: [200]
- response shape:
```json
{
 "id": "int",
 "orgWebsiteId": "int",
 "prompt": "string",
 "intent": "string",
 "isActive": "bool",
 "lastCheckedAt": "string",
 "createdAt": "string",
 "updatedAt": "string",
 "answers": [
  {
   "id": "int",
   "promptId": "int",
   "answer": "string",
   "orgWebsiteMentioned": "bool",
   "llmProvider": "string",
   "llmModel": "string",
   "createdAt": "string",
   "updatedAt": "string"
  }
 ],
 "tierLabel": "string",
 "topSources": [
  {
   "domain": "string",
   "count": "int",
   "urls": [
    {
     "url": "…",
     "sourceType": "…"
    }
   ]
  }
 ],
 "topBrands": [
  {
   "brandName": "string",
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
}
```

### `GET /api/llm-visibility/top-sources`
- seen on: 09-ai-visibility-overview, 12-ai-visibility-sources, G09-goleta-ai-visibility
- status: [200]
- query params seen: `promptId=407334`, `promptId=407336`, `promptId=407341`, `promptId=407345`, `promptId=407346`, `promptId=533740`, `promptId=533741`, `promptId=533742`, `promptId=556092`, `promptId=598774`
- response shape:
```json
[
 {
  "domain": "string",
  "count": "int",
  "urls": [
   {
    "url": "string",
    "sourceType": "string"
   }
  ]
 }
]
```

## locations

### `GET /api/locations`
- seen on: 00-global, 24-settings-business, 40-clients
- status: [200]
- response shape:
```json
[
 {
  "locationCode": "int",
  "subLocations": [
   "int"
  ]
 }
]
```

### `GET /api/locations/regen-status`
- seen on: 24-settings-business
- status: [200]
- response shape:
```json
{
 "status": "string",
 "processedAt": "string"
}
```

## meta-posting

### `GET /api/meta-posting/feature-status`
- seen on: 00-global
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "canConnect": "bool",
  "hasMetaAutopilot": "bool",
  "hasScalePlan": "bool",
  "cadence": "string",
  "unconnectedPostLimit": "int",
  "generationPaused": "bool",
  "connections": [
   {
    "id": "int",
    "facebookPageId": "string",
    "facebookPageName": "string",
    "facebookPictureUrl": "string",
    "instagramUserId": "string",
    "instagramUsername": "string",
    "instagramPictureUrl": "string",
    "status": "string",
    "grantedScopes": [
     "…"
    ],
    "pageTasks": [],
    "connectedAt": "string",
    "lastValidatedAt": "string",
    "tokenExpiresAt": "null",
    "lastErrorCode": "null",
    "lastErrorMessage": "null"
   }
  ],
  "publishConnectionId": "int",
  "lastConnectAttempt": {
   "id": "int",
   "outcome": "string",
   "startedAt": "string",
   "finishedAt": "string",
   "profileName": "string",
   "tickedInstagram": "null"
  }
 }
}
```

### `GET /api/meta-posting/posts`
- seen on: B07-blg-socials-instagram-facebook
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "id": "int",
   "articleId": "int",
   "articleTitle": "string",
   "postType": "string",
   "caption": "string",
   "hashtags": [
    "string"
   ],
   "slides": [
    {
     "body": "…",
     "role": "…",
     "citation": "…",
     "headline": "…",
     "imageUrl": "…",
     "position": "…"
    }
   ],
   "status": "string",
   "scheduledFor": "null",
   "scheduleMissedAt": "null",
   "publications": [
    {
     "destination": "…",
     "status": "…",
     "metaRemotePostId": "…",
     "permalinkUrl": "…",
     "publishedAt": "…",
     "lastErrorMessage": "…"
    }
   ],
   "createdAt": "string",
   "updatedAt": "string"
  }
 ]
}
```

### `GET /api/meta-posting/settings`
- seen on: B28-blg-settings-meta
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "publishMode": "string",
  "publishTime": "string",
  "publishWeekdays": [
   "int"
  ],
  "postToFacebook": "bool",
  "postToInstagram": "bool",
  "generationEnabled": "bool",
  "showBrandMark": "bool",
  "enabledPostTypes": [
   "string"
  ],
  "slideTextStyle": "string",
  "slideImageStyle": "string",
  "publishConnectionId": "int"
 }
}
```

## onboarding

### `GET /api/onboarding/status`
- seen on: 00-global, 40-clients
- status: [200]
- response shape:
```json
{
 "status": "string"
}
```

## organization

### `GET /api/organization`
- seen on: 00-global, 08-reporting, 22-settings-billing, 30-settings-publishing, 38-settings-white-label, 45-clients-settings-members, B38-blg-settings-white-label, G08-goleta-reporting, zz-redirected-16-seo-specialist
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "id": "int",
  "name": "string",
  "creatorId": "int",
  "gscCredentials": "null",
  "acquisitionChannel": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [
   {
    "id": "int",
    "email": "string",
    "name": "string",
    "isActive": "bool",
    "role": "string",
    "stripeCustomerId": "null",
    "newsSubscribed": "bool",
    "isInvoiceEmailEnabled": "bool",
    "platformLanguage": "string",
    "referralCode": "string",
    "linkedinPostCompleted": "bool",
    "linkedinExperiencePostCompleted": "bool",
    "isG2ReviewCompleted": "bool",
    "hasWatchedWelcomeVideo": "bool",
    "hasSeenArticleHints": "bool",
    "watchedVideos": [],
    "completedSetupItems": [],
    "lastSeenProductUpdateAt": "string",
    "resendAbandonedStartedAt": "null",
    "resendChurnedStartedAt": "null",
    "resendOnboardingStartedAt": "null",
    "resendActiveUserStartedAt": "null",
    "deletionRequestedAt": "null",
    "lastLoginAt": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "supabaseId": "string",
    "organizationId": "int",
    "websiteAccess": [
     "…"
    ]
   }
  ],
  "websites": [
   {
    "id": "int",
    "url": "string",
    "creationSource": "string",
    "brandName": "string",
    "selectedLanguage": "string",
    "description": "string",
    "targetAudience": [
     "…"
    ],
    "mainServices": [],
    "onboardingStatus": "string",
    "lastCompletedOnboardingStep": "null",
    "includeYoutube": "bool",
    "youtubeChannel": "null",
    "includeCTAImage": "bool",
    "ctaSettings": {
     "map": "…",
     "links": "…",
     "contact": "…"
    },
    "includeCitation": "bool",
    "includeSourcesSection": "bool",
    "includeJsonLd": "bool",
    "includeFaqJsonLd": "bool",
    "includeInternalLinks": "bool",
    "includeToc": "bool",
    "includeTldr": "bool",
    "summaryStyle": "string",
    "includeRecommendedReads": "bool",
    "includePerspective": "bool",
    "mentionCompetitorsIfRelevant": "bool",
    "englishType": "string",
    "screenshotUrl": "string",
    "screenshotLinkUrl": "null",
    "sitemapUrl": "string",
    "promoWebsiteUrl": "string",
    "exampleArticleUrl": "string",
    "brandVoice": {
     "pacing_and_flow": "…",
     "tone_and_emotion": "…",
     "figurative_language": "…",
     "perspective_and_voice": "…",
     "word_choice_and_vocabulary": "…",
     "sentence_structure_and_complexity": "…",
     "formatting_and_structural_elements": "…",
     "level_of_formality_and_personalization": "…"
    },
    "articleInstructions": "string",
    "articleDisclaimer": "null",
    "researchUrls": [],
    "imageInstructions": "string",
    "instructionNotes": {
     "images": "…",
     "writing": "…",
     "reviewedAt": "…"
    },
    "createdAt": "string",
    "onboardingCompletedAt": "string",
    "reonboardedAt": "string",
    "brandColor": "string",
    "brandSecondaryColor": "string",
    "brandDescription": "string",
    "updatedAt": "string",
    "autoPublish": "bool",
    "citationRegion": "string",
    "backlinksEnabled": "bool",
    "backlinksExchangeEligible": "bool",
    "isHidden": "bool",
    "domainRating": "int"
   }
  ],
  "whitelabelConfig": {
   "domain": "string",
   "brandName": "string",
   "primaryColor": "string",
   "secondaryColor": "string",
   "logo": "string",
   "favicon": "string"
  }
 }
}
```

### `GET /api/organization/business-profile`
- seen on: 01-overview, 24-settings-business, zz-redirected-16-seo-specialist
- status: [200]
- response shape:
```json
{
 "data": {
  "servicesOffered": [
   {
    "kind": "string",
    "name": "string",
    "sourceUrl": "string",
    "amount": "string",
    "priceType": "string",
    "currency": "string",
    "period": "string",
    "unit": "string"
   }
  ],
  "servicesOfferedUpdatedAt": "string",
  "servicesOfferedSource": "string",
  "positioning": "string",
  "businessType": "string"
 },
 "message": "string"
}
```

### `GET /api/organization/get-org-website`
- seen on: 00-global, 01-overview, 08-reporting, 15-traffic-google, 19-ai-visibility-prompt-detail, 20-settings-account, 27-settings-improvements, 34-settings-saved-pages, 42-clients-settings-profile, B38-blg-settings-white-label, G08-goleta-reporting
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "id": "int",
  "url": "string",
  "creationSource": "string",
  "brandName": "string",
  "selectedLanguage": "string",
  "description": "string",
  "targetAudience": [
   "string"
  ],
  "mainServices": [],
  "onboardingStatus": "string",
  "lastCompletedOnboardingStep": "null",
  "includeYoutube": "bool",
  "youtubeChannel": "null",
  "includeCTAImage": "bool",
  "ctaSettings": {
   "map": {
    "lat": "float",
    "lng": "float",
    "address": "string",
    "enabled": "bool",
    "mapsUrl": "string",
    "imageKey": "string",
    "imageUrl": "string",
    "placeName": "string"
   },
   "links": {
    "items": [
     "…"
    ],
    "enabled": "bool"
   },
   "contact": {
    "email": "null",
    "phone": "null",
    "enabled": "bool",
    "whatsapp": "null"
   }
  },
  "includeCitation": "bool",
  "includeSourcesSection": "bool",
  "includeJsonLd": "bool",
  "includeFaqJsonLd": "bool",
  "includeInternalLinks": "bool",
  "includeToc": "bool",
  "includeTldr": "bool",
  "summaryStyle": "string",
  "includeRecommendedReads": "bool",
  "includePerspective": "bool",
  "mentionCompetitorsIfRelevant": "bool",
  "englishType": "string",
  "screenshotUrl": "string",
  "screenshotLinkUrl": "null",
  "sitemapUrl": "string",
  "promoWebsiteUrl": "string",
  "exampleArticleUrl": "string",
  "brandVoice": {
   "pacing_and_flow": "string",
   "tone_and_emotion": "string",
   "figurative_language": "string",
   "perspective_and_voice": "string",
   "word_choice_and_vocabulary": "string",
   "sentence_structure_and_complexity": "string",
   "formatting_and_structural_elements": "string",
   "level_of_formality_and_personalization": "string"
  },
  "articleInstructions": "string",
  "articleDisclaimer": "null",
  "researchUrls": [],
  "imageInstructions": "string",
  "instructionNotes": {
   "images": {
    "revisions": [
     "…"
    ],
    "unsupported": []
   },
   "writing": {
    "revisions": [
     "…"
    ],
    "unsupported": []
   },
   "reviewedAt": "string"
  },
  "createdAt": "string",
  "onboardingCompletedAt": "string",
  "reonboardedAt": "string",
  "brandColor": "string",
  "brandSecondaryColor": "string",
  "brandDescription": "string",
  "updatedAt": "string",
  "autoPublish": "bool",
  "citationRegion": "string",
  "backlinksEnabled": "bool",
  "backlinksExchangeEligible": "bool",
  "isHidden": "bool",
  "domainRating": "int"
 }
}
```

### `GET /api/organization/get-org-websites`
- seen on: 00-global, 05-site-health, 45-clients-settings-members, B28-blg-settings-meta, G06-goleta-socials, G22-goleta-billing, zz-redirected-28-settings-meta
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "id": "int",
   "organizationId": "int",
   "url": "string",
   "brandName": "string",
   "selectedLanguage": "string",
   "onboardingStatus": "string",
   "onboardingCompletedAt": "null",
   "brandColor": "string",
   "brandSecondaryColor": "string",
   "logoUrl": "null",
   "screenshotUrl": "null",
   "createdAt": "string",
   "isHidden": "bool",
   "subscriptions": []
  }
 ]
}
```

### `GET /api/organization/language-upsell`
- seen on: 00-global, 40-clients
- status: [200]
- response shape:
```json
{
 "data": {
  "suggestion": {
   "nextProposedLanguageCode": "string"
  }
 },
 "message": "string"
}
```

### `GET /api/organization/website-metrics-history`
- seen on: 15-traffic-google, G15-goleta-google
- status: [200]
- query params seen: `period=all`
- response shape:
```json
{
 "data": {
  "last": {
   "id": "int",
   "date": "string",
   "domainRating": "int",
   "backlinks": "int",
   "refdomains": "int",
   "dofollowBacklinks": "int",
   "dofollowRefdomains": "int",
   "orgWebsiteId": "int",
   "createdAt": "string",
   "updatedAt": "string"
  },
  "previous": {
   "id": "int",
   "date": "string",
   "domainRating": "int",
   "backlinks": "int",
   "refdomains": "int",
   "dofollowBacklinks": "int",
   "dofollowRefdomains": "int",
   "orgWebsiteId": "int",
   "createdAt": "string",
   "updatedAt": "string"
  },
  "history": [
   {
    "id": "int",
    "date": "string",
    "domainRating": "int",
    "backlinks": "int",
    "refdomains": "int",
    "dofollowBacklinks": "int",
    "dofollowRefdomains": "int",
    "orgWebsiteId": "int",
    "createdAt": "string",
    "updatedAt": "string"
   }
  ]
 }
}
```

## overview

### `GET /api/overview/achievements`
- seen on: 04-backlinks, G04-goleta-backlinks
- status: [200]
- response shape:
```json
{
 "summary": {
  "articlesIndexedWithClicks": "int",
  "googleClicksFromBlg": "int",
  "googleImpressionsFromBlg": "int",
  "liveBacklinks": "int",
  "backlinksValue": "int",
  "domainRating": "int",
  "trafficValue": "float",
  "aiTraffic": "int"
 },
 "timeseries": [
  {
   "date": "string",
   "backlinksReceived": "int",
   "backlinksValue": "int"
  }
 ]
}
```

### `GET /api/overview/agent-activities`
- seen on: 01-overview, 01b-agent-activities-history, zz-redirected-26-settings-gbp
- status: [200]
- query params seen: `date=2026-06-28`, `date=2026-07-04`, `date=2026-07-10`, `date=2026-07-16`, `date=2026-07-22`, `date=2026-07-28`, `date=2026-08-03`, `date=2026-08-09`, `date=2026-08-15`, `date=2026-08-21`, `date=2026-08-27`, `date=2026-09-02`, `date=2026-09-08`, `date=2026-09-14`, `date=2026-09-20`, `date=2026-09-26`, `date=2026-10-02`, `date=2026-10-08`, `date=2026-10-14`, `date=2026-10-20`, `date=2026-10-26`, `tz=America/Los_Angeles`
- response shape:
```json
{
 "timeZone": "string",
 "firstDate": "string",
 "lastDate": "string",
 "selectedDate": "string",
 "days": [
  {
   "date": "string",
   "isToday": "bool",
   "count": "int",
   "featuredArticle": {
    "articleId": "int",
    "contentPlanId": "null",
    "title": "string",
    "articleType": "string",
    "keyword": "string",
    "searchVolume": "int",
    "keywordDifficulty": "int",
    "imageUrl": "string",
    "whyThisTopic": [
     "…"
    ],
    "publishedUrl": "string",
    "status": "string"
   },
   "items": [
    {
     "type": "…",
     "date": "…",
     "day": "…",
     "count": "…"
    }
   ]
  }
 ]
}
```

### `GET /api/overview/milestones`
- seen on: 00-global, zz-redirected-26-settings-gbp
- status: [200]
- response shape:
```json
{
 "cards": [
  {
   "id": "int",
   "category": "string",
   "threshold": "int",
   "achievedAt": "string",
   "seenAt": "string",
   "proof": {
    "kind": "string",
    "more": {
     "count": "…"
    },
    "items": [
     "…"
    ]
   },
   "value": "int",
   "gainLast7Days": "int",
   "nextThreshold": "int"
  }
 ],
 "unseen": [
  {
   "id": "int",
   "category": "string",
   "threshold": "int",
   "achievedAt": "string"
  }
 ],
 "gscProperty": "string"
}
```

### `GET /api/overview/setup-checklist`
- seen on: 01-overview, zz-redirected-16-seo-specialist, zz-redirected-17-product-updates, zz-redirected-26-settings-gbp, zz-redirected-28-settings-meta, zz-redirected-B26-blg-settings-gbp
- status: [200]
- response shape:
```json
{
 "items": [
  {
   "key": "string",
   "isDone": "bool"
  }
 ]
}
```

## pages

### `GET /api/pages`
- seen on: 34-settings-saved-pages
- status: [200]
- query params seen: `limit=50`
- response shape:
```json
{
 "message": "string",
 "data": [
  {
   "id": "int",
   "url": "string",
   "metaTitle": "string",
   "lastModifiedAt": "null"
  }
 ],
 "pageInfo": {
  "nextCursor": "string",
  "hasMore": "bool",
  "totalCount": "int",
  "pageSize": "int"
 }
}
```

### `GET /api/pages/articles-missing-in-sitemap`
- seen on: 04-backlinks, G04-goleta-backlinks
- status: [200]
- response shape:
```json
{
 "articlesMissingInSitemap": "bool"
}
```

## product-catalog

### `GET /api/product-catalog/status`
- seen on: 29-settings-product-catalog
- status: [200]
- response shape:
```json
{
 "shopifyConnected": "bool",
 "storeName": "null",
 "creationSource": "null",
 "woocommerceConnected": "bool",
 "siteUrl": "null",
 "productCount": "int",
 "shopifyProductCount": "int",
 "woocommerceProductCount": "int",
 "manualProductCount": "int",
 "feed": "null",
 "lastSyncAt": "null",
 "lastSyncStatus": "null",
 "lastSyncError": "null"
}
```

## quora

### `GET /api/quora/configuration`
- seen on: 07-socials-quora, 31-settings-quora
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "keywords": [
   {
    "id": "int",
    "orgWebsiteId": "int",
    "keyword": "string",
    "isActive": "bool",
    "lastGoogleCheckedAt": "string",
    "createdAt": "string"
   }
  ],
  "maxKeywords": "int",
  "replyInstructions": "string",
  "nextRunAt": "string"
 }
}
```

### `GET /api/quora/relevant-posts`
- seen on: 07-socials-quora, 22-settings-billing, G22-goleta-billing
- status: [200]
- query params seen: `filter=all`, `limit=1`, `limit=100`, `page=1`
- response shape:
```json
{
 "message": "string",
 "data": {
  "posts": [
   {
    "id": "int",
    "quoraPostId": "int",
    "quoraMonitoringKeywordId": "int",
    "opportunityScore": "int",
    "suggestedComment": "null",
    "markedAsCommentedAt": "null",
    "discardedAt": "null",
    "orgWebsiteId": "int",
    "createdAt": "string",
    "updatedAt": "string",
    "quoraPost": {
     "id": "…",
     "quoraId": "…",
     "question": "…",
     "author": "…",
     "followers": "…",
     "viewCount": "…",
     "answerCount": "…",
     "url": "…",
     "createdAt": "…",
     "postCreatedAt": "…",
     "updatedAt": "…"
    },
    "monitoringKeyword": {
     "id": "…",
     "orgWebsiteId": "…",
     "keyword": "…",
     "isActive": "…",
     "lastGoogleCheckedAt": "…",
     "createdAt": "…"
    }
   }
  ],
  "total": "int",
  "hasMore": "bool"
 }
}
```

## reddit

### `GET /api/reddit/configuration`
- seen on: 06-socials-reddit, 32-settings-reddit, B06-blg-socials, G06-goleta-socials
- status: [200]
- response shape:
```json
text/html: [omitted third-party/analytics body]
```

### `GET /api/reddit/relevant-posts`
- seen on: 06-socials-reddit, 22-settings-billing, B06-blg-socials, G06-goleta-socials, G22-goleta-billing
- status: [200]
- query params seen: `filter=all`, `limit=1`, `limit=100`, `page=1`
- response shape:
```json
text/html: [omitted third-party/analytics body]
```

### `GET /api/reddit/subreddits`
- seen on: 06-socials-reddit, 32-settings-reddit
- status: [200]
- response shape:
```json
{
 "message": "string",
 "data": {
  "subreddits": [
   {
    "id": "int",
    "subreddit": "string"
   }
  ]
 }
}
```

## reditus

### `GET /api/reditus/auth-token`
- seen on: 00-global
- status: [200]
- response shape:
```json
{
 "data": {
  "token": "string"
 },
 "message": "string"
}
```

### `GET /api/reditus/referral-summary`
- seen on: B33-blg-settings-referrals
- status: [200]
- response shape:
```json
{
 "data": {
  "cardReward": {
   "amountUsd": "int",
   "holdDays": "int"
  },
  "tiers": [
   {
    "id": "string",
    "minReferrals": "int",
    "perReferral": {
     "accountCreditUsd": "…"
    },
    "entryBadge": "null"
   }
  ],
  "status": {
   "tier": "null",
   "convertedCount": "int",
   "badges": [],
   "earned": {
    "totalUsd": "int"
   },
   "nextTier": {
    "id": "string",
    "minReferrals": "int",
    "remaining": "int"
   }
  },
  "friends": [],
  "cards": [],
  "friendDiscount": {
   "percentOff": "int",
   "durationMonths": "int",
   "monthlyPlansOnly": "bool"
  }
 },
 "message": "string"
}
```

## seo-specialist

### `GET /api/seo-specialist/balance`
- seen on: 00-global
- status: [200]
- response shape:
```json
{
 "availableMin": "int",
 "totalMin": "int",
 "blockedMin": "int",
 "upcomingHoldsMin": "int",
 "rows": [],
 "upcomingBookings": []
}
```

### `GET /api/seo-specialist/booking-links`
- seen on: B16-blg-seo-specialist
- status: [200]
- response shape:
```json
{
 "availableMin": "int",
 "thirtyMin": "null",
 "sixtyMin": "null"
}
```

### `GET /api/seo-specialist/bookings`
- seen on: B16-blg-seo-specialist
- status: [200]
- response shape:
```json
{
 "data": []
}
```

## subscriptions

### `GET /api/subscriptions/get-org-website-subscription`
- seen on: 00-global, 04-backlinks, 06-socials-reddit, 22-settings-billing, 30-settings-publishing, B06-blg-socials, B33-blg-settings-referrals, G22-goleta-billing, G30-goleta-publishing
- status: [200]
- query params seen: `type=backlink_credits`, `type=llm_visibility_prompts`, `type=main`, `type=meta_autopilot`, `type=quora`, `type=reddit`, `type=reddit_autopilot`
- response shape:
```json
{
 "data": {
  "id": "string",
  "object": "string",
  "application": "null",
  "application_fee_percent": "null",
  "automatic_tax": {
   "disabled_reason": "null",
   "enabled": "bool",
   "liability": "null"
  },
  "billing_cycle_anchor": "int",
  "billing_cycle_anchor_config": "null",
  "billing_mode": {
   "flexible": "null",
   "type": "string"
  },
  "billing_thresholds": "null",
  "cancel_at": "null",
  "cancel_at_period_end": "bool",
  "canceled_at": "null",
  "cancellation_details": {
   "comment": "null",
   "feedback": "null",
   "feedback_option": "null",
   "reason": "null"
  },
  "collection_method": "string",
  "created": "int",
  "currency": "string",
  "current_period_end": "int",
  "current_period_start": "int",
  "customer": "string",
  "customer_account": "null",
  "days_until_due": "null",
  "default_payment_method": "string",
  "default_source": "null",
  "default_tax_rates": [],
  "description": "string",
  "discount": "null",
  "discounts": [],
  "ended_at": "null",
  "invoice_settings": {
   "account_tax_ids": "null",
   "custom_fields": "null",
   "description": "null",
   "footer": "null",
   "issuer": {
    "type": "string"
   }
  },
  "items": {
   "object": "string",
   "data": [
    {
     "id": "…",
     "object": "…",
     "billing_thresholds": "…",
     "created": "…",
     "current_period_end": "…",
     "current_period_start": "…",
     "current_trial": "…",
     "discounts": "…",
     "metadata": "…",
     "plan": "…",
     "price": "…",
     "quantity": "…",
     "subscription": "…",
     "tax_rates": "…"
    }
   ],
   "has_more": "bool",
   "total_count": "int",
   "url": "string"
  },
  "latest_invoice": "string",
  "livemode": "bool",
  "managed_payments": {
   "enabled": "bool"
  },
  "metadata": {
   "clientIp": "string",
   "clientUserAgent": "string",
   "fbp": "string",
   "orgWebsiteId": "string",
   "orgWebsiteUrl": "string",
   "pendingPlanChangeFromPriceId": "string",
   "selectedLanguage": "string",
   "subscriptionType": "string",
   "userId": "string"
  },
  "next_pending_invoice_item_invoice": "null",
  "on_behalf_of": "null",
  "pause_collection": "null",
  "payment_settings": {
   "payment_method_options": {
    "acss_debit": "null",
    "bancontact": "null",
    "billie": "null",
    "blik": "null",
    "card": {
     "network": "…",
     "request_three_d_secure": "…"
    },
    "customer_balance": "null",
    "konbini": "null",
    "payto": "null",
    "pix": "null",
    "sepa_debit": "null",
    "upi": "null",
    "us_bank_account": "null"
   },
   "payment_method_types": [
    "string"
   ],
   "save_default_payment_method": "string"
  },
  "pending_invoice_item_interval": "null",
  "pending_setup_intent": "null",
  "pending_update": "null",
  "plan": {
   "id": "string",
   "object": "string",
   "active": "bool",
   "aggregate_usage": "null",
   "amount": "int",
   "amount_decimal": "string",
   "billing_scheme": "string",
   "created": "int",
   "currency": "string",
   "interval": "string",
   "interval_count": "int",
   "livemode": "bool",
   "metadata": {},
   "meter": "null",
   "nickname": "null",
   "product": "string",
   "tiers_mode": "null",
   "transform_usage": "null",
   "trial_period_days": "null",
   "usage_type": "string"
  },
  "quantity": "int",
  "schedule": "null",
  "start_date": "int",
  "status": "string",
  "test_clock": "null",
  "transfer_data": "null",
  "trial_end": "int",
  "trial_settings": {
   "end_behavior": {
    "billing_cycle_anchor": "string",
    "missing_payment_method": "string"
   }
  }
 },
 "message": "string",
 "hasActiveSubscription": "bool"
}
```

### `GET /api/subscriptions/invoices`
- seen on: 22-settings-billing, G22-goleta-billing
- status: [200]
- query params seen: `type=backlink_credits`, `type=llm_visibility_prompts`, `type=main`, `type=meta_autopilot`, `type=quora`, `type=reddit`, `type=reddit_autopilot`
- response shape:
```json
{
 "data": [
  {
   "id": "string",
   "object": "string",
   "account_country": "string",
   "account_name": "string",
   "account_tax_ids": "null",
   "amount_due": "int",
   "amount_overpaid": "int",
   "amount_paid": "int",
   "amount_remaining": "int",
   "amount_shipping": "int",
   "application": "null",
   "application_fee_amount": "null",
   "attempt_count": "int",
   "attempted": "bool",
   "auto_advance": "bool",
   "automatic_tax": {
    "disabled_reason": "null",
    "enabled": "bool",
    "liability": "null",
    "provider": "null",
    "status": "null"
   },
   "automatically_finalizes_at": "null",
   "billing_reason": "string",
   "charge": "string",
   "collection_method": "string",
   "created": "int",
   "currency": "string",
   "custom_fields": "null",
   "customer": "string",
   "customer_account": "null",
   "customer_address": "null",
   "customer_email": "string",
   "customer_name": "null",
   "customer_phone": "null",
   "customer_shipping": "null",
   "customer_tax_exempt": "string",
   "customer_tax_ids": [],
   "default_payment_method": "null",
   "default_source": "null",
   "default_tax_rates": [],
   "description": "null",
   "discount": "null",
   "discounts": [],
   "due_date": "null",
   "effective_at": "int",
   "ending_balance": "int",
   "footer": "null",
   "from_invoice": "null",
   "hosted_invoice_url": "string",
   "invoice_pdf": "string",
   "issuer": {
    "type": "string"
   },
   "last_finalization_error": "null",
   "latest_revision": "null",
   "lines": {
    "object": "string",
    "data": [
     "…"
    ],
    "has_more": "bool",
    "total_count": "int",
    "url": "string"
   },
   "livemode": "bool"
  }
 ],
 "message": "string"
}
```

### `GET /api/subscriptions/language-addition-eligibility`
- seen on: 00-global, 01-overview, B06-blg-socials, zz-redirected-26-settings-gbp, zz-redirected-28-settings-meta, zz-redirected-B26-blg-settings-gbp
- status: [200]
- response shape:
```json
{
 "data": {
  "hasScalePrimary": "bool",
  "hasFreeSlotRemaining": "bool",
  "slotsUsed": "int",
  "totalSlots": "int",
  "freeSlotsRemaining": "int",
  "languagePriceId": "string",
  "primaryStripeSubscriptionId": "string",
  "primaryOrgWebsiteId": "int",
  "pausedComplimentaryLanguages": []
 },
 "message": "string"
}
```

### `GET /api/subscriptions/organization-invoices`
- seen on: 41-clients-invoices
- status: [200]
- response shape:
```json
{
 "data": [
  {
   "id": "string",
   "created": "int",
   "amount_due": "int",
   "currency": "string",
   "status": "string",
   "invoice_pdf": "string",
   "websiteUrl": "string"
  }
 ],
 "message": "string"
}
```

## users

### `GET /api/users/me`
- seen on: 00-global, 04-backlinks, 30-settings-publishing, 40-clients, B33-blg-settings-referrals, G30-goleta-publishing
- status: [200]
- response shape:
```json
{
 "data": {
  "id": "int",
  "email": "string",
  "name": "string",
  "isActive": "bool",
  "role": "string",
  "stripeCustomerId": "string",
  "newsSubscribed": "bool",
  "isInvoiceEmailEnabled": "bool",
  "platformLanguage": "string",
  "referralCode": "string",
  "linkedinPostCompleted": "bool",
  "linkedinExperiencePostCompleted": "bool",
  "isG2ReviewCompleted": "bool",
  "hasWatchedWelcomeVideo": "bool",
  "hasSeenArticleHints": "bool",
  "watchedVideos": [],
  "completedSetupItems": [],
  "lastSeenProductUpdateAt": "string",
  "resendAbandonedStartedAt": "string",
  "resendChurnedStartedAt": "null",
  "resendOnboardingStartedAt": "null",
  "resendActiveUserStartedAt": "string",
  "deletionRequestedAt": "null",
  "lastLoginAt": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "supabaseId": "string",
  "organizationId": "int",
  "websiteAccess": []
 },
 "message": "string"
}
```

## whitelabel

### `GET /api/whitelabel/setup`
- seen on: 38-settings-white-label, 40-clients, 43-clients-settings-branding, 44-clients-settings-hosting, B38-blg-settings-white-label
- status: [200]
- response shape:
```json
{
 "config": {
  "id": "int",
  "organizationId": "int",
  "domain": "string",
  "brandName": "string",
  "primaryColor": "string",
  "secondaryColor": "string",
  "logo": "string",
  "favicon": "string",
  "sendingDomain": "string",
  "defaultLanguage": "string",
  "googleClientId": "null",
  "supabaseRedirectConfigured": "bool",
  "wantsWhitelabel": "bool",
  "createdAt": "string",
  "updatedAt": "string"
 },
 "appDomain": {
  "ok": "bool",
  "data": {
   "domain": "string",
   "verified": "bool",
   "misconfigured": "bool",
   "recommendedCname": "string",
   "verification": []
  }
 },
 "emailDomain": {
  "ok": "bool",
  "data": {
   "id": "string",
   "name": "string",
   "status": "string",
   "region": "string",
   "records": [
    {
     "record": "…",
     "name": "…",
     "value": "…",
     "type": "…",
     "status": "…",
     "ttl": "…"
    }
   ]
  }
 }
}
```
