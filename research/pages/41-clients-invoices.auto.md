# 41-clients-invoices — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/clients/invoices`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/41-clients-invoices-1.png`, `screenshots/41-clients-invoices-2.png`

## Visible text (main content, top → bottom)

```text
Invoices
All invoices across your client websites.
Manage all subscriptions
Client	Invoice ID	Billing Date	Amount	Status	Invoice PDF
vaultio.co	in_1UV4FtLiGzfLlQttBT1lTBBd	Oct 26, 2026	$99.00	
Paid
Download
vaultio.co	in_1URKqsLiGzfLlQttyxjvHIij	Oct 16, 2026	$49.00	
Paid
Download
goletapressurewashing.com	in_1UN1DOLiGzfLlQttMKNILNzA	Oct 4, 2026	$99.00	
Paid
Download
vaultio.co	in_1UKBxPLiGzfLlQttTwfiz6yg	Sep 26, 2026	$99.00	
Paid
Download
goletapressurewashing.com	in_1UC8vlLiGzfLlQttDNZY5oZx	Sep 4, 2026	$99.00	
Paid
Download
vaultio.co	in_1U8xB5LiGzfLlQttenXgir7J	Aug 26, 2026	$99.00	
Paid
Download
goletapressurewashing.com	in_1U0u8rLiGzfLlQtt4NxRgqFp	Aug 4, 2026	$99.00	
Paid
Download
goletapressurewashing.com	in_1U0sjXLiGzfLlQttH79LXaZM	Aug 4, 2026	$0.00	
Paid
Download
vaultio.co	in_1TxiPbLiGzfLlQttfI5cPorb	Jul 26, 2026	$99.00	
Paid
Download
vaultio.co	in_1Tmq6JLiGzfLlQttipzVNsD6	Jun 26, 2026	$99.00	
Paid
Download
vaultio.co	in_1TmpE8LiGzfLlQttL1788ZHM	Jun 26, 2026	$0.00	
Paid
Download
```

## Headings

- H1: Invoices

## Buttons / links (text [lucide icon] -> href)

- Manage all subscriptions
- Download

## Tables

- headers: ['Client', 'Invoice ID', 'Billing Date', 'Amount', 'Status', 'Invoice PDF'] · rows rendered: 11
- sample: `[["vaultio.co", "in_1UV4FtLiGzfLlQttBT1lTBBd", "Oct 26, 2026", "$99.00", "Paid", "Download"], ["vaultio.co", "in_1URKqsLiGzfLlQttyxjvHIij", "Oct 16, 2026", "$49.00", "Paid", "Download"], ["goletapressurewashing.com", "in_1UN1DOLiGzfLlQttMKNILNzA", "Oct 4, 2026", "$99.00", "Paid", "Download"], ["vaultio.co", "in_1UKBxPLiGzfLlQttTwfiz6yg", "Sep 26, 2026", "$99.00", "Paid", "Download"]]`

## API calls (`api/41-clients-invoices.json`)

### `GET /api/subscriptions/organization-invoices` → 200
Response shape:
```json
{
 "data": [
  {
   "id": "string: in_1UV4FtLiGzfLlQttBT1lTBBd",
   "created": "int",
   "amount_due": "int",
   "currency": "string: usd",
   "status": "string: paid",
   "invoice_pdf": "string: https://pay.stripe.com/invoice/acct_1QGKexLiGzfLlQtt/live_YW",
   "websiteUrl": "string: https://vaultio.co"
  }
 ],
 "message": "string: Invoices retrieved successfully"
}
```
