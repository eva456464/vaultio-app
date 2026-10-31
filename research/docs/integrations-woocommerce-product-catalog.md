<!-- Source: https://www.babylovegrowth.ai/docs/integrations/woocommerce-product-catalog -->

Integrations

# WooCommerce Product Catalog

Connect your WooCommerce store and sync products into BabyLoveGrowth.

The WooCommerce Product Catalog integration lets BabyLoveGrowth import products from your WooCommerce store. Once connected, you can sync your catalog on demand and use product data across the platform.

Separate from blog publishing

Product catalog uses its own WooCommerce REST API key. It is independent of the [WordPress blog publishing integration](https://www.babylovegrowth.ai/docs/integrations/wordpress).

---

## [Setup Instructions](#setup-instructions)

To begin, go to **Settings → Product Catalog** and click **Connect WooCommerce**. Then follow the steps below.

### [What You Need](#what-you-need)

- **WordPress admin access** to your store, with the WooCommerce plugin active
- **Your store URL** (e.g., `https://yourstore.com`)
- **A WooCommerce REST API key** with **Read** permissions, created in Step 1 below

### [Create a REST API Key](#create-a-rest-api-key)

1. In your WordPress admin, go to **WooCommerce → Settings → Advanced → REST API**
2. Click **Add key**
3. Give it a description (e.g., "BabyLoveGrowth Product Catalog") and leave the user as your admin account
4. Set **Permissions** to **Read**. Write access is not needed and will not be used
5. Click **Generate API key**

### [Copy the Consumer Key and Secret](#copy-the-consumer-key-and-secret)

1. Copy the **Consumer key**. It starts with `ck_`
2. Copy the **Consumer secret**. It starts with `cs_`

WooCommerce shows these values only once. Copy them before leaving the page. If you lose them, revoke the key and create a new one.

### [Connect in BabyLoveGrowth](#connect-in-babylovegrowth)

1. In the BabyLoveGrowth dashboard, open **Settings → Product Catalog**
2. Click **Connect WooCommerce**
3. Enter your **Store URL**, **Consumer key**, and **Consumer secret**
4. Click **Connect**. This takes up to 30 seconds while we verify the key against your store

**Include www if your store uses it.** If your store canonically loads at `www.yourstore.com` and you enter `yourstore.com`, WordPress redirects across hosts, the authorisation header is dropped, and you get an error saying the key is invalid even though it is fine.

Connecting starts your first catalog sync automatically, so the status will show **Syncing** right away. After that, click **Sync Catalog** any time to refresh products. Manual products you add separately are kept even if you disconnect WooCommerce.

## [Tips & Best Practices](#tips--best-practices)

- Use **Read** permissions. Read/Write is unnecessary and gives away more access than the integration needs
- Only one store platform can be connected per website. Disconnect Shopify first if you want to switch to WooCommerce
- Stores with more than 10,000 products sync the first 10,000. The catalog page shows a note when this happens, and the sync still counts as successful
- Products whose price we cannot read unambiguously are saved without a price. They stay active and can still be featured in articles
- Rotating a key? Use **Edit connection** on the catalog page rather than disconnecting, so your synced products are kept
- You can add manual products alongside synced WooCommerce products at any time

## [Troubleshooting & FAQ](#troubleshooting--faq)

"That API key doesn't have Read access"

The key was created with the wrong permissions. In **WooCommerce → Settings → Advanced → REST API**, open the key and set **Permissions** to **Read**, or revoke it and create a new one.

"Invalid key" on a key you just created: check www first

This is the most common cause. If your store loads at `www.yourstore.com` but you entered `yourstore.com` (or the other way round), WordPress redirects to the canonical host and the authorisation header is dropped along the way, so the key looks wrong. Re-enter the store URL exactly as your store loads in the browser.

Connection fails mentioning permalinks

The WooCommerce REST API needs pretty permalinks. In WordPress, go to **Settings → Permalinks** and choose anything other than **Plain**, then save and try connecting again.

Connection times out or is blocked

A firewall, security plugin, or WAF (e.g., Cloudflare or Wordfence) may be blocking API requests, or your store may not be reachable over HTTPS. Allow requests to `/wp-json/wc/v3/` and confirm your certificate is valid.

Prices show in the wrong currency

We detect your store currency automatically during the sync. If it looks wrong, contact support and we can set it manually.

Can I connect WooCommerce and Shopify together?

No. One store platform can be connected per website. Manual products and file imports work alongside either one.

[Shopify Product Catalog

Connect your Shopify store and sync products into BabyLoveGrowth.](https://www.babylovegrowth.ai/docs/integrations/shopify-product-catalog)[Lovable

Add a self-updating blog to your Lovable site with one copy-paste prompt, or let us host it for you.](https://www.babylovegrowth.ai/docs/integrations/lovable)
