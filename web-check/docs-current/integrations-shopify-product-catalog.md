<!-- Source: https://www.babylovegrowth.ai/docs/integrations/shopify-product-catalog (fetched 2026-11-05) -->

Integrations

# Shopify Product Catalog

Connect your Shopify store and sync products into BabyLoveGrowth.

The Shopify Product Catalog integration lets BabyLoveGrowth import products from your Shopify store. Once connected, your catalog re-syncs automatically about once a day, you can click **Sync Catalog** to refresh it sooner, and you can use product data across the platform.

Separate from blog publishing

Product catalog uses its own Shopify app credentials and scopes. It is independent of the [Shopify blog publishing integration](/docs/integrations/shopify). You can connect one, both, or neither.

------------------------------------------------------------------------

## [Setup Instructions](#setup-instructions)

To begin, go to **Settings → Product Catalog** and choose **Shopify** (or **Add products → Shopify**). Then follow the steps below.

### [What You Need](#what-you-need)

- **Shopify admin access** with permission to create apps
- **Store name from your .myshopify.com domain** (e.g., `na70yq-bn` from `na70yq-bn.myshopify.com`)
- **Product read permissions** on your Shopify app (**read_products** and **read_inventory**)

### [Get Your Store Name](#get-your-store-name)

1.  In Shopify Admin, go to **Settings → Domains**
2.  Find your `.myshopify.com` domain (e.g., `na70yq-bn.myshopify.com`)
3.  Copy the part before `.myshopify.com` (e.g., `na70yq-bn`). This is your **Store Name** for BabyLoveGrowth

![Shopify settings page](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-settings.832df490.png&w=3840&q=75)

![Shopify domain settings showing myshopify.com domain](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-settings-domain.aeee2c9b.png&w=3840&q=75)

### [Create a Shopify App in Dev Dashboard](#create-a-shopify-app-in-dev-dashboard)

1.  In Shopify Admin, go to **Apps**, then click **Develop apps**
2.  Click **Build apps in Dev Dashboard** (opens dev.shopify.com/dashboard)
3.  Click **Create app** and name it (e.g., "BabyLoveGrowth Product Catalog")

![Shopify Apps page with Develop apps option](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-app-develop-app.8f67c2e6.png&w=3840&q=75)

![Shopify Dev Dashboard](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-dev-dashboard.cf47032e.png&w=3840&q=75)

![Create app button in Shopify Dev Dashboard](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-create-app.b50e3758.png&w=3840&q=75)

![Create app form with app name](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-app-name-create.9a40be48.png&w=3840&q=75)

### [Set Scopes (Products Only)](#set-scopes-products-only)

1.  In the app, go to **Access** and click **Select scopes**
2.  Search "products" and enable: **read_products**
3.  Search "inventory" and enable: **read_inventory**
4.  Click **Done**, then click **Release** (version name can be left blank) and confirm

![Shopify app permissions selection](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-product-catalogue-permission.9d23aa36.png&w=3840&q=75)

![Shopify app release confirmation](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-app-release.164e39b0.png&w=3840&q=75)

### [Install the App](#install-the-app)

1.  Click **Home** in the app sidebar
2.  Click **Install app** (top right) and confirm in your Shopify store dashboard
3.  Verify the app shows under **Apps** in your Shopify store

![Install app button in Shopify Dev Dashboard](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-app-install.744c9efa.png&w=3840&q=75)

![App installation confirmation in Shopify store](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-app-install-store.d6d20517.png&w=3840&q=75)

### [Copy Client ID and Client Secret](#copy-client-id-and-client-secret)

1.  Back in the Shopify Dev Dashboard, open your app
2.  Click **Settings** in the app sidebar
3.  Copy the **Client ID** and **Client Secret**

![Shopify app credentials showing Client ID and Client Secret](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-credentials-get.92145b99.png&w=3840&q=75)

### [Connect in BabyLoveGrowth](#connect-in-babylovegrowth)

1.  In the BabyLoveGrowth dashboard, open **Settings → Product Catalog**
2.  Choose **Shopify** (or **Add products → Shopify**)
3.  Enter **Store Name** (from Step 1), **Client ID**, and **Client Secret**
4.  Click **Connect store**. Your first catalog sync starts automatically

Once connected, your catalog re-syncs automatically about once a day. Click **Sync Catalog** any time to refresh products from Shopify sooner. Manual products you add separately are kept even if you disconnect Shopify.

## [Tips & Best Practices](#tips--best-practices)

- Use your `.myshopify.com` store name (not a custom domain) for the connection
- Install the app on your store before connecting (Client ID and Secret alone are not enough)
- Both **read_products** and **read_inventory** scopes are required for full product and variant data
- You can add manual products alongside synced Shopify products at any time

## [Troubleshooting & FAQ](#troubleshooting--faq)

Connection fails?

Re-check Store Name (from .myshopify.com), Client ID, and Client Secret. Confirm the app is installed on your store and scopes **read_products** and **read_inventory** are enabled.

Sync fails with inventory permission error?

Add the **read_inventory** scope to your Shopify app, release a new version, and reinstall if needed.

App not visible in store Apps?

Make sure you completed the Install step in the store dashboard.

Will disconnecting remove manual products?

No. Disconnecting Shopify only removes synced Shopify products. Manual entries are kept.

Do I need the blog publishing integration too?

No. Product catalog and blog publishing are separate. Connect product catalog only if you want to sync products.

Which store name do I enter?

The part before `.myshopify.com` (e.g., `na70yq-bn`).

[](/docs/integrations/webhook)

Webhooks

Send BabyLoveGrowth articles to any endpoint with a simple bearer-auth POST webhook.

[](/docs/integrations/woocommerce-product-catalog)

WooCommerce Product Catalog

Connect your WooCommerce store and sync products into BabyLoveGrowth.
