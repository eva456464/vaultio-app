# B33-blg-settings-referrals — raw capture dossier (auto-generated)
- **URL:** `https://www.babylovegrowth.ai/en/dashboard/settings/referrals`
- **Title:** BabyLoveGrowth - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/B33-blg-settings-referrals-1.png`, `screenshots/B33-blg-settings-referrals-2.png`

## Visible text (main content, top → bottom)

```text
Refer and earn
Invite friends. When they subscribe, they get a discount and you get a prepaid Visa card.
Your referral link
Share & earn
Get a $60 prepaid Visa card for every friend you bring!
0 paying referrals
$0 earned
How it works
1.
Share your link. Send it to friends and colleagues.
2.
Your friend subscribes. They get 30% off for 3 months.
3.
You get a prepaid card. A $60 virtual Visa card is ready to claim here 3 days after your friend's first payment.
Your rewards
One $60 prepaid Visa card per paying referral. Claim it here, then add it to Apple Pay or Google Pay or spend it online. Rewards from before the card program were paid in cash through Reditus.
No rewards yet
Your first reward appears here once a referred friend subscribes.
Your referred friends
No referrals yet
Friends you invite will show up here as soon as they sign up.
Cards are single-use virtual Visa cards provided by Tremendous and expire six months after you claim them. A card is issued 3 days after your friend's first payment if their subscription is still active.
```

## Headings

- H1: Refer and earn
- H2: Your referral link
- H2: How it works
- H2: Your rewards
- H2: Your referred friends

## Buttons / links (text [lucide icon] -> href)

- Share & earn [icon:lucide-gift]

## Lucide icons used

- lucide-gift
- lucide-credit-card
- lucide-user-plus

## API calls (`api/B33-blg-settings-referrals.json`)

### `GET /api/users/me` → 200
Response shape:
```json
{
 "data": {
  "id": "int",
  "email": "string: knightsdamian@gmail.com",
  "name": "string: Damian Knights",
  "isActive": "bool",
  "role": "string: admin",
  "stripeCustomerId": "string: cus_UTQeBR3aZ4JKPx",
  "newsSubscribed": "bool",
  "isInvoiceEmailEnabled": "bool",
  "platformLanguage": "string: en",
  "referralCode": "string: T3YLMLLQ",
  "linkedinPostCompleted": "bool",
  "linkedinExperiencePostCompleted": "bool",
  "isG2ReviewCompleted": "bool",
  "hasWatchedWelcomeVideo": "bool",
  "hasSeenArticleHints": "bool",
  "watchedVideos": [],
  "completedSetupItems": [],
  "lastSeenProductUpdateAt": "string: 2026-10-23",
  "resendAbandonedStartedAt": "string: 2026-06-24T05:54:03.908Z",
  "resendChurnedStartedAt": "null",
  "resendOnboardingStartedAt": "null",
  "resendActiveUserStartedAt": "string: 2026-09-26T01:01:34.116Z",
  "deletionRequestedAt": "null",
  "lastLoginAt": "string: 2026-10-31T02:01:48.536Z",
  "createdAt": "string: 2026-05-07T15:10:56.359Z",
  "updatedAt": "string: 2026-10-31T02:01:48.536Z",
  "supabaseId": "string: cf01a7df-95e5-44bf-bf55-a261c2e300ea",
  "organizationId": "int",
  "websiteAccess": []
 },
 "message": "string: User fetched successfully"
}
```

### `GET /api/reditus/referral-summary` → 200
Response shape:
```json
{
 "data": {
  "cardReward": {
   "amountUsd": "int",
   "holdDays": "int"
  },
  "tiers": [
   {
    "id": "string: bronze",
    "minReferrals": "int",
    "perReferral": {
     "accountCreditUsd": "int"
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
    "id": "string: bronze",
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
 "message": "string: Referral summary fetched"
}
```

### `GET /api/subscriptions/get-org-website-subscription?type=main` → 200
Response shape:
```json
{
 "data": {
  "id": "string: sub_1TmpE7LiGzfLlQttDwgNlrsX",
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
  "default_payment_method": "string: pm_1TmpE4LiGzfLlQtt6zc5sU3x",
  "default_source": "null",
  "default_tax_rates": [],
  "description": "string: https://vaultio.co (English)",
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
     "id": "string: si_UmO0cFfS8NFEA3",
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
     "subscription": "string: sub_1TmpE7LiGzfLlQttDwgNlrsX",
     "tax_rates": []
    }
   ],
   "has_more": "bool",
   "total_count": "int",
   "url": "string: /v1/subscription_items?subscription=sub_1TmpE7LiGzfLlQttDwgN"
  },
  "latest_invoice": "string: in_1UV4FtLiGzfLlQttBT1lTBBd",
  "livemode": "bool",
  "managed_payments": {
   "enabled": "bool"
  },
  "metadata": {
   "clientIp": "string: 146.75.175.1",
   "clientUserAgent": "string: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/",
   "fbp": "string: fb.1.1782539053062.620131230",
   "orgWebsiteId": "string: 41420",
   "orgWebsiteUrl": "string: https://vaultio.co",
   "pendingPlanChangeFromPriceId": "string: price_1SwexZLiGzfLlQttzFmWxaHk",
   "selectedLanguage": "string: en",
   "subscriptionType": 
```
