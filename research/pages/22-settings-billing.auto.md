# 22-settings-billing — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/settings/billing`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/22-settings-billing-1.png`, `screenshots/22-settings-billing-2.png`

## Visible text (main content, top → bottom)

```text
Subscription
Your plan, add-ons, payment details and invoices.

Email me my invoices

Active Subscription
Subscription details and billing information

Current Plan
Grow
Next invoice
$99.00 on Nov 26
Status
Active
Pause billing
Cancel subscription
Ready to scale? Daily Instagram & Facebook posts, 3 more posting languages, 5x more tracked prompts, unlimited seats — all in the Scale plan.
See what Scale offers
Payment History
View and download your invoices
Invoice ID	Billing Date	Amount	Status	Invoice PDF
in_1UV4FtLiGzfLlQttBT1lTBBd	Oct 26, 2026	$99.00	
Paid
Download
in_1UKBxPLiGzfLlQttTwfiz6yg	Sep 26, 2026	$99.00	
Paid
Download
in_1U8xB5LiGzfLlQttenXgir7J	Aug 26, 2026	$99.00	
Paid
Download
in_1TxiPbLiGzfLlQttfI5cPorb	Jul 26, 2026	$99.00	
Paid
Download
in_1Tmq6JLiGzfLlQttipzVNsD6	Jun 26, 2026	$99.00	
Paid
Download
in_1TmpE8LiGzfLlQttL1788ZHM	Jun 26, 2026	$0.00	
Paid
Download
```

## Headings

- H1: Subscription
- H2: Active Subscription
- H2: Payment History

## Buttons / links (text [lucide icon] -> href)

- (Manage Subscription) [icon:lucide-settings]
- Pause billing [icon:lucide-circle-pause]
- Cancel subscription
- See what Scale offers [icon:lucide-chevron-right]
- Download

## Lucide icons used

- lucide-check
- lucide-settings
- lucide-circle-pause
- lucide-chevron-right

## Form controls

| tag | type | label | placeholder | value / state |
|---|---|---|---|---|
| INPUT | checkbox | Email me my invoices |  | on  |
| SELECT | select-one |  |  | main  |

## Tables

- headers: ['Invoice ID', 'Billing Date', 'Amount', 'Status', 'Invoice PDF'] · rows rendered: 6
- sample: `[["in_1UV4FtLiGzfLlQttBT1lTBBd", "Oct 26, 2026", "$99.00", "Paid", "Download"], ["in_1UKBxPLiGzfLlQttTwfiz6yg", "Sep 26, 2026", "$99.00", "Paid", "Download"], ["in_1U8xB5LiGzfLlQttenXgir7J", "Aug 26, 2026", "$99.00", "Paid", "Download"], ["in_1TxiPbLiGzfLlQttfI5cPorb", "Jul 26, 2026", "$99.00", "Paid", "Download"]]`

## API calls (`api/22-settings-billing.json`)

### `GET /api/backlinks` → 200
Response shape:
```json
{
 "creditBalance": "int",
 "given": [
  {
   "id": "int",
   "sourceOrgWebsiteId": "int",
   "targetOrgWebsiteId": "int",
   "url": "string: https://dblscanner.com/blog/site-architecture-seo",
   "isBacklinkPresent": "bool",
   "articleId": "int",
   "articleClusterId": "int",
   "linkPower": "int",
   "becameOnlineAt": "string: 2026-10-28T00:56:26.429Z",
   "removedAt": "null",
   "blgRemovedAt": "null",
   "lastCrawledAt": "string: 2026-10-28T00:56:26.429Z",
   "followType": "string: nofollow",
   "nofollowEmailSentAt": "null",
   "createdAt": "string: 2026-10-26T14:04:05.653Z",
   "updatedAt": "string: 2026-10-28T00:56:26.432Z",
   "targetOrgWebsite": {
    "url": "string: https://dblscanner.com"
   },
   "article": {
    "title": "string: Flooring Website Design: What Turns Visitors Into Quote Requ",
    "publishedUrl": "string: https://vaultio.co/blog/flooring-website-design",
    "publishedAt": "string: 2026-10-28T00:56:22.539Z"
   },
   "keywordCluster": {
    "contentPlan": {
     "scheduledFor": "string: 2026-10-28T00:00:00.000Z"
    }
   }
  }
 ],
 "received": [
  {
   "id": "int",
   "sourceOrgWebsiteId": "int",
   "targetOrgWebsiteId": "int",
   "url": "string: https://vaultio.co/Blog/nap-consistency",
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
   "backlinkExplanation": "string: An article on NAP consistency from cincinnatiwebdesigns.com ",
   "createdAt": "string: 2026-10-30T17:49:56.808Z",
   "updatedAt": "string: 2026-10-30T19:17:43.642Z",
   "sourceOrgWebsite": {
    "url": "string: https://cincinnatiwebdesigns.com"
   },
   "article": {
    "title": "string: NAP Consistency: How to Check and Fix Your Listings",
    "publishedUrl": "null",
    "publishedAt": "null"
   },
   "keywordCluster": {
    "contentPlan": {
     "scheduledFor": "string: 2026-11-01T00:00:00.000Z"
    }
   }
  }
 ]
}
```

### `GET /api/competitor` → 200
Response shape:
```json
[
 {
  "id": "int",
  "url": "string: https://contractorindependence.com",
  "orgWebsiteId": "int",
  "organicTraffic": "null",
  "lastAnalyzedDate": "null",
  "createdAt": "string: 2026-06-27T05:54:52.449Z",
  "updatedAt": "string: 2026-06-27T05:54:52.449Z"
 }
]
```

### `GET /api/articles` → 200
Response (text): `[{"id":1036058,"orgWebsiteId":41420,"title":"Local SEO Ranking Factors for Contractors in 2026","slug":"local-seo-ranking-factors","metaDescription":"The local SEO ranking factors that decide who wins the map pack, and what plumbers, HVAC pros, roofers and electricians should fix first to get found.`

### `GET /api/content-plan` → 200
Response (text): `[{"id":1028777,"orgWebsiteId":41420,"scheduledFor":"2026-06-27T00:00:00.000Z","userInstruction":null,"supportUrl":null,"proposedProductIds":[],"selectedProductIds":[],"createdAt":"2026-06-27T06:12:23.446Z","updatedAt":"2026-06-27T06:19:26.771Z","articleId":534437,"keywordClusterId":4944018,"article"`

### `GET /api/gsc/metrics/timeseries?&period=30d` → 200
Response shape:
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
   "date": "string: 2026-10-02T00:00:00.000Z",
   "clicks": "int",
   "impressions": "int",
   "ctr": "int",
   "position": "float",
   "createdAt": "string: 2026-10-06T10:20:02.497Z",
   "updatedAt": "string: 2026-10-06T10:20:02.497Z",
   "orgWebsiteId": "int"
  }
 ]
}
```

### `GET /api/quora/relevant-posts?page=1&limit=1&filter=all` → 200
Response shape:
```json
{
 "message": "string: OK",
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
    "createdAt": "string: 2026-08-07T08:23:41.432Z",
    "updatedAt": "string: 2026-08-07T08:23:41.432Z",
    "quoraPost": {
     "id": "int",
     "quoraId": "string: what-are-the-top-methods-for-home-service-lead-generation",
     "question": "string: How do I boost home service lead generation effectively?",
     "author": "string: Ethen Peterson",
     "followers": "int",
     "viewCount": "int",
     "answerCount": "int",
     "url": "string: https://www.quora.com/What-are-the-top-methods-for-home-serv",
     "createdAt": "string: 2026-08-07T08:23:35.837Z",
     "postCreatedAt": "string: 2024-07-11T16:57:32.642Z",
     "updatedAt": "string: 2026-08-07T08:23:36.858Z"
    },
    "monitoringKeyword": {
     "id": "int",
     "orgWebsiteId": "int",
     "keyword": "string: top lead response tools for home services",
     "isActive": "bool",
     "lastGoogleCheckedAt": "string: 2026-08-07T08:21:26.586Z",
     "createdAt": "string: 2026-08-07T01:30:00.835Z"
    }
   }
  ],
  "total": "int",
  "hasMore": "bool"
 }
}
```

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

### `GET /api/llm-visibility/prompts` → 200
Response shape:
```json
[
 {
  "id": "int",
  "orgWebsiteId": "int",
  "prompt": "string: How can contractors get more local leads?",
  "intent": "string: awareness",
  "isActive": "bool",
  "lastCheckedAt": "null",
  "createdAt": "string: 2026-06-27T05:57:03.898Z",
  "updatedAt": "string: 2026-06-27T05:57:03.898Z",
  "tierLabel": "string: Other",
  "providers": [],
  "providersWithMentions": [],
  "sentiment": "null"
 }
]
```

### `GET /api/subscriptions/invoices?type=main` → 200
Response shape:
```json
{
 "data": [
  {
   "id": "string: in_1UV4FtLiGzfLlQttBT1lTBBd",
   "object": "string: invoice",
   "account_country": "string: US",
   "account_name": "string: babylovegrowth",
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
   "billing_reason": "string: subscription_cycle",
   "charge": "string: ch_3UV5CILiGzfLlQtt0RDzmU1Q",
   "collection_method": "string: charge_automatically",
   "created": "int",
   "currency": "string: usd",
   "custom_fields": "null",
   "customer": "string: cus_UTQeBR3aZ4JKPx",
   "customer_account": "null",
   "customer_address": "null",
   "customer_email": "string: knightsdamian@gmail.com",
   "customer_name": "null",
   "customer_phone": "null",
   "customer_shipping": "null",
   "customer_tax_exempt": "string: none",
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
   "hosted_invoice_url": "string: https://invoice.stripe.com/i/acct_1QGKexLiGzfLlQtt/live_YWNj",
   "invoice_pdf": "string: https://pay.stripe.com/invoice/acct_1QGKexLiGzfLlQtt/live_YW",
   "issuer": {
    "type": "string: self"
   },
   "last_finalization_error": "null",
   "latest_revision": "null",
   "lines": {
    "object": "string: list",
    "data": [
     {
      "id": "…",
      "object": "…",
      "amount": "…",
      "amount_excluding_tax": "…",
      "currency": "…",
      "description": "…",
      "discount_amounts": "…",
      "discountable": "…",
      "discounts": "…",
      "invoice": "…",
      "livemode": "…",
      "metadata": "…",
      "parent": "…",
      "period": "…",
      "plan": "…",
      "pretax_credit_amounts": "…",
      "price": "…",
      "pricing": "…",
      "proration": "…",
      "proration_details": "…",
      "quantity": "…",
      "quantity_decimal": "…",
      "subscription": "…",
      "subscription_item": "…",
      "subtotal": "…",
      "tax_amounts": "…",
      "tax_rates": "…",
      "taxes": "…",
      "type": "…",
      "unit_amount_excluding_tax": "…"
     }
    ],
    "has_more": "bool",
    "total_count": "int",
    "url": "string: /v1/invoices/in_1UV4FtLiGzfLlQttBT1lTBBd/lines"
   },
   "livemode": "bool",
   "metadata": {},
   "next_payment_attempt": "null",
   "number": "string: DE95EAE5-70322",
   "on_behalf_of": "null",
   "paid": "bool",
   "paid_out_of_band": "bool",
   "parent": {
    "quote_details": "null",
    "subscription_details": {
     "metadata": {
      "clientIp": "…",
      "clientUserAgent": "…",
      "fbp": "…",
      "orgWebsiteId": "…",
      "orgWebsiteUrl": "…",
      "pendingPlanChangeFromPriceId": "…",
      "selectedLanguage": "…",
      "subscriptionType": "…",
      "userId": "…"
     },
     "subscription": "string: sub_1TmpE7LiGzfLlQttDwgNlrsX"
    },
    "type": "string: subscription_details"
   },
   "payment_intent": "string: pi_3UV5CILiGzfLlQtt0IduwL
```

### `GET /api/subscriptions/get-org-website-subscription?type=meta_autopilot` → 200
Response shape:
```json
{
 "data": {
  "id": "string: sub_1URKqsLiGzfLlQttyUojO8N1",
  "object": "string: subscription",
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
   "type": "string: classic"
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
  "collection_method": "string: charge_automatically",
  "created": "int",
  "currency": "string: usd",
  "current_period_end": "int",
  "current_period_start": "int",
  "customer": "string: cus_UTQeBR3aZ4JKPx",
  "customer_account": "null",
  "days_until_due": "null",
  "default_payment_method": "string: pm_1URKqsLiGzfLlQttZKdU4ePg",
  "default_source": "null",
  "default_tax_rates": [],
  "description": "string: Meta Posting - https://vaultio.co",
  "discount": "null",
  "discounts": [],
  "ended_at": "null",
  "invoice_settings": {
   "account_tax_ids": "null",
   "custom_fields": "null",
   "description": "null",
   "footer": "null",
   "issuer": {
    "type": "string: self"
   }
  },
  "items": {
   "object": "string: list",
   "data": [
    {
     "id": "string: si_VSFLrroENjIrQA",
     "object": "string: subscription_item",
     "billing_thresholds": "null",
     "created": "int",
     "current_period_end": "int",
     "current_period_start": "int",
     "current_trial": "null",
     "discounts": [],
     "metadata": {},
     "plan": {
      "id": "…",
      "object": "…",
      "active": "…",
      "aggregate_usage": "…",
      "amount": "…",
      "amount_decimal": "…",
      "billing_scheme": "…",
      "created": "…",
      "currency": "…",
      "interval": "…",
      "interval_count": "…",
      "livemode": "…",
      "metadata": "…",
      "meter": "…",
      "nickname": "…",
      "product": "…",
      "tiers_mode": "…",
      "transform_usage": "…",
      "trial_period_days": "…",
      "usage_type": "…"
     },
     "price": {
      "id": "…",
      "object": "…",
      "active": "…",
      "billing_scheme": "…",
      "created": "…",
      "currency": "…",
      "custom_unit_amount": "…",
      "livemode": "…",
      "lookup_key": "…",
      "metadata": "…",
      "nickname": "…",
      "product": "…",
      "recurring": "…",
      "tax_behavior": "…",
      "tiers_mode": "…",
      "transform_quantity": "…",
      "type": "…",
      "unit_amount": "…",
      "unit_amount_decimal": "…"
     },
     "quantity": "int",
     "subscription": "string: sub_1URKqsLiGzfLlQttyUojO8N1",
     "tax_rates": []
    }
   ],
   "has_more": "bool",
   "total_count": "int",
   "url": "string: /v1/subscription_items?subscription=sub_1URKqsLiGzfLlQttyUoj"
  },
  "latest_invoice": "string: in_1URKqsLiGzfLlQttyxjvHIij",
  "livemode": "bool",
  "managed_payments": {
   "enabled": "bool"
  },
  "metadata": {
   "clientIp": "string: 165.162.66.161",
   "clientUserAgent": "string: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/",
   "fbp": "string: fb.1.1791653123982.787425832",
   "openAiConversionSourceUrl": "string: https://www.babylovegrowth.ai",
   "orgWebsiteId": "string: 41420",
   "orgWebsiteUrl": "string: https://vaultio.co",
   "subscriptionType": "string: meta_autopilot",
   "user
```

### `GET /api/subscriptions/invoices?type=meta_autopilot` → 200
Response shape:
```json
{
 "data": [
  {
   "id": "string: in_1URKqsLiGzfLlQttyxjvHIij",
   "object": "string: invoice",
   "account_country": "string: US",
   "account_name": "string: babylovegrowth",
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
   "billing_reason": "string: subscription_create",
   "charge": "string: ch_3URKqtLiGzfLlQtt1MRqhzVA",
   "collection_method": "string: charge_automatically",
   "created": "int",
   "currency": "string: usd",
   "custom_fields": "null",
   "customer": "string: cus_UTQeBR3aZ4JKPx",
   "customer_account": "null",
   "customer_address": "null",
   "customer_email": "string: knightsdamian@gmail.com",
   "customer_name": "null",
   "customer_phone": "null",
   "customer_shipping": "null",
   "customer_tax_exempt": "string: none",
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
   "hosted_invoice_url": "string: https://invoice.stripe.com/i/acct_1QGKexLiGzfLlQtt/live_YWNj",
   "invoice_pdf": "string: https://pay.stripe.com/invoice/acct_1QGKexLiGzfLlQtt/live_YW",
   "issuer": {
    "type": "string: self"
   },
   "last_finalization_error": "null",
   "latest_revision": "null",
   "lines": {
    "object": "string: list",
    "data": [
     {
      "id": "…",
      "object": "…",
      "amount": "…",
      "amount_excluding_tax": "…",
      "currency": "…",
      "description": "…",
      "discount_amounts": "…",
      "discountable": "…",
      "discounts": "…",
      "invoice": "…",
      "livemode": "…",
      "metadata": "…",
      "parent": "…",
      "period": "…",
      "plan": "…",
      "pretax_credit_amounts": "…",
      "price": "…",
      "pricing": "…",
      "proration": "…",
      "proration_details": "…",
      "quantity": "…",
      "quantity_decimal": "…",
      "subscription": "…",
      "subscription_item": "…",
      "subtotal": "…",
      "tax_amounts": "…",
      "tax_rates": "…",
      "taxes": "…",
      "type": "…",
      "unit_amount_excluding_tax": "…"
     }
    ],
    "has_more": "bool",
    "total_count": "int",
    "url": "string: /v1/invoices/in_1URKqsLiGzfLlQttyxjvHIij/lines"
   },
   "livemode": "bool",
   "metadata": {},
   "next_payment_attempt": "null",
   "number": "string: DE95EAE5-67484",
   "on_behalf_of": "null",
   "paid": "bool",
   "paid_out_of_band": "bool",
   "parent": {
    "quote_details": "null",
    "subscription_details": {
     "metadata": {
      "clientIp": "…",
      "clientUserAgent": "…",
      "fbp": "…",
      "openAiConversionSourceUrl": "…",
      "orgWebsiteId": "…",
      "orgWebsiteUrl": "…",
      "subscriptionType": "…",
      "userId": "…"
     },
     "subscription": "string: sub_1URKqsLiGzfLlQttyUojO8N1"
    },
    "type": "string: subscription_details"
   },
   "payment_intent": "string: pi_3URKqtLiGzfLlQtt1pJKe2YR",
   "payment_settings": {
   
```

### `GET /api/subscriptions/invoices?type=quora` → 200
Response shape:
```json
{
 "data": [],
 "message": "string: No invoices found"
}
```

### `GET /api/subscriptions/invoices?type=backlink_credits` → 200
Response shape:
```json
{
 "data": [],
 "message": "string: No invoices found"
}
```

### `GET /api/subscriptions/invoices?type=llm_visibility_prompts` → 200
Response shape:
```json
{
 "data": [],
 "message": "string: No invoices found"
}
```

### `GET /api/organization` → 200
Response shape:
```json
{
 "message": "string: Organization fetched successfully",
 "data": {
  "id": "int",
  "name": "string: Vaultio Organization",
  "creatorId": "int",
  "gscCredentials": "null",
  "acquisitionChannel": "string: facebook",
  "createdAt": "string: 2026-05-07T15:10:56.356Z",
  "updatedAt": "string: 2026-08-05T02:16:56.138Z",
  "members": [
   {
    "id": "int",
    "email": "string: zepohd@gmail.com",
    "name": "string: Vaultio Marketing VA",
    "isActive": "bool",
    "role": "string: member",
    "stripeCustomerId": "null",
    "newsSubscribed": "bool",
    "isInvoiceEmailEnabled": "bool",
    "platformLanguage": "string: en",
    "referralCode": "string: YP556K96",
    "linkedinPostCompleted": "bool",
    "linkedinExperiencePostCompleted": "bool",
    "isG2ReviewCompleted": "bool",
    "hasWatchedWelcomeVideo": "bool",
    "hasSeenArticleHints": "bool",
    "watchedVideos": [],
    "completedSetupItems": [],
    "lastSeenProductUpdateAt": "string: 2026-10-09",
    "resendAbandonedStartedAt": "null",
    "resendChurnedStartedAt": "null",
    "resendOnboardingStartedAt": "null",
    "resendActiveUserStartedAt": "null",
    "deletionRequestedAt": "null",
    "lastLoginAt": "string: 2026-10-22T20:18:29.965Z",
    "createdAt": "string: 2026-07-18T17:36:13.801Z",
    "updatedAt": "string: 2026-10-22T20:18:29.965Z",
    "supabaseId": "string: 3a3f6160-6b46-4287-990b-1859a271c5c4",
    "organizationId": "int",
    "websiteAccess": [
     {
      "id": "…",
      "userId": "…",
      "orgWebsiteId": "…",
      "createdAt": "…",
      "updatedAt": "…",
      "orgWebsite": "…"
     }
    ]
   }
  ],
  "websites": [
   {
    "id": "int",
    "url": "string: https://vaultio.co",
    "creationSource": "string: web_app",
    "brandName": "string: Vaultio",
    "selectedLanguage": "string: en",
    "description": "string: Vaultio puts contractors at the top of Google SEO and AI sea",
    "targetAudience": [
     "string: home service contractors seeking to increase lead capture"
    ],
    "mainServices": [],
    "onboardingStatus": "string: completed",
    "lastCompletedOnboardingStep": "null",
    "includeYoutube": "bool",
    "youtubeChannel": "null",
    "includeCTAImage": "bool",
    "ctaSettings": {
     "map": {
      "lat": "…",
      "lng": "…",
      "address": "…",
      "enabled": "…",
      "mapsUrl": "…",
      "imageKey": "…",
      "imageUrl": "…",
      "placeName": "…"
     },
     "links": {
      "items": "…",
      "enabled": "…"
     },
     "contact": {
      "email": "…",
      "phone": "…",
      "enabled": "…",
      "whatsapp": "…"
     }
    },
    "includeCitation": "bool",
    "includeSourcesSection": "bool",
    "includeJsonLd": "bool",
    "includeFaqJsonLd": "bool",
    "includeInternalLinks": "bool",
    "includeToc": "bool",
    "includeTldr": "bool",
    "summaryStyle": "string: tldr",
    "includeRecommendedReads": "bool",
    "includePerspective": "bool",
    "mentionCompetitorsIfRelevant": "bool",
    "englishType": "string: american",
    "screenshotUrl": "string: https://media.babylovegrowth.ai/blog-images/organization-294",
    "screenshotLinkUrl": "null",
    "sitemapUrl": "string: https://vaultio.co/sitemap.xml",
    "promoWebsiteUrl": "string: https://vaultio.co",
    "exampleArticleUrl": "string: https://vaultio.co",
    "brandVoice": {
     "pacing_and_flow": "string: The pacing is rapid and dynamic, maintaining reader engageme",
     "tone_and_emotion": "string: The tone is urgent, confident, and persua
```
