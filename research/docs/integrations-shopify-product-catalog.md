<!-- Source: https://www.babylovegrowth.ai/docs/integrations/shopify-product-catalog -->

Integrations

# Shopify Product Catalog

Connect your Shopify store and sync products into BabyLoveGrowth.

The Shopify Product Catalog integration lets BabyLoveGrowth import products from your Shopify store. Once connected, you can sync your catalog on demand and use product data across the platform.

Separate from blog publishing

Product catalog uses its own Shopify app credentials and scopes. It is independent of the [Shopify blog publishing integration](https://www.babylovegrowth.ai/docs/integrations/shopify). You can connect one, both, or neither.

---

## [Setup Instructions](#setup-instructions)

To begin, go to **Settings → Product Catalog** and click **Connect Shopify**. Then follow the steps below.

### [What You Need](#what-you-need)

- **Shopify admin access** with permission to create apps
- **Store name from your .myshopify.com domain** (e.g., `na70yq-bn` from `na70yq-bn.myshopify.com`)
- **Product read permissions** on your Shopify app (**read\_products** and **read\_inventory**)

### [Get Your Store Name](#get-your-store-name)

1. In Shopify Admin, go to **Settings → Domains**
2. Find your `.myshopify.com` domain (e.g., `na70yq-bn.myshopify.com`)
3. Copy the part before `.myshopify.com` (e.g., `na70yq-bn`). This is your **Store Name** for BabyLoveGrowth

![Shopify settings page](https://www.babylovegrowth.ai/_next/static/media/shopify-settings.832df490.png)

![Shopify domain settings showing myshopify.com domain](https://www.babylovegrowth.ai/_next/static/media/shopify-settings-domain.aeee2c9b.png)

### [Create a Shopify App in Dev Dashboard](#create-a-shopify-app-in-dev-dashboard)

1. In Shopify Admin, go to **Apps**, then click **Develop apps**
2. Click **Build apps in Dev Dashboard** (opens dev.shopify.com/dashboard)
3. Click **Create app** and name it (e.g., "BabyLoveGrowth Product Catalog")

![Shopify Apps page with Develop apps option](https://www.babylovegrowth.ai/_next/static/media/shopify-app-develop-app.8f67c2e6.png)

![Shopify Dev Dashboard](https://www.babylovegrowth.ai/_next/static/media/shopify-dev-dashboard.cf47032e.png)

![Create app button in Shopify Dev Dashboard](https://www.babylovegrowth.ai/_next/static/media/shopify-create-app.b50e3758.png)

![Create app form with app name](https://www.babylovegrowth.ai/_next/static/media/shopify-app-name-create.9a40be48.png)

### [Set Scopes (Products Only)](#set-scopes-products-only)

1. In the app, go to **Access** and click **Select scopes**
2. Search "products" and enable: **read\_products**
3. Search "inventory" and enable: **read\_inventory**
4. Click **Done**, then click **Release** (version name can be left blank) and confirm

![Shopify app permissions selection](https://www.babylovegrowth.ai/_next/static/media/shopify-product-catalogue-permission.9d23aa36.png)

![Shopify app release confirmation](https://www.babylovegrowth.ai/_next/static/media/shopify-app-release.164e39b0.png)

### [Install the App](#install-the-app)

1. Click **Home** in the app sidebar
2. Click **Install app** (top right) and confirm in your Shopify store dashboard
3. Verify the app shows under **Apps** in your Shopify store

![Install app button in Shopify Dev Dashboard](https://www.babylovegrowth.ai/_next/static/media/shopify-app-install.744c9efa.png)

![App installation confirmation in Shopify store](https://www.babylovegrowth.ai/_next/static/media/shopify-app-install-store.d6d20517.png)

### [Copy Client ID and Client Secret](#copy-client-id-and-client-secret)

1. Back in the Shopify Dev Dashboard, open your app
2. Click **Settings** in the app sidebar
3. Copy the **Client ID** and **Client Secret**

![Shopify app credentials showing Client ID and Client Secret](https://www.babylovegrowth.ai/_next/static/media/shopify-credentials-get.92145b99.png)

### [Connect in BabyLoveGrowth](#connect-in-babylovegrowth)

1. In the BabyLoveGrowth dashboard, open **Settings → Product Catalog**
2. Click **Connect Shopify**
3. Enter **Store Name** (from Step 1), **Client ID**, and **Client Secret**
4. Save. After connecting, click **Sync Catalog** to import your products

Once connected, click **Sync Catalog** any time to refresh products from Shopify. Manual products you add separately are kept even if you disconnect Shopify.

## [Tips & Best Practices](#tips--best-practices)

- Use your `.myshopify.com` store name (not a custom domain) for the connection
- Install the app on your store before connecting (Client ID and Secret alone are not enough)
- Both **read\_products** and **read\_inventory** scopes are required for full product and variant data
- You can add manual products alongside synced Shopify products at any time

## [Troubleshooting & FAQ](#troubleshooting--faq)

Connection fails?

Re-check Store Name (from .myshopify.com), Client ID, and Client Secret. Confirm the app is installed on your store and scopes **read\_products** and **read\_inventory** are enabled.

Sync fails with inventory permission error?

Add the **read\_inventory** scope to your Shopify app, release a new version, and reinstall if needed.

App not visible in store Apps?

Make sure you completed the Install step in the store dashboard.

Will disconnecting remove manual products?

No. Disconnecting Shopify only removes synced Shopify products. Manual entries are kept.

Do I need the blog publishing integration too?

No. Product catalog and blog publishing are separate. Connect product catalog only if you want to sync products.

Which store name do I enter?

The part before `.myshopify.com` (e.g., `na70yq-bn`).

[Webhooks

Send BabyLoveGrowth articles to any endpoint with a simple bearer-auth POST webhook.](https://www.babylovegrowth.ai/docs/integrations/webhook)[WooCommerce Product Catalog

Connect your WooCommerce store and sync products into BabyLoveGrowth.](https://www.babylovegrowth.ai/docs/integrations/woocommerce-product-catalog)
