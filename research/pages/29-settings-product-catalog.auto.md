# 29-settings-product-catalog — raw capture dossier (auto-generated)
- **URL:** `https://app.vaultio.co/en/dashboard/settings/product-catalog`
- **Title:** Vaultio - Get Google and ChatGPT Traffic on Autopilot
- **Screenshots:** `screenshots/29-settings-product-catalog-1.png`, `screenshots/29-settings-product-catalog-2.png`

## Visible text (main content, top → bottom)

```text
Product catalog
Products from your store that articles can feature and link to.
Add your products
Connect your store to automatically import your products, or add them manually. We'll then feature them in your articles with relevant links.


Shopify
Connect your Shopify store and import products automatically.


WooCommerce
Connect your WooCommerce store and import products automatically.

Add manually
Add products one by one, upload a file, or import a Google or Facebook feed.

XML Feed (URL)
Import products from an existing XML feed URL.
```

## Headings

- H1: Product catalog
- H2: Add your products

## Buttons / links (text [lucide icon] -> href)

- Shopify Connect your Shopify store and import products automatically. [icon:lucide-arrow-right]
- WooCommerce Connect your WooCommerce store and import products automatically. [icon:lucide-arrow-right]
- Add manually Add products one by one, upload a file, or import a Google or Faceb [icon:lucide-file-text]
- XML Feed (URL) Import products from an existing XML feed URL. [icon:lucide-link2]

## Lucide icons used

- lucide-arrow-right
- lucide-file-text
- lucide-link2

## Images

-  | https://app.vaultio.co/logos/logoShopify.svg
-  | https://app.vaultio.co/logos/Woo_logo_color.svg
-  | https://app.vaultio.co/images/PC1.svg

## API calls (`api/29-settings-product-catalog.json`)

### `GET /api/product-catalog/status` → 200
Response shape:
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

### `GET /api/async-jobs` → 200
Response shape:
```json
[]
```
